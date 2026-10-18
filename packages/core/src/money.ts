// Money is always an integer number of piastres (1 EGP = 100 piastres). No floating point
// arithmetic is used for amounts; provider decimals are parsed as strings.

export const CURRENCY = 'EGP' as const;
export type Currency = typeof CURRENCY;

export type Piastres = number;

export class MoneyError extends Error {
  override name = 'MoneyError';
}

export function assertPiastres(value: number, label = 'amount'): Piastres {
  if (!Number.isSafeInteger(value))
    throw new MoneyError(`${label} must be an integer number of piastres`);
  return value;
}

export function addPiastres(...values: Piastres[]): Piastres {
  let total = 0;
  for (const v of values) total += assertPiastres(v);
  return assertPiastres(total, 'total');
}

export function multiplyPiastres(unit: Piastres, qty: number): Piastres {
  assertPiastres(unit, 'unit price');
  if (!Number.isSafeInteger(qty) || qty < 0)
    throw new MoneyError('quantity must be a non-negative integer');
  return assertPiastres(unit * qty, 'line total');
}

const DECIMAL = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

/** Parses "100", "100.5" or "100.50" (EGP) into piastres. Rejects signs, exponents and >2 decimals. */
export function decimalToPiastres(input: string): Piastres {
  const m = DECIMAL.exec(input.trim());
  if (!m) throw new MoneyError(`invalid decimal amount: ${JSON.stringify(input)}`);
  const whole = Number(m[1]);
  const fraction = Number((m[2] ?? '').padEnd(2, '0'));
  return assertPiastres(whole * 100 + fraction);
}

/**
 * Converts an amount a provider sent as a JSON number (e.g. 1500.5) into piastres via its
 * shortest decimal string representation, rejecting values with sub-piastre precision.
 */
export function providerNumberToPiastres(value: unknown): Piastres {
  if (typeof value === 'string') return decimalToPiastres(value);
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new MoneyError('provider amount must be a non-negative finite number');
  }
  return decimalToPiastres(String(value));
}

export function piastresToDecimal(amount: Piastres): string {
  assertPiastres(amount);
  if (amount < 0) throw new MoneyError('negative amounts are not formatted as provider decimals');
  const whole = Math.floor(amount / 100);
  const fraction = String(amount % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

export type Locale = 'ar' | 'en';

export function formatEGP(amount: Piastres, locale: Locale): string {
  assertPiastres(amount);
  const fmt = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  // Formatting is presentation only; the integer amount stays authoritative.
  return fmt.format(amount / 100);
}
