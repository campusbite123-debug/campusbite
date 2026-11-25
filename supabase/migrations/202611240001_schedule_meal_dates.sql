begin;

create function public.schedule_meal_dates(
  p_meal_id uuid, p_dates jsonb, p_available_from time, p_available_until time,
  p_quantity integer, p_available boolean
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  day_record record;
  previous_date date;
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if jsonb_typeof(p_dates) is distinct from 'array' then raise exception 'Select at least one service date'; end if;
  if jsonb_array_length(p_dates) = 0 then raise exception 'Select at least one service date'; end if;

  -- Lock overlapping schedules in the same order. An error rolls back every day.
  for day_record in
    select * from jsonb_to_recordset(p_dates)
      as d(service_date date, expected_quantity integer, low_stock_threshold integer)
    order by service_date
  loop
    if day_record.service_date is null or day_record.service_date = previous_date then
      raise exception 'Select distinct service dates';
    end if;
    perform public.schedule_meal(
      p_meal_id, day_record.service_date, p_available_from, p_available_until,
      p_quantity, day_record.low_stock_threshold, p_available, day_record.expected_quantity
    );
    previous_date := day_record.service_date;
  end loop;
end;
$$;

revoke all on function public.schedule_meal_dates(uuid,jsonb,time,time,integer,boolean) from public, anon;
grant execute on function public.schedule_meal_dates(uuid,jsonb,time,time,integer,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
