// Development schema generation only. Never run migrations during an HTTP request.
import { Miniflare } from 'miniflare';
import { getMigrations } from 'better-auth/db/migration';
import { createAuth } from '../src/lib/auth.ts';
import { writeFile } from 'node:fs/promises';
const mf = new Miniflare({
  modules: true,
  script: 'export default { fetch(){ return new Response("ok") } }',
  d1Databases: { DB: 'auth-schema-generation' },
  compatibilityDate: '2026-08-01',
});
try {
  const DB = await mf.getD1Database('DB');
  const auth = createAuth({
    DB,
    APP_URL: 'http://localhost:4321',
    AUTH_SECRET: 'schema-generation-only-not-a-runtime-secret-12345',
  });
  const migration = await getMigrations(auth.options);
  await writeFile(
    new URL('../../../packages/db/migrations/0004_auth.sql', import.meta.url),
    '-- Generated from installed Better Auth 1.7.10 + twoFactor.\n' +
      (await migration.compileMigrations()),
  );
} finally {
  await mf.dispose();
}
