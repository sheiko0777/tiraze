const {chromium} = require(process.argv[2] || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true}).catch(() => chromium.launch({channel:'msedge',headless:true}));
  const checks = [];
  try {
    for (const width of [1440,390]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
      await page.goto('http://127.0.0.1:8090/',{waitUntil:'networkidle'});
      await page.waitForFunction(() => {const v=document.querySelector('#hero-video');return v && !v.paused && v.currentTime > .2;});
      assert.ok(await page.locator('#hero-video').evaluate(v => v.muted && v.loop && v.playsInline && v.videoWidth > 0));
      await page.locator('[data-action="video"]').click();
      assert.ok(await page.locator('#hero-video').evaluate(v => v.paused));
      await page.locator('[data-action="video"]').click();
      await page.waitForFunction(() => !document.querySelector('#hero-video').paused);
      assert.equal(await page.locator('.tiraze-wordmark').first().getAttribute('aria-label'),'Tiraze');
      if (await page.locator('[data-action="cookie"]').count()) await page.locator('[data-action="cookie"]').click();
      await page.screenshot({path:path.resolve(__dirname,`../qa/hero-video-${width}.png`)});
      checks.push(`${width}px: original film plays, loops muted inline; pause/resume; Tiraze wordmark`);
      await page.close();
    }
    const reduced = await browser.newPage({reducedMotion:'reduce'});
    await reduced.goto('http://127.0.0.1:8090/',{waitUntil:'networkidle'});
    assert.ok(await reduced.locator('#hero-video').evaluate(v => v.paused));
    assert.equal(await reduced.locator('[data-action="video"]').getAttribute('aria-label'),'تشغيل الفيديو');
    await reduced.locator('[data-action="video"]').click();
    await reduced.waitForFunction(() => !document.querySelector('#hero-video').paused);
    checks.push('Reduced motion: paused poster by default; manual play works');
    await fs.writeFile(path.resolve(__dirname,'../qa/hero-video-report.json'),JSON.stringify({passed:checks},null,2));
    console.log(`PASS ${checks.length} hero video scenarios`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
