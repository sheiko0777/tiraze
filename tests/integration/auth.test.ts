import { createHmac } from 'node:crypto';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { createTestD1, type TestD1 } from '../helpers/d1.ts';
import { createAuth } from '../../apps/web/src/lib/auth.ts';
let t: TestD1;
const origin = 'http://localhost:4321';
let auth: ReturnType<typeof createAuth>;
beforeAll(async () => {
  t = await createTestD1();
  auth = createAuth({
    DB: t.db,
    APP_URL: origin,
    AUTH_SECRET: 'test-only-local-auth-secret-never-deploy-123456789',
  });
});
afterAll(async () => t?.dispose());
function req(path: string, body?: unknown, cookie?: string, requestOrigin = origin) {
  return new Request(origin + '/api/auth/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: requestOrigin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
it('registration requires verified email and returns an authenticated server session only after verification', async () => {
  const signup = await auth.handler(
    req('sign-up/email', {
      name: 'Fixture User',
      email: 'fixture@example.com',
      password: 'Test-only-password-123!',
      callbackURL: origin + '/en/account',
    }),
  );
  expect(signup.status).toBe(200);
  const blocked = await auth.handler(
    req('sign-in/email', { email: 'fixture@example.com', password: 'Test-only-password-123!' }),
  );
  expect(blocked.status).toBe(403);
  const row = await t.db
    .prepare("SELECT payload FROM outbox WHERE topic='email.auth' LIMIT 1")
    .first<{ payload: string }>();
  expect(row).not.toBeNull();
  const payload = JSON.parse(row!.payload);
  expect(payload.to).toBe('fixture@example.com');
  expect(new URL(payload.url).origin).toBe(origin);
  const verification = await auth.handler(new Request(payload.url));
  expect([200, 302]).toContain(verification.status);
  const login = await auth.handler(
    req('sign-in/email', { email: 'fixture@example.com', password: 'Test-only-password-123!' }),
  );
  expect(login.status).toBe(200);
  const cookie = login.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
  expect(cookie).toContain('session_token');
  const session = await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) });
  expect(session?.user.emailVerified).toBe(true);
  expect(
    await t.db
      .prepare('SELECT role FROM staff_roles WHERE user_id=?')
      .bind(session!.user.id)
      .first(),
  ).toBeNull();
  const enrollment = await auth.handler(
    req('two-factor/enable', { password: 'Test-only-password-123!' }, cookie),
  );
  expect(enrollment.status).toBe(200);
  const factor = (await enrollment.json()) as { totpURI: string; backupCodes: string[] };
  expect(factor.totpURI).toMatch(/^otpauth:/);
  expect(factor.backupCodes.length).toBeGreaterThan(1);
  const stored = await t.db
    .prepare('SELECT secret,backupCodes FROM twoFactor WHERE userId=?')
    .bind(session!.user.id)
    .first<{ secret: string; backupCodes: string }>();
  expect(stored!.secret).not.toBe(new URL(factor.totpURI).searchParams.get('secret'));
  expect(stored!.backupCodes).not.toContain(factor.backupCodes[0]);
  function totp(uri: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of new URL(uri).searchParams.get('secret')!.replace(/=+$/, '').toUpperCase())
      bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
    const bytes = Buffer.from((bits.match(/.{8}/g) ?? []).map((s) => parseInt(s, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
    const hmac = createHmac('sha1', bytes).update(counter).digest();
    const offset = hmac[hmac.length - 1]! & 15;
    return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
  }
  const verified = await auth.handler(
    req('two-factor/verify-totp', { code: totp(factor.totpURI), trustDevice: false }, cookie),
  );
  expect(verified.status).toBe(200);
  const challenged = await auth.handler(
    req('sign-in/email', { email: 'fixture@example.com', password: 'Test-only-password-123!' }),
  );
  expect((await challenged.clone().json()).twoFactorRedirect).toBe(true);
  const pending = challenged.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
  expect(await auth.api.getSession({ headers: new Headers({ Cookie: pending }) })).toBeNull();
  const completed = await auth.handler(
    req('two-factor/verify-totp', { code: totp(factor.totpURI), trustDevice: false }, pending),
  );
  expect(completed.status).toBe(200);
  const fullCookie = completed.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');
  expect(
    (await auth.api.getSession({ headers: new Headers({ Cookie: fullCookie }) }))?.user
      .twoFactorEnabled,
  ).toBe(true);
  const logout = await auth.handler(req('sign-out', {}, fullCookie));
  expect(logout.status).toBe(200);
  expect(await auth.api.getSession({ headers: new Headers({ Cookie: fullCookie }) })).toBeNull();
}, 60000);
it('rejects cross-origin account mutations', async () => {
  const r = await auth.handler(
    req(
      'sign-up/email',
      { name: 'Attacker', email: 'attacker@example.com', password: 'Test-only-password-123!' },
      undefined,
      'https://attacker.example',
    ),
  );
  expect(r.status).toBe(403);
});
