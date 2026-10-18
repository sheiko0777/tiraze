import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { readJson, sameOrigin, drainRejectedBody } from './security.ts';
import { enqueueStmt } from '../../../../packages/db/src/outbox.ts';
import type { D1Database } from '@cloudflare/workers-types';
export interface AppEnv {
  DB: D1Database;
  APP_URL: string;
  AUTH_SECRET?: string;
  ENVIRONMENT?: string;
  FIXTURES_VISIBLE?: string;
  MEDIA_HOSTS?: string;
  COMMERCE_LAUNCH_READY?: string;
  ALLOW_TEST_CHECKOUT?: string;
  KASHIER_MODE?: string;
  KASHIER_MERCHANT_ID?: string;
  KASHIER_API_KEY?: string;
  KASHIER_SECRET_KEY?: string;
}
export function createAuth(env: AppEnv) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
    throw new Error('AUTH_SECRET must contain at least 32 characters');
  const origin = new URL(env.APP_URL);
  if (
    origin.username ||
    origin.password ||
    (env.ENVIRONMENT === 'production' && origin.protocol !== 'https:')
  )
    throw new Error('invalid_auth_origin');
  const mail = async (to: string, url: string, kind: string) => {
    if (new URL(url).origin !== new URL(env.APP_URL).origin) throw new Error('unsafe_auth_url');
    await enqueueStmt(
      env.DB,
      'email.auth',
      crypto.randomUUID(),
      { to, url, kind },
      Date.now(),
    ).run();
  };
  const auth = betterAuth({
    appName: 'Tiraze',
    baseURL: env.APP_URL,
    secret: env.AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [new URL(env.APP_URL).origin],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => mail(user.email, url, 'reset_password'),
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => mail(user.email, url, 'verify_email'),
    },
    session: {
      expiresIn: 604800,
      updateAge: 86400,
      freshAge: 900,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
    advanced: { useSecureCookies: new URL(env.APP_URL).protocol === 'https:' },
    plugins: [
      twoFactor({ issuer: 'Tiraze', backupCodeOptions: { storeBackupCodes: 'encrypted' } }),
    ],
  });
  return {
    ...auth,
    handler: async (request: Request) => {
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (!sameOrigin(request, env)) {
          await drainRejectedBody(request);
          return Response.json({ error: 'origin_rejected' }, { status: 403 });
        }
        try {
          const body = await readJson(request, 16384);
          return auth.handler(
            new Request(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(body),
            }),
          );
        } catch {
          return Response.json({ error: 'invalid_auth_request' }, { status: 400 });
        }
      }
      return auth.handler(request);
    },
  };
}
