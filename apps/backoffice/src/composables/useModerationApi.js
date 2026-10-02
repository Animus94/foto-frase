import { ref } from 'vue'
import { CAMPAIGN_TAG, VARIANTS } from '@foto-frase/shared'
import { useGithubDeviceAuth, MOCK_TOKEN } from './useGithubDeviceAuth.js'

const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL

/**
 * The Worker's error responses are `{ error: "<message>" }` (jsonError in
 * worker/src/http.ts), often with useful detail (e.g. the underlying
 * Cloudinary HTTP status — see worker/src/moderation.ts's
 * cloudinaryErrorMessage). Reads that message instead of discarding the
 * response body in favor of a generic "HTTP <status>" string.
 * @param {Response} response
 * @param {string} fallback
 */
async function readWorkerErrorMessage(response, fallback) {
  try {
    const payload = await response.json()
    return typeof payload?.error === 'string' && payload.error ? payload.error : fallback
  } catch {
    return fallback
  }
}

function buildMockSubmissions() {
  const now = Date.now()
  const hoursAgo = (hours) => new Date(now - hours * 3_600_000).toISOString()
  return [
    {
      public_id: `${CAMPAIGN_TAG}/submissions/mock-1`,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      created_at: hoursAgo(1),
      context: {
        phrase_id: 'familia',
        phrase_text: 'Yo voy a la Marcha... Con mi familia',
        variant: VARIANTS.SELFIE,
        submitted_at: hoursAgo(1),
        device_id: 'mock-device-1',
      },
    },
    {
      public_id: `${CAMPAIGN_TAG}/submissions/mock-2`,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      created_at: hoursAgo(2),
      context: {
        phrase_id: 'amigos',
        phrase_text: 'Yo voy a la Marcha... Con mis amigos/as',
        variant: VARIANTS.ALTERNATIVE,
        sticker_name: 'Facu',
        submitted_at: hoursAgo(2),
        device_id: 'mock-device-2',
      },
    },
    {
      public_id: `${CAMPAIGN_TAG}/submissions/mock-3`,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      created_at: hoursAgo(3),
      context: {
        phrase_id: 'hijos',
        phrase_text: 'Yo voy a la Marcha... Con mis hijos',
        variant: VARIANTS.SELFIE,
        submitted_at: hoursAgo(3),
        device_id: 'mock-device-3',
      },
    },
    {
      public_id: `${CAMPAIGN_TAG}/submissions/mock-4`,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      created_at: hoursAgo(4),
      context: {
        phrase_id: 'comision',
        phrase_text: 'Yo voy a la Marcha... Con mi comisión',
        variant: VARIANTS.ALTERNATIVE,
        sticker_name: 'Plaza Houssay',
        submitted_at: hoursAgo(4),
        device_id: 'mock-device-4',
      },
    },
  ]
}

/**
 * Moderation client for the Worker's Cloudinary proxy routes (ADR-001 §B):
 * `GET /moderation/pending`, `POST /moderation/:public_id/approve`,
 * `POST /moderation/:public_id/reject`. Never talks to Cloudinary directly
 * — the Worker holds the API Secret and validates the caller's GitHub
 * permissions before touching Cloudinary.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowMock] - dev-only; see useGithubDeviceAuth's MOCK_TOKEN.
 */
