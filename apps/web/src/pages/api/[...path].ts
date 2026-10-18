import { requestEnv } from '../../lib/environment.ts';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleApi } from '../../lib/api.ts';
import type { AppEnv } from '../../lib/auth.ts';
export const ALL: APIRoute = ({ request, params }) =>
  handleApi(request, requestEnv(env as unknown as AppEnv, request), params.path ?? '');
