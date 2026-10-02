import { ref } from 'vue'
import { useGithubDeviceAuth, MOCK_TOKEN } from './useGithubDeviceAuth.js'
import { useGithubContents } from './useGithubContents.js'

const PATH = 'data/campaign.json'

function buildMockCampaign() {
  return {
    version: 1,
    submissionsCloseAt: '2026-10-15T23:59:59-03:00',
    maxSubmissionsPerDevice: 4,
    gridPageSize: 100,
  }
}

/**
 * Converts an ISO 8601 instant into the local-time string
 * `<input type="datetime-local">` expects ("YYYY-MM-DDTHH:mm"). The input
 * has no timezone of its own — it's always interpreted in the browser's
 * local time — so this only needs to represent the same instant, not
 * preserve the original UTC offset literally.
 * @param {string|null} iso
 */
export function isoToDatetimeLocal(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Inverse of isoToDatetimeLocal: takes the raw value of a datetime-local
 * input (interpreted by `Date` as local time) and returns an ISO 8601
 * string. Note this comes back with a `Z`/UTC offset rather than the
 * browser's local offset literal — that's fine, it represents the exact
 * same instant, which is all `submissionsCloseAt` is compared against
 * (ADR-002 §5: `Date.now() > new Date(submissionsCloseAt).getTime()`).
 * @param {string} value
 */
export function datetimeLocalToIso(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Editor for `data/campaign.json` (ADR-002 §2): git-as-backend config read
 * and written via the GitHub Contents API, same mechanism as
 * usePhrasesEditor.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowMock] - dev-only; see useGithubDeviceAuth's MOCK_TOKEN.
 */
export function useCampaignEditor(options = {}) {
  const { allowMock = false } = options
  const { token } = useGithubDeviceAuth()
  const github = useGithubContents(token)

  const submissionsCloseAt = ref('')
  const maxSubmissionsPerDevice = ref(4)
  const gridPageSize = ref(100)
  const marcos = ref([])
  const sha = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  function isMockSession() {
    return allowMock && import.meta.env.DEV && token.value === MOCK_TOKEN
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      if (isMockSession()) {
        const mock = buildMockCampaign()
        submissionsCloseAt.value = mock.submissionsCloseAt
        maxSubmissionsPerDevice.value = mock.maxSubmissionsPerDevice
        gridPageSize.value = mock.gridPageSize
        sha.value = 'mock-sha'
        return
      }
      if (!github.isConfigured) {
        error.value = 'Falta VITE_GITHUB_REPO en la configuración (ver .env.example).'
        return
      }
      const { data, sha: currentSha } = await github.getJsonFile(PATH)
      submissionsCloseAt.value = data.submissionsCloseAt ?? ''
      maxSubmissionsPerDevice.value = data.maxSubmissionsPerDevice ?? 4
      gridPageSize.value = data.gridPageSize ?? 100
      marcos.value = data.marcos ?? []
      sha.value = currentSha
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * @param {string} commitMessage
   * @returns {Promise<boolean>}
   */
  async function save(commitMessage) {
    saving.value = true
    error.value = null
    try {
      const payload = {
        version: 1,
        submissionsCloseAt: submissionsCloseAt.value,
        maxSubmissionsPerDevice: Number(maxSubmissionsPerDevice.value),
        gridPageSize: Number(gridPageSize.value),
        marcos: marcos.value,
      }
      if (isMockSession()) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        sha.value = `mock-sha-${Date.now()}`
        return true
      }
      if (!github.isConfigured) {
        error.value = 'Falta VITE_GITHUB_REPO en la configuración (ver .env.example).'
        return false
      }
      const { sha: newSha } = await github.putJsonFile(PATH, payload, sha.value, commitMessage)
      sha.value = newSha
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    submissionsCloseAt,
    maxSubmissionsPerDevice,
    gridPageSize,
    marcos,
    loading,
    saving,
    error,
    load,
    save,
  }
}
