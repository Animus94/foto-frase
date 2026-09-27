import { ref, computed } from 'vue'
import { MURAL_PUBLIC_TAG } from '@foto-frase/shared'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CACHE_KEY = 'ff:mural:listing-cache:v1'
const CACHE_TTL_MS = 60 * 1000

/**
 * A handful of fixture resources, shaped like Cloudinary's
 * `image/list/<tag>.json` response, so the Mural view is developable/
 * demoable before a real Cloudinary account + `mural-public` tagged assets
 * exist. Only used in dev builds when explicitly requested (see
 * `useMuralListing({ allowMock: true })`) — never shipped as the default
 * behavior of a production build.
 */
function buildMockResources(count = 12) {
  return Array.from({ length: count }, (_, index) => ({
    public_id: `marcha-5ta/submissions/mock-${index + 1}`,
    format: 'jpg',
    version: 1000 + index,
    created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
    width: 1200,
    height: 1600,
    url: `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
    secure_url: `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
  }))
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.cachedAt !== 'number') return null
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null
    return parsed.resources
  } catch {
    return null
  }
}

function writeCache(resources) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), resources }))
  } catch {
    // sessionStorage unavailable — just skip caching, every navigation
    // refetches instead of failing.
  }
}

/**
 * Cloudinary's unsigned `image/list/<tag>.json` endpoint (unlike the signed
 * Admin/Search APIs) returns only `public_id`/`version`/`format` per
 * resource — no ready-made `url`/`secure_url` — confirmed live: the actual
 * response never had those fields, which is why every image in the Mural
 * rendered broken (the components read `resource.secure_url ?? resource.url`,
 * always `undefined` here). Builds the standard delivery URL ourselves
 * instead. The `v<version>` segment isn't optional to include — without it,
 * a re-uploaded/updated asset could serve a stale CDN-cached copy under the
 * same public_id.
 */
function buildSecureUrl(resource) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${resource.version}/${resource.public_id}.${resource.format}`
}

/**
 * Deterministic order for the grid/carousel: newest first by created_at,
 * with public_id as a stable tiebreaker (ADR-002 §6).
 */
function sortResources(resources) {
  return [...resources].sort((a, b) => {
    const byDate = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (byDate !== 0) return byDate
    return a.public_id.localeCompare(b.public_id)
  })
}

/**
 * Fetches the unsigned public resource list for the Mural (ADR-002 §6):
 * `GET https://res.cloudinary.com/<cloud_name>/image/list/mural-public.json`
 * — no API Secret involved, safe to call directly from GitHub Pages.
 * Cached in sessionStorage for ~60s so scrolling/paginating within a
 * session doesn't refetch. The carousel and the paginated grid both read
 * the same `resources` list.
 *
 * @param {object} [options]
 * @param {number} [options.gridPageSize]
 * @param {boolean} [options.allowMock] - dev/testing only; see buildMockResources.
 */
export function useMuralListing(options = {}) {
  const { gridPageSize = 100, allowMock = false } = options

  const resources = ref([])
  const loading = ref(false)
  const error = ref(null)
  const page = ref(1)

  const isConfigured = Boolean(CLOUD_NAME)

  async function load(force = false) {
    if (!force) {
      const cached = readCache()
      if (cached) {
        resources.value = cached
        return
      }
    }

    if (!isConfigured) {
      if (allowMock && import.meta.env.DEV) {
        resources.value = sortResources(buildMockResources())
        return
      }
      error.value =
        'Cloudinary no está configurado (falta VITE_CLOUDINARY_CLOUD_NAME). Ver apps/public/.env.example.'
      return
    }

    loading.value = true
    error.value = null
    try {
      const endpoint = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${MURAL_PUBLIC_TAG}.json`
      const response = await fetch(endpoint, { cache: 'no-cache' })
      // Cloudinary's unsigned tag-list endpoint returns 404 (not 200 with an
      // empty array) when a tag has zero resources — verified directly
      // against the live account. That's the normal, expected state before
      // any submission has been approved, not a real error: treat it as an
      // empty Mural instead of surfacing a scary error message.
      if (response.status === 404) {
        resources.value = []
        writeCache([])
        return
      }
      if (!response.ok) {
        throw new Error(`No se pudo cargar el Mural (HTTP ${response.status})`)
      }
      const payload = await response.json()
      const withUrls = (payload.resources ?? []).map((resource) => ({
        ...resource,
        secure_url: resource.secure_url ?? buildSecureUrl(resource),
      }))
      const sorted = sortResources(withUrls)
      resources.value = sorted
      writeCache(sorted)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  const totalPages = computed(() => Math.max(1, Math.ceil(resources.value.length / gridPageSize)))

  const pageItems = computed(() => {
    const start = (page.value - 1) * gridPageSize
    return resources.value.slice(start, start + gridPageSize)
  })

  function setPage(nextPage) {
    page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  }

  return {
    isConfigured,
    resources,
    loading,
    error,
    page,
    totalPages,
    pageItems,
    setPage,
    load,
  }
}
