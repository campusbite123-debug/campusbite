begin;
-- Public-to-customers aggregate quantities, without exposing another student's orders.
create function public.get_meal_popularity() returns table(meal_id uuid,quantity bigint)
language sql stable security definer set search_path=public,pg_temp as $$
 select i.meal_id,sum(i.quantity) from order_items i join orders o on o.id=i.order_id
 where is_active_user() and o.status<>'Cancelled' and o.created_at>=now()-interval '30 days'
 group by i.meal_id order by sum(i.quantity) desc
$$;
revoke all on function public.get_meal_popularity() from public,anon,authenticated;
grant execute on function public.get_meal_popularity() to authenticated;
commit;
