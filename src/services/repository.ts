import type {
  Checkout,
  DailyMenu,
  MealInput,
  Order,
  Profile,
  ScheduleInput,
  SessionUser,
  Settings,
  Slot,
  Snapshot,
  Status,
} from '@/types';
import { supabase } from './supabase';
import { dayKey, mealSchema } from '@/utils/domain';

type OrderRow = Omit<Order, 'items' | 'history' | 'payment_collected' | 'collected_at'> & {
  order_items: Order['items'];
  order_status_history: Order['history'];
  // payments.order_id is unique, so this nested relation is one nullable object.
  payments: { collected_at: string } | null;
};

const db = () => {
  if (!supabase) throw new Error('Sign-in is currently unavailable. Please contact the canteen.');
  return supabase;
};
function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
function signedIn(user: SessionUser) {
  if (!user.id || user.is_suspended) throw new Error('An active account is required.');
}
function administrator(user: SessionUser) {
  signedIn(user);
  if (user.role !== 'ADMIN') throw new Error('Administrator access is required.');
}
// Database grants/RLS and RPCs enforce every permission independently of these UI checks.
async function allRows(table: string, select = '*', key = 'id'): Promise<any[]> {
  const rows: any[] = [];
  for (let start = 0; ; start += 500) {
    const batch = checked(
      await db()
        .from(table)
        .select(select)
        .order(key)
        .range(start, start + 499),
    ) as any[];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
export async function loadSnapshot(user: SessionUser): Promise<Snapshot> {
  signedIn(user);
  const [categories, meals, menus, inventory, slots, orders, profiles, settings, popularity] =
    await Promise.all([
      allRows('meal_categories'),
      allRows('meals'),
      allRows('daily_menus'),
      allRows('meal_inventory', '*', 'daily_menu_id'),
      db().rpc('get_pickup_slots').then(checked),
      allRows('orders', '*,order_items(*),order_status_history(*),payments(*)'),
      user.role === 'ADMIN' ? db().rpc('list_students').then(checked) : allRows('profiles'),
      db().from('canteen_settings').select('*').single().then(checked),
      db().rpc('get_meal_popularity').then(checked),
    ]);
  return {
    categories,
    meals,
    popularity: popularity as Snapshot['popularity'],
    menus: menus.map((m) => ({
      ...m,
      ...inventory.find((i) => i.daily_menu_id === m.id),
    })) as DailyMenu[],
    slots: slots as Slot[],
    profiles: profiles as Profile[],
    settings: settings as Settings,
    orders: orders.map((o: OrderRow) => ({
      ...o,
      items: o.order_items,
      history: o.order_status_history.sort((a, b) => a.created_at.localeCompare(b.created_at)),
      payment_collected: Boolean(o.payments),
      collected_at: o.payments?.collected_at,
    })) as Order[],
  };
}
export function subscribeChanges(user: SessionUser, callback: () => void) {
  let channel = db().channel(`canteen-${user.id}`);
  for (const table of [
    'orders',
    'meals',
    'daily_menus',
    'meal_inventory',
    'pickup_slots',
    'canteen_settings',
    'profiles',
  ])
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, callback);
  channel.subscribe();
  return () => {
    void db().removeChannel(channel);
  };
}
export async function placeOrder(input: Checkout, user: SessionUser) {
  signedIn(user);
  return checked(
    await db().rpc('create_order', {
      p_items: input.items,
      p_slot_id: input.slot_id,
      p_idempotency_key: input.idempotency_key,
    }),
  ) as string;
}
export async function transitionOrder(
  id: string,
  status: Status,
  user: SessionUser,
  code?: string,
  reason?: string,
  collect = false,
) {
  signedIn(user);
  return checked(
    await db().rpc('transition_order', {
      p_order_id: id,
      p_status: status,
      p_pickup_code: code ?? null,
      p_reason: reason ?? null,
      p_collect_cash: collect,
    }),
  );
}
export async function saveMeal(input: MealInput, user: SessionUser) {
  administrator(user);
  const clean = mealSchema.parse(input);
  const request = input.id
    ? db().from('meals').update(clean).eq('id', input.id)
    : db().from('meals').insert(clean);
  return checked(await request.select('id').single())!.id as string;
}
export async function scheduleMeal(
  input: ScheduleInput,
  user: SessionUser,
  expectedQuantity?: number,
) {
  administrator(user);
  return checked(
    await db().rpc('schedule_meal', {
      p_meal_id: input.meal_id,
      p_service_date: input.service_date,
      p_available_from: input.available_from,
      p_available_until: input.available_until,
      p_quantity: input.quantity,
      p_threshold: input.low_stock_threshold,
      p_available: input.is_available,
      p_expected_quantity: expectedQuantity ?? null,
    }),
  );
}
export async function setStock(
  id: string,
  quantity: number,
  threshold: number,
  user: SessionUser,
  expectedQuantity: number,
) {
  administrator(user);
  return checked(
    await db().rpc('set_stock', {
      p_menu_id: id,
      p_quantity: quantity,
      p_threshold: threshold,
      p_expected_quantity: expectedQuantity,
    }),
  );
}
export async function saveSettings(value: Settings, user: SessionUser) {
  administrator(user);
  return checked(await db().from('canteen_settings').update(value).eq('id', true));
}
export async function saveSlot(
  input: Omit<Slot, 'id' | 'reserved'> & { id?: string },
  user: SessionUser,
) {
  administrator(user);
  if (
    !Number.isFinite(new Date(input.starts_at).getTime()) ||
    !Number.isFinite(new Date(input.ends_at).getTime()) ||
    new Date(input.starts_at).getTime() <= Date.now() ||
    new Date(input.ends_at) <= new Date(input.starts_at) ||
    !Number.isInteger(input.capacity) ||
    input.capacity < 1 ||
    input.capacity > 500 ||
    dayKey(new Date(input.starts_at)) !== dayKey(new Date(input.ends_at))
  )
    throw new Error('Check the future date, times and capacity (1–500).');
  const { id, ...values } = input;
  return checked(
    await (id
      ? db().from('pickup_slots').update(values).eq('id', id)
      : db().from('pickup_slots').insert(values)),
  );
}
export async function suspendStudent(
  id: string,
  suspended: boolean,
  reason: string,
  user: SessionUser,
) {
  administrator(user);
  return checked(
    await db().rpc('set_account_suspension', {
      p_user_id: id,
      p_suspended: suspended,
      p_reason: reason,
    }),
  );
}
export async function updateProfile(name: string, user: SessionUser) {
  signedIn(user);
  if (name.trim().length < 2 || name.trim().length > 100)
    throw new Error('Enter a name between 2 and 100 characters.');
  return checked(await db().from('profiles').update({ full_name: name.trim() }).eq('id', user.id));
}
export const currentMenus = (data: Snapshot, date = dayKey()) =>
  data.menus.filter((m) => m.service_date === date);
