-- All money is stored as integer Philippine centavos. All service dates use Asia/Manila.
begin;
create type public.order_status as enum ('Pending','Confirmed','Preparing','Ready for Pickup','Completed','Cancelled');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  student_id text not null unique check (student_id ~ '^[A-Z0-9-]{4,30}$'),
  email text not null, is_suspended boolean not null default false, created_at timestamptz not null default now()
);
create table public.user_roles (user_id uuid primary key references public.profiles(id) on delete cascade, role text not null default 'CUSTOMER' check(role in ('CUSTOMER','ADMIN')));
create table public.meal_categories (id uuid primary key default gen_random_uuid(), name text not null unique, icon text not null default 'food-variant');
create table public.meals (
  id uuid primary key default gen_random_uuid(), name text not null check(char_length(trim(name)) between 2 and 100), description text not null check(char_length(description) between 5 and 1000),
  category_id uuid not null references public.meal_categories(id) on delete restrict,
  price integer not null check(price between 1 and 1000000), image_url text not null check(image_url like 'https://%'),
  prep_minutes integer not null default 10 check(prep_minutes between 1 and 120), is_active boolean not null default true, featured boolean not null default false, created_at timestamptz not null default now()
);
create table public.daily_menus (
  id uuid primary key default gen_random_uuid(), meal_id uuid not null references public.meals(id) on delete restrict,
  service_date date not null, available_from time not null default '07:00', available_until time not null default '20:00',
  is_available boolean not null default true, unique(meal_id,service_date), check(available_from < available_until)
);
create table public.meal_inventory (daily_menu_id uuid primary key references public.daily_menus(id) on delete restrict, quantity integer not null check(quantity between 0 and 10000), low_stock_threshold integer not null default 8 check(low_stock_threshold between 0 and 10000), updated_at timestamptz not null default now());
create table public.pickup_slots (id uuid primary key default gen_random_uuid(), starts_at timestamptz not null unique, ends_at timestamptz not null, capacity integer not null default 20 check(capacity between 1 and 500), is_active boolean not null default true, check(starts_at < ends_at), check((starts_at at time zone 'Asia/Manila')::date = (ends_at at time zone 'Asia/Manila')::date));
create table public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique, customer_id uuid not null references public.profiles(id) on delete restrict,
  customer_name text not null, student_id text not null, pickup_slot_id uuid not null references public.pickup_slots(id) on delete restrict,
  pickup_at timestamptz not null, pickup_code text not null unique, status public.order_status not null default 'Pending', total integer not null check(total > 0),
  idempotency_key uuid not null, cancellation_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(customer_id,idempotency_key)
);
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, meal_id uuid not null references public.meals(id) on delete restrict, daily_menu_id uuid not null references public.daily_menus(id) on delete restrict, name text not null, category_id uuid not null references public.meal_categories(id) on delete restrict, quantity integer not null check(quantity between 1 and 99), unit_price integer not null check(unit_price > 0), unique(order_id,daily_menu_id));
create table public.order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, status public.order_status not null, actor_id uuid not null references public.profiles(id) on delete restrict, reason text, created_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete restrict, method text not null default 'Cash on Pickup' check(method = 'Cash on Pickup'), amount integer not null check(amount > 0), collected_by uuid not null references public.profiles(id) on delete restrict, collected_at timestamptz not null default now());
create table public.admin_activity_logs (id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.profiles(id) on delete restrict, action text not null, entity_id text, details jsonb not null default '{}', created_at timestamptz not null default now());
create table public.canteen_settings (id boolean primary key default true check(id), name text not null default 'Campus Canteen', pickup_location text not null default 'Main Canteen · Pickup Counter 1', opens_at time not null default '07:00', closes_at time not null default '20:00', accepting_orders boolean not null default true, check(opens_at < closes_at), check(char_length(trim(name)) between 2 and 100), check(char_length(trim(pickup_location)) between 2 and 200));
insert into public.canteen_settings(id) values(true);
create index orders_customer_date on public.orders(customer_id,created_at desc);
create index orders_status_pickup on public.orders(status,pickup_at);
create index orders_slot on public.orders(pickup_slot_id) where status <> 'Cancelled';
create index menus_date on public.daily_menus(service_date);
create index items_order on public.order_items(order_id);
create index history_order on public.order_status_history(order_id,created_at);
create index payments_date on public.payments(collected_at);

