import { decimalToPiastres } from './money.ts';

// CSV catalogue import (up to 1000 products). A dry run validates every row and reports
// row-level errors; nothing is published from a file that has any error. The template is
// documented in docs/runbooks/catalog-import.md.

export const IMPORT_COLUMNS = [
  'sku_code',
  'product_key',
  'slug_ar',
  'slug_en',
  'title_ar',
  'title_en',
  'description_ar',
  'description_en',
  'category',
  'kind',
  'width_cm',
  'length_cm',
  'color',
  'material',
  'technique',
  'origin_note',
  'price_egp',
  'quantity',
  'unique_piece',
  'weight_g',
  'package_length_cm',
  'package_width_cm',
  'package_height_cm',
  'image_urls',
  'image_alt_ar',
  'image_alt_en',
  'status',
] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const MAX_IMPORT_ROWS = 1000;

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF/LF). */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (quoted) throw new Error('unterminated_csv_quote');
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

export interface ImportRow {
  rowNumber: number;
  skuCode: string;
  productKey: string;
  slugAr: string;
  slugEn: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: string;
  kind: 'ready' | 'made_to_order';
  widthCm: number;
  lengthCm: number;
  color: string;
  material: string;
  technique: string;
  originNote: string;
  pricePiastres: number;
  quantity: number;
  uniquePiece: boolean;
  weightG: number;
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
  imageUrls: string[];
  imageAltAr: string;
  imageAltEn: string;
  status: 'draft' | 'published';
}

export interface RowError {
  rowNumber: number;
  column: string;
  code: string;
}

export interface ImportReport {
  rows: ImportRow[];
  errors: RowError[];
  productCount: number;
}

const SLUG = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const SKU = /^[A-Z0-9][A-Z0-9_-]{2,40}$/;

