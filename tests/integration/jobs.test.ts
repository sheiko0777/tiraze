import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { runJobs, sendMessage, type JobsEnv } from '../../apps/jobs/src/index.ts';
import { claimOutbox, markOutboxFailed, enqueueStmt } from '../../packages/db/src/outbox.ts';
let t: TestD1, env: JobsEnv;
const now = Date.now();
beforeAll(async () => {
  t = await createTestD1();
  env = {
    DB: t.db,
    APP_URL: 'https://tiraze.net',
    MAIL_ENABLED: 'false',
    RESEND_API_KEY: 'fixture-key',
    MAIL_FROM: 'Tiraze <fixture@example.com>',
  };
});
afterAll(() => t?.dispose());
it('overlapping scheduled runs have one lease and mail stays disabled by default', async () => {
  await enqueueStmt(t.db, 'alert.staff', 'disabled-mail', { kind: 'test' }, now).run();
  const runs = await Promise.all([runJobs(env, now), runJobs(env, now)]);
  expect(runs.filter((r) => 'skipped' in r)).toHaveLength(1);
  expect(
    (
      await t.db
        .prepare("SELECT status FROM outbox WHERE dedupe_key='disabled-mail'")
        .first<{ status: string }>()
    )?.status,
  ).toBe('pending');
  await t.db.prepare("UPDATE outbox SET status='sent'").run();
});
it('a lost mail response retries with the same provider idempotency key without a second delivery', async () => {
  await enqueueStmt(
    t.db,
    'email.auth',
    'mail-retry',
    {
      to: 'fixture@example.com',
      url: 'https://tiraze.net/api/auth/verify-email?token=TEST_ONLY',
      kind: 'verify_email',
    },
    now,
  ).run();
  const [first] = await claimOutbox(t.db, now, 1);
  expect(first).toBeTruthy();
  const deliveries = new Map<string, string>();
  let calls = 0;
  const send = async (_url: any, request: any) => {
    calls++;
    const key = request.headers['Idempotency-Key'];
    if (!deliveries.has(key)) deliveries.set(key, 'receipt');
    if (calls === 1) throw new TypeError('response lost after acceptance');
    return Response.json({ id: deliveries.get(key) });
  };
  await expect(sendMessage(env, first!, now, send as typeof fetch)).rejects.toThrow();
  await markOutboxFailed(t.db, first!, 'response_lost', now);
  const [retry] = await claimOutbox(t.db, now + 60001, 1);
  await sendMessage(env, retry!, now + 60001, send as typeof fetch);
  expect(calls).toBe(2);
  expect(deliveries.size).toBe(1);
  expect(
    (
      await t.db
        .prepare('SELECT status FROM outbox WHERE id=?')
        .bind(first!.id)
        .first<{ status: string }>()
    )?.status,
  ).toBe('sent');
});
it('an expired authentication email is discarded before any outbound call', async () => {
  await enqueueStmt(
    t.db,
    'email.auth',
    'expired-auth',
    {
      to: 'fixture@example.com',
      url: 'https://tiraze.net/api/auth/verify-email?token=EXPIRED_TEST_ONLY',
      kind: 'verify_email',
    },
    now - 3600001,
  ).run();
  const [message] = await claimOutbox(t.db, now, 1);
  let calls = 0;
  await sendMessage(env, message!, now, (async () => {
    calls++;
    return Response.json({ id: 'must-not-send' });
  }) as typeof fetch);
  expect(calls).toBe(0);
  expect(
    await t.db.prepare('SELECT status,payload FROM outbox WHERE id=?').bind(message!.id).first(),
  ).toEqual({ status: 'dead', payload: '{}' });
});
