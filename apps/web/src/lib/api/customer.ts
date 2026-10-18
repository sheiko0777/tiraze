import type { ApiContext } from './context.ts';
import { addressInput, cartMergeInput, checkoutInput } from '@tiraze/core';
import {
  all,
  first,
  getCart,
  setCartItem,
  mergeCart,
  listAddresses,
  createAddress,
  deleteAddress,
  previewCheckout,
  createOrder,
  startKashierPayment,
} from '@tiraze/db';
import { rolesFor } from '../../../../../packages/db/src/operations.ts';
import { readJson, response } from '../security.ts';
import { kashier } from './payment-config.ts';
export async function customerRoute(context: ApiContext): Promise<Response | null> {
  const { request, env, path, url, db, now, method, locale, fixtures, session } = context;
  const user = session.user;
  if (path === 'me' && method === 'GET')
    return response({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      roles: await rolesFor(db, user.id),
    });
  if (path === 'cart' && ['GET', 'POST'].includes(method)) {
    if (method === 'GET') return response(await getCart(db, user.id, locale));
    const data = (await readJson(request)) as { skuId?: unknown; qty?: unknown };
    if (
      typeof data.skuId !== 'string' ||
      !Number.isInteger(data.qty) ||
      Number(data.qty) < 0 ||
      Number(data.qty) > 20
    )
      return response({ error: 'invalid_cart' }, 400);
    const sku = await first<{ id: string }>(
      db,
      "SELECT s.id FROM skus s JOIN products p ON p.id=s.product_id WHERE s.id=? AND s.active=1 AND p.status='published' AND (p.is_fixture=0 OR ?=1)",
      data.skuId,
      fixtures ? 1 : 0,
    );
    if (!sku && Number(data.qty) > 0) return response({ error: 'item_unavailable' }, 409);
    const changed = await setCartItem(db, user.id, data.skuId, Number(data.qty), now);
    if (!changed.ok) return response({ error: 'item_unavailable' }, 409);
    return response(await getCart(db, user.id, locale));
  }
  if (path === 'cart/merge' && method === 'POST') {
    const { items } = cartMergeInput.parse(await readJson(request));
    const safe = [];
    for (const item of items) {
      if (
        await first(
          db,
          'SELECT s.id FROM skus s JOIN products p ON p.id=s.product_id WHERE s.id=? AND (p.is_fixture=0 OR ?=1)',
          item.skuId,
          fixtures ? 1 : 0,
        )
      )
        safe.push(item);
    }
    await mergeCart(db, user.id, safe, now);
    return response(await getCart(db, user.id, locale));
  }
  if (path === 'addresses') {
    if (method === 'GET') return response(await listAddresses(db, user.id));
    if (method === 'POST')
      return response(
        await createAddress(db, user.id, addressInput.parse(await readJson(request)), now),
        201,
      );
  }
  if (path.startsWith('addresses/') && method === 'DELETE')
    return response({ deleted: await deleteAddress(db, user.id, path.split('/')[1]!, now) });
  const customer = { userId: user.id, email: user.email, emailVerified: user.emailVerified };
  if (path === 'checkout' && method === 'GET')
    return response(await previewCheckout(db, customer, url.searchParams.get('addressId'), locale));
  if (path === 'checkout' && method === 'POST') {
    const forbidden = await first(
      db,
      'SELECT 1 FROM cart_items c JOIN skus s ON s.id=c.sku_id JOIN products p ON p.id=s.product_id WHERE c.user_id=? AND p.is_fixture=1 AND ?=0',
      user.id,
      fixtures ? 1 : 0,
    );
    if (forbidden) return response({ error: 'item_unavailable' }, 409);
    const result = await createOrder(
      db,
      customer,
      checkoutInput.parse(await readJson(request)),
      now,
    );
    return response(result, result.ok ? 201 : 409);
  }
  if (path === 'orders' && method === 'GET')
    return response(
      await all(
        db,
        'SELECT id,number,status,payment_status,fulfillment_status,payment_method,total_piastres,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
        user.id,
      ),
    );
  if (path.startsWith('orders/')) {
    const [, id, action] = path.split('/');
    const order = await first<{ id: string }>(
      db,
      'SELECT * FROM orders WHERE id=? AND user_id=?',
      id,
      user.id,
    );
    if (!order) return response({ error: 'not_found' }, 404);
    if (!action && method === 'GET')
      return response({
        order,
        lines: await all(
          db,
          'SELECT qty,unit_price_piastres,line_total_piastres,snapshot FROM order_lines WHERE order_id=?',
          id,
        ),
        shipments: await all(
          db,
          'SELECT carrier,tracking_number,tracking_url,shipped_at,delivered_at FROM shipments WHERE order_id=?',
          id,
        ),
      });
    if (action === 'pay' && method === 'POST') {
      const r = await startKashierPayment(db, kashier(env), {
        orderId: id!,
        userId: user.id,
        email: user.email,
        redirectUrl: new URL('/' + locale + '/orders/' + id, env.APP_URL).href,
        webhookUrl: new URL('/api/webhooks/kashier', env.APP_URL).href,
        now,
      });
      return response(r, r.ok ? 200 : 409);
    }
  }

  return null;
}
