alter table public.meals add column if not exists ingredients text[];
notify pgrst, 'reload schema';
