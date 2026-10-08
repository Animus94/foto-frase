import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const outerBase = process.env.BASE_PATH ?? ''

export default defineConfig({
  base: (process.env.IS_CLOUDFLARE_PAGES || process.env.CF_PAGES) ? '/' : `${outerBase}/backoffice/`.replace(/\/\//g, '/'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
