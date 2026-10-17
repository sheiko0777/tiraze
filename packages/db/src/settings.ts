import { all, parseJson, type Db } from './sql.ts';

export interface CommerceSettings {
  reservationMinutesOnline: number;
  codReviewHours: number;
  requireVerifiedEmail: boolean;
  checkoutEnabled: boolean;
  allowedTrackingHosts: string[];
}

export const DEFAULT_SETTINGS: CommerceSettings = {
  reservationMinutesOnline: 15,
  codReviewHours: 24,
  requireVerifiedEmail: true,
  checkoutEnabled: true,
  allowedTrackingHosts: [],
};

export async function getSettings(db: Db): Promise<CommerceSettings> {
  const rows = await all<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: string, d: number, min: number, max: number) => {
    const n = Number(map.get(k));
    return Number.isInteger(n) && n >= min && n <= max ? n : d;
  };
  const hosts = parseJson<unknown>(map.get('allowed_tracking_hosts'), []);
  return {
    reservationMinutesOnline: num('reservation_minutes_online', DEFAULT_SETTINGS.reservationMinutesOnline, 5, 120),
    codReviewHours: num('cod_review_hours', DEFAULT_SETTINGS.codReviewHours, 1, 168),
    requireVerifiedEmail: map.get('require_verified_email') !== 'false',
    checkoutEnabled: map.get('checkout_enabled') !== 'false',
    allowedTrackingHosts: Array.isArray(hosts) ? hosts.filter((h): h is string => typeof h === 'string' && /^[a-z0-9.-]+$/.test(h)) : [],
  };
}

export async function setSetting(db: Db, key: keyof typeof SETTING_KEYS, value: string, now: number): Promise<void> {
  await db
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(SETTING_KEYS[key], value, now)
    .run();
}

export const SETTING_KEYS = {
  reservationMinutesOnline: 'reservation_minutes_online',
  codReviewHours: 'cod_review_hours',
  requireVerifiedEmail: 'require_verified_email',
  checkoutEnabled: 'checkout_enabled',
  allowedTrackingHosts: 'allowed_tracking_hosts',
} as const;
