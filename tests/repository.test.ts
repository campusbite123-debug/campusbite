import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSnapshot } from '@/services/repository';
import { collectedRevenue } from '@/utils/domain';
import { DEMO_CUSTOMER } from './fixtures/demo-engine';

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/services/supabase', () => ({ supabase: api }));

let orders: Record<string, unknown>[];
beforeEach(() => {
  orders = [];
  api.from.mockImplementation((table: string) => {
    const query = {
      select: () => query,
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
