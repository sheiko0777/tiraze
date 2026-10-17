import { randomId } from '@tiraze/core';
import { json, parseJson, returning, type Db, type Stmt } from './sql.ts';

// Transactional outbox: messages are inserted in the same D1 batch as the business change,
// then delivered by the jobs worker with leases, bounded retries, backoff and dead-lettering.

export type OutboxTopic =
  | 'email.order_received'
  | 'email.payment_received'
  | 'email.order_cancelled'
  | 'email.order_shipped'
  | 'email.cod_confirmed'
  | 'email.quote_received'
  | 'email.auth'
  | 'alert.staff';

export interface OutboxMessage {
  id: string;
  topic: OutboxTopic;
  payload: Record<string, unknown>;
  attempts: number;
  lockToken: string;
}

export const OUTBOX_MAX_ATTEMPTS = 8;

export function enqueueStmt(db: Db, topic: OutboxTopic, dedupeKey: string, payload: Record<string, unknown>, now: number): Stmt {
  return db
    .prepare(
      `INSERT INTO outbox (id, topic, payload, dedupe_key, status, attempts, next_attempt_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING`,
    )
    .bind(randomId(), topic, json(payload), dedupeKey, now, now);
}

/** Leases up to `limit` due messages. Expired leases (crashed workers) become claimable again. */
export async function claimOutbox(db: Db, now: number, limit = 20, leaseMs = 60_000): Promise<OutboxMessage[]> {
  const token = randomId();
  const rows = await returning<{ id: string; topic: OutboxTopic; payload: string; attempts: number }>(
    db
      .prepare(
        `UPDATE outbox SET status = 'processing', locked_until = ?, lock_token = ?, attempts = attempts + 1
         WHERE id IN (
           SELECT id FROM outbox
           WHERE (status = 'pending' AND next_attempt_at <= ?) OR (status = 'processing' AND locked_until < ?)
           ORDER BY next_attempt_at LIMIT ?
         )
         RETURNING id, topic, payload, attempts`,
      )
      .bind(now + leaseMs, token, now, now, limit),
  );
  return rows.map((r) => ({ id: r.id, topic: r.topic, payload: parseJson(r.payload, {}), attempts: r.attempts, lockToken: token }));
}

export async function markOutboxSent(db: Db, msg: OutboxMessage, now: number): Promise<boolean> {
  const r = await returning(
    db
      .prepare(`UPDATE outbox SET status = 'sent', sent_at = ?, locked_until = NULL, last_error = NULL WHERE id = ? AND lock_token = ? AND status = 'processing' RETURNING id`)
      .bind(now, msg.id, msg.lockToken),
  );
  return r.length === 1;
}

export function backoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 60 * 60_000);
}

export async function markOutboxFailed(db: Db, msg: OutboxMessage, error: string, now: number): Promise<'retry' | 'dead'> {
  const dead = msg.attempts >= OUTBOX_MAX_ATTEMPTS;
  await db
    .prepare(
      `UPDATE outbox SET status = ?, next_attempt_at = ?, locked_until = NULL, last_error = ?
       WHERE id = ? AND lock_token = ? AND status = 'processing'`,
    )
    .bind(dead ? 'dead' : 'pending', now + backoffMs(msg.attempts), error.slice(0, 500), msg.id, msg.lockToken)
    .run();
  return dead ? 'dead' : 'retry';
}

export async function outboxCounts(db: Db): Promise<Record<string, number>> {
  const r = await db.prepare(`SELECT status, COUNT(*) AS n FROM outbox GROUP BY status`).all<{ status: string; n: number }>();
  return Object.fromEntries((r.results ?? []).map((x) => [x.status, x.n]));
}
