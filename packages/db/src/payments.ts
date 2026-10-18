import {
  createKashierSession,
  lookupKashierOrder,
  KashierRejectedError,
  KashierUnknownOutcomeError,
  matchWebhookToAttempt,
  parseKashierWebhook,
  providerNumberToPiastres,
  randomId,
  refundKashierOrder,
  verifyKashierSignature,
  WebhookShapeError,
  type KashierConfig,
  type ParsedKashierWebhook,
} from '@tiraze/core';
import { orderEventStmt } from './audit.ts';
import { enqueueStmt } from './outbox.ts';
import {
  all,
  dbGuardCode,
  first,
  isUniqueViolation,
  parseJson,
  returning,
  type Db,
} from './sql.ts';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface AttemptRow {
  id: string;
  order_id: string;
  mode: 'test' | 'live';
  status: string;
  amount_piastres: number;
  merchant_order_id: string;
  session_id: string | null;
  session_url: string | null;
}

interface OrderRow {
  id: string;
  number: string;
  user_id: string;
  status: string;
  payment_status: string;
  payment_method: 'kashier' | 'cod';
  total_piastres: number;
  paid_piastres: number;
  refunded_piastres: number;
  reservation_expires_at: number;
  cancel_reason: string | null;
  locale: 'ar' | 'en';
}

export type StartPaymentResult =
  | { ok: true; redirectUrl: string; attemptId: string; reused: boolean }
  | {
      ok: false;
      error:
        | 'order_not_found'
        | 'order_not_payable'
        | 'reservation_expired'
        | 'payment_unresolved'
        | 'provider_rejected'
        | 'provider_unknown'
        | 'payments_not_configured';
    };

export interface StartPaymentParams {
  orderId: string;
  userId: string;
  email: string;
  redirectUrl: string;
  webhookUrl: string;
  now: number;
  fetchImpl?: FetchLike;
}

/**
 * Creates (or reuses) the single open Kashier attempt for an order. The attempt row is written
 * before calling Kashier; a network failure leaves it `unknown`, which blocks new attempts
 * until reconciliation decides what happened at the provider.
 */
