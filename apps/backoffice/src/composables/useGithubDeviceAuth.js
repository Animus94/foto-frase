import { ref, computed } from 'vue'

const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL
const CLIENT_ID = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID
const TOKEN_KEY = 'ff:backoffice:gh_token'
const DEFAULT_POLL_INTERVAL_SEC = 5
const DEFAULT_EXPIRES_IN_SEC = 900

/**
 * Sentinel token value used only by `startMockSession` (dev-only, see
 * below). Exported so other composables (useGithubContents,
 * useModerationApi) can recognize "we're in a mock session" without every
 * one of them re-implementing the check.
 */
export const MOCK_TOKEN = '__mock_session__'

function readStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(value) {
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // sessionStorage unavailable (e.g. blocked storage) — the token still
    // works in-memory for the rest of this tab's life, it just won't
    // survive a reload. Nothing else to do here.
  }
}

// Singleton state: every component that calls useGithubDeviceAuth() shares
// the same session (the token is needed by the phrases/campaign editors and
// by the moderation view alike, and logging out in one place must affect
// all of them immediately).
const token = ref(readStoredToken())
const status = ref(token.value ? 'success' : 'idle')
const userCode = ref(null)
const verificationUri = ref(null)
const error = ref(null)

let pollTimeoutId = null
let deviceCodeExpiresAt = 0

function stopPolling() {
  if (pollTimeoutId) {
    clearTimeout(pollTimeoutId)
    pollTimeoutId = null
  }
}

function setToken(value) {
  token.value = value
  writeStoredToken(value)
}

/**
 * GitHub OAuth App Device Flow client (ADR-001 §A).
 *
 * Talks to the Worker's forwarding routes — `POST {WORKER_BASE_URL}/gh/device/code`
 * and `POST {WORKER_BASE_URL}/gh/oauth/token` — instead of GitHub directly,
 * because GitHub's own device-flow endpoints
 * (`https://github.com/login/oauth/device/code` and
 * `https://github.com/login/oauth/access_token`) don't send CORS headers
 * for browser origins (ADR-001). The Worker does not exist yet
 * (deploy-engineer builds it) — this composable assumes it forwards the
 * exact JSON request/response shape GitHub's device flow API documents
 * (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow),
 * as a plain pass-through with no secret involved in this step.
 *
 * The resulting access token is kept ONLY in sessionStorage (never
 * localStorage, never sent anywhere but api.github.com and this project's
 * own Worker) — per CLAUDE.md and ADR-001.
 */
export function useGithubDeviceAuth() {
  const isConfigured = Boolean(WORKER_BASE_URL && CLIENT_ID)
  const isAuthenticated = computed(() => Boolean(token.value))
  const isMockSession = computed(() => token.value === MOCK_TOKEN)

  function logout() {
    stopPolling()
    setToken(null)
    status.value = 'idle'
    userCode.value = null
    verificationUri.value = null
    error.value = null
  }

  /**
   * Dev-only shortcut so the phrases/campaign editors and the moderation UI
   * can be built and demoed before deploy-engineer stands up the Worker and
   * registers the OAuth App (neither exists yet). `import.meta.env.DEV` is
   * statically inlined to `false` by Vite in a production build, so this
   * branch (and every composable's `allowMock` branch that checks
   * `token.value === MOCK_TOKEN`) is dead code there — never reachable
   * outside a dev server.
   */
  function startMockSession() {
    if (!import.meta.env.DEV) return
    stopPolling()
    setToken(MOCK_TOKEN)
    status.value = 'success'
    error.value = null
  }

  async function startDeviceFlow() {
    if (!isConfigured) {
      error.value =
        'Falta configuración: VITE_WORKER_BASE_URL y/o VITE_GITHUB_OAUTH_CLIENT_ID. Ver apps/backoffice/.env.example.'
      status.value = 'error'
      return
    }

    stopPolling()
    status.value = 'requesting'
    error.value = null
    userCode.value = null
    verificationUri.value = null

    try {
      const response = await fetch(`${WORKER_BASE_URL}/gh/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' }),
      })
      if (!response.ok) {
        throw new Error(`El Worker respondió ${response.status} pidiendo el device code`)
      }
      const payload = await response.json()
      if (!payload.device_code || !payload.user_code) {
        throw new Error('Respuesta inesperada del Worker en /gh/device/code')
      }
      userCode.value = payload.user_code
      verificationUri.value = payload.verification_uri || 'https://github.com/login/device'
      deviceCodeExpiresAt = Date.now() + (payload.expires_in ?? DEFAULT_EXPIRES_IN_SEC) * 1000
      status.value = 'pending'
      schedulePoll(payload.device_code, (payload.interval ?? DEFAULT_POLL_INTERVAL_SEC) * 1000)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      status.value = 'error'
    }
  }

  function schedulePoll(deviceCode, delayMs) {
    pollTimeoutId = setTimeout(() => poll(deviceCode, delayMs), delayMs)
  }

  async function poll(deviceCode, currentDelayMs) {
    if (Date.now() > deviceCodeExpiresAt) {
      status.value = 'timeout'
      error.value = 'El código expiró antes de confirmarse en GitHub. Volvé a intentar.'
      return
    }

    try {
      const response = await fetch(`${WORKER_BASE_URL}/gh/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (payload.access_token) {
        setToken(payload.access_token)
        status.value = 'success'
        userCode.value = null
        verificationUri.value = null
        return
      }

      switch (payload.error) {
        case 'authorization_pending':
          schedulePoll(deviceCode, currentDelayMs)
          return
        case 'slow_down':
          // GitHub's spec: back off by at least 5 extra seconds when told to slow down.
          schedulePoll(deviceCode, currentDelayMs + 5000)
          return
        case 'expired_token':
          status.value = 'timeout'
          error.value = 'El código expiró antes de confirmarse en GitHub. Volvé a intentar.'
          return
        case 'access_denied':
          status.value = 'denied'
          error.value = 'Se canceló la autorización desde GitHub.'
          return
        default:
          throw new Error(payload.error_description || payload.error || `HTTP ${response.status}`)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      status.value = 'error'
    }
  }

  return {
    isConfigured,
    token,
    status,
    userCode,
    verificationUri,
    error,
    isAuthenticated,
    isMockSession,
    startDeviceFlow,
    startMockSession,
    logout,
  }
}
