/**
 * Generates a UUID v4.
 *
 * Uses the native `crypto.randomUUID` when available (all modern mobile
 * browsers over HTTPS, which is what GitHub Pages + this PWA always run
 * under). Falls back to a `Math.random`-based implementation only for
 * environments where that API is missing (e.g. very old WebViews) — good
 * enough here since this id is not a security boundary, just a namespacing
 * key for device/session tracking and Cloudinary public_ids.
 * @returns {string}
 */
export function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