export async function startKashierPayment(
  db: Db,
  cfg: KashierConfig | null,
  p: StartPaymentParams,
): Promise<StartPaymentResult> {
  if (!cfg) return { ok: false, error: 'payments_not_configured' };
  const order = await first<OrderRow>(
    db,
    `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
    p.orderId,
    p.userId,
  );
  if (!order) return { ok: false, error: 'order_not_found' };
  if (
    order.payment_method !== 'kashier' ||
    order.status !== 'awaiting_payment' ||
    !['unpaid', 'pending', 'failed'].includes(order.payment_status)
  ) {
    return { ok: false, error: 'order_not_payable' };
  }
  // Leave a minute of margin so the hosted page cannot outlive the reservation.
  if (order.reservation_expires_at - 60_000 <= p.now)
    return { ok: false, error: 'reservation_expired' };

  const open = await first<AttemptRow>(
    db,
    `SELECT * FROM payment_attempts WHERE order_id = ? AND status IN ('creating','unknown','pending')`,
    order.id,
  );
  if (open) {
    if (open.status === 'pending' && open.session_url)
      return { ok: true, redirectUrl: open.session_url, attemptId: open.id, reused: true };
    return { ok: false, error: 'payment_unresolved' };
  }

  const count = await first<{ n: number }>(
    db,
    `SELECT COUNT(*) AS n FROM payment_attempts WHERE order_id = ?`,
    order.id,
  );
  const attemptId = randomId();
  const merchantOrderId = `${order.number}-${(count?.n ?? 0) + 1}`;
  try {
    await db
      .prepare(
        `INSERT INTO payment_attempts (id, order_id, provider, mode, status, amount_piastres, currency, merchant_order_id, created_at, updated_at)
         VALUES (?, ?, 'kashier', ?, 'creating', ?, 'EGP', ?, ?, ?)`,
      )
      .bind(attemptId, order.id, cfg.mode, order.total_piastres, merchantOrderId, p.now, p.now)
      .run();
  } catch {
    // Another request created the open attempt concurrently (unique partial index).
    return { ok: false, error: 'payment_unresolved' };
  }

  try {
    const session = await createKashierSession(
      cfg,
      {
        merchantOrderId,
        amount: order.total_piastres,
        expireAt: new Date(order.reservation_expires_at - 60_000),
        merchantRedirect: p.redirectUrl,
        serverWebhook: p.webhookUrl,
        display: order.locale,
        customerEmail: p.email,
        customerReference: order.user_id,
        description: `Tiraze ${order.number}`,
      },
      p.fetchImpl,
    );
    await db.batch([
      db
        .prepare(
          `UPDATE payment_attempts SET status = 'pending', session_id = ?, session_url = ?, updated_at = ? WHERE id = ? AND status = 'creating'`,
        )
        .bind(session.sessionId, session.sessionUrl, p.now, attemptId),
      db
        .prepare(
          `UPDATE orders SET payment_status = 'pending', updated_at = ? WHERE id = ? AND payment_status IN ('unpaid','failed')`,
        )
        .bind(p.now, order.id),
      orderEventStmt(
        db,
        order.id,
        'payment.session_created',
        order.user_id,
        { attemptId, merchantOrderId },
        p.now,
      ),
    ]);
    return { ok: true, redirectUrl: session.sessionUrl, attemptId, reused: false };
  } catch (err) {
    if (err instanceof KashierRejectedError) {
      await db.batch([
        db
          .prepare(
            `UPDATE payment_attempts SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'creating'`,
          )
          .bind(p.now, attemptId),
        orderEventStmt(
          db,
          order.id,
          'payment.session_rejected',
          null,
          { attemptId, httpStatus: err.status },
          p.now,
        ),
      ]);
      return { ok: false, error: 'provider_rejected' };
    }
    const reason = err instanceof KashierUnknownOutcomeError ? err.message : 'unexpected_error';
    await db.batch([
      db
        .prepare(
          `UPDATE payment_attempts SET status = 'unknown', updated_at = ? WHERE id = ? AND status = 'creating'`,
        )
        .bind(p.now, attemptId),
      orderEventStmt(db, order.id, 'payment.session_unknown', null, { attemptId, reason }, p.now),
      enqueueStmt(
        db,
        'alert.staff',
        `attempt_unknown:${attemptId}`,
        { kind: 'payment_attempt_unknown', orderId: order.id, attemptId },
        p.now,
      ),
    ]);
    return { ok: false, error: 'provider_unknown' };
  }
}

// ─── Webhook inbox ───────────────────────────────────────────────────────────

export interface WebhookResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Verifies, durably stores and then processes a Kashier webhook. Acknowledges with 200 only
 * after the event row is stored; a storage failure returns 500 so Kashier retries.
 */
export async function receiveKashierWebhook(
  db: Db,
  cfg: KashierConfig | null,
  rawBody: string,
  signature: string | null,
  now: number,
): Promise<WebhookResponse> {
  if (!cfg) return { status: 503, body: { error: 'payments_not_configured' } };
  if (rawBody.length > 64 * 1024) return { status: 413, body: { error: 'payload_too_large' } };
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid_json' } };
  }
  const data = (parsedBody as { data?: unknown })?.data;
  if (!data || typeof data !== 'object') return { status: 400, body: { error: 'invalid_payload' } };
  const valid = await verifyKashierSignature(
    data as Record<string, unknown>,
    signature,
    cfg.apiKey,
  );
  if (!valid) return { status: 401, body: { error: 'invalid_signature' } };
  const signed = (data as Record<string, unknown>).signatureKeys;
  if (
    !Array.isArray(signed) ||
    !['amount', 'currency', 'merchantOrderId', 'status', 'transactionId', 'kashierOrderId'].every(
      (k) => signed.includes(k),
    )
  ) {
    return { status: 400, body: { error: 'unsigned_critical_fields' } };
  }

  let hook: ParsedKashierWebhook;
  try {
    hook = parseKashierWebhook(parsedBody);
  } catch (err) {
    if (err instanceof WebhookShapeError)
      return { status: 400, body: { error: 'invalid_payload' } };
    throw err;
  }

  // Keep only operational fields after signature verification; card/customer/token fields are not persisted.
  const storedData = Object.fromEntries(
    [
      'amount',
      'currency',
      'merchantOrderId',
      'status',
      'transactionId',
      'kashierOrderId',
      'mode',
      'merchantId',
    ]
      .filter((key) => Object.prototype.hasOwnProperty.call(hook.data, key))
      .map((key) => [key, hook.data[key]]),
  );
  const safePayload = JSON.stringify({ event: hook.event, data: storedData });
  const eventId = randomId();
  const inserted = await returning(
    db
      .prepare(
        `INSERT INTO payment_events (id, provider, dedupe_key, event_type, merchant_order_id, payload, received_at)
         VALUES (?, 'kashier', ?, ?, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id`,
      )
      .bind(eventId, hook.dedupeKey, hook.event, hook.merchantOrderId, safePayload, now),
  );
  if (inserted.length === 0) return { status: 200, body: { received: true, duplicate: true } };

  try {
    await processPaymentEvent(db, cfg, eventId, now);
  } catch {
    // Stored but not processed: the jobs worker retries unprocessed events.
  }
  return { status: 200, body: { received: true } };
}

export type EventResult =
  | 'paid'
  | 'paid_late_reallocated'
  | 'paid_unallocated'
  | 'duplicate_payment'
  | 'already_applied'
  | 'failed_recorded'
  | 'failure_ignored_after_success'
  | 'refund_recorded'
  | 'ignored'
  | 'unknown_attempt'
  | 'mismatch';

export async function processPaymentEvent(
  db: Db,
  cfg: KashierConfig,
  eventId: string,
  now: number,
): Promise<EventResult> {
  const ev = await first<{ id: string; payload: string; processed_at: number | null }>(
    db,
    `SELECT id, payload, processed_at FROM payment_events WHERE id = ?`,
    eventId,
  );
  if (!ev || ev.processed_at != null) return 'already_applied';
  const token = randomId();
  const claimed = await returning(
    db
      .prepare(
        `UPDATE payment_events SET attempts = attempts + 1, processing_token = ?, locked_until = ?
    WHERE id = ? AND processed_at IS NULL AND (locked_until IS NULL OR locked_until <= ?) RETURNING id`,
      )
      .bind(token, now + 60_000, eventId, now),
  );
  if (!claimed.length) return 'already_applied';
  try {
    const hook = parseKashierWebhook(parseJson(ev.payload, {}));
    const result = await applyHook(db, cfg, hook, now);
    await db
      .prepare(
        `UPDATE payment_events SET processed_at = ?, result = ?, error = NULL, processing_token = NULL, locked_until = NULL
      WHERE id = ? AND processing_token = ?`,
      )
      .bind(now, result, eventId, token)
      .run();
    return result;
  } catch (error) {
    await db
      .prepare(
        `UPDATE payment_events SET error = 'processing_failed', locked_until = NULL, processing_token = NULL WHERE id = ? AND processing_token = ?`,
      )
      .bind(eventId, token)
      .run();
    throw error;
  }
}

async function applyHook(
  db: Db,
  cfg: KashierConfig,
  hook: ParsedKashierWebhook,
  now: number,
): Promise<EventResult> {
  const attempt = await first<AttemptRow>(
    db,
    `SELECT * FROM payment_attempts WHERE merchant_order_id = ?`,
    hook.merchantOrderId,
  );
  if (!attempt) return 'unknown_attempt';
  const match = matchWebhookToAttempt(hook, {
    mode: attempt.mode,
    amount: attempt.amount_piastres,
    currency: 'EGP',
    merchantId: cfg.merchantId,
  });
  if (!match.ok) {
    await db.batch([
      orderEventStmt(
        db,
        attempt.order_id,
        'payment.mismatch',
        null,
        { attemptId: attempt.id, reason: match.reason, event: hook.event },
        now,
      ),
      enqueueStmt(
        db,
        'alert.staff',
        `mismatch:${hook.dedupeKey}`,
        { kind: 'payment_mismatch', orderId: attempt.order_id, reason: match.reason },
        now,
      ),
    ]);
    return 'mismatch';
  }

  if ((hook.event === 'pay' || hook.event === 'capture') && hook.status === 'succeeded') {
    // The outer event is unsigned: require a matching authenticated money-moving operation.
    if (attempt.mode !== cfg.mode) throw new Error('provider_reconciliation_required');
    const verified = await lookupKashierOrder(cfg, attempt.merchant_order_id);
    const paid = verified?.transactions.find(
      (tx) =>
        tx.id === hook.transactionId &&
        ['pay', 'capture'].includes(tx.operation) &&
        tx.state === 'succeeded' &&
        tx.amountPiastres === attempt.amount_piastres &&
        tx.currency === 'EGP',
    );
    if (
      !verified ||
      !paid ||
      verified.amountPiastres !== attempt.amount_piastres ||
      verified.id !== hook.kashierOrderId
    )
      throw new Error('provider_reconciliation_required');
    return applyPaymentSuccess(
      db,
      attempt,
      { transactionId: hook.transactionId, kashierOrderId: hook.kashierOrderId },
      now,
    );
  }
  if (hook.event === 'pay' && hook.status === 'failed') {
    if (attempt.status === 'succeeded') return 'failure_ignored_after_success';
    await db.batch([
      // A failed transaction may leave the hosted session open; retain the single open attempt.
      db
        .prepare(
          `UPDATE orders SET payment_status = 'failed', updated_at = ? WHERE id = ? AND payment_status IN ('unpaid','pending')`,
        )
        .bind(now, attempt.order_id),
      orderEventStmt(db, attempt.order_id, 'payment.failed', null, { attemptId: attempt.id }, now),
    ]);
    return 'failed_recorded';
  }
  if ((hook.event === 'refund' || hook.event === 'partial_refund') && hook.status === 'succeeded') {
    const amount =
      hook.amount ??
      (hook.data.refundedAmount != null ? safeAmount(hook.data.refundedAmount) : null);
    // The event type is outside the provider signature. Keep it for staff reconciliation;
    // an authenticated refund API response is the automatic confirmation authority.
    await db.batch([
      orderEventStmt(
        db,
        attempt.order_id,
        'refund.reconciliation_required',
        null,
        { transactionId: hook.transactionId, amount },
        now,
      ),
      enqueueStmt(
        db,
        'alert.staff',
        'refund_review:' + hook.dedupeKey,
        { kind: 'refund_reconciliation_required', orderId: attempt.order_id },
        now,
      ),
    ]);
    return 'ignored';
  }
  return 'ignored';
}

function safeAmount(v: unknown): number | null {
  try {
    return providerNumberToPiastres(v);
  } catch {
    return null;
  }
}

async function settledPaymentResult(
  db: Db,
  orderId: string,
  attemptId: string,
  now: number,
): Promise<EventResult> {
  const others = await first<{ n: number }>(
    db,
    "SELECT count(*) AS n FROM payment_attempts WHERE order_id=? AND status='succeeded' AND id<>?",
    orderId,
    attemptId,
  );
  if (!others?.n) return 'already_applied';
  const key = 'duplicate_payment:' + orderId;
  await db.batch([
    db
      .prepare(
        "UPDATE orders SET paid_piastres=(SELECT SUM(amount_piastres) FROM payment_attempts WHERE order_id=orders.id AND status='succeeded'),updated_at=? WHERE id=?",
      )
      .bind(now, orderId),
    db
      .prepare(
        "INSERT INTO order_events (order_id,type,actor_id,detail,created_at) SELECT ?,'payment.duplicate',NULL,?,? WHERE NOT EXISTS (SELECT 1 FROM outbox WHERE dedupe_key=?)",
      )
      .bind(orderId, JSON.stringify({ attemptId }), now, key),
    enqueueStmt(db, 'alert.staff', key, { kind: 'duplicate_payment', orderId, attemptId }, now),
  ]);
  await recomputeRefundState(db, orderId, now);
  return 'duplicate_payment';
}

/**
 * Applies a verified, matched payment success exactly once:
 *  - awaiting_payment with live reservations → confirmed + paid (reservations converted);
 *  - order expired/cancelled → try to re-reserve atomically (late success); if stock is gone,
 *    the order becomes paid_unallocated, fulfilment stays blocked and staff are alerted;
 *  - order already paid by another attempt → duplicate payment alert (refund path).
 */
export async function applyPaymentSuccess(
  db: Db,
  attempt: AttemptRow,
  ids: { transactionId: string | null; kashierOrderId: string | null },
  now: number,
): Promise<EventResult> {
  await returning(
    db
      .prepare(
        `UPDATE payment_attempts SET status = 'succeeded', provider_transaction_id = COALESCE(?, provider_transaction_id),
           provider_order_id = COALESCE(?, provider_order_id), updated_at = ? WHERE id = ? AND status <> 'succeeded' RETURNING id`,
      )
      .bind(ids.transactionId, ids.kashierOrderId, now, attempt.id),
  );

  // Order-level idempotency: replays (or a crash between the two writes) re-run the order
  // transition, which is itself guarded by the order's current status.
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, attempt.order_id);
  if (!order) return 'unknown_attempt';
  const notify = enqueueStmt(
    db,
    'email.payment_received',
    `payment_received:${order.id}`,
    { orderId: order.id, locale: order.locale },
    now,
  );

  if (
    ['paid', 'refund_pending', 'partially_refunded', 'refunded', 'paid_unallocated'].includes(
      order.payment_status,
    )
  ) {
    return settledPaymentResult(db, order.id, attempt.id, now);
  }

  if (order.status === 'awaiting_payment') {
    try {
      const [confirmed] = await db.batch([
        db
          .prepare(
            `UPDATE orders SET status = 'confirmed', payment_status = 'paid', paid_piastres = (SELECT SUM(amount_piastres) FROM payment_attempts WHERE order_id=orders.id AND status='succeeded'), updated_at = ?
             WHERE id = ? AND status = 'awaiting_payment' RETURNING id`,
          )
          .bind(now, order.id),
        orderEventStmt(db, order.id, 'payment.succeeded', null, { attemptId: attempt.id }, now),
        notify,
      ]);
      if ((confirmed?.results ?? []).length === 1) return 'paid';
    } catch (err) {
      if (dbGuardCode(err) !== 'TIRAZE_RESERVATION_MISSING') throw err;
    }
    // Reservations were no longer active: fall through to cancellation + late path.
    await db
      .prepare(
        `UPDATE orders SET status = 'cancelled', cancel_reason = 'expired', updated_at = ? WHERE id = ? AND status = 'awaiting_payment'`,
      )
      .bind(now, order.id)
      .run();
    return applyLateSuccess(db, order.id, attempt.id, now);
  }
  if (order.status === 'cancelled') return applyLateSuccess(db, order.id, attempt.id, now);
  // Any other state (confirmed COD, completed…) should never receive an online payment.
  return (await markUnallocated(db, order.id, attempt.id, 'unexpected_order_state', now))
    ? 'paid_unallocated'
    : settledPaymentResult(db, order.id, attempt.id, now);
}

async function applyLateSuccess(
  db: Db,
  orderId: string,
  attemptId: string,
  now: number,
): Promise<EventResult> {
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, orderId);
  if (!order) return 'unknown_attempt';
  if (
    ['paid', 'paid_unallocated', 'refund_pending', 'partially_refunded', 'refunded'].includes(
      order.payment_status,
    )
  )
    return settledPaymentResult(db, orderId, attemptId, now);
  if (order.cancel_reason !== 'expired') {
    // Cancelled deliberately (e.g. by staff): never silently re-open it.
    return (await markUnallocated(db, orderId, attemptId, 'order_cancelled', now))
      ? 'paid_unallocated'
      : settledPaymentResult(db, orderId, attemptId, now);
  }
  const lines = await all<{ sku_id: string; qty: number }>(
    db,
    `SELECT sku_id, qty FROM order_lines WHERE order_id = ?`,
    orderId,
  );
  try {
    const guard = randomId();
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO operation_guards (id, ok) SELECT ?, CASE WHEN EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'cancelled' AND cancel_reason = 'expired' AND paid_piastres = 0) THEN 1 ELSE 0 END`,
        )
        .bind(guard, orderId),
      ...lines.map((l) =>
        db
          .prepare(
            `INSERT INTO reservations (id, order_id, sku_id, qty, status, expires_at, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
          )
          .bind(randomId(), orderId, l.sku_id, l.qty, now + 60_000, now),
      ),
      db
        .prepare(
          `UPDATE orders SET status = 'confirmed', payment_status = 'paid', paid_piastres = (SELECT SUM(amount_piastres) FROM payment_attempts WHERE order_id=orders.id AND status='succeeded'), cancel_reason = NULL, updated_at = ?
           WHERE id = ? AND status = 'cancelled' AND cancel_reason = 'expired' RETURNING id`,
        )
        .bind(now, orderId),
      orderEventStmt(db, orderId, 'payment.late_success_reallocated', null, { attemptId }, now),
      enqueueStmt(
        db,
        'email.payment_received',
        `payment_received:${orderId}`,
        { orderId, locale: order.locale },
        now,
      ),
      db.prepare(`DELETE FROM operation_guards WHERE id = ?`).bind(guard),
    ]);
    const updated = results[lines.length + 1];
    if ((updated?.results ?? []).length === 1) return 'paid_late_reallocated';
  } catch (err) {
    if (dbGuardCode(err) === 'TIRAZE_OPERATION_CONFLICT')
      return settledPaymentResult(db, orderId, attemptId, now);
    if (dbGuardCode(err) !== 'TIRAZE_INSUFFICIENT_STOCK') throw err;
  }
  return (await markUnallocated(db, orderId, attemptId, 'stock_unavailable_after_expiry', now))
    ? 'paid_unallocated'
    : settledPaymentResult(db, orderId, attemptId, now);
}

async function markUnallocated(
  db: Db,
  orderId: string,
  attemptId: string,
  reason: string,
  now: number,
) {
  const guardId = randomId();
  try {
    await db.batch([
      db
        .prepare(
          "INSERT INTO operation_guards (id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM orders WHERE id=? AND payment_status NOT IN ('paid','paid_unallocated','refund_pending','partially_refunded','refunded')) THEN 1 ELSE 0 END",
        )
        .bind(guardId, orderId),
      db
        .prepare(
          `UPDATE orders SET payment_status = 'paid_unallocated', paid_piastres = (SELECT SUM(amount_piastres) FROM payment_attempts WHERE order_id=orders.id AND status='succeeded'), updated_at = ? WHERE id = ? AND payment_status NOT IN ('paid','paid_unallocated','refund_pending','partially_refunded','refunded')`,
        )
        .bind(now, orderId),
      orderEventStmt(db, orderId, 'payment.paid_unallocated', null, { attemptId, reason }, now),
      enqueueStmt(
        db,
        'alert.staff',
        `paid_unallocated:${orderId}:${attemptId}`,
        { kind: 'paid_unallocated', orderId, attemptId, reason },
        now,
      ),
      db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guardId),
    ]);
    return true;
  } catch (error) {
    if (dbGuardCode(error) === 'TIRAZE_OPERATION_CONFLICT') return false;
    throw error;
  }
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

function refundedStatus(paid: number, refunded: number, openRefunds: number): string {
  if (openRefunds > 0) return 'refund_pending';
  if (refunded >= paid && paid > 0) return 'refunded';
  if (refunded > 0) return 'partially_refunded';
  return 'paid';
}

async function recomputeRefundState(db: Db, orderId: string, now: number) {
  // Compute from current rows in one atomic statement; a pre-read aggregate can race another refund.
  await db
    .prepare(
      `UPDATE orders SET
    refunded_piastres = COALESCE((SELECT SUM(amount_piastres) FROM refunds WHERE order_id=orders.id AND status='succeeded'),0),
    payment_status = CASE
      WHEN EXISTS(SELECT 1 FROM refunds WHERE order_id=orders.id AND status IN ('requested','pending','unknown')) THEN 'refund_pending'
      WHEN COALESCE((SELECT SUM(amount_piastres) FROM refunds WHERE order_id=orders.id AND status='succeeded'),0) >= paid_piastres AND paid_piastres>0 THEN 'refunded'
      WHEN EXISTS(SELECT 1 FROM refunds WHERE order_id=orders.id AND status='succeeded') THEN 'partially_refunded'
      WHEN status='cancelled' AND EXISTS(SELECT 1 FROM order_events WHERE order_id=orders.id AND type='payment.paid_unallocated') THEN 'paid_unallocated'
      ELSE 'paid' END,
    updated_at=? WHERE id=?`,
    )
    .bind(now, orderId)
    .run();
}

export type RefundRequestResult =
  | {
      ok: true;
      refundId: string;
      state: 'succeeded' | 'pending' | 'unknown' | 'failed';
      replayed: boolean;
    }
  | {
      ok: false;
      error:
        | 'order_not_found'
        | 'not_refundable'
        | 'exceeds_paid'
        | 'idempotency_conflict'
        | 'payments_not_configured';
    };

/**
 * Staff refund (finance role, re-authenticated, idempotent). A recorded request is not a
 * refund: the state follows the provider response and later webhook/reconciliation.
 */
export async function requestRefund(
  db: Db,
  cfg: KashierConfig | null,
  p: {
    orderId: string;
    amountPiastres: number;
    paymentAttemptId?: string;
    reason: string;
    idempotencyKey: string;
    actorId: string;
    now: number;
    fetchImpl?: FetchLike;
  },
): Promise<RefundRequestResult> {
  if (!cfg) return { ok: false, error: 'payments_not_configured' };
  if (!Number.isSafeInteger(p.amountPiastres) || p.amountPiastres <= 0)
    return { ok: false, error: 'exceeds_paid' };
  const existing = await first<{
    id: string;
    order_id: string;
    amount_piastres: number;
    status: string;
    reason: string;
    payment_attempt_id: string;
  }>(
    db,
    `SELECT id, order_id, amount_piastres, status, reason, payment_attempt_id FROM refunds WHERE idempotency_key = ?`,
    p.idempotencyKey,
  );
  if (existing) {
    if (
      existing.order_id !== p.orderId ||
      existing.amount_piastres !== p.amountPiastres ||
      existing.reason !== p.reason ||
      (p.paymentAttemptId != null && existing.payment_attempt_id !== p.paymentAttemptId)
    )
      return { ok: false, error: 'idempotency_conflict' };
    return {
      ok: true,
      refundId: existing.id,
      state: existing.status === 'requested' ? 'unknown' : (existing.status as 'succeeded'),
      replayed: true,
    };
  }
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, p.orderId);
  if (!order) return { ok: false, error: 'order_not_found' };
  if (
    order.payment_method !== 'kashier' ||
    !['paid', 'partially_refunded', 'paid_unallocated', 'refund_pending'].includes(
      order.payment_status,
    )
  ) {
    return { ok: false, error: 'not_refundable' };
  }
  const attempt = await first<{
    id: string;
    provider_order_id: string | null;
    provider_transaction_id: string | null;
  }>(
    db,
    `SELECT a.id,a.provider_order_id,a.provider_transaction_id FROM payment_attempts a WHERE a.order_id=? AND a.status='succeeded' AND (? IS NULL OR a.id=?) AND a.amount_piastres-COALESCE((SELECT SUM(r.amount_piastres) FROM refunds r WHERE r.payment_attempt_id=a.id AND r.status IN ('requested','pending','unknown','succeeded')),0)>=? ORDER BY a.created_at LIMIT 1`,
    order.id,
    p.paymentAttemptId ?? null,
    p.paymentAttemptId ?? null,
    p.amountPiastres,
  );
  if (!attempt?.provider_order_id) {
    if (await first(db, 'SELECT id FROM refunds WHERE idempotency_key=?', p.idempotencyKey))
      return requestRefund(db, cfg, p);
    return { ok: false, error: 'exceeds_paid' };
  }

  const refundId = randomId();
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO refunds (id, order_id, payment_attempt_id, amount_piastres, reason, status, idempotency_key, actor_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)`,
        )
        .bind(
          refundId,
          order.id,
          attempt.id,
          p.amountPiastres,
          p.reason,
          p.idempotencyKey,
          p.actorId,
          p.now,
          p.now,
        ),
      db
        .prepare(`UPDATE orders SET payment_status = 'refund_pending', updated_at = ? WHERE id = ?`)
        .bind(p.now, order.id),
      orderEventStmt(
        db,
        order.id,
        'refund.requested',
        p.actorId,
        { refundId, amountPiastres: p.amountPiastres },
        p.now,
      ),
    ]);
  } catch (err) {
    if (
      isUniqueViolation(err, 'refunds.idempotency_key') ||
      dbGuardCode(err) === 'TIRAZE_REFUND_EXCEEDS_PAID'
    ) {
      const raced = await first(
        db,
        'SELECT id FROM refunds WHERE idempotency_key=?',
        p.idempotencyKey,
      );
      if (raced) return requestRefund(db, cfg, p);
    }
    if (dbGuardCode(err) === 'TIRAZE_REFUND_EXCEEDS_PAID')
      return { ok: false, error: 'exceeds_paid' };
    throw err;
  }

  let state: 'succeeded' | 'pending' | 'unknown' | 'failed' = 'unknown';
  let providerRef: string | null = null;
  try {
    const res = await refundKashierOrder(
      cfg,
      {
        kashierOrderId: attempt.provider_order_id,
        amount: p.amountPiastres,
        reason: p.reason,
        targetTransactionId: attempt.provider_transaction_id,
      },
      p.fetchImpl,
    );
    providerRef = res.providerReference;
    state =
      res.state === 'succeeded'
        ? 'succeeded'
        : res.state === 'failed'
          ? 'failed'
          : res.state === 'pending'
            ? 'pending'
            : 'unknown';
  } catch (err) {
    state = err instanceof KashierRejectedError ? 'failed' : 'unknown';
  }
  await db.batch([
    db
      .prepare(
        `UPDATE refunds SET status = ?, provider_reference = COALESCE(?, provider_reference), updated_at = ? WHERE id = ? AND status <> 'succeeded'`,
      )
      .bind(state, providerRef, p.now, refundId),
    orderEventStmt(db, order.id, `refund.${state}`, p.actorId, { refundId }, p.now),
    ...(state === 'unknown' || state === 'failed'
      ? [
          enqueueStmt(
            db,
            'alert.staff',
            `refund_${state}:${refundId}`,
            { kind: `refund_${state}`, orderId: order.id, refundId },
            p.now,
          ),
        ]
      : []),
  ]);
  await recomputeRefundState(db, order.id, p.now);
  return { ok: true, refundId, state, replayed: false };
}

