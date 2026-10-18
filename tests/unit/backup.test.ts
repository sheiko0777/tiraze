import { it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { backupKey, encryptBackup, decryptBackup } from '../../tools/lib/backup.ts';
it('restores authenticated SQL into isolated SQLite and rejects tampering/wrong keys', () => {
  const key = randomBytes(32),
    sql =
      "CREATE TABLE orders (id TEXT PRIMARY KEY,total INTEGER); INSERT INTO orders VALUES ('fixture',110000);";
  const encrypted = encryptBackup(Buffer.from(sql), key);
  expect(encrypted).not.toContain('fixture');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(decryptBackup(encrypted, key).toString());
    expect(db.prepare('SELECT total FROM orders').get()?.total).toBe(110000);
  } finally {
    db.close();
  }
  expect(() => decryptBackup(encrypted, randomBytes(32))).toThrow();
  const changed = JSON.parse(encrypted);
  changed.createdAt = '2026-01-01';
  expect(() => decryptBackup(JSON.stringify(changed), key)).toThrow();
  expect(() => backupKey('bad')).toThrow();
});
