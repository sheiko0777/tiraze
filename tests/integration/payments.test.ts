import { applyPaymentSuccess } from '../../packages/db/src/payments.ts';
import { fulfill } from '../../packages/db/src/fulfillment.ts';
import { beforeAll, afterAll, afterEach, it, expect, vi } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { seed, shipping, order, now } from '../helpers/commerce.ts';
import {
  startKashierPayment,
  receiveKashierWebhook,
  requestRefund,
  reconcileRefund,
  reconcileAttempts,
} from '../../packages/db/src/payments.ts';
import { computeKashierSignature, type KashierConfig } from '../../packages/core/src/index.ts';
let t: TestD1;
const cfg: KashierConfig = {
  mode: 'test',
  merchantId: 'fixture-merchant',
  apiKey: 'fixture-api-key',
  secretKey: 'fixture-secret',
};
beforeAll(async () => {
  t = await createTestD1();
  await shipping(t.db);
  await t.db.prepare("UPDATE settings SET value='true' WHERE key='checkout_enabled'").run();
});
afterAll(() => t?.dispose());
afterEach(() => vi.unstubAllGlobals());
async function payment(id: string) {
  await seed(t.db, id);
  const o = await order(t.db, id, id);
  let calls = 0;
  const r = await startKashierPayment(t.db, cfg, {
    orderId: o.orderId,
    userId: id,
    email: id + '@example.com',
    redirectUrl: 'https://tiraze.net/en/orders/' + o.orderId,
    webhookUrl: 'https://tiraze.net/api/webhooks/kashier',
    now,
    fetchImpl: async () => {
      calls++;
      return Response.json({
        sessionId: 'session-' + id,
        sessionUrl: 'https://checkout.kashier.io/session-' + id,
      });
    },
  });
  expect(r.ok).toBe(true);
  const a = await t.db
    .prepare('SELECT * FROM payment_attempts WHERE order_id=?')
    .bind(o.orderId)
    .first<any>();
  return { o, a, calls };
}
function hook(a: any, status = 'SUCCESS', event = 'pay') {
  const data: Record<string, unknown> = {
    amount: '1100.00',
    currency: 'EGP',
    merchantOrderId: a.merchant_order_id,
    status,
    transactionId: 'tx-' + a.id,
    kashierOrderId: 'ko-' + a.id,
  };
  data.signatureKeys = Object.keys(data);
  return { event, data };
}
it('unknown session creation blocks retries instead of charging twice', async () => {
  await seed(t.db, 'unknown');
  const o = await order(t.db, 'unknown', 'unknown');
  let calls = 0;
  const p = {
    orderId: o.orderId,
    userId: 'unknown',
    email: 'fixture@example.com',
    redirectUrl: 'https://tiraze.net/en/orders',
    webhookUrl: 'https://tiraze.net/api/webhooks/kashier',
    now,
    fetchImpl: async () => {
      calls++;
      throw new TypeError('offline');
    },
  };
  expect(await startKashierPayment(t.db, cfg, p)).toMatchObject({
    ok: false,
    error: 'provider_unknown',
  });
  expect(await startKashierPayment(t.db, cfg, p)).toMatchObject({
    ok: false,
    error: 'payment_unresolved',
  });
  expect(calls).toBe(1);
});
it('requires signature and signed critical fields; mismatch cannot confirm an order', async () => {
  const { o, a } = await payment('signature');
  const h = hook(a);
  expect((await receiveKashierWebhook(t.db, cfg, JSON.stringify(h), 'bad', now)).status).toBe(401);
  const partial = { ...h, data: { ...h.data, signatureKeys: ['amount'] } };
  expect(
    (
      await receiveKashierWebhook(
        t.db,
        cfg,
        JSON.stringify(partial),
        await computeKashierSignature(partial.data, cfg.apiKey),
        now,
      )
    ).status,
  ).toBe(400);
  const mismatch = hook(a);
  mismatch.data.amount = '1.00';
  const signature = await computeKashierSignature(mismatch.data, cfg.apiKey);
  expect(
    (await receiveKashierWebhook(t.db, cfg, JSON.stringify(mismatch), signature, now)).status,
  ).toBe(200);
  expect(
    (
      await t.db
        .prepare('SELECT payment_status FROM orders WHERE id=?')
        .bind(o.orderId)
        .first<{ payment_status: string }>()
    )?.payment_status,
  ).toBe('pending');
});
it('corroborates unsigned event type with provider lookup, applies duplicate webhooks once, ignores late failure', async () => {
  const { o, a } = await payment('webhook');
  const h = hook(a);
  let lookups = 0;
  vi.stubGlobal('fetch', async () => {
    lookups++;
    return Response.json({
      data: [
        {
          merchantId: cfg.merchantId,
          merchantOrderId: a.merchant_order_id,
          orderId: h.data.kashierOrderId,
          order: { amount: '1100.00', currency: 'EGP' },
          status: 'CAPTURED',
          transactions: [
            {
              operation: 'pay',
              status: 'SUCCESS',
              amount: '1100.00',
              currency: 'EGP',
              transactionId: h.data.transactionId,
            },
          ],
        },
      ],
    });
  });
  const signature = await computeKashierSignature(h.data, cfg.apiKey);
  const r = await Promise.all(
    Array.from({ length: 8 }, () =>
      receiveKashierWebhook(t.db, cfg, JSON.stringify(h), signature, now + 1),
    ),
  );
  expect(r.every((r) => r.status === 200)).toBe(true);
  expect(lookups).toBe(1);
  expect(
    await t.db
      .prepare('SELECT status,payment_status,paid_piastres FROM orders WHERE id=?')
      .bind(o.orderId)
      .first(),
  ).toEqual({ status: 'confirmed', payment_status: 'paid', paid_piastres: 110000 });
  const failed = hook(a, 'FAILURE');
  await receiveKashierWebhook(
    t.db,
    cfg,
    JSON.stringify(failed),
    await computeKashierSignature(failed.data, cfg.apiKey),
    now + 2,
  );
  expect(
    (
      await t.db
        .prepare('SELECT status FROM payment_attempts WHERE id=?')
        .bind(a.id)
        .first<{ status: string }>()
    )?.status,
  ).toBe('succeeded');
});
it('refund caps include concurrent requests, same-key retry sends once, and success cannot regress', async () => {
  const a = await t.db
    .prepare("SELECT * FROM payment_attempts WHERE merchant_order_id LIKE '%'")
    .all<any>();
  const attempt = a.results.find((r: any) => r.status === 'succeeded');
  expect(attempt).toBeTruthy();
  let calls = 0;
  const input = {
    orderId: attempt.order_id,
    amountPiastres: 60000,
    reason: 'Test partial refund',
    idempotencyKey: crypto.randomUUID(),
    actorId: 'fixture-finance',
    now: now + 5,
    fetchImpl: async () => {
      calls++;
      return Response.json({ status: 'SUCCESS', transactionId: 'refund-fixture' });
    },
  };
  const same = await Promise.all([
    requestRefund(t.db, cfg, input),
    requestRefund(t.db, cfg, input),
  ]);
  expect(same.every((r) => r.ok)).toBe(true);
  expect(calls).toBe(1);
  expect(
    await requestRefund(t.db, cfg, { ...input, idempotencyKey: crypto.randomUUID() }),
  ).toMatchObject({ ok: false, error: 'exceeds_paid' });
  const refund = await t.db
    .prepare('SELECT id,status FROM refunds WHERE order_id=?')
    .bind(input.orderId)
    .first<{ id: string; status: string }>();
  expect(refund?.status).toBe('succeeded');
  await expect(
    t.db.prepare("UPDATE refunds SET status='pending' WHERE id=?").bind(refund!.id).run(),
  ).rejects.toThrow(/REFUND_SUCCESS_FINAL/);
  expect(
    await t.db
      .prepare('SELECT payment_status,refunded_piastres FROM orders WHERE id=?')
      .bind(input.orderId)
      .first(),
  ).toEqual({ payment_status: 'partially_refunded', refunded_piastres: 60000 });
});

