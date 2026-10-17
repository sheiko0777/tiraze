import { providerNumberToPiastres, type Piastres } from '../money.ts';
import { normalizeKashierStatus, type KashierMode, type ProviderPaymentState } from './client.ts';

// Interprets a signature-verified Kashier webhook. The word "event" alone never means success:
// a payment is successful only for event "pay" (or "capture") with data.status SUCCESS, the
// configured mode, EGP, and an amount equal to our authoritative payment attempt.

export const KASHIER_EVENTS = ['pay', 'authorize', 'capture', 'refund', 'partial_refund', 'void', 'reject', 'reversal'] as const;
export type KashierEvent = (typeof KASHIER_EVENTS)[number];

export interface ParsedKashierWebhook {
  event: KashierEvent;
  data: Record<string, unknown>;
  merchantOrderId: string;
  kashierOrderId: string | null;
  transactionId: string | null;
  status: ProviderPaymentState;
  rawStatus: string;
  mode: string | null;
  currency: string | null;
  amount: Piastres | null;
  merchantId: string | null;
  /** Stable dedupe key for the durable inbox. */
  dedupeKey: string;
}

export class WebhookShapeError extends Error {
  override name = 'WebhookShapeError';
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : typeof v === 'number' ? String(v) : null;
}

export function parseKashierWebhook(body: unknown): ParsedKashierWebhook {
  if (!body || typeof body !== 'object') throw new WebhookShapeError('body is not an object');
  const { event, data } = body as { event?: unknown; data?: unknown };
  if (typeof event !== 'string' || !(KASHIER_EVENTS as readonly string[]).includes(event)) {
    throw new WebhookShapeError('unknown event');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new WebhookShapeError('data is not an object');
  const d = data as Record<string, unknown>;
  const merchantOrderId = str(d.merchantOrderId);
  if (!merchantOrderId) throw new WebhookShapeError('merchantOrderId missing');
  let amount: Piastres | null = null;
  try {
    amount = d.amount == null ? null : providerNumberToPiastres(d.amount);
  } catch {
    amount = null;
  }
  const rawStatus = str(d.status) ?? '';
  const transactionId = str(d.transactionId);
  const kashierOrderId = str(d.kashierOrderId);
  return {
    event: event as KashierEvent,
    data: d,
    merchantOrderId,
    kashierOrderId,
    transactionId,
    status: normalizeKashierStatus(rawStatus),
    rawStatus,
    mode: str(d.mode),
    currency: str(d.currency),
    amount,
    merchantId: str(d.merchantId),
    dedupeKey: ['kashier', event, merchantOrderId, transactionId ?? kashierOrderId ?? '-', rawStatus.toUpperCase()].join(':'),
  };
}

export type WebhookMatch =
  | { ok: true }
  | { ok: false; reason: 'mode_mismatch' | 'currency_mismatch' | 'amount_mismatch' | 'amount_missing' | 'merchant_mismatch' };

/** Authoritative matching against our stored attempt; any mismatch is never treated as paid. */
export function matchWebhookToAttempt(
  hook: ParsedKashierWebhook,
  expected: { mode: KashierMode; amount: Piastres; currency: 'EGP'; merchantId: string },
): WebhookMatch {
  if (hook.mode !== expected.mode) return { ok: false, reason: 'mode_mismatch' };
  if ((hook.currency ?? '').toUpperCase() !== expected.currency) return { ok: false, reason: 'currency_mismatch' };
  // The webhook payload documentation does not list merchantId; when present it must match.
  if (hook.merchantId && hook.merchantId !== expected.merchantId) return { ok: false, reason: 'merchant_mismatch' };
  if (hook.event === 'pay' || hook.event === 'capture') {
    if (hook.amount == null) return { ok: false, reason: 'amount_missing' };
    if (hook.amount !== expected.amount) return { ok: false, reason: 'amount_mismatch' };
  }
  return { ok: true };
}
