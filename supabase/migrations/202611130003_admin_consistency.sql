begin;
-- Reservations may be restored after an administrator has replenished stock.
alter table public.meal_inventory drop constraint meal_inventory_quantity_check;
alter table public.meal_inventory add constraint meal_inventory_quantity_check check(quantity >= 0);

-- A counted stock edit must not overwrite an order that was placed while the editor was open.
drop function public.set_stock(uuid,integer,integer);
create function public.set_stock(p_menu_id uuid,p_quantity integer,p_threshold integer,p_expected_quantity integer) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 if p_quantity is null or p_quantity not between 0 and 10000 or p_threshold is null or p_threshold not between 0 and 10000 then raise exception 'Enter stock and threshold between 0 and 10000'; end if;
 update meal_inventory set quantity=p_quantity,low_stock_threshold=p_threshold,updated_at=now() where daily_menu_id=p_menu_id and quantity=p_expected_quantity;
 if not found then raise exception 'Stock changed while you were editing. Refresh and try again'; end if;
 insert into admin_activity_logs(admin_id,action,entity_id,details) values(auth.uid(),'set_stock',p_menu_id::text,jsonb_build_object('from',p_expected_quantity,'to',p_quantity));
end $$;
drop function public.schedule_meal(uuid,date,time,time,integer,integer,boolean);
create function public.schedule_meal(p_meal_id uuid,p_service_date date,p_available_from time,p_available_until time,p_quantity integer,p_threshold integer,p_available boolean,p_expected_quantity integer default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_stock integer;
begin
 if not is_admin() then raise exception 'Administrator access is required'; end if;
 if p_service_date < (now() at time zone 'Asia/Manila')::date or p_quantity is null or p_quantity not between 0 and 10000 or p_threshold is null or p_threshold not between 0 and 10000 then raise exception 'Check the service date, stock and threshold'; end if;
 select d.id,i.quantity into v_id,v_stock from daily_menus d join meal_inventory i on i.daily_menu_id=d.id where d.meal_id=p_meal_id and d.service_date=p_service_date for update of d,i;
 if found then
  if p_expected_quantity is null or v_stock<>p_expected_quantity then raise exception 'Stock changed while you were editing. Refresh and try again'; end if;
  update daily_menus set available_from=p_available_from,available_until=p_available_until,is_available=p_available where id=v_id;
  update meal_inventory set quantity=p_quantity,low_stock_threshold=p_threshold,updated_at=now() where daily_menu_id=v_id;
 else
  insert into daily_menus(meal_id,service_date,available_from,available_until,is_available) values(p_meal_id,p_service_date,p_available_from,p_available_until,p_available) returning id into v_id;
  insert into meal_inventory(daily_menu_id,quantity,low_stock_threshold) values(v_id,p_quantity,p_threshold);
 end if;
 insert into admin_activity_logs(admin_id,action,entity_id) values(auth.uid(),'schedule_meal',v_id::text); return v_id;
end $$;
create function public.protect_booked_slot() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_count integer;
begin
 select count(*) into v_count from orders where pickup_slot_id=old.id and status<>'Cancelled';
 if v_count>0 and (old.starts_at<>new.starts_at or old.ends_at<>new.ends_at) then raise exception 'Booked pickup times cannot be changed. Close this slot and create a new one'; end if;
 if new.capacity<v_count then raise exception 'Capacity cannot be below existing reservations'; end if;
 return new;
end $$;
create trigger protect_booked_times before update on public.pickup_slots for each row execute function public.protect_booked_slot();
create function public.audit_admin_change() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null and is_admin() then insert into admin_activity_logs(admin_id,action,entity_id) values(auth.uid(),TG_TABLE_NAME||'_'||lower(TG_OP),to_jsonb(new)->>'id'); end if;
 return new;
end $$;
create trigger audit_meal after insert or update on public.meals for each row execute function public.audit_admin_change();
create trigger audit_settings after update on public.canteen_settings for each row execute function public.audit_admin_change();
create trigger audit_slots after insert or update on public.pickup_slots for each row execute function public.audit_admin_change();
revoke all on function public.set_stock(uuid,integer,integer,integer),public.schedule_meal(uuid,date,time,time,integer,integer,boolean,integer),public.protect_booked_slot(),public.audit_admin_change() from public,anon,authenticated;
grant execute on function public.set_stock(uuid,integer,integer,integer),public.schedule_meal(uuid,date,time,time,integer,integer,boolean,integer) to authenticated;
commit;
