import {
  createKashierSession,
  getKashierSessionPayment,
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
import { all, dbGuardCode, first, parseJson, returning, type Db } from './sql.ts';

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
  | { ok: false; error: 'order_not_found' | 'order_not_payable' | 'reservation_expired' | 'payment_unresolved' | 'provider_rejected' | 'provider_unknown' | 'payments_not_configured' };

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
export async function startKashierPayment(db: Db, cfg: KashierConfig | null, p: StartPaymentParams): Promise<StartPaymentResult> {
  if (!cfg) return { ok: false, error: 'payments_not_configured' };
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ? AND user_id = ?`, p.orderId, p.userId);
  if (!order) return { ok: false, error: 'order_not_found' };
  if (order.payment_method !== 'kashier' || order.status !== 'awaiting_payment' || !['unpaid', 'pending', 'failed'].includes(order.payment_status)) {
    return { ok: false, error: 'order_not_payable' };
  }
  // Leave a minute of margin so the hosted page cannot outlive the reservation.
  if (order.reservation_expires_at - 60_000 <= p.now) return { ok: false, error: 'reservation_expired' };

  const open = await first<AttemptRow>(db, `SELECT * FROM payment_attempts WHERE order_id = ? AND status IN ('creating','unknown','pending')`, order.id);
  if (open) {
    if (open.status === 'pending' && open.session_url) return { ok: true, redirectUrl: open.session_url, attemptId: open.id, reused: true };
    return { ok: false, error: 'payment_unresolved' };
  }

  const count = await first<{ n: number }>(db, `SELECT COUNT(*) AS n FROM payment_attempts WHERE order_id = ?`, order.id);
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
        .prepare(`UPDATE payment_attempts SET status = 'pending', session_id = ?, session_url = ?, updated_at = ? WHERE id = ? AND status = 'creating'`)
        .bind(session.sessionId, session.sessionUrl, p.now, attemptId),
      db.prepare(`UPDATE orders SET payment_status = 'pending', updated_at = ? WHERE id = ? AND payment_status IN ('unpaid','failed')`).bind(p.now, order.id),
      orderEventStmt(db, order.id, 'payment.session_created', order.user_id, { attemptId, merchantOrderId }, p.now),
    ]);
    return { ok: true, redirectUrl: session.sessionUrl, attemptId, reused: false };
  } catch (err) {
    if (err instanceof KashierRejectedError) {
      await db.batch([
        db.prepare(`UPDATE payment_attempts SET status = 'rejected', updated_at = ? WHERE id = ? AND status = 'creating'`).bind(p.now, attemptId),
        orderEventStmt(db, order.id, 'payment.session_rejected', null, { attemptId, httpStatus: err.status }, p.now),
      ]);
      return { ok: false, error: 'provider_rejected' };
    }
    const reason = err instanceof KashierUnknownOutcomeError ? err.message : 'unexpected_error';
    await db.batch([
      db.prepare(`UPDATE payment_attempts SET status = 'unknown', updated_at = ? WHERE id = ? AND status = 'creating'`).bind(p.now, attemptId),
      orderEventStmt(db, order.id, 'payment.session_unknown', null, { attemptId, reason }, p.now),
      enqueueStmt(db, 'alert.staff', `attempt_unknown:${attemptId}`, { kind: 'payment_attempt_unknown', orderId: order.id, attemptId }, p.now),
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
  const valid = await verifyKashierSignature(data as Record<string, unknown>, signature, cfg.apiKey);
  if (!valid) return { status: 401, body: { error: 'invalid_signature' } };

  let hook: ParsedKashierWebhook;
  try {
    hook = parseKashierWebhook(parsedBody);
  } catch (err) {
    if (err instanceof WebhookShapeError) return { status: 400, body: { error: 'invalid_payload' } };
    throw err;
  }

  const eventId = randomId();
  const inserted = await returning(
    db
      .prepare(
        `INSERT INTO payment_events (id, provider, dedupe_key, event_type, merchant_order_id, payload, received_at)
         VALUES (?, 'kashier', ?, ?, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id`,
      )
      .bind(eventId, hook.dedupeKey, hook.event, hook.merchantOrderId, rawBody, now),
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

export async function processPaymentEvent(db: Db, cfg: KashierConfig, eventId: string, now: number): Promise<EventResult> {
  const ev = await first<{ id: string; payload: string; processed_at: number | null }>(db, `SELECT id, payload, processed_at FROM payment_events WHERE id = ?`, eventId);
  if (!ev || ev.processed_at) return 'already_applied';
  await db.prepare(`UPDATE payment_events SET attempts = attempts + 1 WHERE id = ?`).bind(eventId).run();
  const hook = parseKashierWebhook(parseJson(ev.payload, {}));
  const result = await applyHook(db, cfg, hook, now);
  await db.prepare(`UPDATE payment_events SET processed_at = ?, result = ?, error = NULL WHERE id = ?`).bind(now, result, eventId).run();
  return result;
}

async function applyHook(db: Db, cfg: KashierConfig, hook: ParsedKashierWebhook, now: number): Promise<EventResult> {
  const attempt = await first<AttemptRow>(db, `SELECT * FROM payment_attempts WHERE merchant_order_id = ?`, hook.merchantOrderId);
  if (!attempt) return 'unknown_attempt';
  const match = matchWebhookToAttempt(hook, { mode: attempt.mode, amount: attempt.amount_piastres, currency: 'EGP', merchantId: cfg.merchantId });
  if (!match.ok) {
    await db.batch([
      orderEventStmt(db, attempt.order_id, 'payment.mismatch', null, { attemptId: attempt.id, reason: match.reason, event: hook.event }, now),
      enqueueStmt(db, 'alert.staff', `mismatch:${hook.dedupeKey}`, { kind: 'payment_mismatch', orderId: attempt.order_id, reason: match.reason }, now),
    ]);
    return 'mismatch';
  }

  if ((hook.event === 'pay' || hook.event === 'capture') && hook.status === 'succeeded') {
    return applyPaymentSuccess(db, attempt, { transactionId: hook.transactionId, kashierOrderId: hook.kashierOrderId }, now);
  }
  if (hook.event === 'pay' && hook.status === 'failed') {
    if (attempt.status === 'succeeded') return 'failure_ignored_after_success';
    await db.batch([
      db
        .prepare(`UPDATE payment_attempts SET status = 'failed', provider_transaction_id = COALESCE(?, provider_transaction_id), updated_at = ? WHERE id = ? AND status IN ('creating','unknown','pending','failed')`)
        .bind(hook.transactionId, now, attempt.id),
      db.prepare(`UPDATE orders SET payment_status = 'failed', updated_at = ? WHERE id = ? AND payment_status IN ('unpaid','pending')`).bind(now, attempt.order_id),
      orderEventStmt(db, attempt.order_id, 'payment.failed', null, { attemptId: attempt.id }, now),
    ]);
    return 'failed_recorded';
  }
  if ((hook.event === 'refund' || hook.event === 'partial_refund') && hook.status === 'succeeded') {
    const amount = hook.amount ?? (hook.data.refundedAmount != null ? safeAmount(hook.data.refundedAmount) : null);
    return applyRefundConfirmation(db, attempt.order_id, hook.transactionId, amount, now);
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
  const marked = await returning(
    db
      .prepare(
        `UPDATE payment_attempts SET status = 'succeeded', provider_transaction_id = COALESCE(?, provider_transaction_id),
           provider_order_id = COALESCE(?, provider_order_id), updated_at = ? WHERE id = ? AND status <> 'succeeded' RETURNING id`,
      )
      .bind(ids.transactionId, ids.kashierOrderId, now, attempt.id),
  );
  const newlySucceeded = marked.length === 1;

  // Order-level idempotency: replays (or a crash between the two writes) re-run the order
  // transition, which is itself guarded by the order's current status.
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, attempt.order_id);
  if (!order) return 'unknown_attempt';
  const notify = enqueueStmt(db, 'email.payment_received', `payment_received:${order.id}`, { orderId: order.id, locale: order.locale }, now);

  if (['paid', 'refund_pending', 'partially_refunded', 'refunded', 'paid_unallocated'].includes(order.payment_status)) {
    const others = await first<{ n: number }>(
      db,
      `SELECT COUNT(*) AS n FROM payment_attempts WHERE order_id = ? AND status = 'succeeded' AND id <> ?`,
      order.id,
      attempt.id,
    );
    if (!newlySucceeded || !others?.n) return 'already_applied';
    await db.batch([
      orderEventStmt(db, order.id, 'payment.duplicate', null, { attemptId: attempt.id }, now),
      enqueueStmt(db, 'alert.staff', `duplicate_payment:${attempt.id}`, { kind: 'duplicate_payment', orderId: order.id, attemptId: attempt.id }, now),
    ]);
    return 'duplicate_payment';
  }

  if (order.status === 'awaiting_payment') {
    try {
      const [confirmed] = await db.batch([
        db
          .prepare(
            `UPDATE orders SET status = 'confirmed', payment_status = 'paid', paid_piastres = total_piastres, updated_at = ?
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
      .prepare(`UPDATE orders SET status = 'cancelled', cancel_reason = 'expired', updated_at = ? WHERE id = ? AND status = 'awaiting_payment'`)
      .bind(now, order.id)
      .run();
    return applyLateSuccess(db, order.id, attempt.id, now);
  }
  if (order.status === 'cancelled') return applyLateSuccess(db, order.id, attempt.id, now);
  // Any other state (confirmed COD, completed…) should never receive an online payment.
  await markUnallocated(db, order.id, attempt.id, 'unexpected_order_state', now);
  return 'paid_unallocated';
}

async function applyLateSuccess(db: Db, orderId: string, attemptId: string, now: number): Promise<EventResult> {
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, orderId);
  if (!order) return 'unknown_attempt';
  if (order.cancel_reason !== 'expired') {
    // Cancelled deliberately (e.g. by staff): never silently re-open it.
    await markUnallocated(db, orderId, attemptId, 'order_cancelled', now);
    return 'paid_unallocated';
  }
  const lines = await all<{ sku_id: string; qty: number }>(db, `SELECT sku_id, qty FROM order_lines WHERE order_id = ?`, orderId);
  try {
    const results = await db.batch([
      ...lines.map((l) =>
        db
          .prepare(`INSERT INTO reservations (id, order_id, sku_id, qty, status, expires_at, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`)
          .bind(randomId(), orderId, l.sku_id, l.qty, now + 60_000, now),
      ),
      db
        .prepare(
          `UPDATE orders SET status = 'confirmed', payment_status = 'paid', paid_piastres = total_piastres, cancel_reason = NULL, updated_at = ?
           WHERE id = ? AND status = 'cancelled' AND cancel_reason = 'expired' RETURNING id`,
        )
        .bind(now, orderId),
      orderEventStmt(db, orderId, 'payment.late_success_reallocated', null, { attemptId }, now),
      enqueueStmt(db, 'email.payment_received', `payment_received:${orderId}`, { orderId, locale: order.locale }, now),
    ]);
    const updated = results[lines.length];
    if ((updated?.results ?? []).length === 1) return 'paid_late_reallocated';
  } catch (err) {
    if (dbGuardCode(err) !== 'TIRAZE_INSUFFICIENT_STOCK') throw err;
  }
  await markUnallocated(db, orderId, attemptId, 'stock_unavailable_after_expiry', now);
  return 'paid_unallocated';
}

