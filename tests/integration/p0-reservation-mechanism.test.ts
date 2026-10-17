import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { D1Database } from '@cloudflare/workers-types';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';

// P0 / T02 — proof of the SQL mechanism itself (raw statements, no service layer):
// a D1 batch is one transaction, and a trigger RAISE(ABORT) inside it rolls back every
// earlier statement of the batch. Runs on local Miniflare/workerd D1 only.

let t: TestD1;
let db: D1Database;
const now = 1_790_000_000_000;

async function seedSku(id: string, onHand: number, price = 100_000) {
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO products (id, product_key, status, kind, category, is_fixture, created_at, updated_at) VALUES ('p-mech', 'mech', 'published', 'ready', 'test', 1, ?, ?)`).bind(now, now),
    db.prepare(`INSERT INTO skus (id, product_id, code, width_cm, length_cm, price_piastres, weight_g, package_length_cm, package_width_cm, package_height_cm, created_at, updated_at) VALUES (?, 'p-mech', ?, 100, 150, ?, 4000, 110, 30, 30, ?, ?)`).bind(id, `CODE-${id}`, price, now, now),
    db.prepare(`INSERT INTO inventory (sku_id, on_hand, reserved, updated_at) VALUES (?, ?, 0, ?)`).bind(id, onHand, now),
  ]);
}

function orderStatements(orderId: string, userId: string, lines: Array<{ sku: string; qty: number; price?: number }>) {
  const subtotal = lines.reduce((s, l) => s + (l.price ?? 100_000) * l.qty, 0);
  const stmts = [
    db.prepare(
      `INSERT INTO orders (id, number, user_id, status, payment_status, payment_method, subtotal_piastres, shipping_piastres, total_piastres, address_snapshot, shipping_snapshot, idempotency_key, request_hash, reservation_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, 'awaiting_payment', 'unpaid', 'kashier', ?, 0, ?, '{}', '{}', ?, 'h', ?, ?, ?)`,
    ).bind(orderId, `N-${orderId}`, userId, subtotal, subtotal, `idem-${orderId}`, now + 900_000, now, now),
  ];
  for (const l of lines) {
    const price = l.price ?? 100_000;
    stmts.push(
      db.prepare(`INSERT INTO order_lines (id, order_id, sku_id, qty, unit_price_piastres, line_total_piastres, snapshot) VALUES (?, ?, ?, ?, ?, ?, '{}')`).bind(`${orderId}-${l.sku}`, orderId, l.sku, l.qty, price, price * l.qty),
      db.prepare(`INSERT INTO reservations (id, order_id, sku_id, qty, status, expires_at, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`).bind(`r-${orderId}-${l.sku}`, orderId, l.sku, l.qty, now + 900_000, now),
    );
  }
  return stmts;
}

async function inv(sku: string) {
  return db.prepare('SELECT on_hand, reserved FROM inventory WHERE sku_id = ?').bind(sku).first<{ on_hand: number; reserved: number }>();
}

beforeAll(async () => {
  t = await createTestD1();
  db = t.db;
});
afterAll(async () => t?.dispose());

describe('P0 D1 reservation mechanism (local emulator)', () => {
  it('100 concurrent batches for the last unit produce exactly one reservation', async () => {
    await seedSku('last', 1);
    const results = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) => db.batch(orderStatements(`c${i}`, `u${i}`, [{ sku: 'last', qty: 1 }]))),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(99);
    for (const f of failed) expect(String(f.reason?.message ?? f.reason)).toContain('TIRAZE_INSUFFICIENT_STOCK');
    expect(await inv('last')).toEqual({ on_hand: 1, reserved: 1 });
    const orders = await db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE id LIKE 'c%'`).first<{ n: number }>();
    expect(orders?.n).toBe(1);
    const reservations = await db.prepare(`SELECT COUNT(*) AS n FROM reservations WHERE sku_id = 'last'`).first<{ n: number }>();
    expect(reservations?.n).toBe(1);
  });

  it('a multi-item batch whose second line lacks stock rolls back the first line and the order', async () => {
    await seedSku('first', 3);
    await seedSku('second', 0);
    await expect(
      db.batch(orderStatements('multi', 'u-multi', [{ sku: 'first', qty: 2 }, { sku: 'second', qty: 1 }])),
    ).rejects.toThrow(/TIRAZE_INSUFFICIENT_STOCK/);
    expect(await inv('first')).toEqual({ on_hand: 3, reserved: 0 });
    const order = await db.prepare(`SELECT id FROM orders WHERE id = 'multi'`).first();
    expect(order).toBeNull();
    const lines = await db.prepare(`SELECT COUNT(*) AS n FROM order_lines WHERE order_id = 'multi'`).first<{ n: number }>();
    expect(lines?.n).toBe(0);
    const moves = await db.prepare(`SELECT COUNT(*) AS n FROM inventory_movements WHERE ref_id = 'multi'`).first<{ n: number }>();
    expect(moves?.n).toBe(0);
  });

  it('a stale price aborts the batch (price guard trigger)', async () => {
    await seedSku('priced', 5, 250_000);
    await expect(db.batch(orderStatements('stale', 'u-stale', [{ sku: 'priced', qty: 1, price: 200_000 }]))).rejects.toThrow(/TIRAZE_PRICE_CHANGED/);
    expect(await inv('priced')).toEqual({ on_hand: 5, reserved: 0 });
  });

  it('inventory CHECK constraints forbid negative and over-reserved stock', async () => {
    await seedSku('chk', 2);
    await expect(db.prepare(`UPDATE inventory SET on_hand = -1 WHERE sku_id = 'chk'`).run()).rejects.toThrow(/CHECK/i);
    await expect(db.prepare(`UPDATE inventory SET reserved = 3 WHERE sku_id = 'chk'`).run()).rejects.toThrow(/CHECK/i);
  });

  it('release is idempotent: a second release of the same reservation changes nothing', async () => {
    await seedSku('rel', 1);
    await db.batch(orderStatements('relo', 'u-rel', [{ sku: 'rel', qty: 1 }]));
    expect(await inv('rel')).toEqual({ on_hand: 1, reserved: 1 });
    const release = () =>
      db.prepare(`UPDATE orders SET status = 'cancelled', cancel_reason = 'expired', updated_at = ? WHERE id = 'relo' AND status = 'awaiting_payment' RETURNING id`).bind(now + 1).all();
    const first = await release();
    const second = await release();
    // meta.changes counts trigger side effects in D1, so guarded transitions use RETURNING.
    expect(first.results).toHaveLength(1);
    expect(second.results).toHaveLength(0);
    expect(await inv('rel')).toEqual({ on_hand: 1, reserved: 0 });
    const r = await db.prepare(`SELECT status FROM reservations WHERE order_id = 'relo'`).first<{ status: string }>();
    expect(r?.status).toBe('expired');
    // Closed reservations cannot be reopened.
    await expect(db.prepare(`UPDATE reservations SET status = 'active' WHERE order_id = 'relo'`).run()).rejects.toThrow(/TIRAZE_RESERVATION_CLOSED/);
  });

  it('confirming converts reservations exactly once and decrements on-hand stock', async () => {
    await seedSku('conv', 2);
    await db.batch(orderStatements('convo', 'u-conv', [{ sku: 'conv', qty: 2 }]));
    const confirm = () =>
      db.prepare(`UPDATE orders SET status = 'confirmed', payment_status = 'paid', updated_at = ? WHERE id = 'convo' AND status = 'awaiting_payment' RETURNING id`).bind(now + 2).all();
    expect((await confirm()).results).toHaveLength(1);
    expect((await confirm()).results).toHaveLength(0);
    expect(await inv('conv')).toEqual({ on_hand: 0, reserved: 0 });
  });
});
