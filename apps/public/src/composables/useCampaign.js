import { ref, computed } from 'vue'

/**
 * Loads data/campaign.json (ADR-002 §2) and exposes the campaign parameters
 * plus a client-side, best-effort check of whether new submissions are
 * still accepted (REQ-001: no new submissions after submissionsCloseAt, but
 * the Mural itself stays visible).
 */
export function useCampaign() {
  const submissionsCloseAt = ref(null)
  const maxSubmissionsPerDevice = ref(4)
  const gridPageSize = ref(100)
  const loading = ref(false)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/campaign.json`, {
        cache: 'no-cache',
      })
      if (!response.ok) {
        throw new Error(`No se pudo cargar campaign.json (HTTP ${response.status})`)
      }
      /** @type {import('@foto-frase/shared').CampaignConfig} */
      const config = await response.json()
      submissionsCloseAt.value = config.submissionsCloseAt ?? null
      maxSubmissionsPerDevice.value = config.maxSubmissionsPerDevice ?? 4
      gridPageSize.value = config.gridPageSize ?? 100
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  // Best-effort only (ADR-002 §5): comparable to the device clock, evadible
  // like any client-side check. Not a security control.
  const isClosed = computed(() => {
    if (!submissionsCloseAt.value) return false
    return Date.now() > new Date(submissionsCloseAt.value).getTime()
  })

  return {
    submissionsCloseAt,
    maxSubmissionsPerDevice,
    gridPageSize,
    loading,
    error,
    isClosed,
    load,
  }
}
