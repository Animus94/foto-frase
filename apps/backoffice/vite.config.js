import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Backoffice is an internal admin tool served from a subpath of the single
// GitHub Pages site (ADR-003): the public app owns the site's root, this one
// owns 'backoffice/' under it. That root itself is a subpath too when this
// repo is served as a GitHub Pages *project* page (no custom domain) — see
// apps/public/vite.config.js's comment and docs/deploy/RUNBOOK.md.
// deploy-pages.yml sets BASE_PATH to that outer prefix (e.g. '/foto-frase');
// locally it's unset, so this falls back to plain '/backoffice/' as before.
// No PWA plugin here — it's not meant to be installed or used offline,
// unlike apps/public.
const outerBase = process.env.BASE_PATH ?? ''

export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
