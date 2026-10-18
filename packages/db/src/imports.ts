import { randomId, validateCatalogCsv, type ImportRow } from '@tiraze/core';
import { all, first, json, type Db } from './sql.ts';
import { normalizeSearch } from './catalog.ts';
import { guard } from './operations.ts';
import { auditStmt } from './audit.ts';
type StagedRow = ImportRow & { productId: string; skuId: string };
export async function validateImport(
  db: Db,
  actorId: string,
  csv: string,
  allowedImageHosts: string[],
  now: number,
) {
  const codes = new Set(
    (await all<{ code: string }>(db, 'SELECT code FROM skus')).map((r) => r.code),
  );
  const report = validateCatalogCsv(csv, { existingSkuCodes: codes, allowedImageHosts });
  const groups = new Map<string, string>();
  for (const row of report.rows) {
    const fingerprint = JSON.stringify([
      row.slugAr,
      row.slugEn,
      row.titleAr,
      row.titleEn,
      row.descriptionAr,
      row.descriptionEn,
      row.category,
      row.kind,
      row.material,
      row.technique,
      row.originNote,
      row.imageUrls,
      row.imageAltAr,
      row.imageAltEn,
      row.status,
    ]);
    if (groups.has(row.productKey) && groups.get(row.productKey) !== fingerprint)
      report.errors.push({
        rowNumber: row.rowNumber,
        column: 'product_key',
        code: 'inconsistent_product_details',
      });
    groups.set(row.productKey, fingerprint);
  }
  const existing = new Set(
    (await all<{ product_key: string }>(db, 'SELECT product_key FROM products')).map(
      (r) => r.product_key,
    ),
  );
  for (const row of report.rows)
    if (existing.has(row.productKey))
      report.errors.push({
        rowNumber: row.rowNumber,
        column: 'product_key',
        code: 'already_exists_use_editor',
      });
  const id = randomId(),
    ids = new Map<string, string>();
  const rows = report.rows.map((row) => {
    if (!ids.has(row.productKey)) ids.set(row.productKey, randomId());
    return { ...row, productId: ids.get(row.productKey)!, skuId: randomId() };
  });
  await db.batch([
    db
      .prepare(
        'INSERT INTO import_batches (id,actor_id,status,row_count,product_count,error_count,errors,created_at,payload) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        actorId,
        report.errors.length ? 'rejected' : 'validated',
        rows.length,
        report.productCount,
        report.errors.length,
        json(report.errors),
        now,
        report.errors.length ? null : json(rows),
      ),
    auditStmt(
      db,
      {
        actorId,
        action: 'catalog.import_validate',
        targetType: 'import',
        targetId: id,
        meta: { rowCount: rows.length, errors: report.errors.length },
      },
      now,
    ),
  ]);
  return { id, rowCount: rows.length, productCount: report.productCount, errors: report.errors };
}
/** Each bounded transaction stages one SKU; nothing publishes until the entire approved file is staged. */
export async function stepImport(db: Db, actorId: string, id: string, now: number) {
  const batch = await first<{
    status: string;
    payload: string | null;
    cursor: number;
    row_count: number;
    approved_at: number | null;
  }>(db, 'SELECT * FROM import_batches WHERE id=?', id);
  if (!batch || batch.status === 'rejected') throw new Error('import_not_validated');
  if (batch.status === 'committed')
    return { done: true, cursor: batch.row_count, total: batch.row_count };
  if (!batch.payload) throw new Error('import_payload_missing');
  const rows = JSON.parse(batch.payload) as StagedRow[];
  const row = rows[batch.cursor];
  if (!row) {
    await db.batch([
      ...guard(
        db,
        "EXISTS (SELECT 1 FROM import_batches WHERE id=? AND status='validated' AND cursor=row_count)",
        [id],
      ),
      db
        .prepare(
          'UPDATE products SET status=(SELECT desired_status FROM import_products WHERE batch_id=? AND product_id=products.id),updated_at=? WHERE id IN (SELECT product_id FROM import_products WHERE batch_id=?)',
        )
        .bind(id, now, id),
      db.prepare("UPDATE import_batches SET status='committed',payload=NULL WHERE id=?").bind(id),
      auditStmt(
        db,
        {
          actorId,
          action: 'catalog.import_commit',
          targetType: 'import',
          targetId: id,
          meta: { rows: rows.length },
        },
        now,
      ),
    ]);
    return { done: true, cursor: rows.length, total: rows.length };
  }
  const firstRow = rows.findIndex((r) => r.productId === row.productId) === batch.cursor;
  await db.batch([
    ...guard(
      db,
      "EXISTS (SELECT 1 FROM import_batches WHERE id=? AND status='validated' AND cursor=?)",
      [id, batch.cursor],
    ),
    ...(firstRow
      ? [
          db
            .prepare(
              "INSERT INTO products (id,product_key,status,kind,category,created_at,updated_at) VALUES (?,?,'draft',?,?,?,?)",
            )
            .bind(row.productId, row.productKey, row.kind, row.category, now, now),
          ...(['ar', 'en'] as const).map((lang) =>
            db
              .prepare(
                'INSERT INTO product_translations (product_id,locale,slug,title,description,material,technique,origin_note,search_text) VALUES (?,?,?,?,?,?,?,?,?)',
              )
              .bind(
                row.productId,
                lang,
                lang === 'ar' ? row.slugAr : row.slugEn,
                lang === 'ar' ? row.titleAr : row.titleEn,
                lang === 'ar' ? row.descriptionAr : row.descriptionEn,
                row.material,
                row.technique,
                row.originNote,
                normalizeSearch(
                  (lang === 'ar'
                    ? row.titleAr + ' ' + row.descriptionAr
                    : row.titleEn + ' ' + row.descriptionEn) +
                    ' ' +
                    row.color,
                ),
              ),
          ),
          db
            .prepare(
              'INSERT INTO import_products (batch_id,product_id,desired_status) VALUES (?,?,?)',
            )
            .bind(id, row.productId, row.status),
          ...row.imageUrls.map((url, i) =>
            db
              .prepare(
                'INSERT INTO media (id,product_id,url,alt_ar,alt_en,sort_order) VALUES (?,?,?,?,?,?)',
              )
              .bind(randomId(), row.productId, url, row.imageAltAr, row.imageAltEn, i),
          ),
        ]
      : []),
    db
      .prepare(
        'INSERT INTO skus (id,product_id,code,width_cm,length_cm,color,price_piastres,is_unique,weight_g,package_length_cm,package_width_cm,package_height_cm,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        row.skuId,
        row.productId,
        row.skuCode,
        row.widthCm,
        row.lengthCm,
        row.color,
        row.pricePiastres,
        row.uniquePiece ? 1 : 0,
        row.weightG,
        row.packageLengthCm,
        row.packageWidthCm,
        row.packageHeightCm,
        now,
        now,
      ),
    db
      .prepare('INSERT INTO inventory (sku_id,on_hand,reserved,updated_at) VALUES (?,?,0,?)')
      .bind(row.skuId, row.quantity, now),
    db
      .prepare(
        "INSERT INTO inventory_movements (sku_id,delta_on_hand,delta_reserved,reason,ref_type,ref_id,actor_id,created_at) VALUES (?,?,0,'catalog import','import',?,?,?)",
      )
      .bind(row.skuId, row.quantity, id, actorId, now),
    db
      .prepare(
        'UPDATE import_batches SET cursor=cursor+1,approved_at=COALESCE(approved_at,?) WHERE id=?',
      )
      .bind(now, id),
  ]);
  return { done: false, cursor: batch.cursor + 1, total: rows.length };
}
