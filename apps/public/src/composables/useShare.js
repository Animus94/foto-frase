import { ref } from 'vue'

/**
 * Native share (Web Share API) with a copy-to-clipboard fallback (REQ-002
 * §7). Reused by both the CaptureFlow "done" step (share the Mural after
 * submitting) and the Mural view's own CTA, so the share-vs-copy decision
 * and its user-facing feedback message live in one place.
 */
export function useShare() {
  const isSharing = ref(false)
  const feedback = ref(null) // e.g. "Link copiado" — transient success message
  const error = ref(null)

  /**
   * @param {object} params
   * @param {string} params.url - absolute URL to share.
   * @param {string} [params.title]
   * @param {string} [params.text]
   */
  async function share({ url, title, text }) {
    isSharing.value = true
    feedback.value = null
    error.value = null
    try {
      if (navigator.share) {
        await navigator.share({ url, title, text })
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        feedback.value = 'Link copiado'
        return
      }
      throw new Error('Este navegador no permite compartir ni copiar el link automáticamente.')
    } catch (err) {
      // The user simply dismissing the native share sheet isn't an error.
      if (err instanceof Error && err.name === 'AbortError') return
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      isSharing.value = false
    }
  }

  return { share, isSharing, feedback, error }
}
