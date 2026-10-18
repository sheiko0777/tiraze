import type { D1Database } from '@cloudflare/workers-types';
import {
  createAddress,
  setCartItem,
  getCart,
  createOrder,
  activateShippingVersion,
  getActiveShipping,
} from '../../packages/db/src/index.ts';
export const now = 1790000000000;
export async function seed(db: D1Database, id: string, stock = 1, price = 100000, unique = true) {
  await db.batch([
    db
      .prepare(
        "INSERT INTO products (id,product_key,status,kind,category,is_fixture,created_at,updated_at) VALUES (?,?,'published','ready','test',1,?,?)",
      )
      .bind('p-' + id, id, now, now),
    ...(['ar', 'en'] as const).map((lang) =>
      db
        .prepare(
          'INSERT INTO product_translations (product_id,locale,slug,title,description,search_text) VALUES (?,?,?,?,?,?)',
        )
        .bind('p-' + id, lang, id, 'Fixture ' + id, 'Test only', 'fixture ' + id),
    ),
    db
      .prepare(
        'INSERT INTO skus (id,product_id,code,width_cm,length_cm,price_piastres,is_unique,weight_g,package_length_cm,package_width_cm,package_height_cm,created_at,updated_at) VALUES (?,?,?,100,150,?,?,4000,110,30,30,?,?)',
      )
      .bind(id, 'p-' + id, 'SKU-' + id, price, unique ? 1 : 0, now, now),
    db
      .prepare('INSERT INTO inventory (sku_id,on_hand,reserved,updated_at) VALUES (?,?,0,?)')
      .bind(id, stock, now),
  ]);
}
export async function shipping(db: D1Database) {
  await activateShippingVersion(
    db,
    {
      zones: { C: 'CAIRO' },
      rates: [{ zoneCode: 'CAIRO', maxWeightG: 10000, maxLongestCm: 200, feePiastres: 10000 }],
      codCarrierLimitPiastres: 1000000,
      isFixture: true,
    },
    'fixture',
    now,
  );
}
export async function basket(
  db: D1Database,
  userId: string,
  skuId: string,
  method: 'cod' | 'kashier' = 'kashier',
) {
  await setCartItem(db, userId, skuId, 1, now);
  const address = await createAddress(
    db,
    userId,
    {
      recipientName: 'Fixture',
      phone: '+201012345678',
      governorate: 'C',
      city: 'Fixture Cairo',
      line1: 'Test address',
    },
    now,
  );
  const cart = await getCart(db, userId, 'en');
  return {
    customer: { userId, email: userId + '@example.com', emailVerified: true },
    input: {
      addressId: address.id,
      shippingVersionId: (await getActiveShipping(db))!.table.versionId,
      paymentMethod: method,
      idempotencyKey: crypto.randomUUID(),
      cartVersion: cart.version,
      locale: 'en' as const,
    },
  };
}
export async function order(
  db: D1Database,
  userId: string,
  skuId: string,
  method: 'cod' | 'kashier' = 'kashier',
) {
  const b = await basket(db, userId, skuId, method);
  const result = await createOrder(db, b.customer, b.input, now);
  if (!result.ok) throw new Error(result.error);
  return { ...result, ...b };
}
