import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // 必須填寫正確的網站網址，Sitemap 才能產生正確的連結
  site: 'https://haku-yakyuu.github.io',
  integrations: [sitemap()],
});
