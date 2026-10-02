import { ref } from 'vue'
import { useGithubDeviceAuth } from './useGithubDeviceAuth.js'

export function useAdminCloudinaryUpload() {
  const { token } = useGithubDeviceAuth()
  const error = ref(null)
  const uploading = ref(false)

  async function uploadFrame(file) {
    uploading.value = true
    error.value = null
    try {
      const WORKER_BASE_URL = import.meta.env.VITE_WORKER_BASE_URL
      if (!WORKER_BASE_URL) throw new Error("Falta configuracion VITE_WORKER_BASE_URL")

      // 1. Get signature from worker
      const signRes = await fetch(\\/upload/admin/sign\, {
        method: 'POST',
        headers: { 'Authorization': \Bearer \\ }
      })
      if (!signRes.ok) {
        throw new Error('No autorizado para subir marcos.')
      }
      const signatureData = await signRes.json()

      // 2. Upload to Cloudinary directly
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signatureData.apiKey)
      formData.append('timestamp', signatureData.timestamp)
      formData.append('signature', signatureData.signature)
      formData.append('public_id', signatureData.publicId)
      formData.append('tags', signatureData.tags)
      formData.append('folder', signatureData.folder)

      const uploadRes = await fetch(\https://api.cloudinary.com/v1_1/\/image/upload\, {
        method: 'POST',
        body: formData
      })
      if (!uploadRes.ok) {
        throw new Error('Error al subir la imagen a Cloudinary')
      }
      
      const uploadData = await uploadRes.json()
      return uploadData.secure_url
    } catch (err) {
      error.value = err.message
      return null
    } finally {
      uploading.value = false
    }
  }

  return { uploadFrame, uploading, error }
}
