import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Miniflare } from 'miniflare';
import type { D1Database } from '@cloudflare/workers-types';

// Local D1 emulation through Miniflare/workerd (real SQLite with D1 batch semantics).
// Evidence produced with this helper is LOCAL-EMULATOR evidence only.

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'packages', 'db', 'migrations');

/** Splits a migration file into statements, keeping CREATE TRIGGER … END; bodies intact. */
export function splitSqlStatements(sql: string): string[] {
  const lines = sql.split(/\r?\n/).filter((l) => !/^\s*--/.test(l));
  const out: string[] = [];
  let buf: string[] = [];
  let inTrigger = false;
  for (const line of lines) {
    if (!buf.length && !line.trim()) continue;
    buf.push(line);
    if (/^\s*CREATE\s+TRIGGER/i.test(line)) inTrigger = true;
    const trimmed = line.trim();
    if (inTrigger ? /^END;$/i.test(trimmed) : trimmed.endsWith(';')) {
      out.push(buf.join('\n').trim());
      buf = [];
      inTrigger = false;
    }
  }
  if (buf.join('').trim()) out.push(buf.join('\n').trim());
  return out;
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
}

export async function applyMigrations(db: D1Database): Promise<void> {
  for (const file of migrationFiles()) {
    const statements = splitSqlStatements(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    for (const stmt of statements) {
      try {
        await db.prepare(stmt).run();
      } catch (err) {
        throw new Error(`migration ${file} failed at:\n${stmt.slice(0, 200)}\n${(err as Error).message}`);
      }
    }
  }
}

export interface TestD1 {
  mf: Miniflare;
  db: D1Database;
  dispose: () => Promise<void>;
}

export async function createTestD1(): Promise<TestD1> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    d1Databases: { DB: `test-${crypto.randomUUID()}` },
    compatibilityDate: '2026-08-01',
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await applyMigrations(db);
  return { mf, db, dispose: () => mf.dispose() };
}