// ─── Reconciliation (jobs worker) ────────────────────────────────────────────

/**
 * Looks up attempts whose outcome is unknown or still pending after `olderThanMs`.
 * Only an explicit provider success (with matching amount/currency) is applied; an unknown
 * lookup leaves the attempt for the next run and for staff review.
 */
export async function reconcileAttempts(
  db: Db,
  cfg: KashierConfig,
  now: number,
  opts: { olderThanMs?: number; limit?: number; fetchImpl?: typeof fetch } = {},
) {
  const rows = await all<AttemptRow>(
    db,
    `SELECT * FROM payment_attempts WHERE status IN ('unknown','pending','creating') AND updated_at<=? AND (last_checked_at IS NULL OR last_checked_at<=?) ORDER BY updated_at LIMIT ?`,
    now - (opts.olderThanMs ?? 300000),
    now - 300000,
    opts.limit ?? 3,
  );
  const out: Array<{ attemptId: string; outcome: string }> = [];
  for (const a of rows) {
    await db
      .prepare('UPDATE payment_attempts SET last_checked_at=? WHERE id=?')
      .bind(now, a.id)
      .run();
    if (a.mode !== cfg.mode) {
      out.push({ attemptId: a.id, outcome: 'mode_mismatch' });
      continue;
    }
    try {
      const order = await lookupKashierOrder(cfg, a.merchant_order_id, opts.fetchImpl);
      const transactions =
        order?.transactions.filter(
          (tx) =>
            ['pay', 'capture'].includes(tx.operation) &&
            tx.state === 'succeeded' &&
            tx.currency === 'EGP' &&
            tx.amountPiastres === a.amount_piastres,
        ) ?? [];
      if (!order || order.amountPiastres !== a.amount_piastres || !transactions.length) {
        out.push({ attemptId: a.id, outcome: 'unresolved' });
        continue;
      }
      const tx = transactions[0]!;
      out.push({
        attemptId: a.id,
        outcome: await applyPaymentSuccess(
          db,
          a,
          { transactionId: tx.id, kashierOrderId: order.id },
          now,
        ),
      });
      if (transactions.length > 1)
        await enqueueStmt(
          db,
          'alert.staff',
          'multiple_provider_transactions:' + a.id,
          {
            kind: 'multiple_successful_provider_transactions',
            orderId: a.order_id,
            attemptId: a.id,
          },
          now,
        ).run();
    } catch {
      out.push({ attemptId: a.id, outcome: 'lookup_failed' });
    }
  }
  return out;
}

