import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { all } from '@tiraze/db';
import type { AppEnv } from '../lib/auth.ts';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export const GET: APIRoute = async () => {
  const bindings = env as unknown as AppEnv;
  const rows = await all<{ locale: string; slug: string }>(
    bindings.DB,
    "SELECT t.locale,t.slug FROM product_translations t JOIN products p ON p.id=t.product_id WHERE p.status='published' AND p.is_fixture=0 LIMIT 10000",
  );
  const urls = [
    ...['ar', 'en'].flatMap((lang) =>
      ['', 'catalog', 'about', 'care', 'quote'].map(
        (path) => 'https://tiraze.net/' + lang + (path ? '/' + path : ''),
      ),
    ),
    ...rows.map(
      (r) => 'https://tiraze.net/' + r.locale + '/products/' + encodeURIComponent(r.slug),
    ),
  ];
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      urls.map((url) => '<url><loc>' + escape(url) + '</loc></url>').join('') +
      '</urlset>',
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
};
