import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const repoDataDir = fileURLToPath(new URL('../../data', import.meta.url))

/**
 * ADR-002 fixes data/phrases.json and data/campaign.json as git-as-backend
 * config, and ADR-002's "Impacto" section says apps/public reads them as a
 * plain static fetch (not bundled into the JS chunk) so a data-only commit
 * doesn't require touching app source. This plugin serves the repo-root
 * data/ directory as /data/*.json both in `vite dev` and in the production
 * build, without duplicating the JSON files inside apps/public.
 */
function serveCampaignData() {
  return {
    name: 'foto-frase-serve-campaign-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = /^\/data\/(phrases|campaign)\.json$/.exec(req.url?.split('?')[0] ?? '')
        if (!match) return next()
        const filePath = path.join(repoDataDir, `${match[1]}.json`)
        fs.readFile(filePath, 'utf-8', (err, contents) => {
          if (err) {
            res.statusCode = 404
            res.end(`Not found: ${filePath}`)
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(contents)
        })
      })
    },
    generateBundle() {
      for (const name of ['phrases.json', 'campaign.json']) {
        this.emitFile({
          type: 'asset',
          fileName: `data/${name}`,
          source: fs.readFileSync(path.join(repoDataDir, name), 'utf-8'),
        })
      }
    },
  }
}

// Public app is served at the root of the single GitHub Pages site (ADR-003);
// the backoffice app owns the '/backoffice/' subpath instead.
export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    serveCampaignData(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-192x192.png',
        'maskable-icon-512x512.png',
      ],
      manifest: {
        name: 'Mural — 5ta Marcha Federal Universitaria',
        short_name: 'Mural Marcha',
        description:
          'Sumá tu selfie o foto con una frase de adhesión a la 5ta Marcha Federal Universitaria.',
        theme_color: '#358e3d',
        background_color: '#358e3d',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // data/*.json is fetched from the site root at runtime (see usePhrases/useCampaign);
        // cache it so the capture flow keeps working offline once it was loaded once.
        runtimeCaching: [
          {
            urlPattern: /\/data\/(phrases|campaign)\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'ff-config-data', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
