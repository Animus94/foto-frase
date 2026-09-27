import { ref } from 'vue'
import {
  CAMPAIGN_TAG,
  MODERATION_TAG,
  VARIANT_TAG,
  STATUS,
  buildPublicId,
} from '@foto-frase/shared'
import { generateUuidV4 } from '@/utils/uuid.js'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL

/**
 * Escapes '=' and '|' inside a Cloudinary context value, per Cloudinary's
 * `context` upload parameter syntax (`key=value|key2=value2`).
 * @param {string} value
 */
function escapeContextValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/\|/g, '\\|')
}

/**
 * @param {Record<string, string | undefined>} context
 */
function serializeContext(context) {
  return Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${escapeContextValue(value)}`)
    .join('|')
}

/**
 * Reads the Worker's `{ error: "<message>" }` envelope (worker/src/http.ts's
 * jsonError) — same pattern as apps/backoffice's useModerationApi.js.
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

/**
 * Signed upload to Cloudinary (ADR-004 — replaces the earlier unsigned
 * upload-preset flow, which let anyone who inspected the public bundle
 * upload directly to Cloudinary). The public app now depends on the Worker
 * to be able to upload at all: it asks `${VITE_WORKER_BASE_URL}/upload/sign`
 * for a per-upload signature — gated by a completed Cloudflare Turnstile
 * challenge (ConsentStep.vue) — before ever talking to Cloudinary. If the
 * Worker is unreachable or misconfigured, uploads simply cannot happen; the
 * rest of the app (Mural, phrase picking, etc.) is unaffected (ADR-004
 * "Impacto"). Tags/context still follow the exact convention fixed by
 * ADR-002 §3 — only *how* the upload gets authorized changed, not what gets
 * stored.
 */
export function useCloudinaryUpload() {
  const isUploading = ref(false)
  const error = ref(null)

  const isConfigured = Boolean(CLOUD_NAME && WORKER_BASE_URL)

  /**
   * @param {object} params
   * @param {Blob} params.blob - composed JPEG (already watermarked/captioned).
   * @param {'selfie'|'alternative'} params.variant
   * @param {string} params.phraseId
   * @param {string} params.phraseText
   * @param {string} [params.stickerName]
   * @param {string} params.deviceId
   * @param {string} params.turnstileToken - completed Cloudflare Turnstile
   *   challenge token (ConsentStep.vue / useTurnstile.js). Single-use: the
   *   Worker rejects a reused or expired one.
   * @returns {Promise<{ publicId: string, submittedAt: string, response: object }>}
   */
  async function uploadSubmission({ blob, variant, phraseId, phraseText, stickerName, deviceId, turnstileToken }) {
    if (!isConfigured) {
      throw new Error(
        'La subida no está disponible: falta VITE_CLOUDINARY_CLOUD_NAME y/o VITE_WORKER_BASE_URL en la configuración (ver apps/public/.env.example). Sin el Worker, esta app no puede firmar ni enviar ninguna foto nueva.',
      )
    }
    if (!turnstileToken) {
      throw new Error('Falta completar la verificación anti-bot (Cloudflare Turnstile) antes de enviar.')
    }

    isUploading.value = true
    error.value = null
    try {
      const uuid = generateUuidV4()
      const publicId = buildPublicId(uuid)
      const submittedAt = new Date().toISOString()

      const tags = [CAMPAIGN_TAG, MODERATION_TAG.PENDING, VARIANT_TAG[variant.toUpperCase()]].join(',')

      const context = serializeContext({
        phrase_id: phraseId,
        phrase_text: phraseText,
        variant,
        // REQ-002 §1/§2: the name-sticker is now drawn on both variants, so
        // the Cloudinary context/moderation UI reflects it for both too —
        // no longer just 'alternative' (ADR-002 §3's original schema note).
        sticker_name: stickerName || undefined,
        status: STATUS.PENDING,
        submitted_at: submittedAt,
        device_id: deviceId,
      })

      // ADR-004: ask the Worker to validate the Turnstile token and sign
      // these EXACT same public_id/tags/context strings. Cloudinary
      // recomputes the signature over whatever it actually receives in the
      // upload POST below, so nothing here can be tweaked after signing
      // without invalidating it (see worker/src/uploadSign.ts).
      let signResponse
      try {
        signResponse = await fetch(`${WORKER_BASE_URL}/upload/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ turnstileToken, publicId, tags, context }),
        })
      } catch {
        throw new Error(
          'No se pudo contactar al Worker para firmar la subida. Esta app depende del Worker para poder enviar fotos nuevas — revisá tu conexión e intentá de nuevo en unos minutos.',
        )
      }

      if (signResponse.status === 403) {
        throw new Error(
          await readWorkerErrorMessage(
            signResponse,
            'Verificación anti-bot inválida o expirada. Volvé a completar el desafío e intentá de nuevo.',
          ),
        )
      }
      if (!signResponse.ok) {
        throw new Error(
          await readWorkerErrorMessage(
            signResponse,
            `El Worker no pudo firmar la subida (HTTP ${signResponse.status}). Intentá de nuevo en unos minutos.`,
          ),
        )
      }

      const { signature, timestamp, apiKey, cloudName } = await signResponse.json()

      const formData = new FormData()
      formData.append('file', blob, `${uuid}.jpg`)
      formData.append('public_id', publicId)
      formData.append('tags', tags)
      formData.append('context', context)
      formData.append('timestamp', String(timestamp))
      formData.append('api_key', apiKey)
      formData.append('signature', signature)

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName || CLOUD_NAME}/image/upload`
      const response = await fetch(endpoint, { method: 'POST', body: formData })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error?.message ?? `Upload falló (HTTP ${response.status})`
        throw new Error(message)
      }

      return { publicId, submittedAt, response: payload }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      isUploading.value = false
    }
  }

  return { isConfigured, isUploading, error, uploadSubmission }
}
