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
import { dayKey, errorMessage, mealSchema, missingPickupSlots, timeInHours } from '@/utils/domain';

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
async function scheduledSlots(user: SessionUser, settings: Settings, slots: Slot[]) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  // The automatic scheduler adds schedule_start to stored rows. Read a sample
  // after the RPC has run so a freshly migrated database has generated its rows.
  const sample = checked(
    await db().from('pickup_slots').select('*').gt('ends_at', nowIso).order('starts_at').limit(1),
  )?.[0];
  if (sample && 'schedule_start' in sample) return slots;

  if (user.role === 'ADMIN') {
    // Legacy checkout requires the stored times to fit the current hours. Trim
    // unbooked edge slots after an hours change, keeping their capacity and ID.
    for (const slot of slots) {
      if (slot.reserved || timeInHours(slot, settings.opens_at, settings.closes_at)) continue;
      const day = dayKey(new Date(slot.starts_at));
      const start = Math.max(
        Date.parse(slot.starts_at),
        Date.parse(`${day}T${settings.opens_at}+08:00`),
      );
      const end = Math.min(
        Date.parse(slot.ends_at),
        Date.parse(`${day}T${settings.closes_at}+08:00`),
      );
      if (start >= end || start <= now) continue;
      if (slots.some((other) => other.id !== slot.id && Date.parse(other.starts_at) === start))
        continue;
      const times = {
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
      };
      const change = await db()
        .from('pickup_slots')
        .update(times)
        .eq('id', slot.id)
        .eq('starts_at', slot.starts_at)
        .eq('ends_at', slot.ends_at)
        .select('id')
        .maybeSingle();
      // Another slot can already own the new start, or an order can reserve
      // this slot after the read. In either case the database row takes priority.
      if (
        change.error?.code === '23505' ||
        change.error?.message.startsWith('Booked pickup times cannot be changed')
      )
        continue;
      if (checked(change)) Object.assign(slot, times);
    }
    // The legacy RPC omits slots already in progress, even if they extend into
    // the next half-hour. Include those rows when checking for overlaps.
    const ongoing =
      sample && Date.parse(sample.starts_at) <= now
        ? checked(
            await db()
              .from('pickup_slots')
              .select('starts_at,ends_at')
              .lte('starts_at', nowIso)
              .gt('ends_at', nowIso),
          )
        : [];
    const missing = missingPickupSlots(settings, [...slots, ...(ongoing ?? [])], now);
    if (missing.length) {
      checked(
        await db().from('pickup_slots').upsert(missing, {
          onConflict: 'starts_at',
          ignoreDuplicates: true,
        }),
      );
      slots = checked(await db().rpc('get_pickup_slots')) as Slot[];
    }
  }
  return slots
    .filter((slot) => timeInHours(slot, settings.opens_at, settings.closes_at))
    .map((slot) => ({ ...slot, pickup_at_start: true }));
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
    slots: await scheduledSlots(user, settings as Settings, slots as Slot[]),
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
export async function scheduleMealDates(
  input: Pick<
    ScheduleInput,
    'meal_id' | 'available_from' | 'available_until' | 'quantity' | 'is_available'
  > & {
    dates: {
      service_date: string;
      expected_quantity: number | null;
      low_stock_threshold: number;
    }[];
  },
  user: SessionUser,
  onPartialSave?: (savedDates: string[]) => void,
) {
  administrator(user);
  const common = {
    p_meal_id: input.meal_id,
    p_available_from: input.available_from,
    p_available_until: input.available_until,
    p_quantity: input.quantity,
    p_available: input.is_available,
  };
  if (!input.dates.length) throw new Error('Select at least one service date.');
  if (input.dates.length > 1) {
    const batch = await db().rpc('schedule_meal_dates', { ...common, p_dates: input.dates });
    // A missing RPC is rejected before execution. Other failures must never replay the batch.
    if (batch.error?.code !== 'PGRST202') {
      checked(batch);
      return;
    }
  }
  const savedDates: string[] = [];
  for (const day of input.dates) {
    try {
      checked(
        await db().rpc('schedule_meal', {
          ...common,
          p_service_date: day.service_date,
          p_expected_quantity: day.expected_quantity,
          p_threshold: day.low_stock_threshold,
        }),
      );
    } catch (error) {
      if (!savedDates.length) throw error;
      onPartialSave?.(savedDates);
      throw new Error(
        `Saved ${savedDates.length} of ${input.dates.length} dates. Check ${day.service_date}. ${errorMessage(error)}`,
      );
    }
    savedDates.push(day.service_date);
  }
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
export async function saveSlot(slot: Slot, capacity: number, active: boolean, user: SessionUser) {
  administrator(user);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)
    throw new Error('Enter a whole capacity from 1 to 500.');
  return checked(
    await db().from('pickup_slots').update({ capacity, is_active: active }).eq('id', slot.id),
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
