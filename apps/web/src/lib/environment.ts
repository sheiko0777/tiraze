import type { AppEnv } from './auth.ts';
/** Local preview may use a different free port; production always uses the configured canonical origin. */
export function requestEnv(bindings: AppEnv, request: Request): AppEnv {
  const url = new URL(request.url);
  if (
    bindings.ENVIRONMENT === 'development' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
    url.protocol === 'http:'
  )
    return { ...bindings, APP_URL: url.origin };
  return bindings;
}
