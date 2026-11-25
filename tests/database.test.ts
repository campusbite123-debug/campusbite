import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const ids = {
  student: '30000000-0000-4000-8000-000000000001',
  other: '30000000-0000-4000-8000-000000000002',
  admin: '30000000-0000-4000-8000-000000000003',
};
let db: PGlite;
let menu: string;
let slot: string;
async function asUser(id: string) {
  await db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.role','authenticated',false); select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function root() {
  await db.exec(
    "reset role; select set_config('request.jwt.claim.role','',false); select set_config('request.jwt.claim.sub','',false);",
  );
}
async function scalar<T = any>(sql: string, values: any[] = []): Promise<T> {
  return Object.values((await db.query<Record<string, T>>(sql, values)).rows[0])[0];
}
async function order(key = crypto.randomUUID(), quantity = 2, items?: any[]) {
  return scalar<string>('select public.create_order($1::jsonb,$2::uuid,$3::uuid)', [
    JSON.stringify(items ?? [{ daily_menu_id: menu, quantity }]),
    slot,
    key,
  ]);
}
async function transition(
  id: string,
  status: string,
  code: string | null = null,
  collect = false,
  reason: string | null = null,
) {
  return db.query(
    'select public.transition_order($1::uuid,$2::public.order_status,$3::text,$4::text,$5::boolean)',
    [id, status, code, reason, collect],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb not null default '{}',created_at timestamptz not null default now(),email_confirmed_at timestamptz); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$; grant usage on schema auth to authenticated,service_role;`,
  );
  await db.exec(
    `create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text); alter table storage.objects enable row level security; grant usage on schema storage to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated; grant select on storage.objects to anon; set client_min_messages=error; create publication supabase_realtime;`,
  );
  for (const name of [
    '202611130001_canteen.sql',
    '202611130002_storage_realtime.sql',
    '202611130003_admin_consistency.sql',
    '202611130004_popular_meals.sql',
    '202611130005_terminal_admin.sql',
    '202611240001_schedule_meal_dates.sql',
    '202611250001_automatic_pickup_slots.sql',
  ])
    await db.exec(
      await readFile(
        fileURLToPath(new URL(`../supabase/migrations/${name}`, import.meta.url)),
        'utf8',
      ),
    );
  await db.exec(
    await readFile(fileURLToPath(new URL('../supabase/seed.sql', import.meta.url)), 'utf8'),
  );
  for (const [name, id] of Object.entries(ids))
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,now())',
      [
        id,
        `${name}@school.test`,
        JSON.stringify({
          full_name: `Test ${name}`,
          student_id: `TEST-${name.toUpperCase()}`,
          role: 'ADMIN',
        }),
      ],
    );
  await db.query("update public.user_roles set role='ADMIN' where user_id=$1", [ids.admin]);
  menu = await scalar<string>(
    "select id from public.daily_menus where meal_id='20000000-0000-4000-8000-000000000001' and service_date=(now() at time zone 'Asia/Manila')::date+1",
  );
  await asUser(ids.student);
  await db.query('select * from public.get_pickup_slots()');
  slot = await scalar<string>(
    "select id from public.pickup_slots where (starts_at at time zone 'Asia/Manila')::date=(now() at time zone 'Asia/Manila')::date+1 and (starts_at at time zone 'Asia/Manila')::time='12:00'",
  );
});
beforeEach(async () => {
  await root();
  await db.exec(
    'delete from public.payments; delete from public.order_status_history; delete from public.order_items; delete from public.orders; delete from public.admin_activity_logs; update public.meal_inventory set quantity=30; update public.profiles set is_suspended=false; update public.canteen_settings set accepting_orders=true; update public.pickup_slots set capacity=20,is_active=true;',
  );
  await asUser(ids.student);
});
afterAll(async () => {
  await db.close();
});
describe('actual PostgreSQL migrations and RPCs', () => {
  it('fills daily pickup windows through closing and preserves an edited slot across refreshes', async () => {
    const tomorrow = "(now() at time zone 'Asia/Manila')::date + 1";
    const windows = () =>
      db.query<{
        id: string;
        start: string;
        finish: string;
        capacity: number;
        is_active: boolean;
      }>(`
      select id, to_char(starts_at at time zone 'Asia/Manila','HH24:MI') as start,
             to_char(ends_at at time zone 'Asia/Manila','HH24:MI') as finish, capacity, is_active
      from public.get_pickup_slots() where (starts_at at time zone 'Asia/Manila')::date = ${tomorrow}
      order by starts_at`);
    await db.exec('begin');
    try {
      await root();
      await db.exec("update canteen_settings set opens_at='05:00', closes_at='19:00'");
      await db.exec(
        `delete from pickup_slots where (starts_at at time zone 'Asia/Manila')::date = ${tomorrow}`,
      );
      await asUser(ids.student);
      const first = (await windows()).rows;
      expect(first).toHaveLength(28);
      expect(first[0].start).toBe('05:00');
      expect(first[27].finish).toBe('19:00');
      expect(first.slice(1).map((s) => s.start)).toEqual(first.slice(0, -1).map((s) => s.finish));
      await asUser(ids.admin);
      await db.query(
        "update pickup_slots set starts_at=starts_at + interval '5 minutes', capacity=8, is_active=false where id=$1",
        [first[0].id],
      );
      await asUser(ids.student);
      const edited = (await windows()).rows;
      expect(edited).toHaveLength(28);
      expect(edited[0]).toMatchObject({
        id: first[0].id,
        start: '05:05',
        capacity: 8,
        is_active: false,
      });
      await asUser(ids.admin);
      await db.exec("update canteen_settings set opens_at='04:45', closes_at='18:45'");
      const changed = (await windows()).rows;
      expect(changed[0].start).toBe('04:45');
      expect(changed.at(-1)?.finish).toBe('18:45');
      expect(changed[1]).toEqual(edited[0]);
    } finally {
      await db.exec('rollback');
    }
  });
  it('fills gaps around a pre-existing closed slot on the first student visit', async () => {
    const tomorrow = "(now() at time zone 'Asia/Manila')::date + 1";
    await db.exec('begin');
    try {
      await root();
      await db.exec(`
        update canteen_settings set opens_at='07:10', closes_at='08:20';
        delete from pickup_slots where (starts_at at time zone 'Asia/Manila')::date = ${tomorrow};
        insert into pickup_slots(starts_at, ends_at, is_active)
          select (d + time '07:25') at time zone 'Asia/Manila', (d + time '07:40') at time zone 'Asia/Manila', false
          from (select ${tomorrow} as d) t;
      `);
      await asUser(ids.student);
      const result = await db.query(`
        select to_char(starts_at at time zone 'Asia/Manila', 'HH24:MI') as start,
               to_char(ends_at at time zone 'Asia/Manila', 'HH24:MI') as finish, is_active
        from get_pickup_slots() where (starts_at at time zone 'Asia/Manila')::date = ${tomorrow}
        order by starts_at
      `);
      expect(result.rows).toEqual([
        { start: '07:10', finish: '07:25', is_active: true },
        { start: '07:25', finish: '07:40', is_active: false },
        { start: '07:40', finish: '08:00', is_active: true },
        { start: '08:00', finish: '08:20', is_active: true },
      ]);
    } finally {
      await db.exec('rollback');
    }
  });

  it('denies terminal provisioning to both student and administrator sessions', async () => {
    await expect(
      db.query('select public.terminal_provision_admin($1,$2)', [ids.student, crypto.randomUUID()]),
    ).rejects.toThrow(/permission/i);
    await asUser(ids.admin);
    await expect(
      db.query('select public.terminal_provision_admin($1,$2)', [ids.student, crypto.randomUUID()]),
    ).rejects.toThrow(/permission/i);
  });
  it('requires a fresh server-attested account and consumes its provisioning nonce', async () => {
    const id = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    await root();
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values($1,$2,$3,$4)',
      [
        id,
        'terminal-staff@test.local',
        JSON.stringify({ full_name: 'Terminal Staff', student_id: 'STAFF-TERMINAL' }),
        JSON.stringify({ admin_provisioning_id: nonce }),
      ],
    );
    await db.exec(
      "set role service_role; select set_config('request.jwt.claim.role','service_role',false);",
    );
    await expect(
      db.query('select public.terminal_provision_admin($1,$2)', [id, crypto.randomUUID()]),
    ).rejects.toThrow(/Invalid/);
    await db.query('select public.terminal_provision_admin($1,$2)', [id, nonce]);
    expect(await scalar('select role from public.user_roles where user_id=$1', [id])).toBe('ADMIN');
    await expect(
      db.query('select public.terminal_provision_admin($1,$2)', [id, nonce]),
    ).rejects.toThrow(/Invalid/);
    await root();
    expect(
      await scalar(
        "select raw_app_meta_data->>'admin_provisioned_via_terminal' from auth.users where id=$1",
        [id],
      ),
    ).toBe('true');
    expect(
      await scalar(
        "select count(*)::int from public.admin_activity_logs where action='terminal_admin_created' and admin_id=$1",
        [id],
      ),
    ).toBe(1);
  });
  it('keeps staff accounts out of the student directory', async () => {
    await expect(db.query('select * from public.list_students()')).rejects.toThrow(/Administrator/);
    await asUser(ids.admin);
    const profiles = await db.query<{ id: string }>('select * from public.list_students()');
    expect(profiles.rows.some((p) => p.id === ids.student)).toBe(true);
    expect(profiles.rows.some((p) => p.id === ids.admin)).toBe(false);
  });
  it('permits meal photo uploads only for administrators', async () => {
    await expect(
      db.exec("insert into storage.objects(bucket_id,name) values('meal-images','student.jpg')"),
    ).rejects.toThrow(/row-level security/);
    await asUser(ids.admin);
    await db.exec("insert into storage.objects(bucket_id,name) values('meal-images','admin.jpg')");
    expect(await scalar("select count(*)::int from storage.objects where name='admin.jpg'")).toBe(
      1,
    );
  });
  it('provides aggregate meal popularity without exposing order ownership', async () => {
    await order();
    await asUser(ids.other);
    const popular = await db.query<{ meal_id: string; quantity: number }>(
      'select * from public.get_meal_popularity()',
    );
    expect(Number(popular.rows[0].quantity)).toBe(2);
    expect(await scalar('select count(*)::int from public.orders')).toBe(0);
  });
  it('ignores public registration role metadata and enforces unique internal account references', async () => {
    expect(await scalar('select role from public.user_roles where user_id=auth.uid()')).toBe(
      'CUSTOMER',
    );
    await root();
    await expect(
      db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
        crypto.randomUUID(),
        'duplicate@test.local',
        JSON.stringify({ full_name: 'Duplicate', student_id: 'TEST-STUDENT' }),
      ]),
    ).rejects.toThrow(/unique/i);
  });
  it('deducts stock and calculates totals inside the database', async () => {
    const id = await order();
    expect(await scalar('select total from public.orders where id=$1', [id])).toBe(15000);
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(28);
  });
  it('is idempotent even when the same request is retried', async () => {
    const key = crypto.randomUUID();
    const first = await order(key);
    expect(await order(key)).toBe(first);
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(28);
  });
  it('rolls back every inventory change if any line is invalid', async () => {
    await expect(
      order(crypto.randomUUID(), 1, [
        { daily_menu_id: menu, quantity: 1 },
        { daily_menu_id: crypto.randomUUID(), quantity: 1 },
      ]),
    ).rejects.toThrow();
    expect(await scalar('select count(*)::int from public.orders')).toBe(0);
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(30);
  });
  it('never oversells when requests contend for the final serving', async () => {
    await root();
    await db.query('update public.meal_inventory set quantity=1 where daily_menu_id=$1', [menu]);
    await asUser(ids.student);
    const result = await Promise.allSettled([
      order(crypto.randomUUID(), 1),
      order(crypto.randomUUID(), 1),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(0);
  });
  it('enforces slot capacity and rejects closed slots', async () => {
    await root();
    await db.query('update public.pickup_slots set capacity=1 where id=$1', [slot]);
    await asUser(ids.student);
    await order();
    await expect(order()).rejects.toThrow(/full/);
  });
  it('restricts students to their own order, items, history and payments', async () => {
    const id = await order();
    await asUser(ids.other);
    for (const table of ['orders', 'order_items', 'order_status_history', 'payments'])
      expect(await scalar(`select count(*)::int from public.${table}`)).toBe(0);
    await expect(transition(id, 'Confirmed')).rejects.toThrow(/Administrator/);
  });
  it('blocks direct order, stock, payment and role writes', async () => {
    for (const sql of [
      "update public.user_roles set role='ADMIN' where user_id=auth.uid()",
      'update public.meal_inventory set quantity=999',
      "update public.orders set status='Completed'",
      'insert into public.payments(order_id,amount,collected_by) values(gen_random_uuid(),1,auth.uid())',
      'update public.profiles set is_suspended=false where id=auth.uid()',
      'delete from public.meals',
    ])
      await expect(db.exec(sql)).rejects.toThrow(/permission/i);
  });
  it('blocks customer meal/settings edits with RLS', async () => {
    expect((await db.query('update public.meals set price=1 returning id')).rows).toHaveLength(0);
    expect(
      (await db.query('update public.canteen_settings set accepting_orders=false returning id'))
        .rows,
    ).toHaveLength(0);
  });
  it('restores cancelled stock only once and releases slot capacity', async () => {
    const id = await order();
    await transition(id, 'Cancelled', null, false, 'Changed plans');
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(30);
    await asUser(ids.admin);
    await expect(transition(id, 'Cancelled', null, false, 'Again')).rejects.toThrow(/transition/);
    expect(
      (await db.query<any>('select * from public.get_pickup_slots()')).rows.find(
        (s) => s.id === slot,
      ).reserved,
    ).toBe(0);
  });
  it('rejects skipped states and verifies code plus cash before revenue', async () => {
    const id = await order();
    const code = await scalar<string>('select pickup_code from public.orders where id=$1', [id]);
    await asUser(ids.admin);
    await expect(transition(id, 'Ready for Pickup')).rejects.toThrow(/transition/);
    for (const status of ['Confirmed', 'Preparing', 'Ready for Pickup'])
      await transition(id, status);
    expect(await scalar('select count(*)::int from public.payments')).toBe(0);
    await expect(transition(id, 'Completed', 'WRONG', true)).rejects.toThrow(/code/);
    await expect(transition(id, 'Completed', code, false)).rejects.toThrow(/cash/);
    await transition(id, 'Completed', code, true);
    expect(await scalar('select sum(amount)::int from public.payments')).toBe(15000);
    await expect(transition(id, 'Completed', code, true)).rejects.toThrow(/transition/);
  });
  it('rejects stale stock edits and allows current counted edits', async () => {
    await order();
    await asUser(ids.admin);
    await expect(db.query('select public.set_stock($1,40,8,30)', [menu])).rejects.toThrow(
      /Stock changed/,
    );
    await db.query('select public.set_stock($1,40,8,28)', [menu]);
    expect(
      await scalar('select quantity from public.meal_inventory where daily_menu_id=$1', [menu]),
    ).toBe(40);
  });
  it('saves selected service dates together and rolls back all dates on a stale count', async () => {
    const mealId = await scalar<string>('select meal_id from public.daily_menus where id=$1', [
      menu,
    ]);
    const dates = (
      await db.query<{ date: string }>(
        "select ((now() at time zone 'Asia/Manila')::date + days)::text as date from unnest(array[14, 17]) as days",
      )
    ).rows.map((row) => row.date);
    const days = dates.map((service_date, i) => ({
      service_date,
      expected_quantity: null as number | null,
      low_stock_threshold: 5 + i,
    }));
    const save = (quantity: number, entries = days) =>
      db.query("select public.schedule_meal_dates($1, $2::jsonb, '08:00', '14:00', $3, true)", [
        mealId,
        JSON.stringify(entries),
        quantity,
      ]);
    const inventory = () =>
      db.query<{ quantity: number; low_stock_threshold: number }>(
        'select i.quantity, i.low_stock_threshold from public.daily_menus m join public.meal_inventory i on i.daily_menu_id=m.id where meal_id=$1 and service_date=any($2::date[]) order by service_date',
        [mealId, dates],
      );
    await expect(save(12)).rejects.toThrow(/Administrator/);
    await asUser(ids.admin);
    await expect(save(12, [])).rejects.toThrow(/at least one/);
    await save(12);
    const saved = [
      { quantity: 12, low_stock_threshold: 5 },
      { quantity: 12, low_stock_threshold: 6 },
    ];
    expect((await inventory()).rows).toEqual(saved);
    await expect(
      save(
        24,
        days.map((d, i) => ({ ...d, expected_quantity: 12 - i })),
      ),
    ).rejects.toThrow(/Stock changed/);
    expect((await inventory()).rows).toEqual(saved);
    await expect(
      save(
        24,
        [days[0], days[0]].map((d) => ({ ...d, expected_quantity: 12 })),
      ),
    ).rejects.toThrow(/distinct/);
    expect((await inventory()).rows).toEqual(saved);
  });
  it('protects booked pickup schedules and records administrator activity', async () => {
    await order();
    await asUser(ids.admin);
    await expect(
      db.query(
        "update public.pickup_slots set starts_at=starts_at+interval '1 minute' where id=$1",
        [slot],
      ),
    ).rejects.toThrow(/Booked/);
    await db.exec("update public.canteen_settings set name='Campus Test'");
    expect(await scalar('select count(*)::int from public.admin_activity_logs')).toBeGreaterThan(0);
  });
  it('requires resolving active orders before suspension and prevents checkout afterward', async () => {
    await order();
    await asUser(ids.admin);
    await expect(
      db.query('select public.set_account_suspension($1,true,$2)', [ids.student, 'Account review']),
    ).rejects.toThrow(/active orders/);
    await db.query('select public.set_account_suspension($1,true,$2)', [
      ids.other,
      'Account review',
    ]);
    await asUser(ids.other);
    await expect(order()).rejects.toThrow(/active account/i);
  });
});
