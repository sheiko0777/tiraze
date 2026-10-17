import {
  addPiastres,
  humanReference,
  isCodAllowed,
  quoteShipping,
  randomId,
  requestHash,
  type CheckoutInput,
  type ShippingQuote,
} from '@tiraze/core';
import { getOwnedAddress } from './addresses.ts';
import { orderEventStmt } from './audit.ts';
import { clearCartStmts, getCart, type Cart } from './cart.ts';
import { enqueueStmt } from './outbox.ts';
import { getSettings } from './settings.ts';
import { getActiveShipping } from './shippingRepo.ts';
import { dbGuardCode, first, isUniqueViolation, json, type Db } from './sql.ts';

export type CheckoutError =
  | 'checkout_disabled'
  | 'email_not_verified'
  | 'cart_empty'
  | 'cart_changed'
  | 'item_unavailable'
  | 'insufficient_stock'
  | 'price_changed'
  | 'address_not_found'
  | 'shipping_unavailable'
  | 'cod_not_allowed'
  | 'idempotency_conflict';

export type CheckoutResult =
  | { ok: true; orderId: string; number: string; replayed: boolean; paymentMethod: 'kashier' | 'cod'; totalPiastres: number }
  | { ok: false; error: CheckoutError; detail?: unknown };

export interface CheckoutCustomer {
  userId: string;
  email: string;
  emailVerified: boolean;
}

/** Totals preview for the checkout review page (same rules as order creation). */
export async function previewCheckout(
  db: Db,
  customer: CheckoutCustomer,
  addressId: string | null,
  locale: 'ar' | 'en',
): Promise<{ cart: Cart; shipping: ShippingQuote | null; totalPiastres: number | null; codAllowed: boolean }> {
  const cart = await getCart(db, customer.userId, locale);
  if (!addressId || cart.lines.length === 0) return { cart, shipping: null, totalPiastres: null, codAllowed: false };
  const address = await getOwnedAddress(db, customer.userId, addressId);
  const active = await getActiveShipping(db);
  if (!address || !active) return { cart, shipping: null, totalPiastres: null, codAllowed: false };
  const shipping = quoteShipping(active.table, address.governorate, packagesFor(cart));
  if (!shipping.ok) return { cart, shipping, totalPiastres: null, codAllowed: false };
  const total = addPiastres(cart.subtotalPiastres, shipping.feePiastres);
  return { cart, shipping, totalPiastres: total, codAllowed: isCodAllowed(total, active.codCarrierLimitPiastres) };
}

function packagesFor(cart: Cart) {
  // Planning assumption (unapproved): each rug unit is its own package.
  return cart.lines.flatMap((l) =>
    Array.from({ length: l.qty }, () => ({
      skuId: l.skuId,
      weightG: l.weightG,
      lengthCm: l.packageLengthCm,
      widthCm: l.packageWidthCm,
      heightCm: l.packageHeightCm,
    })),
  );
}

async function existingOrder(db: Db, userId: string, key: string) {
  return first<{ id: string; number: string; request_hash: string; payment_method: 'kashier' | 'cod'; total_piastres: number }>(
    db,
    `SELECT id, number, request_hash, payment_method, total_piastres FROM orders WHERE user_id = ? AND idempotency_key = ?`,
    userId,
    key,
  );
}

