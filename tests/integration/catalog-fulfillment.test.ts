import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { IMPORT_COLUMNS } from '../../packages/core/src/catalogImport.ts';
import { validateImport, stepImport } from '../../packages/db/src/imports.ts';
import { fulfill, recordCodCollection, settleCod } from '../../packages/db/src/fulfillment.ts';
import { decideCod } from '../../packages/db/src/operations.ts';
import { seed, shipping, order, now } from '../helpers/commerce.ts';
let t: TestD1;
beforeAll(async () => {
  t = await createTestD1();
  await shipping(t.db);
  await t.db.prepare("UPDATE settings SET value='true' WHERE key='checkout_enabled'").run();
});
afterAll(() => t?.dispose());
function csv(rows: Record<string, string>[]) {
  return [
    IMPORT_COLUMNS.join(','),
    ...rows.map((r) =>
      IMPORT_COLUMNS.map((k) => '"' + (r[k] ?? '').replaceAll('"', '""') + '"').join(','),
    ),
  ].join('\n');
}
function row(id: string): Record<string, string> {
  return {
    sku_code: 'IMPORT-' + id,
    product_key: 'import-' + id,
    slug_ar: 'test-' + id,
    slug_en: 'test-' + id,
    title_ar: 'قطعة اختبار',
    title_en: 'Test only piece',
    description_ar: 'قطعة تجريبية غير حقيقية',
    description_en: 'Synthetic test only',
    category: 'test',
    kind: 'ready',
    width_cm: '100',
    length_cm: '150',
    color: 'navy',
    material: 'TEST',
    technique: 'TEST',
    origin_note: 'TEST ONLY',
    price_egp: '1000.25',
    quantity: '1',
    unique_piece: 'yes',
    weight_g: '4000',
    package_length_cm: '110',
    package_width_cm: '30',
    package_height_cm: '30',
    image_urls: 'https://media.tiraze.net/test.webp',
    image_alt_ar: 'اختبار',
    image_alt_en: 'Test only',
    status: 'published',
  };
}
it('publishes nothing from a partly staged import and resumes safely', async () => {
  const result = await validateImport(
    t.db,
    'staff',
    csv([row('ONE'), row('TWO')]),
    ['media.tiraze.net'],
    now,
  );
  expect(result.errors).toEqual([]);
  expect(await stepImport(t.db, 'staff', result.id, now)).toMatchObject({ done: false, cursor: 1 });
  expect(
    (
      await t.db
        .prepare(
          "SELECT count(*) AS n FROM products WHERE product_key LIKE 'import-%' AND status='published'",
        )
        .first<{ n: number }>()
    )?.n,
  ).toBe(0);
  await stepImport(t.db, 'staff', result.id, now);
  expect((await stepImport(t.db, 'staff', result.id, now)).done).toBe(true);
  expect((await stepImport(t.db, 'staff', result.id, now)).done).toBe(true);
  expect(
    (
      await t.db
        .prepare(
          "SELECT count(*) AS n FROM products WHERE product_key LIKE 'import-%' AND status='published'",
        )
        .first<{ n: number }>()
    )?.n,
  ).toBe(2);
  expect(
    (
      await t.db
        .prepare("SELECT price_piastres FROM skus WHERE code='IMPORT-ONE'")
        .first<{ price_piastres: number }>()
    )?.price_piastres,
  ).toBe(100025);
});
it('rejects the entire file for duplicate SKU, malformed CSV or inconsistent product content', async () => {
  const one = row('DUP');
  const r = await validateImport(t.db, 'staff', csv([one, one]), ['media.tiraze.net'], now);
  expect(r.errors.some((e) => e.code === 'duplicate_in_file')).toBe(true);
  const malformed = await validateImport(t.db, 'staff', '"unterminated', ['media.tiraze.net'], now);
  expect(malformed.errors[0]?.code).toBe('malformed_csv');
  const first = row('MANY'),
    second = { ...first, sku_code: 'IMPORT-SECOND', title_en: 'Conflicting title' };
  const conflict = await validateImport(
    t.db,
    'staff',
    csv([first, second]),
    ['media.tiraze.net'],
    now,
  );
  expect(conflict.errors.some((e) => e.code === 'inconsistent_product_details')).toBe(true);
});
it('requires confirmation and fulfillment before collection; settlement is separate and returns do not restock automatically', async () => {
  await seed(t.db, 'fulfillment');
  const o = await order(t.db, 'fulfillment', 'fulfillment', 'cod');
  await expect(fulfill(t.db, 'staff', o.orderId, 'prepare', now)).rejects.toThrow(
    /OPERATION_CONFLICT/,
  );
  await decideCod(t.db, 'staff', o.orderId, 'confirm', 'Phone verified', now + 1);
  await fulfill(t.db, 'staff', o.orderId, 'prepare', now + 2);
  await expect(
    fulfill(t.db, 'staff', o.orderId, 'ship', now + 3, {
      carrier: 'TEST',
      trackingNumber: 'TEST',
      trackingUrl: 'https://evil.example/test',
    }),
  ).rejects.toThrow('tracking_host_not_allowed');
  await fulfill(t.db, 'staff', o.orderId, 'ship', now + 3, {
    carrier: 'TEST',
    trackingNumber: 'TEST',
  });
  await fulfill(t.db, 'staff', o.orderId, 'deliver', now + 4);
  await expect(
    recordCodCollection(t.db, 'finance', o.orderId, 1, 'WRONG', now + 5),
  ).rejects.toThrow(/OPERATION_CONFLICT/);
  await recordCodCollection(t.db, 'finance', o.orderId, 110000, 'TEST-COLLECTION', now + 6);
  expect(
    (
      await t.db
        .prepare('SELECT settled_at FROM cod_collections WHERE order_id=?')
        .bind(o.orderId)
        .first<{ settled_at: number | null }>()
    )?.settled_at,
  ).toBeNull();
  await settleCod(t.db, 'finance', o.orderId, 'TEST-SETTLEMENT', now + 7);
  await expect(settleCod(t.db, 'finance', o.orderId, 'REPLAY', now + 8)).rejects.toThrow(
    /OPERATION_CONFLICT/,
  );
  await fulfill(t.db, 'staff', o.orderId, 'return', now + 9);
  expect(
    await t.db.prepare("SELECT on_hand,reserved FROM inventory WHERE sku_id='fulfillment'").first(),
  ).toEqual({ on_hand: 0, reserved: 0 });
});
