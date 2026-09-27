import { ref } from 'vue'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1h — plenty for a low-traffic campaign site.

const needRefresh = ref(false)
let updateSW = null

/**
 * Surfaces PWA updates instead of leaving them silent (found live,
 * 2026-09-27): with `registerType: 'autoUpdate'`, a new service worker
 * activates in the background, but an ALREADY OPEN tab keeps running the
 * old JS until it reloads — `clientsClaim`/`skipWaiting` don't retroactively
 * change code already loaded in memory. A visitor who opened the app once
 * and leaves the tab/PWA open across several deploys (very plausible for
 * this project, given how often it's being redeployed during setup, and for
 * an event day where people keep it open) would silently keep running a
 * stale, possibly-broken build with no way to tell.
 *
 * Never reloads automatically/silently: forcing a reload mid-flow (e.g.
 * mid-capture, right before submitting) would lose whatever the user was
 * doing. Exposes `needRefresh` instead, for the UI to show a dismissible
 * "update available" prompt the user acts on when it's convenient for them.
 */
export function usePwaUpdate() {
  function reloadForUpdate() {
    updateSW?.(true)
  }

  function registerOnce() {
    if (updateSW || !('serviceWorker' in navigator)) return
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            needRefresh.value = true
          },
          onRegisteredSW(_url, registration) {
            if (!registration) return
            // Browsers only check a service worker for changes on
            // navigation/reload by default — with the tab left open (or a
            // long gap between visits), that check might not happen for a
            // long time on its own. Nudges it periodically instead.
            setInterval(() => registration.update().catch(() => {}), UPDATE_CHECK_INTERVAL_MS)
          },
        })
      })
      .catch(() => {
        // Not built with vite-plugin-pwa yet (e.g. very first `vite dev` run
        // before the plugin generates the virtual module) — safe to ignore.
      })
  }

  return { needRefresh, reloadForUpdate, registerOnce }
}
