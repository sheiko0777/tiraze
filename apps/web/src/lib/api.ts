import { catalogQuery, quoteRequestInput, randomId, hmacSha256Hex } from '@tiraze/core';
import { listProducts, receiveKashierWebhook } from '@tiraze/db';
import {
  allowRate,
  createQuote,
  rolesFor,
  hasRole,
} from '../../../../packages/db/src/operations.ts';
import { createAuth, type AppEnv } from './auth.ts';
import { readJson, response, sameOrigin, drainRejectedBody } from './security.ts';
import type { ApiContext } from './api/context.ts';
import { customerRoute } from './api/customer.ts';
import { staffRoute } from './api/staff.ts';
import { kashier } from './api/payment-config.ts';
export async function handleApi(request: Request, env: AppEnv, path: string) {
  const url = new URL(request.url),
    db = env.DB,
    now = Date.now(),
    method = request.method;
  const locale = url.searchParams.get('lang') === 'en' ? 'en' : 'ar';
  const fixtures = env.ENVIRONMENT === 'development' && env.FIXTURES_VISIBLE === 'true';
  try {
    if (path === 'health' && method === 'GET') {
      await db.prepare('SELECT 1').first();
      return response({ ok: true });
    }
    if (path === 'webhooks/kashier' && method === 'POST') {
      const body = await readJson(request, 65536);
      const r = await receiveKashierWebhook(
        db,
        kashier(env),
        JSON.stringify(body),
        request.headers.get('x-kashier-signature'),
        now,
      );
      return response(r.body, r.status);
    }
    if (method !== 'GET' && !sameOrigin(request, env)) {
      await drainRejectedBody(request);
      return response({ error: 'origin_rejected' }, 403);
    }
    if (path === 'catalog' && method === 'GET')
      return response(
        await listProducts(db, {
          ...catalogQuery(url.searchParams),
          locale,
          includeFixtures: fixtures,
        }),
      );
    const auth = createAuth(env),
      session = await auth.api.getSession({ headers: request.headers });
    if (method !== 'GET') {
      const ip =
        env.ENVIRONMENT === 'development'
          ? 'local'
          : (request.headers.get('cf-connecting-ip') ?? 'unknown');
      const family = path.startsWith('admin/') ? 'admin/' + path.split('/')[1] : path.split('/')[0];
      const known = [
        'cart',
        'checkout',
        'addresses',
        'orders',
        'quotes',
        'admin/inventory',
        'admin/catalog',
        'admin/imports',
        'admin/orders',
        'admin/refunds',
        'admin/collections',
        'admin/quotes',
        'admin/shipping',
        'admin/roles',
        'admin/settings',
        'admin/step-up',
      ];
      const bucket = known.includes(family) ? family : 'unknown';
      const importing =
        bucket === 'admin/imports' &&
        session?.user.emailVerified &&
        session.user.twoFactorEnabled &&
        hasRole(await rolesFor(db, session.user.id), 'catalog');
      const key = await hmacSha256Hex(
        env.AUTH_SECRET!,
        ip + ':' + (session?.user.id ?? 'anonymous') + ':' + bucket,
      );
      if (
        !(await allowRate(
          db,
          key,
          now,
          path === 'quotes' ? 5 : importing ? 600 : 30,
          path === 'quotes' ? 3600000 : 60000,
        ))
      )
        return response({ error: 'rate_limited' }, 429);
    }
    if (path === 'quotes' && method === 'POST')
      return response(
        await createQuote(
          db,
          quoteRequestInput.parse(await readJson(request)),
          session?.user.id ?? null,
          now,
        ),
        201,
      );
    if (!session) {
      if (method !== 'GET') await drainRejectedBody(request);
      return response({ error: 'authentication_required' }, 401);
    }
    const context: ApiContext = {
      request,
      env,
      path,
      url,
      db,
      now,
      method,
      locale,
      fixtures,
      auth,
      session,
    };
    const result = (await customerRoute(context)) ?? (await staffRoute(context));
    if (result) return result;
    return response({ error: 'not_found' }, 404);
  } catch (error) {
    const message = String((error as Error).message ?? error);
    if ((error as { name?: string }).name === 'ZodError' || error instanceof SyntaxError)
      return response({ error: 'invalid_input' }, 400);
    if (message.includes('TIRAZE_') || message.includes('constraint failed'))
      return response({ error: 'state_conflict' }, 409);
    if (['json_required', 'body_required', 'payload_too_large'].includes(message))
      return response({ error: message }, message === 'payload_too_large' ? 413 : 400);
    // Keep customer data, authentication tokens and provider payloads out of logs.
    console.error(JSON.stringify({ event: 'api_failure', path, requestId: randomId() }));
    return response({ error: 'temporarily_unavailable' }, 503);
  }
}
