import { humanReference, randomId, type StaffRole } from '@tiraze/core';
import { all, first, type Db, type Stmt } from './sql.ts';
import { auditStmt, orderEventStmt } from './audit.ts';
import { enqueueStmt } from './outbox.ts';
export async function rolesFor(db: Db, userId: string): Promise<StaffRole[]> {
  return (
    await all<{ role: StaffRole }>(db, 'SELECT role FROM staff_roles WHERE user_id = ?', userId)
  ).map((r) => r.role);
}
export function hasRole(roles: StaffRole[], role: StaffRole): boolean {
  return roles.includes('owner') || roles.includes(role);
}
export function guard(db: Db, condition: string, values: unknown[]): Stmt[] {
  const id = randomId();
  return [
    db
      .prepare(
        'INSERT INTO operation_guards (id, ok) SELECT ?, CASE WHEN (' +
          condition +
          ') THEN 1 ELSE 0 END',
      )
      .bind(id, ...values),
    db.prepare('DELETE FROM operation_guards WHERE id = ?').bind(id),
  ];
}
export async function adjustInventory(
  db: Db,
  actorId: string,
  skuId: string,
  delta: number,
  reason: string,
  now: number,
) {
  if (!Number.isSafeInteger(delta) || delta === 0 || !reason.trim())
    throw new Error('invalid_adjustment');
  await db.batch([
    ...guard(db, 'EXISTS (SELECT 1 FROM inventory WHERE sku_id = ?)', [skuId]),
    db
      .prepare('UPDATE inventory SET on_hand = on_hand + ?, updated_at = ? WHERE sku_id = ?')
      .bind(delta, now, skuId),
    db
      .prepare(
        "INSERT INTO inventory_movements (sku_id, delta_on_hand, delta_reserved, reason, ref_type, ref_id, actor_id, created_at) VALUES (?, ?, 0, ?, 'adjustment', ?, ?, ?)",
      )
      .bind(skuId, delta, reason, randomId(), actorId, now),
    auditStmt(
      db,
      {
        actorId,
        action: 'inventory.adjust',
        targetType: 'sku',
        targetId: skuId,
        reason,
        meta: { delta },
      },
      now,
    ),
  ]);
}
export async function decideCod(
  db: Db,
  actorId: string,
  orderId: string,
  decision: 'confirm' | 'reject',
  reason: string,
  now: number,
) {
  await db.batch([
    ...guard(
      db,
      "EXISTS (SELECT 1 FROM orders WHERE id = ? AND payment_method = 'cod' AND status = 'pending_cod_review' AND reservation_expires_at > ?)",
      [orderId, now],
    ),
    db
      .prepare('UPDATE orders SET status = ?, cancel_reason = ?, updated_at = ? WHERE id = ?')
      .bind(
        decision === 'confirm' ? 'confirmed' : 'cancelled',
        decision === 'reject' ? 'cod_rejected' : null,
        now,
        orderId,
      ),
    orderEventStmt(db, orderId, 'cod.' + decision, actorId, { reason }, now),
    auditStmt(
      db,
      { actorId, action: 'cod.' + decision, targetType: 'order', targetId: orderId, reason },
      now,
    ),
    enqueueStmt(
      db,
      decision === 'confirm' ? 'email.cod_confirmed' : 'email.order_cancelled',
      'cod:' + decision + ':' + orderId,
      { orderId },
      now,
    ),
  ]);
}
export async function expireOrders(db: Db, now: number, limit = 50) {
  const ids = await all<{ id: string }>(
    db,
    "SELECT id FROM orders WHERE status IN ('awaiting_payment','pending_cod_review') AND reservation_expires_at <= ? ORDER BY reservation_expires_at LIMIT ?",
    now,
    limit,
  );
  let count = 0;
  for (const { id } of ids) {
    try {
      await db.batch([
        ...guard(
          db,
          "EXISTS (SELECT 1 FROM orders WHERE id = ? AND status IN ('awaiting_payment','pending_cod_review') AND reservation_expires_at <= ?)",
          [id, now],
        ),
        db
          .prepare(
            "UPDATE orders SET status = 'cancelled', cancel_reason = 'expired', updated_at = ? WHERE id = ?",
          )
          .bind(now, id),
        orderEventStmt(db, id, 'order.expired', null, null, now),
        enqueueStmt(db, 'email.order_cancelled', 'expired:' + id, { orderId: id }, now),
      ]);
      count++;
    } catch (error) {
      if (!String(error).includes('TIRAZE_OPERATION_CONFLICT')) throw error;
    }
  }
  return count;
}
export async function createQuote(
  db: Db,
  input: {
    name: string;
    email: string;
    phone?: string;
    widthCm: number;
    lengthCm: number;
    colors?: string;
    material?: string;
    budgetEgp?: number;
    contactMethod: string;
    notes?: string;
    locale: string;
  },
  userId: string | null,
  now: number,
) {
  const id = randomId(),
    reference = humanReference('TQ');
  await db.batch([
    db
      .prepare(
        'INSERT INTO quote_requests (id,reference,user_id,name,email,phone,width_cm,length_cm,colors,material,budget_piastres,contact_method,notes,locale,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        reference,
        userId,
        input.name,
        input.email,
        input.phone ?? null,
        input.widthCm,
        input.lengthCm,
        input.colors ?? null,
        input.material ?? null,
        input.budgetEgp == null ? null : input.budgetEgp * 100,
        input.contactMethod,
        input.notes ?? null,
        input.locale,
        now,
        now,
      ),
    enqueueStmt(
      db,
      'email.quote_received',
      'quote:' + id,
      { to: input.email, reference, locale: input.locale },
      now,
    ),
    enqueueStmt(db, 'alert.staff', 'quote_staff:' + id, { kind: 'quote_received', reference }, now),
  ]);
  return { id, reference };
}
export async function allowRate(db: Db, key: string, now: number, max = 30, windowMs = 60000) {
  const start = Math.floor(now / windowMs) * windowMs;
  const row = await db
    .prepare(
      'INSERT INTO rate_limits (key,window_start,count) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start RETURNING count',
    )
    .bind(key, start)
    .first<{ count: number }>();
  return (row?.count ?? max + 1) <= max;
}

export async function cancelOrder(
  db: Db,
  actorId: string,
  orderId: string,
  reason: string,
  now: number,
) {
  await db.batch([
    ...guard(
      db,
      "EXISTS (SELECT 1 FROM orders WHERE id=? AND status IN ('awaiting_payment','pending_cod_review','confirmed') AND fulfillment_status IN ('unfulfilled','preparing'))",
      [orderId],
    ),
    db
      .prepare(
        "UPDATE orders SET status='cancelled',cancel_reason='staff_cancelled',updated_at=? WHERE id=?",
      )
      .bind(now, orderId),
    orderEventStmt(db, orderId, 'order.cancelled', actorId, { reason }, now),
    auditStmt(
      db,
      { actorId, action: 'order.cancel', targetType: 'order', targetId: orderId, reason },
      now,
    ),
    enqueueStmt(db, 'email.order_cancelled', 'staff_cancel:' + orderId, { orderId }, now),
  ]);
}
