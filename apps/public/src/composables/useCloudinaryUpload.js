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
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

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
 * Unsigned upload to Cloudinary (ADR-001/ADR-002 §3): only `cloud_name` +
 * `upload_preset` are used, never the API Secret. Tags/context follow the
 * exact convention fixed by ADR-002.
 */
export function useCloudinaryUpload() {
  const isUploading = ref(false)
  const error = ref(null)

  const isConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET)

  /**
   * @param {object} params
   * @param {Blob} params.blob - composed JPEG (already watermarked/captioned).
   * @param {'selfie'|'alternative'} params.variant
   * @param {string} params.phraseId
   * @param {string} params.phraseText
   * @param {string} [params.stickerName]
   * @param {string} params.deviceId
   * @returns {Promise<{ publicId: string, submittedAt: string, response: object }>}
   */
  async function uploadSubmission({ blob, variant, phraseId, phraseText, stickerName, deviceId }) {
    if (!isConfigured) {
      throw new Error(
        'Cloudinary no está configurado (faltan VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET). Ver apps/public/.env.example.',
      )
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
        sticker_name: variant === 'alternative' ? stickerName : undefined,
        status: STATUS.PENDING,
        submitted_at: submittedAt,
        device_id: deviceId,
      })

      const formData = new FormData()
      formData.append('file', blob, `${uuid}.jpg`)
      formData.append('upload_preset', UPLOAD_PRESET)
      formData.append('public_id', publicId)
      formData.append('tags', tags)
      formData.append('context', context)

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
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
