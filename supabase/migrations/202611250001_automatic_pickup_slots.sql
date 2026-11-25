begin;

-- Keep the original half-hour occupied even if staff move or close the slot.
alter table public.pickup_slots add column schedule_start timestamptz unique;
update public.pickup_slots set schedule_start = starts_at
where ends_at > now() and ends_at = starts_at + interval '30 minutes'
  and starts_at = date_bin(interval '30 minutes', starts_at, timestamptz '2000-01-01 00:00+00');
drop trigger audit_slots on public.pickup_slots;
create trigger audit_slot_insert after insert on public.pickup_slots for each row
  when (new.schedule_start is null) execute function public.audit_admin_change();
create trigger audit_slot_update after update on public.pickup_slots for each row
  execute function public.audit_admin_change();

-- Stored half-hours have stable IDs. Their bookable edges follow the current operating hours.
create function public.pickup_window(p_slot public.pickup_slots, p_settings public.canteen_settings)
returns table(window_start timestamptz, window_end timestamptz)
language sql immutable set search_path = public, pg_temp as $$
  select greatest(p_slot.starts_at, (d + p_settings.opens_at) at time zone 'Asia/Manila'),
         least(p_slot.ends_at, (d + p_settings.closes_at) at time zone 'Asia/Manila')
  from (select (p_slot.starts_at at time zone 'Asia/Manila')::date as d) as service
$$;

create or replace function public.get_pickup_slots()
returns table(id uuid, starts_at timestamptz, ends_at timestamptz, capacity integer, is_active boolean, reserved integer)
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  settings canteen_settings;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  if not is_active_user() then return; end if;
  select * into strict settings from canteen_settings where canteen_settings.id for share;

  with days as (
    select today + n as d from generate_series(0, 8) as n
  ), windows as (
    select t at time zone 'Asia/Manila' as start_time,
           least(t + interval '30 minutes', d + time '23:59:59.999999') at time zone 'Asia/Manila' as end_time
    from days cross join lateral generate_series(
      date_bin(interval '30 minutes', d + settings.opens_at, timestamp '2000-01-01'),
      d + settings.closes_at - interval '1 microsecond', interval '30 minutes'
    ) as t
  ), missing as (
    select tstzmultirange(tstzrange(start_time, end_time, '[)')) - coalesce((
      select range_agg(tstzrange(s.starts_at, s.ends_at, '[)'))
      from pickup_slots s where s.starts_at < end_time and s.ends_at > start_time
        and s.starts_at >= (today::timestamp at time zone 'Asia/Manila')
    ), '{}'::tstzmultirange) as gaps
    from windows
    where end_time > now() and start_time < now() + interval '8 days'
      and not exists (select 1 from pickup_slots s where s.schedule_start = start_time)
  )
  insert into pickup_slots(starts_at, ends_at, schedule_start)
  select lower(gap), upper(gap), lower(gap) from missing cross join lateral unnest(gaps) as gap
  where upper(gap) > now()
  order by lower(gap) on conflict do nothing;

  return query
    select s.id, w.window_start, w.window_end, s.capacity, s.is_active, count(o.id)::integer
    from pickup_slots s cross join lateral pickup_window(s, settings) w
    left join orders o on o.pickup_slot_id = s.id and o.status <> 'Cancelled'
    where s.starts_at >= (today::timestamp at time zone 'Asia/Manila')
      and s.starts_at < now() + interval '8 days'
      and w.window_end > now() and w.window_start < w.window_end
    group by s.id, w.window_start, w.window_end order by w.window_start, s.starts_at;
end $$;

revoke all on function public.pickup_window(public.pickup_slots, public.canteen_settings) from public, anon, authenticated;

