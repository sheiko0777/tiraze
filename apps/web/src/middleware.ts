import { defineMiddleware } from 'astro:middleware';
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (context.url.protocol === 'https:')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (
    context.url.pathname.includes('/account') ||
    context.url.pathname.includes('/checkout') ||
    context.url.pathname.includes('/admin') ||
    context.url.pathname.startsWith('/api/')
  )
    response.headers.set('Cache-Control', 'no-store');
  return response;
});
