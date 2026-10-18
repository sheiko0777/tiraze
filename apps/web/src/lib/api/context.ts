import type { createAuth, AppEnv } from '../auth.ts';
type Auth = ReturnType<typeof createAuth>;
export interface ApiContext {
  request: Request;
  env: AppEnv;
  path: string;
  url: URL;
  db: AppEnv['DB'];
  now: number;
  method: string;
  locale: 'ar' | 'en';
  fixtures: boolean;
  auth: Auth;
  session: NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;
}
