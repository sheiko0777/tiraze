import { piastresToDecimal, type Piastres } from '../money.ts';

// Kashier Hosted Checkout (Payment Sessions v3) and order refunds.
// Request shapes follow https://developers.kashier.io/docs/accept-payments/payment-sessions and
// https://developers.kashier.io/docs/accept-payments/refunds (reviewed 18 Oct 2026).
// STATUS: UNVERIFIED against the sandbox/live merchant API — no merchant credentials were
// available. Response parsing is deliberately strict about what it needs and treats anything
// else as an "unknown" outcome that must be reconciled, never as success.

export type KashierMode = 'test' | 'live';

export interface KashierConfig {
  mode: KashierMode;
  merchantId: string;
  /** Payment API key: `api-key` header and webhook HMAC key. */
  apiKey: string;
  /** Secret key: `Authorization` header. */
  secretKey: string;
  /** Override base URLs (tests/fixtures only). */
  apiBaseUrl?: string;
  fepBaseUrl?: string;
  allowedMethods?: string;
}

export function kashierApiBase(cfg: Pick<KashierConfig, 'mode' | 'apiBaseUrl'>): string {
  return (
    cfg.apiBaseUrl ??
    (cfg.mode === 'live' ? 'https://api.kashier.io' : 'https://test-api.kashier.io')
  );
}
export function kashierFepBase(cfg: Pick<KashierConfig, 'mode' | 'fepBaseUrl'>): string {
  return (
    cfg.fepBaseUrl ??
    (cfg.mode === 'live' ? 'https://fep.kashier.io' : 'https://test-fep.kashier.io')
  );
}

export interface CreateSessionInput {
  merchantOrderId: string;
  amount: Piastres;
  expireAt: Date;
  merchantRedirect: string;
  serverWebhook: string;
  display: 'ar' | 'en';
  customerEmail: string;
  customerReference: string;
  description: string;
}

export interface CreatedSession {
  sessionId: string;
  sessionUrl: string;
  status: string | null;
}

