import { z } from 'zod';
import type { CartLine, DailyMenu, Meal, Order, Slot, Snapshot, Status } from '@/types';

export const TIMEZONE = 'Asia/Manila';
export const money = (centavos: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(centavos / 100);
const serviceDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export function dayKey(date: Date = new Date()): string {
  return serviceDayFormat.format(date);
}
export function futureDay(offset: number) {
  const date = new Date(`${dayKey()}T12:00:00+08:00`);
  date.setDate(date.getDate() + offset);
  return dayKey(date);
}
export const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(value.length === 10 ? `${value}T12:00:00+08:00` : value));
export const time = (value: string) =>
  formatDate(value, { hour: 'numeric', minute: '2-digit', month: undefined, day: undefined });
export const clockTime = (value: string) => time(`2000-01-01T${value}+08:00`);
export const todayLabel = () =>
  formatDate(new Date().toISOString(), { weekday: 'long', month: 'long', day: 'numeric' });
export const statuses: Status[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready for Pickup',
  'Completed',
];
export const transitions: Record<Status, Status[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};
export function assertTransition(from: Status, to: Status) {
  if (!transitions[from].includes(to))
    throw new Error(`An order cannot move from ${from} to ${to}.`);
}
export const isActive = (order: Order) => !['Completed', 'Cancelled'].includes(order.status);
export const collectedRevenue = (orders: Order[]) =>
  orders
    .filter((o) => o.status === 'Completed' && o.payment_collected)
    .reduce((n, o) => n + o.total, 0);
export function cartTotal(cart: CartLine[], data: Snapshot) {
  return cart.reduce((total, line) => {
    const menu = data.menus.find((m) => m.id === line.daily_menu_id);
    const meal = data.meals.find((m) => m.id === menu?.meal_id);
    return total + (meal?.price ?? 0) * line.quantity;
  }, 0);
}
export function mealFor(menu: DailyMenu, data: Snapshot): Meal {
  const meal = data.meals.find((m) => m.id === menu.meal_id);
  if (!meal) throw new Error('This meal is no longer on the menu.');
  return meal;
}
export function upcomingSlotsOnDay(slots: Slot[], date: string, now = Date.now()) {
  const midnight = Date.parse(`${date}T00:00:00+08:00`);
  return slots.filter((slot) => {
    const start = Date.parse(slot.starts_at);
    return (
      Date.parse(slot.ends_at) > now && start >= midnight && start < midnight + 24 * 60 * 60 * 1000
    );
  });
}

// Older databases accept only future, stored pickup times. Fill the next seven
// service dates around existing slots, including closed slots and reservations.
export function missingPickupSlots(
  settings: Pick<Snapshot['settings'], 'opens_at' | 'closes_at'>,
  existing: Pick<Slot, 'starts_at' | 'ends_at'>[],
  now: number,
) {
  const today = dayKey(new Date(now));
  const firstOpen = Date.parse(`${today}T${settings.opens_at}+08:00`);
  const firstClose = Date.parse(`${today}T${settings.closes_at}+08:00`);
  const occupied = existing
    .map((slot) => ({
      start: Date.parse(slot.starts_at),
      end: Date.parse(slot.ends_at),
    }))
    .sort((a, b) => a.start - b.start);
  const halfHour = 30 * 60_000;
  const missing: { starts_at: string; ends_at: string }[] = [];
  for (let day = 0; day < 7; day++) {
    const offset = day * 86_400_000;
    const close = firstClose + offset;
    let start = firstOpen + offset;
    while (start < close) {
      const covering = occupied.find((slot) => slot.start <= start && start < slot.end);
      if (covering) {
        start = covering.end;
        continue;
      }
      const next = occupied.find((slot) => slot.start > start);
      const end = Math.min(
        (Math.floor(start / halfHour) + 1) * halfHour,
        close,
        next?.start ?? close,
      );
      if (start > now)
        missing.push({
          starts_at: new Date(start).toISOString(),
          ends_at: new Date(end).toISOString(),
        });
      start = end;
    }
  }
  return missing;
}
export function bookablePickup(
  menu: Pick<DailyMenu, 'service_date' | 'available_from' | 'available_until' | 'is_available'>,
  slot: Slot,
  prep: number,
  settings: Snapshot['settings'],
  now = Date.now(),
) {
  const start = new Date(`${menu.service_date}T${menu.available_from}+08:00`).getTime();
  const end = new Date(`${menu.service_date}T${menu.available_until}+08:00`).getTime();
  const pickup = new Date(slot.starts_at).getTime();
  return (
    menu.is_available &&
    slot.is_active &&
    slot.reserved < slot.capacity &&
    pickup >= start &&
    new Date(slot.ends_at).getTime() <= end &&
    now + prep * 60000 <= (slot.pickup_at_start ? pickup : Date.parse(slot.ends_at)) &&
    timeInHours(slot, settings.opens_at, settings.closes_at)
  );
}
export function validSlots(data: Snapshot, cart: CartLine[], now = Date.now()) {
  if (!data.settings.accepting_orders || !cart.length) return [];
  const services: DailyMenu[] = [];
  let prep = 0;
  for (const line of cart) {
    const menu = data.menus.find((m) => m.id === line.daily_menu_id);
    const meal = data.meals.find((m) => m.id === menu?.meal_id);
    if (!menu || !meal?.is_active || line.quantity > menu.quantity) return [];
    services.push(menu);
    prep = Math.max(prep, meal.prep_minutes);
  }
  const readyAt = now + prep * 60000;
  return data.slots
    .filter((slot) =>
      services.every((menu) => bookablePickup(menu, slot, prep, data.settings, now)),
    )
    .map((slot) => ({
      ...slot,
      pickup_at: new Date(Math.max(Date.parse(slot.starts_at), readyAt)).toISOString(),
    }))
    .sort(
      (a, b) =>
        a.pickup_at.localeCompare(b.pickup_at) || Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
}
export function timeInHours(slot: Slot, open: string, close: string) {
  const d = dayKey(new Date(slot.starts_at));
  return (
    new Date(slot.starts_at) >= new Date(`${d}T${open}+08:00`) &&
    new Date(slot.ends_at) <= new Date(`${d}T${close}+08:00`)
  );
}
export const registrationSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your full name.').max(100),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.').max(128),
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });
export const mealSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(1000),
  ingredients: z.array(z.string().trim().min(1).max(100)).max(60).nullable().optional(),
  category_id: z.string().min(1),
  price: z.number().int().min(1).max(1000000),
  prep_minutes: z.number().int().min(1).max(120),
  image_url: z
    .string()
    .url()
    .refine(
      (v) => v.startsWith('https://') || v.startsWith('data:image/'),
      'Use an HTTPS image URL.',
    ),
  is_active: z.boolean(),
  featured: z.boolean(),
});
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : 'Something went wrong. Please try again.';
}
export const csv = (orders: Order[]) =>
  [
    ['Order', 'Student', 'Created', 'Pickup', 'Status', 'Total PHP', 'Collected PHP'],
    ...orders.map((o) => [
      o.order_number,
      o.customer_name,
      o.created_at,
      o.pickup_at,
      o.status,
      (o.total / 100).toFixed(2),
      o.payment_collected ? (o.total / 100).toFixed(2) : '0.00',
    ]),
  ]
    .map((row) =>
      row
        .map((value) => {
          const safe = String(value).replace(/^[=+@\-\t\r]/, "'$&");
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\r\n');
