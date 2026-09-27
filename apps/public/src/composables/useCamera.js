import { ref, shallowRef } from 'vue'

/**
 * Wraps device camera access for the capture flow (REQ-001): `getUserMedia`
 * as the primary path (front camera for selfie, back camera for the
 * "context photo" alternative), with a graceful fallback to
 * `<input type="file" accept="image/*" capture="...">` on devices/browsers
 * where `getUserMedia` isn't available — mobile browsers are the primary
 * target and some of them (older WebViews, some in-app browsers) only
 * support the capture-attribute input.
 *
 * @param {'user'|'environment'} facingMode - 'user' for selfie, 'environment' for the context photo.
 */
export function useCamera(facingMode) {
  const videoEl = shallowRef(null)
  const stream = shallowRef(null)
  const isStreaming = ref(false)
  const error = ref(null)

  const getUserMediaSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'

  /**
   * @param {HTMLVideoElement} videoElement - element to attach the live stream to.
   */
  async function start(videoElement) {
    error.value = null
    if (!getUserMediaSupported) {
      error.value = 'getUserMedia no disponible en este navegador'
      return false
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      })
      videoEl.value = videoElement
      stream.value = mediaStream
      videoElement.srcObject = mediaStream
      await videoElement.play()
      isStreaming.value = true
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      isStreaming.value = false
      return false
    }
  }

  function stop() {
    stream.value?.getTracks().forEach((track) => track.stop())
    stream.value = null
    isStreaming.value = false
  }

  /**
   * Snapshots the current video frame into an offscreen <canvas> (itself a
   * valid CanvasImageSource), decoupled from the live stream so the camera
   * can be released right after capture while the frame is still usable by
   * useCanvasComposition later in the flow (phrase selection happens after
   * capture, per REQ-001).
   * @returns {{ source: HTMLCanvasElement, width: number, height: number } | null}
   */
  function captureFrame() {
    if (!videoEl.value || !isStreaming.value) return null
    const width = videoEl.value.videoWidth
    const height = videoEl.value.videoHeight
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(videoEl.value, 0, 0, width, height)
    return { source: canvas, width, height }
  }

  /**
   * Fallback capture-attribute input accept value for this facing mode.
   */
  const fallbackCaptureAttr = facingMode === 'user' ? 'user' : 'environment'

  /**
   * Loads a File picked via the fallback <input type="file"> into an
   * HTMLImageElement, ready to be handed to useCanvasComposition.
   * @param {File} file
   * @returns {Promise<{ source: HTMLImageElement, width: number, height: number }>}
   */
  function loadFallbackFile(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('No se pudo leer la imagen seleccionada'))
      }
      img.src = objectUrl
    })
  }

  return {
    getUserMediaSupported,
    isStreaming,
    error,
    fallbackCaptureAttr,
    start,
    stop,
    captureFrame,
    loadFallbackFile,
  }
}
