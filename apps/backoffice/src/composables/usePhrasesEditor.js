import { ref } from 'vue'
import { useGithubDeviceAuth, MOCK_TOKEN } from './useGithubDeviceAuth.js'
import { useGithubContents } from './useGithubContents.js'

const PATH = 'data/phrases.json'

/**
 * Slugifies a label into a stable id candidate ("Con mi comisión" ->
 * "con-mi-comision"). Only a starting suggestion — the admin can edit it
 * before adding (ADR-002 §1: the id is a stable slug, never reused/renamed
 * once published, so it's worth letting a human review it once).
 * @param {string} label
 */
export function slugify(label) {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildMockPhrases() {
  return {
    version: 1,
    prefix: 'Yo voy a la Marcha...',
    options: [
      { id: 'familia', label: 'Con mi familia', active: true },
      { id: 'amigos', label: 'Con mis amigos/as', active: true },
      { id: 'companeros', label: 'Con mis compañeros/as', active: true },
      { id: 'comision', label: 'Con mi comisión', active: true },
      { id: 'hijos', label: 'Con mis hijos', active: true },
      { id: 'mock-retirada', label: '(mock) Opción ya retirada', active: false },
    ],
  }
}

/**
 * Editor for `data/phrases.json` (ADR-002 §1): git-as-backend config read
 * and written via the GitHub Contents API. Retiring an option only ever
 * flips `active: false` (soft-disable) — it is never removed from the
 * array, to avoid breaking traceability of past submissions that reference
 * its `id`.
 *
 * @param {object} [options]
 * @param {boolean} [options.allowMock] - dev-only; see useGithubDeviceAuth's MOCK_TOKEN.
 */
export function usePhrasesEditor(options = {}) {
  const { allowMock = false } = options
  const { token } = useGithubDeviceAuth()
  const github = useGithubContents(token)

  const prefix = ref('')
  const phraseOptions = ref([])
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
        const mock = buildMockPhrases()
        prefix.value = mock.prefix
        phraseOptions.value = mock.options
        sha.value = 'mock-sha'
        return
      }
      if (!github.isConfigured) {
        error.value = 'Falta VITE_GITHUB_REPO en la configuración (ver .env.example).'
        return
      }
      const { data, sha: currentSha } = await github.getJsonFile(PATH)
      prefix.value = data.prefix ?? ''
      phraseOptions.value = data.options ?? []
      sha.value = currentSha
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * @param {string} id - slug, must be unique among existing options (case-insensitive).
   * @param {string} label
   * @returns {{ ok: boolean, error?: string }}
   */
  function addOption(id, label) {
    const trimmedId = id.trim()
    const trimmedLabel = label.trim()
    if (!trimmedId || !trimmedLabel) {
      return { ok: false, error: 'El id y el texto de la opción son obligatorios.' }
    }
    const collides = phraseOptions.value.some(
      (option) => option.id.toLowerCase() === trimmedId.toLowerCase(),
    )
    if (collides) {
      return { ok: false, error: `Ya existe una opción con id "${trimmedId}".` }
    }
    phraseOptions.value.push({ id: trimmedId, label: trimmedLabel, active: true })
    return { ok: true }
  }

  function setActive(id, active) {
    const option = phraseOptions.value.find((item) => item.id === id)
    if (option) option.active = active
  }

  function updateLabel(id, label) {
    const option = phraseOptions.value.find((item) => item.id === id)
    if (option) option.label = label
  }

  function moveOptionUp(id) {
    const index = phraseOptions.value.findIndex(item => item.id === id)
    if (index > 0) {
      const temp = phraseOptions.value[index]
      phraseOptions.value[index] = phraseOptions.value[index - 1]
      phraseOptions.value[index - 1] = temp
    }
  }

  function moveOptionDown(id) {
    const index = phraseOptions.value.findIndex(item => item.id === id)
    if (index > -1 && index < phraseOptions.value.length - 1) {
      const temp = phraseOptions.value[index]
      phraseOptions.value[index] = phraseOptions.value[index + 1]
      phraseOptions.value[index + 1] = temp
    }
  }

  
  function addMarco(phraseId, url, label, config = null) {
    const option = phraseOptions.value.find((item) => item.id === phraseId)
    if (!option) return
    if (!option.marcos) option.marcos = []
    
    option.marcos.push({
      id: "marco-" + Date.now(),
      url,
      label,
      config: config || {
         phrase: { x: 50, y: 15, color: '#facc15', font: 'Montserrat', fontSize: 24, width: 300 },
         name: { x: 50, y: 80, textColor: '#ffffff', bgColor: '#022c22', font: 'Montserrat', fontSize: 16 }
      }
    })
  }

  function removeMarco(phraseId, marcoId) {
    const option = phraseOptions.value.find((item) => item.id === phraseId)
    if (!option || !option.marcos) return
    option.marcos = option.marcos.filter((m) => m.id !== marcoId)
  }

  function updateMarcoConfig(phraseId, marcoId, newConfig) {
     const option = phraseOptions.value.find((item) => item.id === phraseId)
     if (!option || !option.marcos) return
     const marco = option.marcos.find((m) => m.id === marcoId)
     if (marco) marco.config = newConfig
  }

  function updateMarcoLabel(phraseId, marcoId, newLabel) {
     const option = phraseOptions.value.find((item) => item.id === phraseId)
     if (!option || !option.marcos) return
     const marco = option.marcos.find((m) => m.id === marcoId)
     if (marco) marco.label = newLabel
  }

  function updatePrefix(text) {
    prefix.value = text
  }

  /**
   * @param {string} commitMessage
   * @returns {Promise<boolean>} whether the save succeeded.
   */
  async function save(commitMessage) {
    saving.value = true
    error.value = null
    try {
      const payload = { version: 1, prefix: prefix.value, options: phraseOptions.value }
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
    prefix,
    options: phraseOptions,
    loading,
    saving,
    error,
    load,
    addOption,
    setActive,
    updateLabel,
    addMarco,
    removeMarco,
    updateMarcoConfig,
    updateMarcoLabel,
    updatePrefix,
    save,
    moveOptionUp,
    moveOptionDown,
  }
}

