begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('meal-images','meal-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy meal_photos_read on storage.objects for select to public using(bucket_id='meal-images');
create policy meal_photos_insert on storage.objects for insert to authenticated with check(bucket_id='meal-images' and public.is_admin());
create policy meal_photos_update on storage.objects for update to authenticated using(bucket_id='meal-images' and public.is_admin()) with check(bucket_id='meal-images' and public.is_admin());
create policy meal_photos_delete on storage.objects for delete to authenticated using(bucket_id='meal-images' and public.is_admin());
-- RLS applies to Realtime subscribers, including order ownership restrictions.
alter publication supabase_realtime add table public.orders,public.meals,public.daily_menus,public.meal_inventory,public.pickup_slots,public.canteen_settings,public.profiles;
commit;