create function public.is_active_user() returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select exists(select 1 from profiles where id=auth.uid() and not is_suspended) $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public, pg_temp as $$ select exists(select 1 from user_roles r join profiles p on p.id=r.user_id where r.user_id=auth.uid() and r.role='ADMIN' and not p.is_suspended) $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles(id,full_name,student_id,email) values(new.id,trim(new.raw_user_meta_data->>'full_name'),upper(trim(new.raw_user_meta_data->>'student_id')),new.email);
  -- Metadata can never grant administrator access.
  insert into user_roles(user_id,role) values(new.id,'CUSTOMER');
  return new;
end $$;
create trigger create_customer_profile after insert on auth.users for each row execute function public.handle_new_user();

create function public.get_pickup_slots() returns table(id uuid,starts_at timestamptz,ends_at timestamptz,capacity integer,is_active boolean,reserved integer) language sql stable security definer set search_path = public, pg_temp as $$
 select s.id,s.starts_at,s.ends_at,s.capacity,s.is_active,count(o.id)::integer from pickup_slots s left join orders o on o.pickup_slot_id=s.id and o.status <> 'Cancelled'
 where is_active_user() and s.starts_at >= now() and s.starts_at < now()+interval '8 days'
 group by s.id order by s.starts_at
$$;

create function public.create_order(p_items jsonb,p_slot_id uuid,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user profiles; v_slot pickup_slots; v_settings canteen_settings; v_id uuid; v_code text; v_total bigint:=0; v_count integer; v_row record; v_item record;
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
 if not found or not v_slot.is_active or v_slot.starts_at <= now() then raise exception 'Pickup slot has expired or is unavailable'; end if;
 if (v_slot.starts_at at time zone 'Asia/Manila')::time < v_settings.opens_at or (v_slot.ends_at at time zone 'Asia/Manila')::time > v_settings.closes_at then raise exception 'Pickup is outside operating hours'; end if;
 if (select count(*) from orders where pickup_slot_id=p_slot_id and status <> 'Cancelled') >= v_slot.capacity then raise exception 'This pickup slot is full'; end if;
 v_id:=gen_random_uuid(); v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
 -- Lock all stock rows in a consistent order, then use current database prices.
 for v_item in select * from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer) order by x.daily_menu_id loop
   select d.*, i.quantity as stock, m.name,m.price,m.prep_minutes,m.category_id,m.is_active into v_row from daily_menus d join meal_inventory i on i.daily_menu_id=d.id join meals m on m.id=d.meal_id where d.id=v_item.daily_menu_id for update of i,d,m;
   if not found then raise exception 'A meal is no longer offered'; end if;
   if not v_row.is_active or not v_row.is_available or v_row.stock < v_item.quantity then raise exception 'A meal is sold out or has insufficient stock'; end if;
   if v_row.service_date <> (v_slot.starts_at at time zone 'Asia/Manila')::date or (v_slot.starts_at at time zone 'Asia/Manila')::time < v_row.available_from or (v_slot.ends_at at time zone 'Asia/Manila')::time > v_row.available_until then raise exception 'A meal is unavailable at this pickup time'; end if;
   if v_slot.starts_at < now()+make_interval(mins=>v_row.prep_minutes) then raise exception 'Choose a later pickup time to allow preparation'; end if;
   v_total:=v_total+v_row.price::bigint*v_item.quantity;
 end loop;
 if v_total > 2147483647 then raise exception 'Order total is too large'; end if;
 insert into orders(id,order_number,customer_id,customer_name,student_id,pickup_slot_id,pickup_at,pickup_code,total,idempotency_key)
 values(v_id,'CC-'||to_char(now() at time zone 'Asia/Manila','YYMMDD')||'-'||upper(substr(v_id::text,1,8)),v_user.id,v_user.full_name,v_user.student_id,p_slot_id,v_slot.starts_at,v_code,v_total::integer,p_idempotency_key);
 for v_item in select * from jsonb_to_recordset(p_items) as x(daily_menu_id uuid,quantity integer) order by x.daily_menu_id loop
   insert into order_items(order_id,meal_id,daily_menu_id,name,category_id,quantity,unit_price) select v_id,m.id,d.id,m.name,m.category_id,v_item.quantity,m.price from daily_menus d join meals m on m.id=d.meal_id where d.id=v_item.daily_menu_id;
   update meal_inventory set quantity=quantity-v_item.quantity,updated_at=now() where daily_menu_id=v_item.daily_menu_id;
 end loop;
 insert into order_status_history(order_id,status,actor_id) values(v_id,'Pending',auth.uid());
 return v_id;
