import type {
  Checkout,
  MealInput,
  Order,
  ScheduleInput,
  SessionUser,
  Settings,
  Snapshot,
  Status,
} from '@/types';
import { assertTransition, dayKey, futureDay, mealSchema, validSlots } from '@/utils/domain';

export const DEMO_CUSTOMER: SessionUser = {
  id: 'demo-student',
  full_name: 'Alex Reyes',
  student_id: '2026-00142',
  email: 'alex@campus.edu.ph',
  role: 'CUSTOMER',
  is_suspended: false,
  created_at: new Date().toISOString(),
};
export const DEMO_ADMIN: SessionUser = {
  id: 'demo-admin',
  full_name: 'Jamie Santos',
  student_id: 'STAFF-001',
  email: 'canteen@campus.edu.ph',
  role: 'ADMIN',
  is_suspended: false,
  created_at: new Date().toISOString(),
};
const photos = {
  adobo: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Chicken_adobo_meal_20231025.jpg',
  sisig: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Philippine_Sisig.jpg',
  chicken:
    'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=85',
  noodles:
    'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?auto=format&fit=crop&w=900&q=85',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
  fries:
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
  tea: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85',
  water:
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85',
};
export function createSeed(): Snapshot {
  const categories = [
    ['rice', 'Rice Meals', 'rice'],
    ['breakfast', 'Breakfast', 'weather-sunset'],
    ['lunch', 'Lunch', 'food-variant'],
    ['snacks', 'Snacks', 'hamburger'],
    ['beverages', 'Beverages', 'cup-outline'],
    ['other', 'Other Meals', 'noodles'],
  ].map(([id, name, icon]) => ({ id, name, icon }));
  const meals = [
    {
      id: 'adobo',
      name: 'Chicken Adobo with Rice',
      description:
        'The campus comfort classic. Tender chicken slowly simmered in soy sauce, vinegar, garlic and bay leaves, served with fluffy steamed rice.',
      category_id: 'rice',
      price: 7500,
      image_url: photos.adobo,
      prep_minutes: 10,
      is_active: true,
      featured: true,
    },
    {
      id: 'sisig',
      name: 'Pork Sisig with Rice',
      description:
        'Sizzling, savory chopped pork with onions, calamansi and a little kick. A generous serving with steamed rice.',
      category_id: 'rice',
      price: 9500,
      image_url: photos.sisig,
      prep_minutes: 15,
      is_active: true,
      featured: true,
    },
    {
      id: 'chicken',
      name: 'Fried Chicken with Rice',
      description:
        'Golden, crispy chicken with our house gravy and a warm serving of steamed rice. Freshly cooked for your break.',
      category_id: 'lunch',
      price: 8500,
      image_url: photos.chicken,
      prep_minutes: 12,
      is_active: true,
      featured: true,
    },
    {
      id: 'noodles',
      name: 'Pancit Canton',
      description:
        'Stir-fried egg noodles tossed with colorful vegetables and a savory house sauce. Finished with calamansi.',
      category_id: 'other',
      price: 5000,
      image_url: photos.noodles,
      prep_minutes: 8,
      is_active: true,
      featured: false,
    },
    {
      id: 'burger',
      name: 'Classic Campus Burger',
      description:
        'A juicy beef patty, crisp lettuce, tomato and our signature sauce in a toasted sesame bun.',
      category_id: 'snacks',
      price: 4500,
      image_url: photos.burger,
      prep_minutes: 8,
      is_active: true,
      featured: true,
    },
    {
      id: 'fries',
      name: 'French Fries',
      description:
        'Crisp golden potato fries, lightly salted and served with tomato ketchup. Your perfect study snack.',
      category_id: 'snacks',
      price: 4000,
      image_url: photos.fries,
      prep_minutes: 5,
      is_active: true,
      featured: false,
    },
    {
      id: 'tea',
      name: 'House Iced Tea',
      description:
        'Freshly brewed tea with a refreshing citrus finish. Served chilled over ice in a 16 oz cup.',
      category_id: 'beverages',
      price: 2500,
      image_url: photos.tea,
      prep_minutes: 2,
      is_active: true,
      featured: false,
    },
    {
      id: 'water',
      name: 'Bottled Water',
      description: 'Stay refreshed with a chilled 500 ml bottle of purified drinking water.',
      category_id: 'beverages',
      price: 2000,
      image_url: photos.water,
      prep_minutes: 1,
      is_active: true,
      featured: false,
    },
  ];
  const menus = Array.from({ length: 7 }, (_, i) =>
    meals.map((m, j) => ({
      id: `${futureDay(i)}-${m.id}`,
      meal_id: m.id,
      service_date: futureDay(i),
      available_from: '07:00:00',
      available_until: '20:00:00',
      is_available: true,
      quantity: [28, 18, 24, 16, 32, 7, 45, 60][j],
      low_stock_threshold: 8,
    })),
  ).flat();
  const slots = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 26 }, (_, i) => {
      const h = 7 + Math.floor(i / 2);
      const minute = i % 2 ? '30' : '00';
      const end = new Date(`${futureDay(d)}T${String(h).padStart(2, '0')}:${minute}:00+08:00`);
      end.setMinutes(end.getMinutes() + 30);
      return {
        id: `${futureDay(d)}-${i}`,
        starts_at: `${futureDay(d)}T${String(h).padStart(2, '0')}:${minute}:00+08:00`,
        ends_at: end.toISOString(),
        capacity: 20,
        reserved: 0,
        is_active: true,
      };
    }),
  ).flat();
  return {
    categories,
    meals,
    menus,
    slots,
    orders: [],
    profiles: [{ ...DEMO_CUSTOMER }, { ...DEMO_ADMIN }],
    popularity: [],
    settings: {
      name: 'Campus Canteen',
      pickup_location: 'Main Canteen · Pickup Counter 1',
      opens_at: '07:00:00',
      closes_at: '20:00:00',
      accepting_orders: true,
    },
  };
}

