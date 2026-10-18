import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
  site: 'https://tiraze.net',
  outDir: './build/',
  devToolbar: { enabled: false },
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  server: { host: '127.0.0.1', port: 4321 },
});
