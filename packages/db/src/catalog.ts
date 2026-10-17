import type { Locale } from '@tiraze/core';
import { all, first, type Db } from './sql.ts';

export interface CatalogFilter {
  locale: Locale;
  category?: string;
  color?: string;
  minPricePiastres?: number;
  maxPricePiastres?: number;
  minWidthCm?: number;
  maxWidthCm?: number;
  availableOnly?: boolean;
  q?: string;
  sort?: 'curated' | 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  pageSize?: number;
  includeFixtures: boolean;
}

export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  category: string;
  kind: 'ready' | 'made_to_order';
  isFixture: boolean;
  minPricePiastres: number | null;
  available: number;
  imageUrl: string | null;
  imageAlt: string | null;
}

export function normalizeSearch(text: string): string {
  // Arabic-aware folding: strip diacritics/tatweel, unify alef/ya/ta marbuta forms.
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function listProducts(db: Db, f: CatalogFilter): Promise<{ items: ProductCard[]; total: number }> {
  const where: string[] = [`p.status = 'published'`, `t.locale = ?`];
  const params: unknown[] = [f.locale];
  if (!f.includeFixtures) where.push('p.is_fixture = 0');
  if (f.category) {
    where.push('p.category = ?');
    params.push(f.category);
  }
  const skuWhere: string[] = ['s.active = 1'];
  const skuParams: unknown[] = [];
  if (f.color) {
    skuWhere.push('s.color = ?');
    skuParams.push(f.color);
  }
  if (f.minPricePiastres != null) {
    skuWhere.push('s.price_piastres >= ?');
    skuParams.push(f.minPricePiastres);
  }
  if (f.maxPricePiastres != null) {
    skuWhere.push('s.price_piastres <= ?');
    skuParams.push(f.maxPricePiastres);
  }
  if (f.minWidthCm != null) {
    skuWhere.push('s.width_cm >= ?');
    skuParams.push(f.minWidthCm);
  }
  if (f.maxWidthCm != null) {
    skuWhere.push('s.width_cm <= ?');
    skuParams.push(f.maxWidthCm);
  }
  if (f.availableOnly) skuWhere.push('(i.on_hand - i.reserved) > 0');
  const q = f.q ? normalizeSearch(f.q) : '';
  if (q) {
    where.push(`t.search_text LIKE ? ESCAPE '\\'`);
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const order =
    f.sort === 'price_asc'
      ? 'min_price ASC'
      : f.sort === 'price_desc'
        ? 'min_price DESC'
        : f.sort === 'newest'
          ? 'p.created_at DESC'
          : 'p.sort_order ASC, p.created_at DESC';
  const pageSize = Math.min(Math.max(f.pageSize ?? 24, 1), 60);
  const page = Math.max(f.page ?? 1, 1);

  const base = `
    FROM products p
    JOIN product_translations t ON t.product_id = p.id
    JOIN (
      SELECT s.product_id, MIN(s.price_piastres) AS min_price, SUM(MAX(i.on_hand - i.reserved, 0)) AS available
      FROM skus s JOIN inventory i ON i.sku_id = s.id
      WHERE ${skuWhere.join(' AND ')}
      GROUP BY s.product_id
    ) agg ON agg.product_id = p.id
    WHERE ${where.join(' AND ')}`;
  const allParams = [...skuParams, ...params];
  const total = (await first<{ n: number }>(db, `SELECT COUNT(*) AS n ${base}`, ...allParams))?.n ?? 0;
  const rows = await all<{
    id: string;
    slug: string;
    title: string;
    category: string;
    kind: 'ready' | 'made_to_order';
    is_fixture: number;
    min_price: number | null;
    available: number;
    url: string | null;
    alt: string | null;
  }>(
    db,
    `SELECT p.id, t.slug, t.title, p.category, p.kind, p.is_fixture, agg.min_price, agg.available,
       (SELECT m.url FROM media m WHERE m.product_id = p.id ORDER BY m.sort_order LIMIT 1) AS url,
       (SELECT CASE WHEN ? = 'ar' THEN m.alt_ar ELSE m.alt_en END FROM media m WHERE m.product_id = p.id ORDER BY m.sort_order LIMIT 1) AS alt
     ${base} ORDER BY ${order} LIMIT ? OFFSET ?`,
    f.locale,
    ...allParams,
    pageSize,
    (page - 1) * pageSize,
  );
  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category,
      kind: r.kind,
      isFixture: r.is_fixture === 1,
      minPricePiastres: r.min_price,
      available: r.available,
      imageUrl: r.url,
      imageAlt: r.alt,
    })),
  };
}

export interface ProductDetail {
  id: string;
  category: string;
  kind: 'ready' | 'made_to_order';
  isFixture: boolean;
  status: string;
  t: { slug: string; title: string; description: string; material: string; technique: string; originNote: string; care: string };
  slugs: Record<Locale, string>;
  skus: Array<{
    id: string;
    code: string;
    widthCm: number;
    lengthCm: number;
    color: string;
    pricePiastres: number;
    isUnique: boolean;
    available: number;
  }>;
  media: Array<{ url: string; alt: string; width: number | null; height: number | null }>;
}