export function validateCatalogCsv(
  csv: string,
  opts: { existingSkuCodes?: ReadonlySet<string>; allowedImageHosts: readonly string[] },
): ImportReport {
  let table: string[][];
  try {
    table = parseCsv(csv);
  } catch {
    return {
      rows: [],
      errors: [{ rowNumber: 1, column: '*', code: 'malformed_csv' }],
      productCount: 0,
    };
  }
  const errors: RowError[] = [];
  const rows: ImportRow[] = [];
  const header = table[0]?.map((h) => h.trim().toLowerCase());
  if (!header)
    return { rows, errors: [{ rowNumber: 1, column: '*', code: 'empty_file' }], productCount: 0 };
  const missing = IMPORT_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return {
      rows,
      errors: missing.map((c) => ({ rowNumber: 1, column: c, code: 'missing_column' })),
      productCount: 0,
    };
  }
  if (new Set(header).size !== header.length)
    return {
      rows: [],
      errors: [{ rowNumber: 1, column: '*', code: 'duplicate_header' }],
      productCount: 0,
    };
  const body = table.slice(1);
  if (!body.length)
    return {
      rows: [],
      errors: [{ rowNumber: 2, column: '*', code: 'empty_file' }],
      productCount: 0,
    };
  if (body.length > MAX_IMPORT_ROWS) {
    return {
      rows,
      errors: [{ rowNumber: 1, column: '*', code: 'too_many_rows' }],
      productCount: 0,
    };
  }

  const seenSku = new Set<string>();
  const productSlugs = new Map<string, { slugAr: string; slugEn: string }>();
  const slugOwner = new Map<string, string>();

  body.forEach((cells, i) => {
    const rowNumber = i + 2;
    const get = (c: ImportColumn) => (cells[header.indexOf(c)] ?? '').trim();
    const rowErrors: RowError[] = [];
    if (cells.length !== header.length)
      rowErrors.push({ rowNumber, column: '*', code: 'column_count' });
    const err = (column: string, code: string) => rowErrors.push({ rowNumber, column, code });
    const int = (c: ImportColumn, min: number, max: number) => {
      const raw = get(c);
      if (!/^\d+$/.test(raw)) {
        err(c, 'not_integer');
        return 0;
      }
      const n = Number(raw);
      if (n < min || n > max) err(c, 'out_of_range');
      return n;
    };

    const skuCode = get('sku_code').toUpperCase();
    if (!SKU.test(skuCode)) err('sku_code', 'invalid_sku');
    else if (seenSku.has(skuCode)) err('sku_code', 'duplicate_in_file');
    else if (opts.existingSkuCodes?.has(skuCode)) err('sku_code', 'already_exists');
    seenSku.add(skuCode);

    const productKey = get('product_key');
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(productKey)) err('product_key', 'invalid_product_key');
    const slugAr = get('slug_ar');
    const slugEn = get('slug_en').toLowerCase();
    if (!SLUG.test(slugAr)) err('slug_ar', 'invalid_slug');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugEn)) err('slug_en', 'invalid_slug');
    const prior = productSlugs.get(productKey);
    if (prior && (prior.slugAr !== slugAr || prior.slugEn !== slugEn))
      err('product_key', 'inconsistent_slugs');
    for (const [loc, s] of [
      ['ar', slugAr],
      ['en', slugEn],
    ] as const) {
      const owner = slugOwner.get(`${loc}:${s}`);
      if (owner && owner !== productKey) err(`slug_${loc}`, 'duplicate_slug');
    }

    for (const c of [
      'title_ar',
      'title_en',
      'description_ar',
      'description_en',
      'material',
      'technique',
      'image_alt_ar',
      'image_alt_en',
    ] as const) {
      const v = get(c);
      if (!v) err(c, 'required');
      else if (v.length > (c.startsWith('description') ? 4000 : 200)) err(c, 'too_long');
    }
    const category = get('category');
    if (!/^[a-z0-9-]{2,40}$/.test(category)) err('category', 'invalid_category');
    const kind = get('kind');
    if (kind !== 'ready' && kind !== 'made_to_order') err('kind', 'invalid_kind');

    let pricePiastres = 0;
    try {
      pricePiastres = decimalToPiastres(get('price_egp'));
      if (pricePiastres <= 0) err('price_egp', 'must_be_positive');
    } catch {
      err('price_egp', 'invalid_price');
    }
    const quantity = int('quantity', 0, 10_000);
    const uniqueRaw = get('unique_piece').toLowerCase();
    if (!['yes', 'no', 'true', 'false', '1', '0'].includes(uniqueRaw))
      err('unique_piece', 'invalid_boolean');
    const uniquePiece = ['yes', 'true', '1'].includes(uniqueRaw);
    if (uniquePiece && quantity > 1) err('quantity', 'unique_piece_quantity_gt_1');

    const imageUrls = get('image_urls')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    if (imageUrls.length > 12) err('image_urls', 'too_many_images');
    if (imageUrls.length === 0) err('image_urls', 'required');
    for (const u of imageUrls) {
      try {
        const url = new URL(u);
        if (
          url.protocol !== 'https:' ||
          url.username ||
          url.password ||
          url.port ||
          !opts.allowedImageHosts.includes(url.hostname)
        )
          err('image_urls', 'host_not_allowed');
      } catch {
        err('image_urls', 'invalid_url');
      }
    }
    const status = get('status');
    if (status !== 'draft' && status !== 'published') err('status', 'invalid_status');
    const originNote = get('origin_note');
    if (status === 'published' && !originNote) err('origin_note', 'required_for_published');

    const row: ImportRow = {
      rowNumber,
      skuCode,
      productKey,
      slugAr,
      slugEn,
      titleAr: get('title_ar'),
      titleEn: get('title_en'),
      descriptionAr: get('description_ar'),
      descriptionEn: get('description_en'),
      category,
      kind: kind === 'made_to_order' ? 'made_to_order' : 'ready',
      widthCm: int('width_cm', 10, 3000),
      lengthCm: int('length_cm', 10, 3000),
      color: get('color'),
      material: get('material'),
      technique: get('technique'),
      originNote,
      pricePiastres,
      quantity,
      uniquePiece,
      weightG: int('weight_g', 1, 500_000),
      packageLengthCm: int('package_length_cm', 1, 2000),
      packageWidthCm: int('package_width_cm', 1, 2000),
      packageHeightCm: int('package_height_cm', 1, 2000),
      imageUrls,
      imageAltAr: get('image_alt_ar'),
      imageAltEn: get('image_alt_en'),
      status: status === 'published' ? 'published' : 'draft',
    };
    if (rowErrors.length) errors.push(...rowErrors);
    else {
      rows.push(row);
      productSlugs.set(productKey, { slugAr, slugEn });
      slugOwner.set(`ar:${slugAr}`, productKey);
      slugOwner.set(`en:${slugEn}`, productKey);
    }
  });

  return {
    rows: errors.length ? [] : rows,
    errors,
    productCount: new Set(rows.map((r) => r.productKey)).size,
  };
}
