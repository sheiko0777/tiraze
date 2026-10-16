// Optional build helper; generated PNGs are committed, so the site has no runtime dependency.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const assets = path.resolve(__dirname, '../assets');
(async () => {
  const source = await fs.readFile(path.join(assets, 'app-icon.svg'));
  for (const size of [192, 512]) {
    await sharp(source).resize(size, size).png().toFile(path.join(assets, `app-icon-${size}.png`));
  }
  await sharp(source).resize(180, 180).png().toFile(path.join(assets, 'apple-touch-icon.png'));
  console.log('Exported 192px, 512px and Apple 180px icons from the native SVG.');
})().catch(error => { console.error(error); process.exitCode = 1; });
