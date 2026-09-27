import { ref } from 'vue'

/**
 * Loads data/phrases.json (git-as-backend config, ADR-002 §1) and exposes the
 * active phrase options plus a helper to resolve the full "prefix + label"
 * text that gets baked into the composed image and stored as
 * context.phrase_text on Cloudinary.
 */
export function usePhrases() {
  const prefix = ref('')
  const options = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/phrases.json`, {
        cache: 'no-cache',
      })
      if (!response.ok) {
        throw new Error(`No se pudo cargar phrases.json (HTTP ${response.status})`)
      }
      /** @type {import('@foto-frase/shared').PhrasesConfig} */
      const config = await response.json()
      prefix.value = config.prefix ?? ''
      // Only active options are presentable; the array order is the display
      // order (ADR-002 §1).
      options.value = (config.options ?? []).filter((option) => option.active)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Resolves the full sentence for a given phrase id, e.g.
   * "Yo voy a la Marcha... Con mi familia". Returns null if the id is
   * unknown or inactive.
   * @param {string} phraseId
   */
  function resolvePhraseText(phraseId) {
    const option = options.value.find((item) => item.id === phraseId)
    if (!option) return null
    return `${prefix.value} ${option.label}`
  }

  return { prefix, options, loading, error, load, resolvePhraseText }
}