// Pure transaction engine. The adapter serializes and persists each transaction.
export class DemoEngine {
  constructor(
    public data: Snapshot,
    private newId: () => string = () => globalThis.crypto.randomUUID(),
    private now: () => number = () => Date.now(),
  ) {}
  checkout(input: Checkout, user: SessionUser): Order {
    if (user.role !== 'CUSTOMER' || this.data.profiles.find((p) => p.id === user.id)?.is_suspended)
      throw new Error('An active student account is required.');
    const existing = this.data.orders.find(
      (o) => o.customer_id === user.id && o.idempotency_key === input.idempotency_key,
    );
    if (existing) return existing;
    if (!input.items.length || input.items.length > 30)
      throw new Error('Add between 1 and 30 different meals.');
    if (new Set(input.items.map((i) => i.daily_menu_id)).size !== input.items.length)
      throw new Error('Duplicate meals are not allowed.');
    input.items.forEach((i) => {
      if (!Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 99)
        throw new Error('Quantity must be between 1 and 99.');
    });
    const slot = validSlots(this.data, input.items, this.now()).find((s) => s.id === input.slot_id);
    if (!slot)
      throw new Error(
        'This pickup slot or a selected meal is no longer available. Please refresh your cart.',
      );
    const items = input.items.map((i) => {
      const menu = this.data.menus.find((m) => m.id === i.daily_menu_id)!;
      const meal = this.data.meals.find((m) => m.id === menu.meal_id)!;
      return {
        daily_menu_id: menu.id,
        meal_id: meal.id,
        name: meal.name,
        quantity: i.quantity,
        unit_price: meal.price,
        category_id: meal.category_id,
      };
    });
    const id = this.newId();
    const order: Order = {
      id,
      order_number: `CC-${dayKey(new Date(this.now())).replaceAll('-', '').slice(2)}-${id.slice(0, 5).toUpperCase()}`,
      customer_id: user.id,
      customer_name: this.data.profiles.find((p) => p.id === user.id)?.full_name ?? user.full_name,
      student_id: user.student_id,
      created_at: new Date(this.now()).toISOString(),
      pickup_slot_id: slot.id,
      pickup_at: slot.starts_at,
      pickup_code: this.newId().slice(0, 8).toUpperCase(),
      status: 'Pending',
      payment_collected: false,
      total: items.reduce((n, i) => n + i.unit_price * i.quantity, 0),
      items,
      idempotency_key: input.idempotency_key,
      history: [{ status: 'Pending', created_at: new Date(this.now()).toISOString() }],
    };
    items.forEach((i) => {
      this.data.menus.find((m) => m.id === i.daily_menu_id)!.quantity -= i.quantity;
    });
    this.data.slots.find((s) => s.id === slot.id)!.reserved++;
    this.data.orders.unshift(order);
    return order;
  }
  transition(
    id: string,
    status: Status,
    user: SessionUser,
    code?: string,
    reason?: string,
    collect = false,
  ) {
    const o = this.data.orders.find((o) => o.id === id);
    if (!o) throw new Error('Order not found.');
    if (
      user.role !== 'ADMIN' &&
      !(user.id === o.customer_id && o.status === 'Pending' && status === 'Cancelled')
    )
      throw new Error('Administrator access is required.');
    assertTransition(o.status, status);
    if (status === 'Cancelled' && !reason?.trim())
      throw new Error('Please provide a cancellation reason.');
    if (status === 'Completed' && (code?.trim().toUpperCase() !== o.pickup_code || !collect))
      throw new Error('Verify the pickup code and confirm cash collection.');
    if (status === 'Cancelled') {
      o.items.forEach((i) => {
        const menu = this.data.menus.find((m) => m.id === i.daily_menu_id);
        if (menu) menu.quantity += i.quantity;
      });
      this.data.slots.find((s) => s.id === o.pickup_slot_id)!.reserved--;
      o.cancellation_reason = reason;
    }
    o.status = status;
    if (status === 'Completed') {
      o.payment_collected = true;
      o.collected_at = new Date(this.now()).toISOString();
    }
    o.history.push({ status, created_at: new Date(this.now()).toISOString(), reason });
    return o;
  }
  admin(user: SessionUser) {
    if (user.role !== 'ADMIN') throw new Error('Administrator access is required.');
  }
  saveMeal(input: MealInput, user: SessionUser) {
    this.admin(user);
    const clean = mealSchema.parse(input);
    const id = input.id ?? this.newId();
    const index = this.data.meals.findIndex((m) => m.id === id);
    if (index < 0) this.data.meals.push({ ...clean, id });
    else this.data.meals[index] = { ...clean, id };
    return id;
  }
  schedule(input: ScheduleInput, user: SessionUser) {
    this.admin(user);
    if (
      input.service_date < dayKey(new Date(this.now())) ||
      input.available_from >= input.available_until ||
      !Number.isInteger(input.quantity) ||
      input.quantity < 0 ||
      input.quantity > 10000 ||
      !Number.isInteger(input.low_stock_threshold) ||
      input.low_stock_threshold < 0
    )
      throw new Error('Check the date, availability period and quantities.');
    const existing = this.data.menus.find(
      (m) => m.meal_id === input.meal_id && m.service_date === input.service_date,
    );
    const item = { ...input, id: existing?.id ?? this.newId() };
    if (existing) Object.assign(existing, item);
    else this.data.menus.push(item);
  }
  stock(id: string, quantity: number, threshold: number, user: SessionUser) {
    this.admin(user);
    if (![quantity, threshold].every((v) => Number.isInteger(v) && v >= 0 && v <= 10000))
      throw new Error('Enter whole quantities from 0 to 10,000.');
    const menu = this.data.menus.find((m) => m.id === id);
    if (!menu) throw new Error('Menu not found.');
    menu.quantity = quantity;
    menu.low_stock_threshold = threshold;
  }
  settings(value: Settings, user: SessionUser) {
    this.admin(user);
    if (value.opens_at >= value.closes_at || !value.pickup_location.trim() || !value.name.trim())
      throw new Error('Check the canteen name, location and opening hours.');
    this.data.settings = value;
  }
}