it('keeps a failed hosted transaction open for retry and reconciles a lost creation response by merchant order', async () => {
  const { o, a } = await payment('retryable');
  const failed = hook(a, 'FAILURE');
  await receiveKashierWebhook(
    t.db,
    cfg,
    JSON.stringify(failed),
    await computeKashierSignature(failed.data, cfg.apiKey),
    now + 1,
  );
  expect(
    (
      await t.db
        .prepare('SELECT status FROM payment_attempts WHERE id=?')
        .bind(a.id)
        .first<{ status: string }>()
    )?.status,
  ).toBe('pending');
  const result = await startKashierPayment(t.db, cfg, {
    orderId: o.orderId,
    userId: 'retryable',
    email: 'retryable@example.com',
    redirectUrl: 'https://tiraze.net/en/orders',
    webhookUrl: 'https://tiraze.net/api/webhooks/kashier',
    now: now + 2,
    fetchImpl: async () => {
      throw new Error('must not create a fresh session');
    },
  });
  expect(result).toMatchObject({ ok: true, reused: true });
  const lost = await t.db
    .prepare("SELECT * FROM payment_attempts WHERE status='unknown'")
    .first<any>();
  expect(lost).toBeTruthy();
  const report = await reconcileAttempts(t.db, cfg, now + 600000, {
    fetchImpl: async () =>
      Response.json({
        data: [
          {
            merchantId: cfg.merchantId,
            merchantOrderId: lost.merchant_order_id,
            orderId: 'lost-provider-order',
            order: { amount: '1100.00', currency: 'EGP' },
            status: 'CAPTURED',
            transactions: [
              {
                operation: 'pay',
                status: 'SUCCESS',
                amount: '1100.00',
                currency: 'EGP',
                transactionId: 'lost-provider-tx',
              },
            ],
          },
        ],
      }),
  });
  expect(report.find((r) => r.attemptId === lost.id)?.outcome).toBe('paid');
});
it('resolves an unknown refund by exact authenticated provider reference without reusing it', async () => {
  const a = await t.db
    .prepare(
      "SELECT * FROM payment_attempts WHERE status='succeeded' AND merchant_order_id LIKE '%'",
    )
    .all<any>();
  const attempt = a.results.find((r: any) => r.provider_order_id === 'lost-provider-order');
  expect(attempt).toBeTruthy();
  const requested = await requestRefund(t.db, cfg, {
    orderId: attempt.order_id,
    amountPiastres: 10000,
    reason: 'Unknown outcome fixture',
    idempotencyKey: crypto.randomUUID(),
    actorId: 'fixture-finance',
    now: now + 600001,
    fetchImpl: async () => {
      throw new TypeError('offline');
    },
  });
  expect(requested).toMatchObject({ ok: true, state: 'unknown' });
  if (!requested.ok) throw new Error('fixture failed');
  const fetchImpl = async () =>
    Response.json({
      data: [
        {
          merchantId: cfg.merchantId,
          merchantOrderId: attempt.merchant_order_id,
          orderId: attempt.provider_order_id,
          order: { amount: '1100.00', currency: 'EGP' },
          status: 'PARTIALLY_REFUNDED',
          transactions: [
            {
              operation: 'refund',
              status: 'SUCCESS',
              amount: '100.00',
              currency: 'EGP',
              transactionId: 'exact-refund-reference',
              targetedTransaction: attempt.provider_transaction_id,
            },
          ],
        },
      ],
    });
  expect(
    await reconcileRefund(t.db, cfg, {
      refundId: requested.refundId,
      providerTransactionId: 'wrong-reference',
      actorId: 'fixture-finance',
      now: now + 600002,
      fetchImpl,
    }),
  ).toMatchObject({ ok: false, error: 'provider_unresolved' });
  expect(
    await reconcileRefund(t.db, cfg, {
      refundId: requested.refundId,
      providerTransactionId: 'exact-refund-reference',
      actorId: 'fixture-finance',
      now: now + 600003,
      fetchImpl,
    }),
  ).toMatchObject({ ok: true, state: 'succeeded' });
  expect(
    (
      await t.db
        .prepare('SELECT refunded_piastres FROM orders WHERE id=?')
        .bind(attempt.order_id)
        .first<{ refunded_piastres: number }>()
    )?.refunded_piastres,
  ).toBe(10000);
});

