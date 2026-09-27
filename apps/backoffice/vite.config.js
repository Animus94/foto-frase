import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Backoffice is an internal admin tool served from a subpath of the single
// GitHub Pages site (ADR-003): the public app owns '/', this one owns
// '/backoffice/'. No PWA plugin here — it's not meant to be installed or
// used offline, unlike apps/public.
export default defineConfig({
  base: '/backoffice/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