async function markUnallocated(db: Db, orderId: string, attemptId: string, reason: string, now: number) {
  await db.batch([
    db
      .prepare(`UPDATE orders SET payment_status = 'paid_unallocated', paid_piastres = total_piastres, updated_at = ? WHERE id = ? AND payment_status NOT IN ('paid','paid_unallocated','refund_pending','partially_refunded','refunded')`)
      .bind(now, orderId),
    orderEventStmt(db, orderId, 'payment.paid_unallocated', null, { attemptId, reason }, now),
    enqueueStmt(db, 'alert.staff', `paid_unallocated:${orderId}:${attemptId}`, { kind: 'paid_unallocated', orderId, attemptId, reason }, now),
  ]);
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

function refundedStatus(paid: number, refunded: number, openRefunds: number): string {
  if (openRefunds > 0) return 'refund_pending';
  if (refunded >= paid && paid > 0) return 'refunded';
  if (refunded > 0) return 'partially_refunded';
  return 'paid';
}

async function recomputeRefundState(db: Db, orderId: string, now: number) {
  const agg = await first<{ paid: number; done: number; open: number; unallocated: number }>(
    db,
    `SELECT o.paid_piastres AS paid,
       COALESCE((SELECT SUM(amount_piastres) FROM refunds WHERE order_id = o.id AND status = 'succeeded'), 0) AS done,
       COALESCE((SELECT COUNT(*) FROM refunds WHERE order_id = o.id AND status IN ('requested','pending','unknown')), 0) AS open,
       CASE WHEN EXISTS (SELECT 1 FROM order_events WHERE order_id = o.id AND type = 'payment.paid_unallocated') AND o.status <> 'confirmed' THEN 1 ELSE 0 END AS unallocated
     FROM orders o WHERE o.id = ?`,
    orderId,
  );
  if (!agg) return;
  let status = refundedStatus(agg.paid, agg.done, agg.open);
  if (status === 'paid' && agg.unallocated) status = 'paid_unallocated';
  await db
    .prepare(`UPDATE orders SET refunded_piastres = ?, payment_status = ?, updated_at = ? WHERE id = ?`)
    .bind(Math.min(agg.done, agg.paid), status, now, orderId)
    .run();
}

async function applyRefundConfirmation(db: Db, orderId: string, providerRef: string | null, amount: number | null, now: number): Promise<EventResult> {
  const refund =
    (providerRef
      ? await first<{ id: string }>(db, `SELECT id FROM refunds WHERE order_id = ? AND provider_reference = ? AND status <> 'succeeded'`, orderId, providerRef)
      : null) ??
    (amount != null
      ? await first<{ id: string }>(
          db,
          `SELECT id FROM refunds WHERE order_id = ? AND amount_piastres = ? AND status IN ('pending','unknown','requested') ORDER BY created_at LIMIT 1`,
          orderId,
          amount,
        )
      : null);
  if (!refund) {
    await db.batch([
      orderEventStmt(db, orderId, 'refund.unmatched_provider_event', null, { providerRef, amount }, now),
      enqueueStmt(db, 'alert.staff', `refund_unmatched:${orderId}:${providerRef ?? amount}`, { kind: 'refund_unmatched', orderId }, now),
    ]);
    return 'ignored';
  }
  await db.prepare(`UPDATE refunds SET status = 'succeeded', provider_reference = COALESCE(?, provider_reference), updated_at = ? WHERE id = ?`).bind(providerRef, now, refund.id).run();
  await recomputeRefundState(db, orderId, now);
  return 'refund_recorded';
}

export type RefundRequestResult =
  | { ok: true; refundId: string; state: 'succeeded' | 'pending' | 'unknown' | 'failed'; replayed: boolean }
  | { ok: false; error: 'order_not_found' | 'not_refundable' | 'exceeds_paid' | 'idempotency_conflict' | 'payments_not_configured' };

/**
 * Staff refund (finance role, re-authenticated, idempotent). A recorded request is not a
 * refund: the state follows the provider response and later webhook/reconciliation.
 */
export async function requestRefund(
  db: Db,
  cfg: KashierConfig | null,
  p: { orderId: string; amountPiastres: number; reason: string; idempotencyKey: string; actorId: string; now: number; fetchImpl?: FetchLike },
): Promise<RefundRequestResult> {
  if (!cfg) return { ok: false, error: 'payments_not_configured' };
  const existing = await first<{ id: string; order_id: string; amount_piastres: number; status: string }>(
    db,
    `SELECT id, order_id, amount_piastres, status FROM refunds WHERE idempotency_key = ?`,
    p.idempotencyKey,
  );
  if (existing) {
    if (existing.order_id !== p.orderId || existing.amount_piastres !== p.amountPiastres) return { ok: false, error: 'idempotency_conflict' };
    return { ok: true, refundId: existing.id, state: existing.status === 'requested' ? 'unknown' : (existing.status as 'succeeded'), replayed: true };
  }
  const order = await first<OrderRow>(db, `SELECT * FROM orders WHERE id = ?`, p.orderId);
  if (!order) return { ok: false, error: 'order_not_found' };
  if (order.payment_method !== 'kashier' || !['paid', 'partially_refunded', 'paid_unallocated', 'refund_pending'].includes(order.payment_status)) {
    return { ok: false, error: 'not_refundable' };
  }
  const attempt = await first<{ id: string; provider_order_id: string | null; provider_transaction_id: string | null }>(
    db,
    `SELECT id, provider_order_id, provider_transaction_id FROM payment_attempts WHERE order_id = ? AND status = 'succeeded' ORDER BY updated_at LIMIT 1`,
    order.id,
  );
  if (!attempt?.provider_order_id) return { ok: false, error: 'not_refundable' };

  const refundId = randomId();
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO refunds (id, order_id, payment_attempt_id, amount_piastres, reason, status, idempotency_key, actor_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)`,
        )
        .bind(refundId, order.id, attempt.id, p.amountPiastres, p.reason, p.idempotencyKey, p.actorId, p.now, p.now),
      db.prepare(`UPDATE orders SET payment_status = 'refund_pending', updated_at = ? WHERE id = ?`).bind(p.now, order.id),
      orderEventStmt(db, order.id, 'refund.requested', p.actorId, { refundId, amountPiastres: p.amountPiastres }, p.now),
    ]);
  } catch (err) {
    if (dbGuardCode(err) === 'TIRAZE_REFUND_EXCEEDS_PAID') return { ok: false, error: 'exceeds_paid' };
    throw err;
  }

  let state: 'succeeded' | 'pending' | 'unknown' | 'failed' = 'unknown';
  let providerRef: string | null = null;
  try {
    const res = await refundKashierOrder(
      cfg,
      { kashierOrderId: attempt.provider_order_id, amount: p.amountPiastres, reason: p.reason, targetTransactionId: attempt.provider_transaction_id },
      p.fetchImpl,
    );
    providerRef = res.providerReference;
    state = res.state === 'succeeded' ? 'succeeded' : res.state === 'failed' ? 'failed' : res.state === 'pending' ? 'pending' : 'unknown';
  } catch (err) {
    state = err instanceof KashierRejectedError ? 'failed' : 'unknown';
  }
  await db.batch([
    db.prepare(`UPDATE refunds SET status = ?, provider_reference = ?, updated_at = ? WHERE id = ?`).bind(state, providerRef, p.now, refundId),
    orderEventStmt(db, order.id, `refund.${state}`, p.actorId, { refundId }, p.now),
    ...(state === 'unknown' || state === 'failed'
      ? [enqueueStmt(db, 'alert.staff', `refund_${state}:${refundId}`, { kind: `refund_${state}`, orderId: order.id, refundId }, p.now)]
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
  opts: { olderThanMs?: number; limit?: number; fetchImpl?: FetchLike } = {},
): Promise<Array<{ attemptId: string; outcome: string }>> {
  const rows = await all<AttemptRow>(
    db,
    `SELECT * FROM payment_attempts WHERE status IN ('unknown','pending','creating') AND updated_at <= ?
     AND (last_checked_at IS NULL OR last_checked_at <= ?) ORDER BY updated_at LIMIT ?`,
    now - (opts.olderThanMs ?? 5 * 60_000),
    now - 5 * 60_000,
    opts.limit ?? 20,
  );
  const out: Array<{ attemptId: string; outcome: string }> = [];
  for (const a of rows) {
    await db.prepare(`UPDATE payment_attempts SET last_checked_at = ? WHERE id = ?`).bind(now, a.id).run();
    if (!a.session_id) {
      // No session id: Kashier lookup by merchant order id is not implemented (UNVERIFIED API);
      // escalate to staff after an hour instead of guessing.
      if (now - (await attemptAge(db, a.id)) > 3_600_000) {
        await db.batch([
          enqueueStmt(db, 'alert.staff', `attempt_stale:${a.id}`, { kind: 'payment_attempt_needs_manual_reconciliation', attemptId: a.id, orderId: a.order_id }, now),
        ]);
      }
      out.push({ attemptId: a.id, outcome: 'no_session_id' });
      continue;
    }
    let lookup;
    try {
      lookup = await getKashierSessionPayment(cfg, a.session_id, opts.fetchImpl);
    } catch {
      out.push({ attemptId: a.id, outcome: 'lookup_failed' });
      continue;
    }
    if (lookup.state === 'succeeded') {
      const amount = safeAmount(lookup.amount);
      if (amount !== a.amount_piastres || (lookup.currency ?? '').toUpperCase() !== 'EGP') {
        await db.batch([
          orderEventStmt(db, a.order_id, 'payment.reconcile_mismatch', null, { attemptId: a.id }, now),
          enqueueStmt(db, 'alert.staff', `reconcile_mismatch:${a.id}`, { kind: 'payment_mismatch', orderId: a.order_id }, now),
        ]);
        out.push({ attemptId: a.id, outcome: 'mismatch' });
        continue;
      }
      out.push({ attemptId: a.id, outcome: await applyPaymentSuccess(db, a, { transactionId: lookup.transactionId, kashierOrderId: lookup.kashierOrderId }, now) });
    } else if (lookup.state === 'failed') {
      await db.prepare(`UPDATE payment_attempts SET status = 'failed', updated_at = ? WHERE id = ? AND status IN ('unknown','pending','creating')`).bind(now, a.id).run();
      out.push({ attemptId: a.id, outcome: 'failed' });
    } else {
      out.push({ attemptId: a.id, outcome: lookup.state });
    }
  }
  return out;
}

async function attemptAge(db: Db, id: string): Promise<number> {
  const r = await first<{ created_at: number }>(db, `SELECT created_at FROM payment_attempts WHERE id = ?`, id);
  return r?.created_at ?? 0;
}

/** Re-processes inbox rows that were stored but not processed (e.g. a crash after the ack). */
export async function processPendingEvents(db: Db, cfg: KashierConfig, now: number, limit = 20): Promise<number> {
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
      await db.prepare(`UPDATE payment_events SET error = ? WHERE id = ?`).bind(String((err as Error).message).slice(0, 300), r.id).run();
    }
  }
  return n;
}

export async function orderPaymentView(db: Db, orderId: string) {
  return all<{ id: string; status: string; amount_piastres: number; merchant_order_id: string; created_at: number; updated_at: number }>(
    db,
    `SELECT id, status, amount_piastres, merchant_order_id, created_at, updated_at FROM payment_attempts WHERE order_id = ? ORDER BY created_at`,
    orderId,
  );
}
