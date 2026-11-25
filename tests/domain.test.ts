import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createSeed, DemoEngine, DEMO_ADMIN, DEMO_CUSTOMER } from './fixtures/demo-engine';
import {
  assertTransition,
  cartTotal,
  collectedRevenue,
  csv,
  missingPickupSlots,
  registrationSchema,
  validSlots,
} from '@/utils/domain';
import type { Checkout, Snapshot } from '@/types';
let data: Snapshot;
let engine: DemoEngine;
let checkout: Checkout;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-13T01:00:00Z'));
  data = createSeed();
  engine = new DemoEngine(data);
  checkout = {
    items: [{ daily_menu_id: data.menus[0].id, quantity: 2 }],
    slot_id: validSlots(data, [{ daily_menu_id: data.menus[0].id, quantity: 2 }])[0].id,
    idempotency_key: crypto.randomUUID(),
  };
});
afterEach(() => vi.useRealTimers());
describe('automatic pickup windows', () => {
  it('fills seven Manila dates around existing slots and stops exactly at closing', () => {
    const settings = { opens_at: '07:10:00', closes_at: '08:20:00' };
    const existing = [
      { starts_at: '2026-11-14T07:20:00+08:00', ends_at: '2026-11-14T07:40:00+08:00' },
    ];
    const now = Date.parse('2026-11-13T07:45:00+08:00');
    const missing = missingPickupSlots(settings, existing, now);
    const local = (value: string) => new Date(value + '+08:00').toISOString();
    expect(missing.slice(0, 4)).toEqual(
      [
        ['2026-11-13T08:00', '2026-11-13T08:20'],
        ['2026-11-14T07:10', '2026-11-14T07:20'],
        ['2026-11-14T07:40', '2026-11-14T08:00'],
        ['2026-11-14T08:00', '2026-11-14T08:20'],
      ].map(([start, end]) => ({ starts_at: local(start), ends_at: local(end) })),
    );
    expect(missing.at(-1)?.ends_at).toBe(local('2026-11-19T08:20'));
    expect(missingPickupSlots(settings, [...existing, ...missing], now)).toEqual([]);
  });
});