export async function createOrder(db: Db, customer: CheckoutCustomer, input: CheckoutInput, now: number): Promise<CheckoutResult> {
  const settings = await getSettings(db);
  if (!settings.checkoutEnabled) return { ok: false, error: 'checkout_disabled' };
  if (settings.requireVerifiedEmail && !customer.emailVerified) return { ok: false, error: 'email_not_verified' };

  const cart = await getCart(db, customer.userId, input.locale);
  const hash = await requestHash({
    addressId: input.addressId,
    paymentMethod: input.paymentMethod,
    cartVersion: input.cartVersion,
  });

  // Idempotency: same key + same input → same order, no second effect; different input → reject.
  const prior = await existingOrder(db, customer.userId, input.idempotencyKey);
  if (prior) {
    if (prior.request_hash !== hash) return { ok: false, error: 'idempotency_conflict' };
    return { ok: true, orderId: prior.id, number: prior.number, replayed: true, paymentMethod: prior.payment_method, totalPiastres: prior.total_piastres };
  }

  if (cart.lines.length === 0) return { ok: false, error: 'cart_empty' };
  if (cart.version !== input.cartVersion) return { ok: false, error: 'cart_changed' };
  const unavailable = cart.lines.filter((l) => l.issue === 'unavailable').map((l) => l.skuId);
  if (unavailable.length) return { ok: false, error: 'item_unavailable', detail: unavailable };
  const short = cart.lines.filter((l) => l.issue === 'insufficient_stock').map((l) => l.skuId);
  if (short.length) return { ok: false, error: 'insufficient_stock', detail: short };

  const address = await getOwnedAddress(db, customer.userId, input.addressId);
  if (!address) return { ok: false, error: 'address_not_found' };

  const active = await getActiveShipping(db);
  if (!active) return { ok: false, error: 'shipping_unavailable', detail: 'no_active_matrix' };
  const shipping = quoteShipping(active.table, address.governorate, packagesFor(cart));
  if (!shipping.ok) return { ok: false, error: 'shipping_unavailable', detail: shipping.reason };

  const subtotal = cart.subtotalPiastres;
  const total = addPiastres(subtotal, shipping.feePiastres);
  if (input.paymentMethod === 'cod' && !isCodAllowed(total, active.codCarrierLimitPiastres)) {
    return { ok: false, error: 'cod_not_allowed', detail: { totalPiastres: total } };
  }

  const orderId = randomId();
  const number = humanReference('TZ');
  const isCod = input.paymentMethod === 'cod';
  const expiresAt = now + (isCod ? settings.codReviewHours * 3_600_000 : settings.reservationMinutesOnline * 60_000);
  const shippingSnapshot = { versionId: shipping.versionId, zoneCode: shipping.zoneCode, feePiastres: shipping.feePiastres, packages: shipping.packages };

  const stmts = [
    db
      .prepare(
        `INSERT INTO orders (id, number, user_id, status, payment_status, fulfillment_status, payment_method, subtotal_piastres, shipping_piastres,
           total_piastres, currency, locale, address_snapshot, shipping_snapshot, idempotency_key, request_hash, reservation_expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'unpaid', 'unfulfilled', ?, ?, ?, ?, 'EGP', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        orderId,
        number,
        customer.userId,
        isCod ? 'pending_cod_review' : 'awaiting_payment',
        input.paymentMethod,
        subtotal,
        shipping.feePiastres,
        total,
        input.locale,
        json(address),
        json(shippingSnapshot),
        input.idempotencyKey,
        hash,
        expiresAt,
        now,
        now,
      ),
  ];
  for (const l of cart.lines) {
    const snapshot = { code: l.code, title: l.title, widthCm: l.widthCm, lengthCm: l.lengthCm, color: l.color, productId: l.productId, isUnique: l.isUnique };
    stmts.push(
      db
        .prepare(`INSERT INTO order_lines (id, order_id, sku_id, qty, unit_price_piastres, line_total_piastres, snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(randomId(), orderId, l.skuId, l.qty, l.unitPricePiastres, l.lineTotalPiastres, json(snapshot)),
      // The reservation trigger aborts the whole batch if stock is insufficient.
      db
        .prepare(`INSERT INTO reservations (id, order_id, sku_id, qty, status, expires_at, created_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`)
        .bind(randomId(), orderId, l.skuId, l.qty, expiresAt, now),
    );
  }
  stmts.push(
    orderEventStmt(db, orderId, 'order.created', customer.userId, { paymentMethod: input.paymentMethod, totalPiastres: total }, now),
    enqueueStmt(db, 'email.order_received', `order_received:${orderId}`, { orderId, to: customer.email, locale: input.locale }, now),
    ...(isCod ? [enqueueStmt(db, 'alert.staff', `cod_review:${orderId}`, { kind: 'cod_review_required', orderId, number }, now)] : []),
    ...clearCartStmts(db, customer.userId, now),
  );

  try {
    await db.batch(stmts);
  } catch (err) {
    const code = dbGuardCode(err);
    if (code === 'TIRAZE_INSUFFICIENT_STOCK') return { ok: false, error: 'insufficient_stock' };
    if (code === 'TIRAZE_PRICE_CHANGED') return { ok: false, error: 'price_changed' };
    if (isUniqueViolation(err, 'orders.user_id')) {
      // A concurrent request with the same idempotency key won the race.
      const raced = await existingOrder(db, customer.userId, input.idempotencyKey);
      if (raced && raced.request_hash === hash) {
        return { ok: true, orderId: raced.id, number: raced.number, replayed: true, paymentMethod: raced.payment_method, totalPiastres: raced.total_piastres };
      }
      return { ok: false, error: 'idempotency_conflict' };
    }
    throw err;
  }
  return { ok: true, orderId, number, replayed: false, paymentMethod: input.paymentMethod, totalPiastres: total };
}
