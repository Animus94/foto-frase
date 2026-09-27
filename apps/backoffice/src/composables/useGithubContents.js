const REPO = import.meta.env.VITE_GITHUB_REPO
const API_BASE = 'https://api.github.com'

function decodeBase64Utf8(base64) {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

/**
 * Thin client for the GitHub Contents API
 * (`GET/PUT /repos/{owner}/{repo}/contents/{path}`), used to read and write
 * `data/phrases.json` and `data/campaign.json` as git-as-backend config
 * (ADR-002). Called directly from the browser straight to api.github.com
 * — which supports CORS with a Bearer token, unlike the device-flow
 * endpoints — never through the Worker, which only handles OAuth
 * forwarding and Cloudinary moderation (ADR-001 §A, last bullet).
 *
 * @param {import('vue').Ref<string|null>} token - GitHub access token ref (sessionStorage-backed, see useGithubDeviceAuth).
 */
export function useGithubContents(token) {
  const isConfigured = Boolean(REPO)

  function authHeaders() {
    return {
      Authorization: `Bearer ${token.value}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  async function handleResponse(response, action) {
    if (response.status === 401 || response.status === 403) {
      const err = new Error(`No autorizado (HTTP ${response.status}) al ${action}.`)
      err.code = 'UNAUTHORIZED'
      throw err
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.message || `Error HTTP ${response.status} al ${action}.`)
    }
    return response.json()
  }

  /**
   * @param {string} path e.g. "data/phrases.json"
   * @returns {Promise<{ data: any, sha: string }>}
   */
  async function getJsonFile(path) {
    const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
      headers: authHeaders(),
      cache: 'no-cache',
    })
    const payload = await handleResponse(response, `leer ${path}`)
    const decoded = decodeBase64Utf8(payload.content)
    return { data: JSON.parse(decoded), sha: payload.sha }
  }

  /**
   * @param {string} path
   * @param {any} data - plain JS object, serialized with 2-space indent.
   * @param {string} sha - sha of the file version being replaced (required by the Contents API for updates).
   * @param {string} message - commit message.
   * @returns {Promise<{ sha: string }>} the new file sha, to keep editing without re-fetching.
   */
  async function putJsonFile(path, data, sha, message) {
    const content = encodeBase64Utf8(`${JSON.stringify(data, null, 2)}\n`)
    const response = await fetch(`${API_BASE}/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha }),
    })
    const payload = await handleResponse(response, `guardar ${path}`)
    return { sha: payload.content.sha }
  }

  return { isConfigured, getJsonFile, putJsonFile }
}