/** Re-processes inbox rows that were stored but not processed (e.g. a crash after the ack). */
export async function processPendingEvents(
  db: Db,
  cfg: KashierConfig,
  now: number,
  limit = 20,
): Promise<number> {
  const rows = await all<{ id: string }>(
    db,
    `SELECT id FROM payment_events WHERE processed_at IS NULL AND attempts < 10 ORDER BY received_at LIMIT ?`,
    limit,
  );
  let n = 0;
  for (const r of rows) {
    try {
      await processPaymentEvent(db, cfg, r.id, now);
      n++;
    } catch (err) {
      await db
        .prepare(`UPDATE payment_events SET error = ? WHERE id = ?`)
        .bind(String((err as Error).message).slice(0, 300), r.id)
        .run();
    }
  }
  const exhausted = await all<{ id: string }>(
    db,
    'SELECT id FROM payment_events WHERE processed_at IS NULL AND attempts>=10 LIMIT 10',
  );
  for (const event of exhausted)
    await enqueueStmt(
      db,
      'alert.staff',
      'payment_event_exhausted:' + event.id,
      { kind: 'payment_event_requires_review', eventId: event.id },
      now,
    ).run();
  return n;
}

export async function orderPaymentView(db: Db, orderId: string) {
  return all<{
    id: string;
    status: string;
    amount_piastres: number;
    merchant_order_id: string;
    created_at: number;
    updated_at: number;
  }>(
    db,
    `SELECT id, status, amount_piastres, merchant_order_id, created_at, updated_at FROM payment_attempts WHERE order_id = ? ORDER BY created_at`,
    orderId,
  );
}

