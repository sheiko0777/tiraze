import { hmacSha256Hex, timingSafeEqual } from '../crypto.ts';

// Kashier Payment webhook signature, per https://developers.kashier.io/docs/webhooks
// (reviewed 18 Oct 2026):
//   1. take data.signatureKeys and sort them (default lexicographic sort),
//   2. pick only those keys from `data`,
//   3. build a query string with query-string's stringify (values URL-encoded, keys joined
//      with "=" and "&"),
//   4. HMAC-SHA256 with the Payment API key, hex digest,
//   5. compare with the `x-kashier-signature` header (case-insensitive hex).
// This is the payment-webhook algorithm only; payout signatures are different and not used.
//
// query-string defaults reproduced here: strict encoding (encodeURIComponent plus !'()*),
// keys sorted, `undefined` skipped, `null` rendered as the bare key, arrays repeated as
// key=value pairs. The unit tests cross-check this against the real query-string package.

export const KASHIER_SIGNATURE_HEADER = 'x-kashier-signature';

function strictEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodePair(key: string, value: unknown): string[] {
  if (value === undefined) return [];
  if (value === null) return [strictEncode(key)];
  if (Array.isArray(value)) {
    return value.filter((v) => v !== undefined).flatMap((v) => encodePair(key, v));
  }
  return [`${strictEncode(key)}=${strictEncode(String(value))}`];
}

export function kashierSignaturePayload(data: Record<string, unknown>): string {
  const keys = data.signatureKeys;
  if (!Array.isArray(keys) || keys.length === 0 || !keys.every((k) => typeof k === 'string')) {
    throw new Error('Kashier webhook data.signatureKeys is missing or invalid');
  }
  const sorted = [...(keys as string[])].sort();
  const parts: string[] = [];
  for (const key of sorted) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    parts.push(...encodePair(key, data[key]));
  }
  return parts.join('&');
}

export async function computeKashierSignature(data: Record<string, unknown>, paymentApiKey: string): Promise<string> {
  return hmacSha256Hex(paymentApiKey, kashierSignaturePayload(data));
}

export async function verifyKashierSignature(
  data: Record<string, unknown>,
  headerValue: string | null | undefined,
  paymentApiKey: string,
): Promise<boolean> {
  if (!headerValue || !paymentApiKey) return false;
  let expected: string;
  try {
    expected = await computeKashierSignature(data, paymentApiKey);
  } catch {
    return false;
  }
  return timingSafeEqual(expected.toLowerCase(), headerValue.trim().toLowerCase());
}
