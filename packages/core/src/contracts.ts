import { z } from 'zod';
import { isGovernorateCode, normalizeEgyptMobile } from './egypt.ts';
import { ORDER_STATUSES, PAYMENT_STATUSES, FULFILLMENT_STATUSES, QUOTE_STATUSES } from './states.ts';

// Server-side input contracts. Every API boundary parses with one of these; prices, totals,
// payment status and stock are never accepted from the client.

export const STAFF_ROLES = ['owner', 'catalog', 'fulfillment', 'support', 'finance'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const idempotencyKey = z.string().min(16).max(100).regex(/^[A-Za-z0-9_-]+$/);

export const egyptMobile = z
  .string()
  .trim()
  .max(25)
  .transform((v, ctx) => {
    const n = normalizeEgyptMobile(v);
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'invalid_egypt_mobile' });
      return z.NEVER;
    }
    return n;
  });

export const cartItemInput = z.object({
  skuId: id,
  qty: z.number().int().min(1).max(20),
});
export const cartSetInput = z.object({ items: z.array(cartItemInput).max(50) });
/** Anonymous browser cart merged into the account cart after sign-in (ids + quantities only). */
export const cartMergeInput = cartSetInput;

export const addressInput = z.object({
  recipientName: text(120),
  phone: egyptMobile,
  governorate: z.string().refine(isGovernorateCode, 'invalid_governorate'),
  city: text(80),
  line1: text(200),
  line2: optionalText(200),
  notes: optionalText(300),
});
export type AddressInput = z.infer<typeof addressInput>;

export const checkoutInput = z.object({
  addressId: id,
  paymentMethod: z.enum(['kashier', 'cod']),
  idempotencyKey,
  /** Cart version the customer reviewed; a mismatch means the cart changed and must be re-reviewed. */
  cartVersion: z.number().int().min(0),
  locale: z.enum(['ar', 'en']).default('ar'),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const quoteRequestInput = z.object({
  name: text(120),
  email: z.email().max(160),
  phone: egyptMobile.optional(),
  widthCm: z.number().int().min(30).max(2000),
  lengthCm: z.number().int().min(30).max(3000),
  colors: optionalText(200),
  material: optionalText(120),
  budgetEgp: z.number().int().min(0).max(100_000_000).optional(),
  contactMethod: z.enum(['email', 'phone', 'whatsapp']),
  notes: optionalText(2000),
  locale: z.enum(['ar', 'en']).default('ar'),
  consent: z.literal(true),
});

export const inventoryAdjustInput = z.object({
  skuId: id,
  delta: z
    .number()
    .int()
    .min(-1000)
    .max(1000)
    .refine((v) => v !== 0, 'delta_zero'),
  reason: text(300),
});

export const shipmentInput = z.object({
  carrier: text(80),
  trackingNumber: text(80),
  trackingUrl: z.url().max(500).optional(),
});

export const refundInput = z.object({
  amountPiastres: z.number().int().positive(),
  reason: text(300),
  idempotencyKey,
});

export const codDecisionInput = z.object({
  decision: z.enum(['confirm', 'reject']),
  reason: text(300),
});

export const codCollectionInput = z.object({
  amountPiastres: z.number().int().positive(),
  reference: text(120),
});

export const shippingRateInput = z.object({
  zoneCode: z.string().trim().min(1).max(32).regex(/^[A-Z0-9_-]+$/),
  maxWeightG: z.number().int().positive().max(500_000),
  maxLongestCm: z.number().int().positive().max(2000),
  feePiastres: z.number().int().min(0).max(10_000_000),
});
export const shippingTableInput = z.object({
  zones: z.record(z.string().refine(isGovernorateCode, 'invalid_governorate'), z.string().regex(/^[A-Z0-9_-]+$/)),
  rates: z.array(shippingRateInput).min(1).max(500),
  codCarrierLimitPiastres: z.number().int().positive().max(1_000_000).nullable().optional(),
});

export const staffRoleInput = z.object({
  email: z.email().max(160),
  role: z.enum(STAFF_ROLES),
  grant: z.boolean(),
});

export const orderListFilter = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
  q: z.string().trim().max(60).optional(),
});

export const quoteStatusInput = z.object({ status: z.enum(QUOTE_STATUSES), note: optionalText(500) });

export function firstIssueCode(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'invalid_input';
  return `${issue.path.join('.') || 'input'}:${issue.message}`;
}
