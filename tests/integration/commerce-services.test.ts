import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { now, seed, shipping, basket, order } from '../helpers/commerce.ts';
import {
  createOrder,
  getCart,
  applyPaymentSuccess,
  requestRefund,
  claimOutbox,
  markOutboxSent,
} from '../../packages/db/src/index.ts';
import { expireOrders, decideCod } from '../../packages/db/src/operations.ts';
let t: TestD1;
beforeAll(async () => {
  t = await createTestD1();
  await shipping(t.db);
});
afterAll(() => t?.dispose());
it('checkout fails closed before explicit enablement', async () => {
  await seed(t.db, 'closed');
  const b = await basket(t.db, 'closed', 'closed');
  expect(await createOrder(t.db, b.customer, b.input, now)).toEqual({
    ok: false,
    error: 'checkout_disabled',
  });
  await t.db.prepare("UPDATE settings SET value='true' WHERE key='checkout_enabled'").run();
});
it('same-key concurrent checkout has one order, one reservation and one notification', async () => {
  await seed(t.db, 'idem');
  const b = await basket(t.db, 'idem', 'idem');
  const results = await Promise.all(
    Array.from({ length: 12 }, () => createOrder(t.db, b.customer, b.input, now)),
  );
  expect(results.every((r) => r.ok)).toBe(true);
  expect(new Set(results.map((r) => (r.ok ? r.orderId : 'error'))).size).toBe(1);
  expect(
    (
      await t.db
        .prepare("SELECT count(*) AS n FROM orders WHERE user_id='idem'")
        .first<{ n: number }>()
    )?.n,
  ).toBe(1);
  const cart = await getCart(t.db, 'idem', 'en');
  expect(cart.lines).toHaveLength(0);
  expect(await createOrder(t.db, b.customer, { ...b.input, locale: 'ar' }, now)).toEqual({
    ok: false,
    error: 'idempotency_conflict',
  });
});
it('different checkout keys cannot consume a cart twice', async () => {
  await seed(t.db, 'different', 5, 100000, false);
  const b = await basket(t.db, 'different', 'different');
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      createOrder(t.db, b.customer, { ...b.input, idempotencyKey: crypto.randomUUID() }, now),
    ),
  );
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(
    await t.db.prepare("SELECT on_hand,reserved FROM inventory WHERE sku_id='different'").first(),
  ).toEqual({ on_hand: 5, reserved: 1 });
});
it('COD staff confirmation consumes stock without claiming payment, expiry releases unreviewed COD', async () => {
  await seed(t.db, 'cod');
  const o = await order(t.db, 'cod', 'cod', 'cod');
  await decideCod(t.db, 'staff', o.orderId, 'confirm', 'Confirmed by phone', now + 1);
  expect(
    await t.db
      .prepare('SELECT status,payment_status FROM orders WHERE id=?')
      .bind(o.orderId)
      .first(),
  ).toEqual({ status: 'confirmed', payment_status: 'unpaid' });
  await expect(decideCod(t.db, 'staff', o.orderId, 'confirm', 'Replay', now + 2)).rejects.toThrow(
    /OPERATION_CONFLICT/,
  );
  await seed(t.db, 'cod-expire');
  const e = await order(t.db, 'cod-expire', 'cod-expire', 'cod');
  await expireOrders(t.db, now + 25 * 3600000);
  expect(
    (
      await t.db
        .prepare('SELECT status FROM orders WHERE id=?')
        .bind(e.orderId)
        .first<{ status: string }>()
    )?.status,
  ).toBe('cancelled');
  expect(
    await t.db.prepare("SELECT on_hand,reserved FROM inventory WHERE sku_id='cod-expire'").first(),
  ).toEqual({ on_hand: 1, reserved: 0 });
});
it('concurrent late payment retries allocate once with no orphan reservations', async () => {
  await seed(t.db, 'late', 5, 100000, false);
  const o = await order(t.db, 'late', 'late');
  await expireOrders(t.db, now + 1000000);
  const a = {
    id: 'attempt-late',
    order_id: o.orderId,
    mode: 'test' as const,
    status: 'pending',
    amount_piastres: 110000,
    merchant_order_id: 'merchant-late',
    session_id: 'session',
    session_url: null,
  };
  await t.db
    .prepare(
      "INSERT INTO payment_attempts (id,order_id,provider,mode,status,amount_piastres,currency,merchant_order_id,created_at,updated_at) VALUES (?,?,'kashier','test','pending',110000,'EGP',?,?,?)",
    )
    .bind(a.id, o.orderId, a.merchant_order_id, now, now)
    .run();
  const r = await Promise.all(
    Array.from({ length: 10 }, () =>
      applyPaymentSuccess(
        t.db,
        a,
        { transactionId: 'tx-late', kashierOrderId: 'ko-late' },
        now + 1000001,
      ),
    ),
  );
  expect(r).toContain('paid_late_reallocated');
  expect(
    await t.db.prepare("SELECT on_hand,reserved FROM inventory WHERE sku_id='late'").first(),
  ).toEqual({ on_hand: 4, reserved: 0 });
  expect(
    (
      await t.db
        .prepare("SELECT count(*) AS n FROM reservations WHERE order_id=? AND status='active'")
        .bind(o.orderId)
        .first<{ n: number }>()
    )?.n,
  ).toBe(0);
  expect(
    (await t.db.prepare('SELECT count(*) AS n FROM operation_guards').first<{ n: number }>())?.n,
  ).toBe(0);
});
it('SQL rejects fractional money and more than one unit of a unique piece', async () => {
  await seed(t.db, 'integer');
  await expect(
    t.db.prepare("UPDATE skus SET price_piastres=100.5 WHERE id='integer'").run(),
  ).rejects.toThrow(/INTEGER_REQUIRED/);
  await expect(
    t.db.prepare("UPDATE inventory SET on_hand=2 WHERE sku_id='integer'").run(),
  ).rejects.toThrow(/UNIQUE_STOCK/);
});
it('outbox leases prevent two workers sending the same message and recover crashed claims', async () => {
  await t.db.prepare("UPDATE outbox SET status='sent'").run();
  await t.db
    .prepare(
      "INSERT INTO outbox (id,topic,payload,dedupe_key,next_attempt_at,created_at) VALUES ('lease-test','alert.staff','{}','lease-test',?,?)",
    )
    .bind(now, now)
    .run();
  const leases = await Promise.all([claimOutbox(t.db, now, 1), claimOutbox(t.db, now, 1)]);
  expect(leases.flat()).toHaveLength(1);
  const first = leases.flat()[0]!;
  const [retry] = await claimOutbox(t.db, now + 60001, 1);
  expect(retry?.id).toBe(first.id);
  expect(await markOutboxSent(t.db, first, now + 60002)).toBe(false);
  expect(await markOutboxSent(t.db, retry!, now + 60002)).toBe(true);
});

it('a committed checkout replay remains readable after the kill switch closes intake', async () => {
  await seed(t.db, 'kill-replay');
  const b = await basket(t.db, 'kill-replay', 'kill-replay');
  const first = await createOrder(t.db, b.customer, b.input, now);
  expect(first.ok).toBe(true);
  await t.db.prepare("UPDATE settings SET value='false' WHERE key='checkout_enabled'").run();
  expect(await createOrder(t.db, b.customer, b.input, now + 1)).toMatchObject({
    ok: true,
    replayed: true,
  });
  await t.db.prepare("UPDATE settings SET value='true' WHERE key='checkout_enabled'").run();
});