end $$;

create function public.transition_order(p_order_id uuid,p_status public.order_status,p_pickup_code text default null,p_reason text default null,p_collect_cash boolean default false) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order orders; v_item record;
begin
 if not is_active_user() then raise exception 'An active account is required'; end if;
 select * into v_order from orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if not is_admin() and not(v_order.customer_id=auth.uid() and v_order.status='Pending' and p_status='Cancelled') then raise exception 'Administrator access is required'; end if;
 if not ((v_order.status='Pending' and p_status in ('Confirmed','Cancelled')) or (v_order.status='Confirmed' and p_status in ('Preparing','Cancelled')) or (v_order.status='Preparing' and p_status in ('Ready for Pickup','Cancelled')) or (v_order.status='Ready for Pickup' and p_status in ('Completed','Cancelled'))) then raise exception 'Invalid order status transition'; end if;
 if p_status='Cancelled' and (p_reason is null or length(trim(p_reason)) not between 3 and 500) then raise exception 'Provide a cancellation reason (3–500 characters)'; end if;
 if p_status='Completed' then
   if upper(trim(coalesce(p_pickup_code,'')))<>v_order.pickup_code then raise exception 'Invalid pickup code'; end if;
   if not p_collect_cash then raise exception 'Confirm cash collection before completing the order'; end if;
   insert into payments(order_id,amount,collected_by) values(v_order.id,v_order.total,auth.uid());
 end if;
 if p_status='Cancelled' then
   perform 1 from pickup_slots where id=v_order.pickup_slot_id for update;
   for v_item in select * from order_items where order_id=v_order.id order by daily_menu_id loop
     update meal_inventory set quantity=quantity+v_item.quantity,updated_at=now() where daily_menu_id=v_item.daily_menu_id;
   end loop;
 end if;
 update orders set status=p_status,cancellation_reason=case when p_status='Cancelled' then trim(p_reason) else cancellation_reason end,updated_at=now() where id=v_order.id;
 insert into order_status_history(order_id,status,actor_id,reason) values(v_order.id,p_status,auth.uid(),p_reason);
 if is_admin() then insert into admin_activity_logs(admin_id,action,entity_id,details) values(auth.uid(),'order_status',v_order.id::text,jsonb_build_object('from',v_order.status,'to',p_status)); end if;
end $$;

create function public.schedule_meal(p_meal_id uuid,p_service_date date,p_available_from time,p_available_until time,p_quantity integer,p_threshold integer,p_available boolean) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 if p_service_date < (now() at time zone 'Asia/Manila')::date then raise exception 'Cannot schedule meals in the past'; end if;
 insert into daily_menus(meal_id,service_date,available_from,available_until,is_available) values(p_meal_id,p_service_date,p_available_from,p_available_until,p_available)
 on conflict(meal_id,service_date) do update set available_from=excluded.available_from,available_until=excluded.available_until,is_available=excluded.is_available returning id into v_id;
 insert into meal_inventory(daily_menu_id,quantity,low_stock_threshold) values(v_id,p_quantity,p_threshold) on conflict(daily_menu_id) do update set quantity=excluded.quantity,low_stock_threshold=excluded.low_stock_threshold,updated_at=now();
 insert into admin_activity_logs(admin_id,action,entity_id) values(auth.uid(),'schedule_meal',v_id::text); return v_id;
