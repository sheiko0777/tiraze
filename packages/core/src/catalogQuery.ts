import { z } from 'zod';
import { decimalToPiastres } from './money.ts';
const amount = z
  .string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/)
  .optional()
  .transform((v) => (v ? decimalToPiastres(v) : undefined));
const width = z.coerce.number().int().min(1).max(3000).optional();
const schema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  color: z.string().trim().max(40).optional(),
  minPrice: amount,
  maxPrice: amount,
  minWidth: width,
  maxWidth: width,
  available: z.enum(['1', '0']).optional(),
  sort: z.enum(['curated', 'price_asc', 'price_desc', 'newest']).default('curated'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export function catalogQuery(params: URLSearchParams) {
  const values = Object.fromEntries([...params].filter(([, v]) => v !== ''));
  const q = schema.parse(values);
  return {
    q: q.q,
    category: q.category,
    color: q.color,
    minPricePiastres: q.minPrice,
    maxPricePiastres: q.maxPrice,
    minWidthCm: q.minWidth,
    maxWidthCm: q.maxWidth,
    availableOnly: q.available === '1',
    sort: q.sort,
    page: q.page,
    pageSize: 24,
  };
}
