import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
export const GET: APIRoute = () =>
  new Response(
    (env as { ENVIRONMENT?: string }).ENVIRONMENT === 'production'
      ? 'User-agent: *\nDisallow: /api/\nDisallow: /ar/account\nDisallow: /en/account\nDisallow: /ar/cart\nDisallow: /en/cart\nDisallow: /ar/checkout\nDisallow: /en/checkout\nDisallow: /ar/orders\nDisallow: /en/orders\nDisallow: /ar/admin\nDisallow: /en/admin\nSitemap: https://tiraze.net/sitemap.xml\n'
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