end $$;
create function public.set_stock(p_menu_id uuid,p_quantity integer,p_threshold integer) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 update meal_inventory set quantity=p_quantity,low_stock_threshold=p_threshold,updated_at=now() where daily_menu_id=p_menu_id;
 if not found then raise exception 'Inventory record not found'; end if;
 insert into admin_activity_logs(admin_id,action,entity_id,details) values(auth.uid(),'set_stock',p_menu_id::text,jsonb_build_object('quantity',p_quantity));
end $$;
create function public.set_account_suspension(p_user_id uuid,p_suspended boolean,p_reason text) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 if p_user_id=auth.uid() or exists(select 1 from user_roles where user_id=p_user_id and role='ADMIN') then raise exception 'Administrator accounts cannot be suspended here'; end if;
 perform 1 from profiles where id=p_user_id for update;
 if p_reason is null or char_length(trim(p_reason)) < 3 then raise exception 'A reason is required'; end if;
 if p_suspended and exists(select 1 from orders where customer_id=p_user_id and status not in ('Completed','Cancelled')) then raise exception 'Resolve this student''s active orders before suspension'; end if;
 update profiles set is_suspended=p_suspended where id=p_user_id;
 if not found then raise exception 'Student not found'; end if;
 insert into admin_activity_logs(admin_id,action,entity_id,details) values(auth.uid(),'account_suspension',p_user_id::text,jsonb_build_object('suspended',p_suspended,'reason',p_reason));
end $$;

-- RLS is paired with restricted grants. Clients never write order, payment, history,
-- stock or role records directly; only validated functions may perform those writes.
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table meal_categories enable row level security;
alter table meals enable row level security;
alter table daily_menus enable row level security;
alter table meal_inventory enable row level security;
alter table pickup_slots enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;
alter table admin_activity_logs enable row level security;
alter table canteen_settings enable row level security;
create policy profiles_read on profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy profiles_edit_name on profiles for update to authenticated using(id=auth.uid() and is_active_user()) with check(id=auth.uid());
create policy roles_read on user_roles for select to authenticated using(user_id=auth.uid() or is_admin());
create policy categories_read on meal_categories for select to authenticated using(is_active_user());
create policy meals_read on meals for select to authenticated using(is_active_user() and (is_active or is_admin()));
create policy meals_admin on meals for all to authenticated using(is_admin()) with check(is_admin());
create policy menus_read on daily_menus for select to authenticated using(is_active_user());
create policy inventory_read on meal_inventory for select to authenticated using(is_active_user());
create policy slots_read on pickup_slots for select to authenticated using(is_active_user());
create policy slots_admin on pickup_slots for all to authenticated using(is_admin()) with check(is_admin());
create policy orders_read on orders for select to authenticated using(is_active_user() and (customer_id=auth.uid() or is_admin()));
create policy items_read on order_items for select to authenticated using(exists(select 1 from orders where id=order_id));
create policy history_read on order_status_history for select to authenticated using(exists(select 1 from orders where id=order_id));
create policy payments_read on payments for select to authenticated using(exists(select 1 from orders where id=order_id));
create policy logs_admin on admin_activity_logs for select to authenticated using(is_admin());
create policy settings_read on canteen_settings for select to authenticated using(is_active_user());
create policy settings_admin on canteen_settings for update to authenticated using(is_admin()) with check(is_admin());
revoke all on all tables in schema public from anon,authenticated;
grant usage on schema public to authenticated;
grant select on profiles,user_roles,meal_categories,meals,daily_menus,meal_inventory,pickup_slots,orders,order_items,order_status_history,payments,admin_activity_logs,canteen_settings to authenticated;
grant update(full_name) on profiles to authenticated;
grant insert,update on meals to authenticated;
grant insert,update on pickup_slots to authenticated;
grant update on canteen_settings to authenticated;
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_active_user(),public.is_admin(),public.get_pickup_slots(),public.create_order(jsonb,uuid,uuid),public.transition_order(uuid,public.order_status,text,text,boolean),public.schedule_meal(uuid,date,time,time,integer,integer,boolean),public.set_stock(uuid,integer,integer),public.set_account_suspension(uuid,boolean,text) to authenticated;
commit;
