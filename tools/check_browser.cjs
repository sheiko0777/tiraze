const {chromium} = require(process.argv[2] || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'qa');
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({headless:true}).catch(() => chromium.launch({channel:'msedge', headless:true}));
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {if(response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);});
  const results = [];
  try {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height:900});
      await page.goto('http://127.0.0.1:8090/', {waitUntil:'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      if (await page.locator('[data-action="cookie"]').count()) await page.locator('[data-action="cookie"]').click();
      await page.evaluate(async () => {
        const images = [...document.images];
        for (const image of images) image.loading = 'eager';
        await Promise.all(images.map(image => image.decode()));
      });
      assert.equal(await page.locator('.tiraze-wordmark').first().getAttribute('aria-label'), 'Tiraze');
      assert.equal(await page.locator('.product-card').count(), 3);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
      await page.screenshot({path:path.join(output, `home-${width}.png`), fullPage:true});
      await page.screenshot({path:path.join(output, `opening-${width}.png`)});
      results.push(`Homepage ${width}px: assets, branding, 3 rugs and no overflow`);
      assert.ok(!/IRTH|Collectibles|RIHAL|رحال|إرث|كسوة/.test(await page.locator('body').innerText()));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('[data-action="menu"]').click();
    await page.locator('#overlay a[href="/catalog"]').click();
    await page.waitForURL('**/catalog');
    await page.locator('[data-filter="ivory"]').click();
    assert.equal(await page.locator('#catalog-items .product-card').count(),1);
    await page.locator('#catalog-items h3 a').click();
    await page.locator('[data-add="safaa-silk"]').click();
    assert.ok((await page.locator('#overlay').innerText()).includes('صفاء'));
    await page.locator('[data-action="close"]').first().click();
    results.push('Mobile menu → catalog → ivory filter → product → bag');
    await page.goto('http://127.0.0.1:8090/');
    await page.locator('[data-action="menu"]').click();
    await page.locator('#overlay [data-action="language"]').click();
    assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
    await page.screenshot({path:path.join(output,'home-en-390.png'),fullPage:true});
    results.push('English language and LTR layout');
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output,'browser-report.json'),JSON.stringify({passed:results,errors},null,2));
    console.log('PASS '+results.length+' browser scenarios; no page or asset errors.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
