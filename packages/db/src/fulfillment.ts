import { randomId } from '@tiraze/core';
import { guard } from './operations.ts';
import { type Db } from './sql.ts';
import { auditStmt, orderEventStmt } from './audit.ts';
import { enqueueStmt } from './outbox.ts';
import { getSettings } from './settings.ts';
export async function fulfill(
  db: Db,
  actorId: string,
  orderId: string,
  action: 'prepare' | 'ship' | 'deliver' | 'return',
  now: number,
  shipment?: { carrier: string; trackingNumber: string; trackingUrl?: string },
) {
  const condition =
    action === 'prepare' || action === 'ship'
      ? "EXISTS (SELECT 1 FROM orders WHERE id=? AND status='confirmed' AND ((payment_method='kashier' AND payment_status IN ('paid','partially_refunded') AND paid_piastres-refunded_piastres>=total_piastres) OR (payment_method='cod' AND payment_status IN ('unpaid','paid'))) AND fulfillment_status=?)"
      : action === 'return'
        ? "EXISTS (SELECT 1 FROM orders WHERE id=? AND status IN ('confirmed','completed') AND fulfillment_status IN ('shipped','delivered') AND ?='delivered')"
        : "EXISTS (SELECT 1 FROM orders WHERE id=? AND status IN ('confirmed','completed') AND fulfillment_status=?)";
  const from = {
    prepare: 'unfulfilled',
    ship: 'preparing',
    deliver: 'shipped',
    return: 'delivered',
  }[action];
  const to = { prepare: 'preparing', ship: 'shipped', deliver: 'delivered', return: 'returned' }[
    action
  ];
  if (action === 'ship') {
    if (!shipment) throw new Error('shipment_required');
    if (shipment.trackingUrl) {
      const url = new URL(shipment.trackingUrl),
        settings = await getSettings(db);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        !settings.allowedTrackingHosts.includes(url.hostname)
      )
        throw new Error('tracking_host_not_allowed');
    }
  }
  await db.batch([
    ...guard(db, condition, [orderId, from]),
    ...(action === 'ship'
      ? [
          db
            .prepare(
              'INSERT INTO shipments (id,order_id,carrier,tracking_number,tracking_url,shipped_at,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?)',
            )
            .bind(
              randomId(),
              orderId,
              shipment!.carrier,
              shipment!.trackingNumber,
              shipment!.trackingUrl ?? null,
              now,
              actorId,
              now,
            ),
        ]
      : []),
    db
      .prepare(
        "UPDATE orders SET fulfillment_status=?,status=CASE WHEN ?='delivered' AND payment_method='kashier' AND payment_status='paid' THEN 'completed' ELSE status END,updated_at=? WHERE id=?",
      )
      .bind(to, to, now, orderId),
    ...(action === 'deliver'
      ? [
          db
            .prepare(
              'UPDATE shipments SET delivered_at=? WHERE order_id=? AND delivered_at IS NULL',
            )
            .bind(now, orderId),
        ]
      : []),
    orderEventStmt(db, orderId, 'fulfillment.' + to, actorId, null, now),
    auditStmt(
      db,
      { actorId, action: 'fulfillment.' + to, targetType: 'order', targetId: orderId },
      now,
    ),
    ...(action === 'ship'
      ? [enqueueStmt(db, 'email.order_shipped', 'shipped:' + orderId, { orderId }, now)]
      : []),
  ]);
}
export async function recordCodCollection(
  db: Db,
  actorId: string,
  orderId: string,
  amountPiastres: number,
  reference: string,
  now: number,
) {
  await db.batch([
    ...guard(
      db,
      "EXISTS (SELECT 1 FROM orders WHERE id=? AND payment_method='cod' AND status='confirmed' AND fulfillment_status='delivered' AND payment_status='unpaid' AND total_piastres=?)",
      [orderId, amountPiastres],
    ),
    db
      .prepare(
        'INSERT INTO cod_collections (id,order_id,amount_piastres,reference,collected_recorded_by,collected_at) VALUES (?,?,?,?,?,?)',
      )
      .bind(randomId(), orderId, amountPiastres, reference, actorId, now),
    db
      .prepare(
        "UPDATE orders SET payment_status='paid',paid_piastres=total_piastres,status='completed',updated_at=? WHERE id=?",
      )
      .bind(now, orderId),
    auditStmt(
      db,
      {
        actorId,
        action: 'cod.collection',
        targetType: 'order',
        targetId: orderId,
        meta: { reference, amountPiastres },
      },
      now,
    ),
  ]);
}
export async function settleCod(
  db: Db,
  actorId: string,
  orderId: string,
  reference: string,
  now: number,
) {
  await db.batch([
    ...guard(db, 'EXISTS (SELECT 1 FROM cod_collections WHERE order_id=? AND settled_at IS NULL)', [
      orderId,
    ]),
    db
      .prepare('UPDATE cod_collections SET settled_at=?,settled_recorded_by=? WHERE order_id=?')
      .bind(now, actorId, orderId),
    auditStmt(
      db,
      {
        actorId,
        action: 'cod.settlement',
        targetType: 'order',
        targetId: orderId,
        reason: reference,
      },
      now,
    ),
  ]);
}
