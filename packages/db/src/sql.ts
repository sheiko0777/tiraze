import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export type Db = D1Database;
export type Stmt = D1PreparedStatement;

/** Error codes raised by schema triggers via RAISE(ABORT, 'TIRAZE_…'). */
export type DbGuardCode =
  | 'TIRAZE_INSUFFICIENT_STOCK'
  | 'TIRAZE_PRICE_CHANGED'
  | 'TIRAZE_RESERVATION_MISSING'
  | 'TIRAZE_RESERVATION_CLOSED'
  | 'TIRAZE_PAYMENT_SUCCESS_FINAL'
  | 'TIRAZE_REFUND_EXCEEDS_PAID';

export function dbGuardCode(err: unknown): DbGuardCode | null {
  const m = /TIRAZE_[A-Z_]+/.exec(String((err as Error)?.message ?? err));
  return m ? (m[0] as DbGuardCode) : null;
}

export function isUniqueViolation(err: unknown, hint?: string): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /UNIQUE constraint failed/i.test(msg) && (!hint || msg.includes(hint));
}

export function isCheckViolation(err: unknown): boolean {
  return /CHECK constraint failed/i.test(String((err as Error)?.message ?? err));
}

export async function first<T>(db: Db, sql: string, ...params: unknown[]): Promise<T | null> {
  return db.prepare(sql).bind(...params).first<T>();
}

export async function all<T>(db: Db, sql: string, ...params: unknown[]): Promise<T[]> {
  const r = await db.prepare(sql).bind(...params).all<T>();
  return r.results ?? [];
}

/**
 * Guarded state transition. D1's meta.changes includes rows touched by triggers, so the
 * statement must use `RETURNING` and callers check the number of returned rows.
 */
export async function returning<T = { id: string }>(stmt: Stmt): Promise<T[]> {
  const r = await stmt.all<T>();
  return r.results ?? [];
}

export function json(value: unknown): string {
  return JSON.stringify(value);
}

export function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