export async function getProductBySlug(db: Db, locale: Locale, slug: string, includeFixtures: boolean): Promise<ProductDetail | null> {
  const p = await first<{ id: string; category: string; kind: 'ready' | 'made_to_order'; is_fixture: number; status: string }>(
    db,
    `SELECT p.id, p.category, p.kind, p.is_fixture, p.status FROM products p JOIN product_translations t ON t.product_id = p.id
     WHERE t.locale = ? AND t.slug = ? AND p.status = 'published' ${includeFixtures ? '' : 'AND p.is_fixture = 0'}`,
    locale,
    slug,
  );
  if (!p) return null;
  return loadProduct(db, p, locale);
}

export async function getProductById(db: Db, id: string, locale: Locale): Promise<ProductDetail | null> {
  const p = await first<{ id: string; category: string; kind: 'ready' | 'made_to_order'; is_fixture: number; status: string }>(
    db,
    `SELECT id, category, kind, is_fixture, status FROM products WHERE id = ?`,
    id,
  );
  return p ? loadProduct(db, p, locale) : null;
}

async function loadProduct(
  db: Db,
  p: { id: string; category: string; kind: 'ready' | 'made_to_order'; is_fixture: number; status: string },
  locale: Locale,
): Promise<ProductDetail | null> {
  const [translations, skus, media] = await db.batch([
    db.prepare(`SELECT locale, slug, title, description, material, technique, origin_note, care FROM product_translations WHERE product_id = ?`).bind(p.id),
    db
      .prepare(
        `SELECT s.id, s.code, s.width_cm, s.length_cm, s.color, s.price_piastres, s.is_unique, MAX(i.on_hand - i.reserved, 0) AS available
         FROM skus s JOIN inventory i ON i.sku_id = s.id WHERE s.product_id = ? AND s.active = 1 ORDER BY s.width_cm, s.length_cm`,
      )
      .bind(p.id),
    db.prepare(`SELECT url, alt_ar, alt_en, width, height FROM media WHERE product_id = ? ORDER BY sort_order`).bind(p.id),
  ]);
  type T = { locale: Locale; slug: string; title: string; description: string; material: string; technique: string; origin_note: string; care: string };
  const ts = (translations?.results ?? []) as T[];
  const tr = ts.find((x) => x.locale === locale);
  if (!tr) return null;
  const slugs = Object.fromEntries(ts.map((x) => [x.locale, x.slug])) as Record<Locale, string>;
  return {
    id: p.id,
    category: p.category,
    kind: p.kind,
    isFixture: p.is_fixture === 1,
    status: p.status,
    slugs,
    t: {
      slug: tr.slug,
      title: tr.title,
      description: tr.description,
      material: tr.material,
      technique: tr.technique,
      originNote: tr.origin_note,
      care: tr.care,
    },
    skus: ((skus?.results ?? []) as Array<Record<string, number | string>>).map((s) => ({
      id: String(s.id),
      code: String(s.code),
      widthCm: Number(s.width_cm),
      lengthCm: Number(s.length_cm),
      color: String(s.color),
      pricePiastres: Number(s.price_piastres),
      isUnique: Number(s.is_unique) === 1,
      available: Number(s.available),
    })),
    media: ((media?.results ?? []) as Array<{ url: string; alt_ar: string; alt_en: string; width: number | null; height: number | null }>).map((m) => ({
      url: m.url,
      alt: locale === 'ar' ? m.alt_ar : m.alt_en,
      width: m.width,
      height: m.height,
    })),
  };
}

export async function listCategories(db: Db, includeFixtures: boolean): Promise<string[]> {
  const rows = await all<{ category: string }>(
    db,
    `SELECT DISTINCT category FROM products WHERE status = 'published' ${includeFixtures ? '' : 'AND is_fixture = 0'} ORDER BY category`,
  );
  return rows.map((r) => r.category);
}

export async function listColors(db: Db, includeFixtures: boolean): Promise<string[]> {
  const rows = await all<{ color: string }>(
    db,
    `SELECT DISTINCT s.color FROM skus s JOIN products p ON p.id = s.product_id
     WHERE p.status = 'published' AND s.active = 1 AND s.color <> '' ${includeFixtures ? '' : 'AND p.is_fixture = 0'} ORDER BY s.color`,
  );
  return rows.map((r) => r.color);
}

export async function listPublishedSlugs(db: Db, includeFixtures: boolean): Promise<Array<{ ar: string; en: string; updatedAt: number }>> {
  const rows = await all<{ ar: string; en: string; updated_at: number }>(
    db,
    `SELECT a.slug AS ar, e.slug AS en, p.updated_at FROM products p
     JOIN product_translations a ON a.product_id = p.id AND a.locale = 'ar'
     JOIN product_translations e ON e.product_id = p.id AND e.locale = 'en'
     WHERE p.status = 'published' ${includeFixtures ? '' : 'AND p.is_fixture = 0'}`,
  );
  return rows.map((r) => ({ ar: r.ar, en: r.en, updatedAt: r.updated_at }));
}
