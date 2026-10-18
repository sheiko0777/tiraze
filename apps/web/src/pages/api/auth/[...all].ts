import { requestEnv } from '../../../lib/environment.ts';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createAuth, type AppEnv } from '../../../lib/auth.ts';
export const ALL: APIRoute = ({ request }) =>
  createAuth(requestEnv(env as unknown as AppEnv, request)).handler(request);