/** Thrown when the request may or may not have reached Kashier: the outcome must be reconciled. */
export class KashierUnknownOutcomeError extends Error {
  override name = 'KashierUnknownOutcomeError';
}
/** Thrown when Kashier definitively rejected the request (4xx with a body). */
export class KashierRejectedError extends Error {
  override name = 'KashierRejectedError';
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function buildCreateSessionBody(
  cfg: KashierConfig,
  input: CreateSessionInput,
): Record<string, unknown> {
  return {
    expireAt: input.expireAt.toISOString(),
    maxFailureAttempts: 3,
    paymentType: 'credit',
    amount: piastresToDecimal(input.amount),
    currency: 'EGP',
    order: input.merchantOrderId,
    merchantRedirect: input.merchantRedirect,
    display: input.display,
    type: 'one-time',
    allowedMethods: cfg.allowedMethods ?? 'card,wallet',
    merchantId: cfg.merchantId,
    failureRedirect: false,
    description: input.description,
    manualCapture: false,
    customer: { email: input.customerEmail, reference: input.customerReference },
    interactionSource: 'ECOMMERCE',
    enable3DS: true,
    serverWebhook: input.serverWebhook,
  };
}

function pickString(obj: unknown, ...path: string[]): string | null {
  let cur: unknown = obj;
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return null;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' && cur.length > 0 ? cur : null;
}

export async function createKashierSession(
  cfg: KashierConfig,
  input: CreateSessionInput,
  fetchImpl: FetchLike = fetch,
): Promise<CreatedSession> {
  let res: Response;
  try {
    res = await fetchImpl(`${kashierApiBase(cfg)}/v3/payment/sessions`, {
      method: 'POST',
      headers: {
        Authorization: cfg.secretKey,
        'api-key': cfg.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(buildCreateSessionBody(cfg, input)),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new KashierUnknownOutcomeError(
      `session request did not complete: ${(err as Error).name}`,
    );
  }
  if (res.status >= 500 || [408, 409, 425, 429].includes(res.status))
    throw new KashierUnknownOutcomeError(`Kashier responded ${res.status}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new KashierUnknownOutcomeError('Kashier response was not JSON');
  }
  if (!res.ok)
    throw new KashierRejectedError(`Kashier rejected the session (${res.status})`, res.status);
  const sessionId =
    pickString(body, 'sessionId') ??
    pickString(body, '_id') ??
    pickString(body, 'data', 'sessionId');
  const sessionUrl = pickString(body, 'sessionUrl') ?? pickString(body, 'data', 'sessionUrl');
  if (!sessionId || !sessionUrl)
    throw new KashierUnknownOutcomeError('Kashier response lacked sessionId/sessionUrl');
  const url = new URL(sessionUrl);
  if (url.protocol !== 'https:' || !/(^|\.)kashier\.io$/.test(url.hostname)) {
    throw new KashierUnknownOutcomeError('Kashier sessionUrl is not an https kashier.io URL');
  }
  return { sessionId, sessionUrl, status: pickString(body, 'status') };
}

export type ProviderPaymentState = 'succeeded' | 'failed' | 'pending' | 'unknown';

export function normalizeKashierStatus(status: string | null | undefined): ProviderPaymentState {
  switch ((status ?? '').toUpperCase()) {
    case 'SUCCESS':
    case 'PAID':
    case 'CAPTURED':
      return 'succeeded';
    case 'FAILURE':
    case 'FAILED':
    case 'DECLINED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'failed';
    case 'PENDING':
    case 'CREATED':
    case 'OPENED':
      return 'pending';
    default:
      return 'unknown';
  }
}

export interface SessionLookup {
  state: ProviderPaymentState;
  raw: unknown;
  amount: unknown;
  currency: string | null;
  merchantOrderId: string | null;
  transactionId: string | null;
  kashierOrderId: string | null;
}

/**
 * Reads a session's payment for reconciliation (GET /v3/payment/sessions/:id/payment).
 * UNVERIFIED: the full response schema was not available; only explicit recognised statuses
 * are mapped, anything else is `unknown`.
 */
export async function getKashierSessionPayment(
  cfg: KashierConfig,
  sessionId: string,
  fetchImpl: FetchLike = fetch,
): Promise<SessionLookup> {
  const res = await fetchImpl(
    `${kashierApiBase(cfg)}/v3/payment/sessions/${encodeURIComponent(sessionId)}/payment`,
    {
      method: 'GET',
      headers: { Authorization: cfg.secretKey, 'api-key': cfg.apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok)
    return {
      state: 'unknown',
      raw: { httpStatus: res.status },
      amount: null,
      currency: null,
      merchantOrderId: null,
      transactionId: null,
      kashierOrderId: null,
    };
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const data = (body && typeof body.data === 'object' && body.data ? body.data : body) as Record<
    string,
    unknown
  > | null;
  return {
    state: normalizeKashierStatus(pickString(data, 'status')),
    raw: body,
    amount: data?.amount ?? null,
    currency: pickString(data, 'currency'),
    merchantOrderId: pickString(data, 'merchantOrderId') ?? pickString(data, 'order'),
    transactionId: pickString(data, 'transactionId'),
    kashierOrderId: pickString(data, 'kashierOrderId') ?? pickString(data, 'orderId'),
  };
}

export interface RefundInput {
  kashierOrderId: string;
  amount: Piastres;
  reason: string;
  targetTransactionId?: string | null;
}

export interface RefundResult {
  state: ProviderPaymentState;
  providerReference: string | null;
  raw: unknown;
}

/** PUT {fep}/v3/orders/:orderId with apiOperation REFUND. UNVERIFIED against the merchant API. */
export async function refundKashierOrder(
  cfg: KashierConfig,
  input: RefundInput,
  fetchImpl: FetchLike = fetch,
): Promise<RefundResult> {
  let res: Response;
  try {
    res = await fetchImpl(
      `${kashierFepBase(cfg)}/v3/orders/${encodeURIComponent(input.kashierOrderId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: cfg.secretKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiOperation: 'REFUND',
          reason: input.reason,
          transaction: {
            amount: Number(piastresToDecimal(input.amount)),
            ...(input.targetTransactionId
              ? { targetTransactionId: input.targetTransactionId }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch (err) {
    throw new KashierUnknownOutcomeError(`refund request did not complete: ${(err as Error).name}`);
  }
  if (res.status >= 500 || [408, 409, 425, 429].includes(res.status))
    throw new KashierUnknownOutcomeError(`Kashier responded ${res.status}`);
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok)
    throw new KashierRejectedError(`Kashier rejected the refund (${res.status})`, res.status);
  const data = (body?.response ?? body?.data ?? body) as Record<string, unknown> | null;
  const status =
    pickString(data, 'status') ??
    pickString(data, 'transaction', 'status') ??
    pickString(body, 'status');
  return {
    state: normalizeKashierStatus(status),
    providerReference:
      pickString(data, 'transactionId') ?? pickString(data, 'transaction', 'transactionId'),
    raw: body,
  };
}
