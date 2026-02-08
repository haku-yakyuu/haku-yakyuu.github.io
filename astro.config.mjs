import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ⚠️ 1. 請填入你的 GitHub Pages 網址 (例如 https://你的帳號.github.io)
  site: 'https://haku-yakyuu.github.io',

  // ⚠️ 2. 如果你的儲存庫名稱不是 kae-k.github.io，而是像 "my-shop"，請填入 '/my-shop'
  // 如果是使用者主頁 (user site)，則留空字串 ''
  base: '',

  integrations: [sitemap(), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});