create or replace function public.create_order(p_items jsonb,p_slot_id uuid,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_pickup_at timestamptz; v_window record; v_user profiles; v_slot pickup_slots; v_settings canteen_settings; v_id uuid; v_code text; v_total bigint:=0; v_count integer; v_row record; v_item record;
begin
 select * into v_user from profiles where id=auth.uid() for share;
 if not found or v_user.is_suspended then raise exception 'An active account is required'; end if;
 if exists(select 1 from user_roles where user_id=auth.uid() and role='ADMIN') then raise exception 'Use a student account to place an order'; end if;
 if p_idempotency_key is null then raise exception 'Checkout request ID is required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_idempotency_key::text,0));
 select id into v_id from orders where customer_id=auth.uid() and idempotency_key=p_idempotency_key;
 if found then return v_id; end if;
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Select between 1 and 30 meals'; end if;
 select count(distinct x.daily_menu_id) into v_count from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer);
 if v_count <> jsonb_array_length(p_items) then raise exception 'Duplicate or missing meal IDs'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer) where x.quantity is null or x.quantity not between 1 and 99) then raise exception 'Invalid quantity'; end if;
 select * into v_settings from canteen_settings where id=true for share;
 if not v_settings.accepting_orders then raise exception 'The canteen is not accepting orders'; end if;
 select * into v_slot from pickup_slots where id=p_slot_id for update;
 if not found or not v_slot.is_active or v_slot.ends_at <= now() then raise exception 'Pickup slot has expired or is unavailable'; end if;
 select * into v_window from pickup_window(v_slot, v_settings);
 if v_window.window_start >= v_window.window_end or v_window.window_end <= now() then raise exception 'Pickup is outside operating hours'; end if;
 v_pickup_at := v_window.window_start;
 if (select count(*) from orders where pickup_slot_id=p_slot_id and status <> 'Cancelled') >= v_slot.capacity then raise exception 'This pickup slot is full'; end if;
 v_id:=gen_random_uuid(); v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 -- Lock all stock rows in a consistent order, then use current database prices.
 for v_item in select * from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer) order by x.daily_menu_id loop
   select d.*, i.quantity as stock, m.name,m.price,m.prep_minutes,m.category_id,m.is_active into v_row from daily_menus d join meal_inventory i on i.daily_menu_id=d.id join meals m on m.id=d.meal_id where d.id=v_item.daily_menu_id for update of i,d,m;
   if not found then raise exception 'A meal is no longer offered'; end if;
   if not v_row.is_active or not v_row.is_available or v_row.stock < v_item.quantity then raise exception 'A meal is sold out or has insufficient stock'; end if;
   if v_row.service_date <> (v_slot.starts_at at time zone 'Asia/Manila')::date or (v_window.window_start at time zone 'Asia/Manila')::time < v_row.available_from or (v_window.window_end at time zone 'Asia/Manila')::time > v_row.available_until then raise exception 'A meal is unavailable at this pickup time'; end if;
   v_pickup_at := greatest(v_pickup_at, now()+make_interval(mins=>v_row.prep_minutes));
   if v_pickup_at > v_window.window_end then raise exception 'Choose a later pickup time to allow preparation'; end if;
   v_total:=v_total+v_row.price::bigint*v_item.quantity;
 end loop;
 if v_total > 2147483647 then raise exception 'Order total is too large'; end if;
 insert into orders(id,order_number,customer_id,customer_name,student_id,pickup_slot_id,pickup_at,pickup_code,total,idempotency_key)
 values(v_id,'CC-'||to_char(now() at time zone 'Asia/Manila','YYMMDD')||'-'||upper(substr(v_id::text,1,8)),v_user.id,v_user.full_name,v_user.student_id,p_slot_id,v_pickup_at,v_code,v_total::integer,p_idempotency_key);
 for v_item in select * from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer) order by x.daily_menu_id loop
   insert into order_items(order_id,meal_id,daily_menu_id,name,category_id,quantity,unit_price) select v_id,m.id,d.id,m.name,m.category_id,v_item.quantity,m.price from daily_menus d join meals m on m.id=d.meal_id where d.id=v_item.daily_menu_id;
   update meal_inventory set quantity=quantity-v_item.quantity,updated_at=now() where daily_menu_id=v_item.daily_menu_id;
 end loop;
 insert into order_status_history(order_id,status,actor_id) values(v_id,'Pending',auth.uid());
 return v_id;
end $$;

notify pgrst, 'reload schema';
commit;
