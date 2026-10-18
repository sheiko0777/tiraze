import { json, type Db, type Stmt } from './sql.ts';

/** Audit entries record who did what, when, why and to which reference — no secrets or extra PII. */
export function auditStmt(
  db: Db,
  entry: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    reason?: string | null;
    meta?: Record<string, unknown>;
  },
  now: number,
): Stmt {
  return db
    .prepare(
      `INSERT INTO audit_log (actor_id, action, target_type, target_id, reason, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      entry.actorId,
      entry.action,
      entry.targetType,
      entry.targetId,
      entry.reason ?? null,
      entry.meta ? json(entry.meta) : null,
      now,
    );
}

export function orderEventStmt(
  db: Db,
  orderId: string,
  type: string,
  actorId: string | null,
  detail: Record<string, unknown> | null,
  now: number,
): Stmt {
  return db
    .prepare(
      `INSERT INTO order_events (order_id, type, actor_id, detail, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(orderId, type, actorId, detail ? json(detail) : null, now);
}
