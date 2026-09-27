import { onBeforeUnmount, ref } from 'vue'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

let scriptLoadingPromise = null

/**
 * Loads Cloudflare Turnstile's public script exactly once per page load
 * (ADR-004), even across multiple mounts of the component that uses this
 * composable — CaptureFlow.vue's `v-else-if` step chain fully unmounts
 * ConsentStep.vue on "Volver a sacar la foto" and remounts it on the way
 * back, so this module-level cache guards against re-injecting the
 * `<script>` tag (and re-downloading it) every time the user retakes.
 */
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (scriptLoadingPromise) return scriptLoadingPromise
  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadingPromise = null
      reject(new Error('No se pudo cargar el script de Cloudflare Turnstile (revisá tu conexión).'))
    }
    document.head.appendChild(script)
  })
  return scriptLoadingPromise
}

/**
 * Wraps the Cloudflare Turnstile widget (ADR-004: anti-bot gate for
 * `POST /upload/sign`). Renders the widget into a container element and
 * exposes the resulting token reactively; the token is cleared automatically
 * on expiry/error so a stale token is never sent to the Worker.
 *
 * `data-sitekey` (`VITE_TURNSTILE_SITE_KEY`) is public by design (ADR-004),
 * but has no real value yet for this project — see apps/public/.env.example
 * and docs/deploy/RUNBOOK.md. While unset, `isConfigured` is false and
 * `mount()` is a no-op, so the caller can show a clear "not configured yet"
 * message instead of a widget that will never render.
 */
export function useTurnstile() {
  const token = ref(null)
  const error = ref(null)
  const isConfigured = Boolean(SITE_KEY)
  let widgetId = null

  async function mount(container) {
    if (!isConfigured || !container) return
    error.value = null
    try {
      await loadTurnstileScript()
      widgetId = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        callback: (t) => {
          token.value = t
        },
        'expired-callback': () => {
          token.value = null
        },
        'error-callback': () => {
          token.value = null
          error.value =
            'No se pudo completar la verificación de Cloudflare Turnstile. Recargá la página e intentá de nuevo.'
        },
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  /** Requests a fresh challenge (e.g. after a failed submit — the token Turnstile issues is single-use). */
  function reset() {
    token.value = null
    if (widgetId !== null && window.turnstile) {
      window.turnstile.reset(widgetId)
    }
  }

  /** Tears down the rendered widget entirely (component unmount). */
  function remove() {
    if (widgetId !== null && window.turnstile) {
      window.turnstile.remove(widgetId)
    }
    widgetId = null
    token.value = null
  }

  onBeforeUnmount(remove)

  return { token, error, isConfigured, mount, reset, remove }
}