describe('registration and cart', () => {
  it('registers without a student ID and requires a name, email and matching passwords', () => {
    const valid = {
      full_name: 'Alex Reyes',
      email: 'alex@campus.edu.ph',
      password: 'schooltime123',
      confirm_password: 'schooltime123',
    };
    expect(registrationSchema.safeParse(valid).success).toBe(true);
    expect(registrationSchema.parse({ ...valid, student_id: 'ignored' })).not.toHaveProperty(
      'student_id',
    );
    for (const invalid of [
      { full_name: '' },
      { email: 'bad' },
      { confirm_password: 'other' },
      { password: 'tiny' },
    ])
      expect(registrationSchema.safeParse({ ...valid, ...invalid }).success).toBe(false);
  });
  it('calculates multi-item totals in integer centavos', () => {
    expect(
      cartTotal(
        [
          { daily_menu_id: data.menus[0].id, quantity: 2 },
          { daily_menu_id: data.menus[6].id, quantity: 1 },
        ],
        data,
      ),
    ).toBe(17500);
  });
  it('escapes CSV quotes and spreadsheet formulas', () => {
    const order = engine.checkout(checkout, DEMO_CUSTOMER);
    order.customer_name = '=HYPERLINK("bad")';
    expect(csv([order])).toContain('"\'=HYPERLINK(""bad"")"');
  });
});
describe('order transactions', () => {
  it('keeps the last pickup window available while the whole bag can be ready by closing', () => {
    const at = (time: string) => Date.parse(`2026-11-13T${time}:00+08:00`);
    const last = validSlots(data, checkout.items, at('18:45'));
    expect(last).toHaveLength(1);
    expect(Date.parse(last[0].pickup_at)).toBe(at('18:55'));
    expect(validSlots(data, checkout.items, at('18:51'))).toHaveLength(0);
    expect(validSlots(data, checkout.items, at('19:00'))).toHaveLength(0);
    const beforeOpening = validSlots(data, checkout.items, at('04:00'));
    expect(Date.parse(beforeOpening[0].pickup_at)).toBe(at('05:00'));
  });
  it('deducts stock, reserves a slot and calculates current prices', () => {
    const before = data.menus[0].quantity;
    data.meals[0].price = 8000;
    const order = engine.checkout(checkout, DEMO_CUSTOMER);
    expect(order.total).toBe(16000);
    expect(data.menus[0].quantity).toBe(before - 2);
    expect(data.slots.find((s) => s.id === checkout.slot_id)?.reserved).toBe(1);
  });
  it('returns the same order on repeated checkout without deducting twice', () => {
    const first = engine.checkout(checkout, DEMO_CUSTOMER);
    const remaining = data.menus[0].quantity;
    expect(engine.checkout(checkout, DEMO_CUSTOMER).id).toBe(first.id);
    expect(data.orders).toHaveLength(1);
    expect(data.menus[0].quantity).toBe(remaining);
  });
  it('rejects insufficient stock with no partial mutations', () => {
    const before = structuredClone(data);
    checkout.items[0].quantity = 99;
    expect(() => engine.checkout(checkout, DEMO_CUSTOMER)).toThrow();
    expect(data).toEqual(before);
  });
  it('rejects duplicate meal IDs and fractional or negative quantities', () => {
    for (const quantity of [-1, 0, 1.5, 100]) {
      checkout.items[0].quantity = quantity;
      expect(() => engine.checkout(checkout, DEMO_CUSTOMER)).toThrow();
    }
    checkout.items[0].quantity = 1;
    checkout.items.push({ ...checkout.items[0] });
    expect(() => engine.checkout(checkout, DEMO_CUSTOMER)).toThrow('Duplicate');
  });
  it('checks pickup capacity, preparation, schedule and canteen hours', () => {
    const slot = data.slots.find((s) => s.id === checkout.slot_id)!;
    slot.reserved = slot.capacity;
    expect(validSlots(data, checkout.items).some((s) => s.id === slot.id)).toBe(false);
    slot.reserved = 0;
    data.menus[0].available_until = '08:00:00';
    expect(() => engine.checkout(checkout, DEMO_CUSTOMER)).toThrow();
  });
  it('blocks suspended customers and administrator checkout', () => {
    expect(() => engine.checkout(checkout, DEMO_ADMIN)).toThrow();
    data.profiles[0].is_suspended = true;
    expect(() => engine.checkout(checkout, DEMO_CUSTOMER)).toThrow();
  });
  it('enforces every status transition and administrator access', () => {
    const o = engine.checkout(checkout, DEMO_CUSTOMER);
    expect(() => engine.transition(o.id, 'Preparing', DEMO_ADMIN)).toThrow();
    expect(() => engine.transition(o.id, 'Confirmed', DEMO_CUSTOMER)).toThrow();
    expect(() => assertTransition('Completed', 'Cancelled')).toThrow();
  });
  it('restores inventory once and releases slot on cancellation', () => {
    const before = data.menus[0].quantity;
    const o = engine.checkout(checkout, DEMO_CUSTOMER);
    engine.transition(o.id, 'Cancelled', DEMO_CUSTOMER, undefined, 'Plans changed');
    expect(data.menus[0].quantity).toBe(before);
    expect(data.slots.find((s) => s.id === o.pickup_slot_id)?.reserved).toBe(0);
    expect(() => engine.transition(o.id, 'Cancelled', DEMO_ADMIN, undefined, 'Again')).toThrow();
    expect(data.menus[0].quantity).toBe(before);
  });
  it('records revenue only after the correct code and cash collection', () => {
    const o = engine.checkout(checkout, DEMO_CUSTOMER);
    engine.transition(o.id, 'Confirmed', DEMO_ADMIN);
    engine.transition(o.id, 'Preparing', DEMO_ADMIN);
    engine.transition(o.id, 'Ready for Pickup', DEMO_ADMIN);
    expect(collectedRevenue(data.orders)).toBe(0);
    expect(() =>
      engine.transition(o.id, 'Completed', DEMO_ADMIN, 'WRONG', undefined, true),
    ).toThrow();
    expect(() => engine.transition(o.id, 'Completed', DEMO_ADMIN, o.pickup_code)).toThrow();
    engine.transition(o.id, 'Completed', DEMO_ADMIN, o.pickup_code, undefined, true);
    expect(collectedRevenue(data.orders)).toBe(15000);
    expect(o.collected_at).toBeTruthy();
    expect(() =>
      engine.transition(o.id, 'Completed', DEMO_ADMIN, o.pickup_code, undefined, true),
    ).toThrow();
  });
});
