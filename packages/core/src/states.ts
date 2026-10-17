// Three independent status axes. The database enforces the same rules with guarded UPDATEs
// (WHERE status = expected) and triggers; this module documents and checks them in code.

export const ORDER_STATUSES = ['awaiting_payment', 'pending_cod_review', 'confirmed', 'cancelled', 'completed'] as const;
export const PAYMENT_STATUSES = [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refund_pending',
  'partially_refunded',
  'refunded',
  'paid_unallocated',
] as const;
export const FULFILLMENT_STATUSES = ['unfulfilled', 'preparing', 'shipped', 'delivered', 'returned'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

const ORDER: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ['confirmed', 'cancelled'],
  pending_cod_review: ['confirmed', 'cancelled'],
  // A paid order whose reservation expired may be re-allocated (late success) → confirmed.
  cancelled: ['confirmed'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
};

const PAYMENT: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ['pending', 'paid', 'failed'],
  pending: ['paid', 'failed', 'paid_unallocated'],
  // A late failure never overrides a success: there is no paid → failed edge.
  failed: ['pending', 'paid', 'paid_unallocated'],
  paid: ['refund_pending'],
  paid_unallocated: ['paid', 'refund_pending'],
  refund_pending: ['partially_refunded', 'refunded', 'paid'],
  partially_refunded: ['refund_pending', 'refunded'],
  refunded: [],
};

const FULFILLMENT: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  unfulfilled: ['preparing'],
  preparing: ['shipped', 'unfulfilled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  returned: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER[from].includes(to);
}
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT[from].includes(to);
}
export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return FULFILLMENT[from].includes(to);
}

/** Fulfilment may only start for confirmed orders whose payment is settled for the method. */
export function canStartFulfillment(order: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'kashier' | 'cod';
}): boolean {
  if (order.status !== 'confirmed') return false;
  if (order.paymentMethod === 'kashier') return order.paymentStatus === 'paid';
  // COD is collected on delivery; staff confirmation does not make it paid.
  return order.paymentStatus === 'unpaid' || order.paymentStatus === 'paid';
}

export const QUOTE_STATUSES = ['new', 'contacted', 'quoted', 'closed'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