it('distinct concurrent successes record both charges, sell one unit and refund the selected extra charge', async () => {
  const { o, a } = await payment('double-success');
  const second = {
    ...a,
    id: 'second-distinct-attempt',
    merchant_order_id: 'second-distinct-order',
    status: 'failed',
  };
  await t.db
    .prepare(
      "INSERT INTO payment_attempts (id,order_id,provider,mode,status,amount_piastres,currency,merchant_order_id,created_at,updated_at) VALUES (?,?,'kashier','test','failed',110000,'EGP',?,?,?)",
    )
    .bind(second.id, o.orderId, second.merchant_order_id, now, now)
    .run();
  await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const current = i % 2 ? a : second;
      return applyPaymentSuccess(
        t.db,
        current,
        {
          transactionId: 'distinct-tx-' + current.id,
          kashierOrderId: 'distinct-order-' + current.id,
        },
        now + 1,
      );
    }),
  );
  expect(
    await t.db
      .prepare('SELECT status,paid_piastres FROM orders WHERE id=?')
      .bind(o.orderId)
      .first(),
  ).toEqual({ status: 'confirmed', paid_piastres: 220000 });
  expect(
    await t.db
      .prepare("SELECT on_hand,reserved FROM inventory WHERE sku_id='double-success'")
      .first(),
  ).toEqual({ on_hand: 0, reserved: 0 });
  expect(
    (
      await t.db
        .prepare('SELECT count(*) AS n FROM outbox WHERE dedupe_key=?')
        .bind('duplicate_payment:' + o.orderId)
        .first<{ n: number }>()
    )?.n,
  ).toBe(1);
  expect(
    (
      await t.db
        .prepare(
          "SELECT count(*) AS n FROM outbox WHERE topic='alert.staff' AND json_extract(payload,'$.kind')='paid_unallocated' AND json_extract(payload,'$.orderId')=?",
        )
        .bind(o.orderId)
        .first<{ n: number }>()
    )?.n,
  ).toBe(0);
  const result = await requestRefund(t.db, cfg, {
    orderId: o.orderId,
    paymentAttemptId: second.id,
    amountPiastres: 110000,
    reason: 'Extra charge fixture',
    idempotencyKey: crypto.randomUUID(),
    actorId: 'fixture-finance',
    now: now + 2,
    fetchImpl: async (url) => {
      expect(url).toContain('distinct-order-' + second.id);
      return Response.json({ status: 'SUCCESS', transactionId: 'refund-extra-distinct' });
    },
  });
  expect(result).toMatchObject({ ok: true, state: 'succeeded' });
  expect(
    (
      await t.db
        .prepare('SELECT refunded_piastres FROM orders WHERE id=?')
        .bind(o.orderId)
        .first<{ refunded_piastres: number }>()
    )?.refunded_piastres,
  ).toBe(110000);
  await fulfill(t.db, 'fixture-fulfillment', o.orderId, 'prepare', now + 3);
  expect(
    await requestRefund(t.db, cfg, {
      orderId: o.orderId,
      paymentAttemptId: second.id,
      amountPiastres: 1,
      reason: 'Duplicate refund must fail',
      idempotencyKey: crypto.randomUUID(),
      actorId: 'fixture-finance',
      now: now + 4,
      fetchImpl: async () => {
        throw new Error('must not contact provider');
      },
    }),
  ).toMatchObject({ ok: false, error: 'exceeds_paid' });
});
