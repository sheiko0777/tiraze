import {
  kashierApiBase,
  normalizeKashierStatus,
  type KashierConfig,
  type ProviderPaymentState,
} from './client.ts';
import { providerNumberToPiastres } from '../money.ts';
export interface VerifiedTransaction {
  id: string;
  operation: string;
  state: ProviderPaymentState;
  amountPiastres: number;
  currency: string;
  target: string | null;
}
export interface VerifiedOrder {
  id: string;
  merchantOrderId: string;
  amountPiastres: number;
  currency: string;
  status: string;
  transactions: VerifiedTransaction[];
}
/** Documented /v3/payment/orders lookup. Merchant sandbox contract still requires validation. No card/customer fields escape this adapter. */
export async function lookupKashierOrder(
  cfg: KashierConfig,
  merchantOrderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VerifiedOrder | null> {
  const response = await fetchImpl(
    kashierApiBase(cfg) +
      '/v3/payment/orders?' +
      new URLSearchParams({ search: merchantOrderId, page: '1', limit: '20' }),
    {
      headers: { Authorization: cfg.secretKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: unknown };
  if (!Array.isArray(body.data)) return null;
  const matches = body.data.filter(
    (row: any) =>
      row && String(row.merchantOrderId) === merchantOrderId && row.merchantId === cfg.merchantId,
  );
  if (matches.length !== 1) return null;
  const row = matches[0],
    id = row.orderId,
    currency = row.order?.currency;
  if (typeof id !== 'string' || currency !== 'EGP' || !Array.isArray(row.transactions)) return null;
  let amount: number;
  try {
    amount = providerNumberToPiastres(row.order.amount);
  } catch {
    return null;
  }
  const transactions: VerifiedTransaction[] = [];
  for (const tx of row.transactions) {
    if (
      !tx ||
      typeof tx.transactionId !== 'string' ||
      typeof tx.operation !== 'string' ||
      typeof tx.currency !== 'string'
    )
      continue;
    try {
      transactions.push({
        id: tx.transactionId,
        operation: tx.operation.toLowerCase(),
        state: normalizeKashierStatus(tx.status),
        amountPiastres: providerNumberToPiastres(tx.amount),
        currency: tx.currency,
        target:
          typeof tx.targetedTransaction === 'string'
            ? tx.targetedTransaction
            : typeof tx.targetTransactionId === 'string'
              ? tx.targetTransactionId
              : null,
      });
    } catch {}
  }
  return {
    id,
    merchantOrderId,
    amountPiastres: amount,
    currency,
    status: String(row.status ?? ''),
    transactions,
  };
}
