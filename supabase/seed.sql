-- Idempotent sample catalog. Never creates auth users or public administrator accounts.
-- Schedules 7 days from the database's current Manila date. Run again to add future days.
begin;
insert into public.meal_categories(id,name,icon) values
 ('10000000-0000-4000-8000-000000000001','Rice Meals','rice'),
 ('10000000-0000-4000-8000-000000000002','Breakfast','weather-sunset'),
 ('10000000-0000-4000-8000-000000000003','Lunch','food-variant'),
 ('10000000-0000-4000-8000-000000000004','Snacks','hamburger'),
 ('10000000-0000-4000-8000-000000000005','Beverages','cup-outline'),
 ('10000000-0000-4000-8000-000000000006','Other Meals','noodles') on conflict(id) do nothing;
insert into public.meals(id,name,description,category_id,price,image_url,prep_minutes,featured) values
 ('20000000-0000-4000-8000-000000000001','Chicken Adobo with Rice','Tender chicken slowly simmered in soy sauce, vinegar, garlic and bay leaves, served with fluffy steamed rice.','10000000-0000-4000-8000-000000000001',7500,'https://upload.wikimedia.org/wikipedia/commons/a/ab/Chicken_adobo_meal_20231025.jpg',10,true),
 ('20000000-0000-4000-8000-000000000002','Pork Sisig with Rice','Savory chopped pork with onions, calamansi and a little kick. Served with steamed rice.','10000000-0000-4000-8000-000000000001',9500,'https://upload.wikimedia.org/wikipedia/commons/5/52/Philippine_Sisig.jpg',15,true),
 ('20000000-0000-4000-8000-000000000003','Fried Chicken with Rice','Golden, crispy chicken with house gravy and a warm serving of steamed rice.','10000000-0000-4000-8000-000000000003',8500,'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=85',12,true),
 ('20000000-0000-4000-8000-000000000004','Pancit Canton','Stir-fried egg noodles tossed with colorful vegetables and a savory house sauce, finished with calamansi.','10000000-0000-4000-8000-000000000006',5000,'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?auto=format&fit=crop&w=900&q=85',8,false),
 ('20000000-0000-4000-8000-000000000005','Classic Campus Burger','A juicy beef patty, crisp lettuce, tomato and our signature sauce in a toasted sesame bun.','10000000-0000-4000-8000-000000000004',4500,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',8,true),
 ('20000000-0000-4000-8000-000000000006','French Fries','Crisp golden potato fries, lightly salted and served with tomato ketchup.','10000000-0000-4000-8000-000000000004',4000,'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',5,false),
 ('20000000-0000-4000-8000-000000000007','House Iced Tea','Freshly brewed tea with a refreshing citrus finish. Served chilled over ice in a 16 oz cup.','10000000-0000-4000-8000-000000000005',2500,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85',2,false),
 ('20000000-0000-4000-8000-000000000008','Bottled Water','A chilled 500 ml bottle of purified drinking water.','10000000-0000-4000-8000-000000000005',2000,'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85',1,false)
on conflict(id) do nothing;
insert into public.daily_menus(meal_id,service_date,available_from,available_until)
select m.id,((now() at time zone 'Asia/Manila')::date+d),'07:00','20:00' from public.meals m cross join generate_series(0,6) d where m.is_active
on conflict(meal_id,service_date) do nothing;
insert into public.meal_inventory(daily_menu_id,quantity,low_stock_threshold)
select id,case when meal_id='20000000-0000-4000-8000-000000000006' then 7 else 30 end,8 from public.daily_menus
on conflict(daily_menu_id) do nothing;
insert into public.pickup_slots(starts_at,ends_at,capacity)
select (((now() at time zone 'Asia/Manila')::date+d)+time '07:00'+n*interval '30 minutes') at time zone 'Asia/Manila',
       (((now() at time zone 'Asia/Manila')::date+d)+time '07:00'+(n+1)*interval '30 minutes') at time zone 'Asia/Manila',20
from generate_series(0,6) d cross join generate_series(0,25) n
on conflict(starts_at) do nothing;
commit;
