import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const origin = process.env.E2E_ORIGIN || 'http://localhost:4330';
const output = new URL('../../qa/commerce/', import.meta.url);
await mkdir(output, { recursive: true });
let ready = false;
for (let i = 0; i < 90; i++) {
  try {
    const r = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error('Built preview did not become healthy at ' + origin);
const browser = await chromium
  .launch({ headless: true })
  .catch(() => chromium.launch({ channel: 'msedge', headless: true }));
const results = [],
  errors = [];
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' }),
    page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().includes('/assets/') && r.status() >= 400)
      errors.push('Asset HTTP ' + r.status() + ' ' + new URL(r.url()).pathname);
  });
  for (const lang of ['ar', 'en'])
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(origin + '/' + lang, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('html').getAttribute('dir'), lang === 'ar' ? 'rtl' : 'ltr');
      assert.equal(
        await page.locator('#hero-video source').getAttribute('src'),
        '/assets/hero.mp4',
      );
      assert.ok(
        await page.locator('#hero-video').evaluate((v) => v.muted && v.loop && v.playsInline),
      );
      assert.ok(await page.locator('#hero-video').evaluate((v) => v.paused));
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        'Horizontal overflow ' + lang + ' ' + width,
      );
      if (width <= 390) {
        await page.locator('[data-menu]').click();
        assert.equal(await page.locator('#mobile-navigation').isVisible(), true);
        assert.equal(
          await page.locator('#mobile-navigation a[href="/' + lang + '/catalog"]').count(),
          1,
        );
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#mobile-navigation').isVisible(), false);
      }
      await page.screenshot({
        path: new URL('home-' + lang + '-' + width + '.png', output).pathname.replace(
          /^\/([A-Za-z]:)/,
          '$1',
        ),
      });
      results.push(lang + ' ' + width + 'px: SSR identity/video/reduced motion/no overflow');
    }
  const media = await page.request.get(origin + '/assets/hero.mp4', {
    headers: { Range: 'bytes=0-1023' },
  });
  assert.ok([200, 206].includes(media.status()));
  assert.match(media.headers()['content-type'] ?? '', /video\/mp4/);
  assert.ok((await media.body()).length >= 1024);
  results.push('Original hero video is served as MP4 bytes');
  await page.goto(origin + '/en/catalog');
  assert.ok(await page.locator('#main h1').innerText());
  assert.equal((await page.request.get(origin + '/api/me')).status(), 401);
  assert.equal(
    (
      await page.request.post(origin + '/api/checkout', { headers: { Origin: origin }, data: {} })
    ).status(),
    401,
  );
  assert.equal(
    (
      await page.request.post(origin + '/api/quotes', {
        headers: { Origin: 'https://evil.example' },
        data: {},
      })
    ).status(),
    403,
  );
  assert.equal(
    (
      await page.request.post(origin + '/api/auth/sign-up/email', {
        headers: { Origin: 'https://evil.example' },
        data: {},
      })
    ).status(),
    403,
  );
  results.push('Anonymous checkout and cross-origin API/auth blocked');
  await page.goto(origin + '/en/quote');
  await page.locator('[name=name]').fill('Local browser fixture');
  await page.locator('[name=email]').fill('browser-fixture@example.com');
  await page.locator('[name=widthCm]').fill('120');
  await page.locator('[name=lengthCm]').fill('180');
  await page.locator('[name=consent]').check();
  await page.locator('[data-store=quote] button').click();
  await page.waitForFunction(() => document.querySelector('#notice')?.textContent.includes('TQ-'));
  results.push('Bespoke enquiry durably submitted without payment');
  const unknown = await page.goto(origin + '/en/not-a-page');
  assert.equal(unknown.status(), 404);
  results.push('Unknown routes return HTTP 404');
  assert.deepEqual(errors, []);
  await writeFile(
    new URL('browser-results.json', output),
    JSON.stringify(
      {
        environment:
          'Local built Astro Workers preview + headless Chromium/Edge; no real payment or email',
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('PASS ' + results.length + ' browser scenarios');
} finally {
  await browser.close();
}
