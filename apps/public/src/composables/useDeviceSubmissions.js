import { ref, computed } from 'vue'
import { generateUuidV4 } from '@/utils/uuid.js'

const DEVICE_ID_KEY = 'ff:mural:device_id'
const SUBMISSIONS_KEY = 'ff:mural:submissions:v1'

/**
 * Reads the persistent per-device id, generating and storing one on first
 * use. ADR-002 §5: localStorage (not sessionStorage) so it survives between
 * sessions on the same browser/device.
 * @returns {string}
 */
function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const created = generateUuidV4()
    localStorage.setItem(DEVICE_ID_KEY, created)
    return created
  } catch {
    // localStorage unavailable (private mode edge cases, storage disabled):
    // degrade to a session-only id rather than crashing the capture flow.
    return generateUuidV4()
  }
}

function readSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSubmissions(submissions) {
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions))
  } catch {
    // Best-effort persistence only (ADR-002 §5); if storage is full/blocked
    // we simply can't remember past submissions across reloads.
  }
}

/**
 * Client-side, best-effort enforcement of the per-device submission limit
 * (REQ-001 / ADR-002 §5). Must be checked BEFORE attempting the Cloudinary
 * upload, never relying on a server to reject the 5th submission.
 */
export function useDeviceSubmissions() {
  const deviceId = ref(getOrCreateDeviceId())
  const submissions = ref(readSubmissions())

  const count = computed(() => submissions.value.length)

  /**
   * @param {number} maxSubmissionsPerDevice
   */
  function canSubmit(maxSubmissionsPerDevice) {
    return count.value < maxSubmissionsPerDevice
  }

  /**
   * @param {{ public_id: string, submitted_at: string }} entry
   */
  function recordSubmission(entry) {
    const next = [...submissions.value, entry]
    submissions.value = next
    writeSubmissions(next)
  }

  return { deviceId, submissions, count, canSubmit, recordSubmission }
}
