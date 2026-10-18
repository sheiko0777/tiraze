import { addPiastres, multiplyPiastres, type Locale } from '@tiraze/core';
import { all, first, type Db } from './sql.ts';

// Server cart for signed-in customers. Prices and availability are always re-read from the
// catalogue; the browser only ever supplies SKU ids and quantities.

export interface CartLine {
  skuId: string;
  qty: number;
  code: string;
  productId: string;
  slug: string;
  title: string;
  widthCm: number;
  lengthCm: number;
  color: string;
  unitPricePiastres: number;
  lineTotalPiastres: number;
  available: number;
  isUnique: boolean;
  purchasable: boolean;
  issue: null | 'unavailable' | 'insufficient_stock';
  imageUrl: string | null;
  weightG: number;
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
}

export interface Cart {
  version: number;
  lines: CartLine[];
  subtotalPiastres: number;
  hasIssues: boolean;
}

export async function getCart(db: Db, userId: string, locale: Locale): Promise<Cart> {
  const cart = await first<{ version: number }>(
    db,
    'SELECT version FROM carts WHERE user_id = ?',
    userId,
  );
  const rows = await all<{
    sku_id: string;
    qty: number;
    code: string;
    product_id: string;
    slug: string | null;
    title: string | null;
    width_cm: number;
    length_cm: number;
    color: string;
    price_piastres: number;
    is_unique: number;
    available: number;
    active: number;
    status: string;
    kind: string;
    url: string | null;
    weight_g: number;
    package_length_cm: number;
    package_width_cm: number;
    package_height_cm: number;
  }>(
    db,
    `SELECT c.sku_id, c.qty, s.code, s.product_id, t.slug, t.title, s.width_cm, s.length_cm, s.color, s.price_piastres, s.is_unique,
       MAX(i.on_hand - i.reserved, 0) AS available, s.active, p.status, p.kind,
       (SELECT m.url FROM media m WHERE m.product_id = p.id ORDER BY m.sort_order LIMIT 1) AS url,
       s.weight_g, s.package_length_cm, s.package_width_cm, s.package_height_cm
     FROM cart_items c
     JOIN skus s ON s.id = c.sku_id
     JOIN products p ON p.id = s.product_id
     JOIN inventory i ON i.sku_id = s.id
     LEFT JOIN product_translations t ON t.product_id = p.id AND t.locale = ?
     WHERE c.user_id = ? ORDER BY c.added_at`,
    locale,
    userId,
  );
  const lines: CartLine[] = rows.map((r) => {
    const purchasable = r.active === 1 && r.status === 'published' && r.kind === 'ready';
    const issue = !purchasable ? 'unavailable' : r.available < r.qty ? 'insufficient_stock' : null;
    return {
      skuId: r.sku_id,
      qty: r.qty,
      code: r.code,
      productId: r.product_id,
      slug: r.slug ?? '',
      title: r.title ?? r.code,
      widthCm: r.width_cm,
      lengthCm: r.length_cm,
      color: r.color,
      unitPricePiastres: r.price_piastres,
      lineTotalPiastres: multiplyPiastres(r.price_piastres, r.qty),
      available: r.available,
      isUnique: r.is_unique === 1,
      purchasable,
      issue,
      imageUrl: r.url,
      weightG: r.weight_g,
      packageLengthCm: r.package_length_cm,
      packageWidthCm: r.package_width_cm,
      packageHeightCm: r.package_height_cm,
    };
  });
  return {
    version: cart?.version ?? 0,
    lines,
    subtotalPiastres: lines.length
      ? addPiastres(...lines.filter((l) => !l.issue).map((l) => l.lineTotalPiastres))
      : 0,
    hasIssues: lines.some((l) => l.issue !== null),
  };
}

async function maxQtyFor(db: Db, skuId: string): Promise<number | null> {
  const r = await first<{ is_unique: number; available: number }>(
    db,
    `SELECT s.is_unique, MAX(i.on_hand - i.reserved, 0) AS available FROM skus s JOIN inventory i ON i.sku_id = s.id
     JOIN products p ON p.id = s.product_id WHERE s.id = ? AND s.active = 1 AND p.status = 'published' AND p.kind = 'ready'`,
    skuId,
  );
  if (!r) return null;
  return r.is_unique === 1 ? 1 : 20;
}

function touchCart(db: Db, userId: string, now: number) {
  return db
    .prepare(
      `INSERT INTO carts (user_id, version, updated_at) VALUES (?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET version = version + 1, updated_at = excluded.updated_at`,
    )
    .bind(userId, now);
}

export type CartMutation = { ok: true } | { ok: false; code: 'sku_unavailable' };

/** Sets an absolute quantity (0 removes). Unique pieces are capped at one. */
export async function setCartItem(
  db: Db,
  userId: string,
  skuId: string,
  qty: number,
  now: number,
): Promise<CartMutation> {
  if (qty <= 0) {
    await db.batch([
      touchCart(db, userId, now),
      db.prepare('DELETE FROM cart_items WHERE user_id = ? AND sku_id = ?').bind(userId, skuId),
    ]);
    return { ok: true };
  }
  const max = await maxQtyFor(db, skuId);
  if (max == null) return { ok: false, code: 'sku_unavailable' };
  await db.batch([
    touchCart(db, userId, now),
    db
      .prepare(
        `INSERT INTO cart_items (user_id, sku_id, qty, added_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, sku_id) DO UPDATE SET qty = excluded.qty`,
      )
      .bind(userId, skuId, Math.min(qty, max), now),
  ]);
  return { ok: true };
}

/**
 * Merges an anonymous browser cart after sign-in. Rule: per SKU keep the larger quantity
 * (never the sum, so a refresh cannot double quantities), capped by the SKU's limit.
 * Unknown or unpurchasable SKUs are dropped and reported.
 */
export async function mergeCart(
  db: Db,
  userId: string,
  items: Array<{ skuId: string; qty: number }>,
  now: number,
): Promise<{ dropped: string[] }> {
  const dropped: string[] = [];
  const stmts = [touchCart(db, userId, now)];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.skuId)) continue;
    seen.add(item.skuId);
    const max = await maxQtyFor(db, item.skuId);
    if (max == null) {
      dropped.push(item.skuId);
      continue;
    }
    stmts.push(
      db
        .prepare(
          `INSERT INTO cart_items (user_id, sku_id, qty, added_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(user_id, sku_id) DO UPDATE SET qty = MIN(MAX(cart_items.qty, excluded.qty), ?)`,
        )
        .bind(userId, item.skuId, Math.min(item.qty, max), now, max),
    );
  }
  await db.batch(stmts);
  return { dropped };
}

export function clearCartStmts(db: Db, userId: string, now: number) {
  return [
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').bind(userId),
    touchCart(db, userId, now),
  ];
}
