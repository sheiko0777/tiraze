import { assertPiastres, type Piastres } from './money.ts';

/** EGP 10,000 — the approved cash-on-delivery ceiling on the final total (incl. shipping and fees). */
export const COD_LIMIT_PIASTRES: Piastres = 1_000_000;

/**
 * Cash on delivery is allowed only when the final total is within the approved limit and,
 * if configured, the (possibly lower) carrier contract limit.
 */
export function isCodAllowed(
  totalPiastres: Piastres,
  carrierLimitPiastres?: Piastres | null,
): boolean {
  assertPiastres(totalPiastres, 'total');
  const limit =
    carrierLimitPiastres != null
      ? Math.min(COD_LIMIT_PIASTRES, assertPiastres(carrierLimitPiastres))
      : COD_LIMIT_PIASTRES;
  return totalPiastres > 0 && totalPiastres <= limit;
}
