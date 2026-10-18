import { randomId, type ShippingTable } from '@tiraze/core';
import { auditStmt } from './audit.ts';
import { all, first, type Db } from './sql.ts';

export interface ActiveShipping {
  table: ShippingTable;
  codCarrierLimitPiastres: number | null;
  isFixture: boolean;
}

export async function getActiveShipping(db: Db): Promise<ActiveShipping | null> {
  const v = await first<{
    id: string;
    cod_carrier_limit_piastres: number | null;
    is_fixture: number;
  }>(
    db,
    `SELECT id, cod_carrier_limit_piastres, is_fixture FROM shipping_versions WHERE status = 'active'`,
  );
  if (!v) return null;
  const [zones, rates] = await db.batch([
    db.prepare(`SELECT governorate, zone_code FROM shipping_zones WHERE version_id = ?`).bind(v.id),
    db
      .prepare(
        `SELECT zone_code, max_weight_g, max_longest_cm, fee_piastres FROM shipping_rates WHERE version_id = ?`,
      )
      .bind(v.id),
  ]);
  return {
    codCarrierLimitPiastres: v.cod_carrier_limit_piastres,
    isFixture: v.is_fixture === 1,
    table: {
      versionId: v.id,
      zones: Object.fromEntries(
        ((zones?.results ?? []) as Array<{ governorate: string; zone_code: string }>).map((z) => [
          z.governorate,
          z.zone_code,
        ]),
      ),
      rates: (
        (rates?.results ?? []) as Array<{
          zone_code: string;
          max_weight_g: number;
          max_longest_cm: number;
          fee_piastres: number;
        }>
      ).map((r) => ({
        zoneCode: r.zone_code,
        maxWeightG: r.max_weight_g,
        maxLongestCm: r.max_longest_cm,
        feePiastres: r.fee_piastres,
      })),
    },
  };
}

/** Publishes a new shipping matrix version atomically; the previous active version is retired. */
export async function activateShippingVersion(
  db: Db,
  input: {
    zones: Record<string, string>;
    rates: ShippingTable['rates'];
    codCarrierLimitPiastres?: number | null;
    isFixture?: boolean;
  },
  actorId: string,
  now: number,
): Promise<string> {
  const id = randomId();
  const zoneCodes = new Set(Object.values(input.zones));
  for (const r of input.rates)
    if (!zoneCodes.has(r.zoneCode)) throw new Error(`rate_for_unknown_zone:${r.zoneCode}`);
  await db.batch([
    db.prepare(`UPDATE shipping_versions SET status = 'retired' WHERE status = 'active'`),
    db
      .prepare(
        `INSERT INTO shipping_versions (id, status, cod_carrier_limit_piastres, is_fixture, created_by, created_at, activated_at) VALUES (?, 'active', ?, ?, ?, ?, ?)`,
      )
      .bind(id, input.codCarrierLimitPiastres ?? null, input.isFixture ? 1 : 0, actorId, now, now),
    ...Object.entries(input.zones).map(([g, z]) =>
      db
        .prepare(`INSERT INTO shipping_zones (version_id, governorate, zone_code) VALUES (?, ?, ?)`)
        .bind(id, g, z),
    ),
    ...input.rates.map((r) =>
      db
        .prepare(
          `INSERT INTO shipping_rates (version_id, zone_code, max_weight_g, max_longest_cm, fee_piastres) VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, r.zoneCode, r.maxWeightG, r.maxLongestCm, r.feePiastres),
    ),
    auditStmt(
      db,
      {
        actorId,
        action: 'shipping.activate',
        targetType: 'shipping_version',
        targetId: id,
        meta: { zones: Object.keys(input.zones).length, rates: input.rates.length },
      },
      now,
    ),
  ]);
  return id;
}

export async function listShippingVersions(db: Db) {
  return all<{
    id: string;
    status: string;
    is_fixture: number;
    created_at: number;
    activated_at: number | null;
  }>(
    db,
    `SELECT id, status, is_fixture, created_at, activated_at FROM shipping_versions ORDER BY created_at DESC LIMIT 20`,
  );
}
