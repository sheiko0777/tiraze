import { defineConfig } from 'vitest/config';

// Unit tests run in Node. Integration tests start a local Miniflare (workerd) instance with a
// real local D1 (SQLite) database. That is local-emulator evidence only, not proof of
// behaviour against remote D1 in staging or production.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
  },
});