export function useModerationApi(options = {}) {
  const { allowMock = false } = options
  const { token } = useGithubDeviceAuth()

  const isConfigured = Boolean(WORKER_BASE_URL)

  const items = ref([])
  const cursor = ref(null)
  const hasMore = ref(false)
  const loading = ref(false)
  /** @type {import('vue').Ref<{ kind: 'unauthorized'|'config'|'generic', message: string }|null>} */
  const error = ref(null)
  const pendingActionIds = ref(new Set())

  function isMockSession() {
    return allowMock && import.meta.env.DEV && token.value === MOCK_TOKEN
  }

  function authHeaders() {
    return { Authorization: `Bearer ${token.value}` }
  }

  /**
   * @param {boolean} [reset] - true for the first page / a full refresh, false to append the next page via `cursor`.
   */
  async function loadItems(tab = 'pending', reset = true) {
    loading.value = true
    error.value = null
    try {
      if (isMockSession()) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        items.value = buildMockSubmissions()
        cursor.value = null
        hasMore.value = false
        return
      }
      if (!isConfigured) {
        error.value = { kind: 'config', message: 'Falta VITE_WORKER_BASE_URL en la configuración (ver .env.example).' }
        return
      }
      const url = new URL(`${WORKER_BASE_URL}/moderation/pending`)
      if (!reset && cursor.value) url.searchParams.set('cursor', cursor.value)
      const response = await fetch(url, { headers: authHeaders() })
      if (response.status === 401 || response.status === 403) {
        error.value = {
          kind: 'unauthorized',
          message:
            'No autorizado: tu sesión de GitHub no tiene permiso de escritura sobre este repositorio, o el token expiró.',
        }
        return
      }
      if (!response.ok) {
        throw new Error(
          await readWorkerErrorMessage(response, `Error HTTP ${response.status} al listar envíos pendientes.`),
        )
      }
      const payload = await response.json()
      const page = payload.items ?? payload.resources ?? []
      items.value = reset ? page : [...items.value, ...page]
      cursor.value = payload.next_cursor ?? payload.cursor ?? null
      hasMore.value = Boolean(cursor.value)
    } catch (err) {
      error.value = { kind: 'generic', message: err instanceof Error ? err.message : String(err) }
    } finally {
      loading.value = false
    }
  }

  /**
   * Shared implementation for approve/reject. Guards against double-click /
   * double submission of the same action on the same public_id (ADR-001 QA
   * notes) by tracking in-flight ids client-side — the Worker is still
   * expected to be idempotent server-side, this is just the UI-level half
   * of that concern (disables the buttons while the request is in flight).
   * @param {string} publicId
   * @param {'approve'|'reject'} action
   * @param {Record<string, string>} [context] - the submission's existing
   *   context (from the same item `loadPending` returned), so the Worker can
   *   reconstruct the full tags/context without a second Cloudinary lookup
   *   (see worker/src/moderation.ts's `moderate`).
   */
  async function act(publicId, action, context = {}) {
    if (pendingActionIds.value.has(publicId)) return false
    pendingActionIds.value = new Set(pendingActionIds.value).add(publicId)
    error.value = null
    try {
      if (isMockSession()) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        items.value = items.value.filter((item) => item.public_id !== publicId)
        return true
      }
      if (!isConfigured) {
        error.value = { kind: 'config', message: 'Falta VITE_WORKER_BASE_URL en la configuración (ver .env.example).' }
        return false
      }
      const response = await fetch(`${WORKER_BASE_URL}/moderation/${encodeURIComponent(publicId)}/${action}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ context }),
      })
      if (response.status === 401 || response.status === 403) {
        error.value = {
          kind: 'unauthorized',
          message:
            'No autorizado para moderar: permiso insuficiente sobre el repositorio, o el token expiró.',
        }
        return false
      }
      if (!response.ok) {
        const verb = action === 'approve' ? 'aprobar' : 'rechazar'
        throw new Error(await readWorkerErrorMessage(response, `Error HTTP ${response.status} al ${verb} el envío.`))
      }
      items.value = items.value.filter((item) => item.public_id !== publicId)
      return true
    } catch (err) {
      error.value = { kind: 'generic', message: err instanceof Error ? err.message : String(err) }
      return false
    } finally {
      const next = new Set(pendingActionIds.value)
      next.delete(publicId)
      pendingActionIds.value = next
    }
  }

  function approve(publicId, context) {
    return act(publicId, 'approve', context)
  }

  function reject(publicId, context) {
    return act(publicId, 'reject', context)
  }

  function isActionPending(publicId) {
    return pendingActionIds.value.has(publicId)
  }

  return {
    isConfigured,
    items,
    hasMore,
    loading,
    error,
    loadItems,
    approve,
    reject,
    isActionPending,
  }
}
