import { describe, expect, it } from 'vitest';
import { orderNotifications } from '@/utils/order-notifications';
import type { History, Order, SessionUser, Status } from '@/types';

const createdAt = '2026-11-26T01:00:00Z';
const student: SessionUser = {
  id: 'student-1',
  role: 'CUSTOMER',
  full_name: 'Alex Reyes',
  student_id: 'internal-reference',
  email: 'student@school.test',
  is_suspended: false,
  created_at: createdAt,
};
const admin: SessionUser = { ...student, id: 'admin', role: 'ADMIN' };

function order(patch: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    order_number: 'CB-0042',
    customer_id: student.id,
    customer_name: student.full_name,
    student_id: student.student_id,
    created_at: createdAt,
    pickup_slot_id: 'slot-1',
    pickup_at: '2026-11-26T03:00:00Z',
    pickup_code: 'PRIVATE-CODE',
    status: 'Pending',
    total: 8500,
    payment_collected: false,
    items: [],
    history: [{ status: 'Pending', created_at: createdAt }],
    idempotency_key: 'request-1',
    ...patch,
  };
}

describe('order notifications', () => {
  it('explicitly scopes student notifications to their own orders', () => {
    const own = order();
    const another = order({ id: 'private-order', customer_id: 'someone-else' });
    expect(orderNotifications([another, own], student).map((event) => event.orderId)).toEqual([
      own.id,
    ]);
  });

  it('keeps event IDs stable across re-fetches and does not mutate the snapshot', () => {
    const orders = [order()];
    const before = structuredClone(orders);
    const first = orderNotifications(orders, student);
    expect(first[0].id).toBe(`order-1:Pending:${createdAt}`);
    expect(orderNotifications(structuredClone(orders), student)).toEqual(first);
    expect(orders).toEqual(before);
  });

  it('lists every status event newest first, including deterministic status ties', () => {
    const statuses: Status[] = [
      'Pending',
      'Confirmed',
      'Preparing',
      'Ready for Pickup',
      'Completed',
    ];
    const history = statuses.map((status) => ({ status, created_at: createdAt }));
    const result = orderNotifications([order({ status: 'Completed', history })], student);
    expect(result.map((event) => event.status)).toEqual([...statuses].reverse());
    expect(
      orderNotifications(
        [order({ status: 'Completed', history: [...history].reverse() })],
        student,
      ),
    ).toEqual(result);
    expect(result.map((event) => event.title)).toEqual([
      'Pickup completed',
      'Ready for pickup',
      'Your meal is being prepared',
      'Order confirmed',
      'Order received',
    ]);
    for (const event of result) {
      expect(event.message).toContain('CB-0042');
      expect(event.message).not.toContain('PRIVATE-CODE');
    }
  });

  it('sorts by actual event time before status rank or input ordering', () => {
    const history: History[] = [
      { status: 'Confirmed', created_at: '2026-11-26T09:01:00+08:00' },
      { status: 'Pending', created_at: '2026-11-26T01:00:00Z' },
    ];
    expect(
      orderNotifications([order({ status: 'Confirmed', history })], student).map(
        (event) => event.status,
      ),
    ).toEqual(['Confirmed', 'Pending']);
  });

  it('shows administrators incoming pre-orders and cancellations across customers', () => {
    const history: History[] = [
      { status: 'Pending', created_at: createdAt },
      { status: 'Confirmed', created_at: createdAt },
      { status: 'Preparing', created_at: createdAt },
      { status: 'Cancelled', created_at: createdAt, reason: 'Kitchen closed early.' },
    ];
    const result = orderNotifications(
      [order({ status: 'Cancelled', customer_id: 'another-customer', history })],
      admin,
    );
    expect(result.map((event) => event.status)).toEqual(['Cancelled', 'Pending']);
    expect(result.map((event) => event.title)).toEqual(['Order cancelled', 'New pre-order']);
    expect(result[1].message).toContain(student.full_name);
    expect(result[0].message).toContain('Kitchen closed early.');
  });

  it('deduplicates history events and repeated order records', () => {
    const placed = { status: 'Pending' as const, created_at: createdAt };
    const value = order({ history: [placed, { ...placed }] });
    expect(orderNotifications([value, structuredClone(value)], student)).toHaveLength(1);
  });

  it('handles empty orders and missing history without changing fallback IDs', () => {
    expect(orderNotifications([], student)).toEqual([]);
    const value = order({ status: 'Ready for Pickup', history: [] });
    const events = orderNotifications([value], student);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: `order-1:Ready for Pickup:${createdAt}`,
      title: 'Ready for pickup',
      createdAt,
    });
    expect(orderNotifications([structuredClone(value)], student)).toEqual(events);
  });

  it('includes current status when an incomplete history omits the last event', () => {
    const confirmedAt = '2026-11-26T01:01:00Z';
    const value = order({
      status: 'Preparing',
      history: [
        { status: 'Pending', created_at: createdAt },
        { status: 'Confirmed', created_at: confirmedAt },
      ],
    });
    const events = orderNotifications([value], student);
    expect(events.map((event) => event.status)).toEqual(['Preparing', 'Confirmed', 'Pending']);
    expect(events[0].createdAt).toBe(confirmedAt);
    expect(value.history).toHaveLength(2);
  });

  it('uses a cancellation event reason before the order reason, trimming whitespace', () => {
    const cancelled = order({
      status: 'Cancelled',
      cancellation_reason: '  Pickup no longer needed.  ',
      history: [{ status: 'Cancelled', created_at: createdAt, reason: '  Meal unavailable.  ' }],
    });
    expect(orderNotifications([cancelled], student)[0].message).toBe(
      'Order CB-0042 was cancelled. Meal unavailable.',
    );
    cancelled.history[0].reason = '   ';
    expect(orderNotifications([cancelled], student)[0].message).toBe(
      'Order CB-0042 was cancelled. Pickup no longer needed.',
    );
  });

  it('caps the feed at the newest 100 distinct events', () => {
    const orders = Array.from({ length: 105 }, (_, index) => {
      const date = new Date(Date.parse(createdAt) + index * 60000).toISOString();
      return order({ id: `order-${index}`, created_at: date, history: [] });
    });
    const result = orderNotifications(orders, student);
    expect(result).toHaveLength(100);
    expect(result[0].orderId).toBe('order-104');
    expect(result.at(-1)?.orderId).toBe('order-5');
  });
});
