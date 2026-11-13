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
export function dayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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
export function slotFits(menu: DailyMenu, slot: Slot, prep: number, now = Date.now()) {
  const start = new Date(`${menu.service_date}T${menu.available_from}+08:00`).getTime();
  const end = new Date(`${menu.service_date}T${menu.available_until}+08:00`).getTime();
  const pickup = new Date(slot.starts_at).getTime();
  return (
    menu.is_available &&
    slot.is_active &&
    slot.reserved < slot.capacity &&
    pickup >= start &&
    new Date(slot.ends_at).getTime() <= end &&
    pickup >= now + prep * 60000
  );
}
export function validSlots(data: Snapshot, cart: CartLine[], now = Date.now()) {
  return data.slots.filter(
    (slot) =>
      data.settings.accepting_orders &&
      cart.length > 0 &&
      cart.every((line) => {
        const menu = data.menus.find((m) => m.id === line.daily_menu_id);
        const meal = data.meals.find((m) => m.id === menu?.meal_id);
        return (
          !!menu &&
          !!meal &&
          meal.is_active &&
          line.quantity <= menu.quantity &&
          slotFits(menu, slot, meal.prep_minutes, now) &&
          timeInHours(slot, data.settings.opens_at, data.settings.closes_at)
        );
      }),
  );
}
function timeInHours(slot: Slot, open: string, close: string) {
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
