import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { createAuth, type AppEnv } from '../../apps/web/src/lib/auth.ts';
import { handleApi } from '../../apps/web/src/lib/api.ts';
let t: TestD1, env: AppEnv, cookie: string, userId: string, sessionId: string;
const origin = 'http://localhost:4321';
function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(origin + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie ?? '',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
beforeAll(async () => {
  t = await createTestD1();
  env = {
    DB: t.db,
    APP_URL: origin,
    AUTH_SECRET: 'test-only-api-auth-secret-not-for-deployment-123456',
    ENVIRONMENT: 'development',
  };
  const auth = createAuth(env);
  await auth.handler(
    new Request(origin + '/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        name: 'API Fixture',
        email: 'api-fixture@example.com',
        password: 'Test-only-password-123!',
      }),
    }),
  );
  const verification = await t.db
    .prepare("SELECT payload FROM outbox WHERE topic='email.auth' LIMIT 1")
    .first<{ payload: string }>();
  await auth.handler(new Request(JSON.parse(verification!.payload).url));
  const login = await auth.handler(
    new Request(origin + '/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({
        email: 'api-fixture@example.com',
        password: 'Test-only-password-123!',
      }),
    }),
  );
  cookie = login.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
  const session = await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) });
  userId = session!.user.id;
  sessionId = session!.session.id;
});
afterAll(() => t?.dispose());
it('requires a real session and ignores forged role/user headers', async () => {
  const r = await handleApi(
    request('admin/inventory', undefined, { Cookie: '', 'x-user-id': 'owner', 'x-role': 'owner' }),
    env,
    'admin/inventory',
  );
  expect(r.status).toBe(401);
  const customer = await handleApi(request('admin/inventory'), env, 'admin/inventory');
  expect(customer.status).toBe(403);
});
it('staff role alone cannot bypass MFA or recent step-up', async () => {
  await t.db
    .prepare("INSERT INTO staff_roles (user_id,role,created_at) VALUES (?,'catalog',?)")
    .bind(userId, Date.now())
    .run();
  expect((await handleApi(request('admin/inventory'), env, 'admin/inventory')).status).toBe(403);
  await t.db.prepare('UPDATE user SET twoFactorEnabled=1 WHERE id=?').bind(userId).run();
  const r = await handleApi(request('admin/inventory'), env, 'admin/inventory');
  expect(r.status).toBe(403);
  expect(await r.json()).toEqual({ error: 'step_up_required' });
  await t.db
    .prepare('INSERT INTO admin_step_up (session_id,expires_at) VALUES (?,?)')
    .bind(sessionId, Date.now() + 60000)
    .run();
  expect((await handleApi(request('admin/inventory'), env, 'admin/inventory')).status).toBe(200);
  expect((await handleApi(request('admin/refunds'), env, 'admin/refunds')).status).toBe(403);
  expect((await handleApi(request('admin/outbox'), env, 'admin/outbox')).status).toBe(403);
});
it('does not expose authentication links through the owner outbox view', async () => {
  await t.db
    .prepare("INSERT INTO staff_roles (user_id,role,created_at) VALUES (?,'owner',?)")
    .bind(userId, Date.now())
    .run();
  const r = await handleApi(request('admin/outbox'), env, 'admin/outbox');
  expect(r.status).toBe(200);
  const body = await r.text();
  expect(body).not.toContain('payload');
  expect(body).not.toContain('verify-email');
  expect(body).not.toContain('token=');
});
it('cross-customer resources and stale step-up are denied', async () => {
  expect(
    (await handleApi(request('orders/other-customer-order'), env, 'orders/other-customer-order'))
      .status,
  ).toBe(404);
  await t.db
    .prepare('UPDATE admin_step_up SET expires_at=0 WHERE session_id=?')
    .bind(sessionId)
    .run();
  expect((await handleApi(request('admin/inventory'), env, 'admin/inventory')).status).toBe(403);
});
it('rejects cross-site and oversized mutation bodies', async () => {
  expect(
    (await handleApi(request('quotes', {}, { Origin: 'https://attacker.example' }), env, 'quotes'))
      .status,
  ).toBe(403);
  const r = await handleApi(request('quotes', { notes: 'x'.repeat(20000) }), env, 'quotes');
  expect(r.status).toBe(413);
});
