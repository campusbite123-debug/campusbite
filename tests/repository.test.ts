import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSnapshot, scheduleMealDates } from '@/services/repository';
import { collectedRevenue } from '@/utils/domain';
import { DEMO_ADMIN, DEMO_CUSTOMER } from './fixtures/demo-engine';

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/services/supabase', () => ({ supabase: api }));

let orders: Record<string, unknown>[];
beforeEach(() => {
  orders = [];
  api.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
      gt: () => query,
      limit: async () => ({ data: [{ schedule_start: null }], error: null }),
      order: () => query,
      range: async () => ({ data: table === 'orders' ? orders : [], error: null }),
      single: async () => ({ data: {}, error: null }),
    };
    return query;
  });
  api.rpc.mockResolvedValue({ data: [], error: null });
});

function order(payment: { collected_at: string } | null) {
  return {
    id: 'order-1',
    status: payment ? 'Completed' : 'Pending',
    total: 7500,
    order_items: [{ name: 'Chicken Adobo with Rice', quantity: 1, unit_price: 7500 }],
    order_status_history: [{ status: 'Pending', created_at: '2026-11-13T01:00:00Z' }],
    // payments.order_id is unique: PostgREST returns a nullable object, not an array.
    payments: payment,
  };
}

describe('Supabase order responses', () => {
  it('loads an unpaid order when its payment relation is null', async () => {
    orders = [order(null)];
    const snapshot = await loadSnapshot(DEMO_CUSTOMER);
    expect(snapshot.orders[0]).toMatchObject({
      id: 'order-1',
      payment_collected: false,
      collected_at: undefined,
      items: orders[0].order_items,
      history: orders[0].order_status_history,
    });
    expect(collectedRevenue(snapshot.orders)).toBe(0);
  });

  it('recognizes a payment object and includes its order in collected revenue', async () => {
    const collectedAt = '2026-11-13T02:00:00Z';
    orders = [order({ collected_at: collectedAt })];
    const snapshot = await loadSnapshot(DEMO_CUSTOMER);
    expect(snapshot.orders[0]).toMatchObject({
      payment_collected: true,
      collected_at: collectedAt,
    });
    expect(collectedRevenue(snapshot.orders)).toBe(7500);
  });
});

describe('menu schedule saves', () => {
  const plan = {
    meal_id: 'meal-1',
    available_from: '07:00:00',
    available_until: '20:00:00',
    quantity: 30,
    is_available: true,
    dates: [
      { service_date: '2026-11-25', expected_quantity: 22, low_stock_threshold: 5 },
      { service_date: '2026-11-26', expected_quantity: null, low_stock_threshold: 8 },
    ],
  };

  it('uses each date’s original stock and threshold when the batch function is missing', async () => {
    api.rpc.mockClear().mockResolvedValueOnce({ error: { code: 'PGRST202' } });
    await scheduleMealDates(plan, DEMO_ADMIN);
    expect(api.rpc.mock.calls.slice(1)).toEqual(
      plan.dates.map((day) => [
        'schedule_meal',
        {
          p_meal_id: plan.meal_id,
          p_available_from: plan.available_from,
          p_available_until: plan.available_until,
          p_quantity: 30,
          p_available: true,
          p_service_date: day.service_date,
          p_expected_quantity: day.expected_quantity,
          p_threshold: day.low_stock_threshold,
        },
      ]),
    );
  });

  it.each(['P0001', '42501', ''])(
    'never replays a failed batch for error code %j',
    async (code) => {
      api.rpc.mockClear().mockResolvedValueOnce({ error: { code, message: 'Save failed' } });
      await expect(scheduleMealDates(plan, DEMO_ADMIN)).rejects.toThrow('Save failed');
      expect(api.rpc).toHaveBeenCalledTimes(1);
    },
  );
});
