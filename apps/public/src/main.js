import { createApp } from 'vue'
import { router } from './router.js'
import App from './App.vue'
import './assets/main.css'

createApp(App).use(router).mount('#app')

if ('serviceWorker' in navigator) {
  // vite-plugin-pwa injects the actual registration via its virtual module
  // during build; nothing to do manually here in dev.
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {
      // Not built with vite-plugin-pwa yet (e.g. very first `vite` dev run
      // before the plugin generates the virtual module) — safe to ignore.
    })
}
