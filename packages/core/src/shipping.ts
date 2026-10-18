import { addPiastres, assertPiastres, type Piastres } from './money.ts';

// Shipping is quoted from an approved zone × package matrix. Initial (unapproved) assumption
// from the plan: every rug unit ships as its own package and fees are summed. An uncovered
// governorate or an unrated package blocks checkout; nothing is guessed.

export interface ShippingRate {
  zoneCode: string;
  /** Inclusive upper bound for the package weight in grams. */
  maxWeightG: number;
  /** Inclusive upper bound for the longest package side in centimetres. */
  maxLongestCm: number;
  feePiastres: Piastres;
}

export interface ShippingTable {
  versionId: string;
  /** governorate code → zone code */
  zones: Record<string, string>;
  rates: ShippingRate[];
}

export interface ShippingPackage {
  skuId: string;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export type ShippingQuote =
  | {
      ok: true;
      versionId: string;
      zoneCode: string;
      feePiastres: Piastres;
      packages: Array<{ skuId: string; feePiastres: Piastres; rate: ShippingRate }>;
    }
  | { ok: false; reason: 'zone_uncovered' | 'package_unrated' | 'no_packages'; skuId?: string };

export function quoteShipping(
  table: ShippingTable,
  governorate: string,
  packages: ShippingPackage[],
): ShippingQuote {
  if (packages.length === 0) return { ok: false, reason: 'no_packages' };
  const zoneCode = table.zones[governorate];
  if (!zoneCode) return { ok: false, reason: 'zone_uncovered' };
  const zoneRates = table.rates
    .filter((r) => r.zoneCode === zoneCode)
    .sort(
      (a, b) =>
        a.maxWeightG - b.maxWeightG ||
        a.maxLongestCm - b.maxLongestCm ||
        a.feePiastres - b.feePiastres,
    );
  if (zoneRates.length === 0) return { ok: false, reason: 'zone_uncovered' };

  const lines: Array<{ skuId: string; feePiastres: Piastres; rate: ShippingRate }> = [];
  for (const p of packages) {
    if (!(p.weightG > 0) || !(p.lengthCm > 0) || !(p.widthCm > 0) || !(p.heightCm > 0)) {
      return { ok: false, reason: 'package_unrated', skuId: p.skuId };
    }
    const longest = Math.max(p.lengthCm, p.widthCm, p.heightCm);
    const rate = zoneRates.find((r) => p.weightG <= r.maxWeightG && longest <= r.maxLongestCm);
    if (!rate) return { ok: false, reason: 'package_unrated', skuId: p.skuId };
    lines.push({ skuId: p.skuId, feePiastres: assertPiastres(rate.feePiastres), rate });
  }
  return {
    ok: true,
    versionId: table.versionId,
    zoneCode,
    feePiastres: addPiastres(...lines.map((l) => l.feePiastres)),
    packages: lines,
  };
}

/** Tracking links are only accepted for approved carrier hosts (exact host or subdomain). */
export function isAllowedTrackingUrl(url: string, allowedHosts: readonly string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  return allowedHosts.some((h) => host === h.toLowerCase() || host.endsWith(`.${h.toLowerCase()}`));
}