export async function reconcileRefund(
  db: Db,
  cfg: KashierConfig,
  p: {
    refundId: string;
    providerTransactionId?: string;
    actorId: string | null;
    now: number;
    fetchImpl?: typeof fetch;
  },
) {
  const refund = await first<{
    id: string;
    order_id: string;
    status: string;
    amount_piastres: number;
    provider_reference: string | null;
    mode: string;
    merchant_order_id: string;
    provider_order_id: string | null;
    provider_transaction_id: string | null;
  }>(
    db,
    `SELECT r.*,a.mode,a.merchant_order_id,a.provider_order_id,a.provider_transaction_id FROM refunds r JOIN payment_attempts a ON a.id=r.payment_attempt_id WHERE r.id=?`,
    p.refundId,
  );
  if (!refund || refund.mode !== cfg.mode) return { ok: false, error: 'refund_not_found' };
  if (refund.status === 'succeeded') return { ok: true, state: 'succeeded' };
  if (
    refund.provider_reference &&
    p.providerTransactionId &&
    p.providerTransactionId !== refund.provider_reference
  )
    return { ok: false, error: 'provider_reference_conflict' };
  const reference = p.providerTransactionId ?? refund.provider_reference;
  if (!reference) return { ok: false, error: 'provider_reference_required' };
  const order = await lookupKashierOrder(cfg, refund.merchant_order_id, p.fetchImpl);
  if (!order || order.id !== refund.provider_order_id)
    return { ok: false, error: 'provider_unresolved' };
  const tx = order.transactions.find(
    (tx) =>
      tx.id === reference &&
      ['refund', 'partial_refund'].includes(tx.operation) &&
      tx.amountPiastres === refund.amount_piastres &&
      tx.currency === 'EGP' &&
      (!tx.target || tx.target === refund.provider_transaction_id),
  );
  if (!tx || !['succeeded', 'failed'].includes(tx.state))
    return { ok: false, error: 'provider_unresolved' };
  await db.batch([
    db
      .prepare(
        "UPDATE refunds SET status=?,provider_reference=?,updated_at=? WHERE id=? AND status IN ('requested','pending','unknown','failed')",
      )
      .bind(tx.state, reference, p.now, refund.id),
    orderEventStmt(
      db,
      refund.order_id,
      'refund.reconciled',
      p.actorId,
      { refundId: refund.id, providerReference: reference, state: tx.state },
      p.now,
    ),
  ]);
  await recomputeRefundState(db, refund.order_id, p.now);
  return { ok: true, state: tx.state };
}
export async function reconcileOpenRefunds(db: Db, cfg: KashierConfig, now: number, limit = 3) {
  const refunds = await all<{ id: string }>(
    db,
    "SELECT id FROM refunds WHERE status IN ('pending','unknown','requested') AND provider_reference IS NOT NULL ORDER BY updated_at LIMIT ?",
    limit,
  );
  for (const r of refunds) {
    try {
      await reconcileRefund(db, cfg, { refundId: r.id, actorId: null, now });
    } catch {}
  }
}
