/**
 * Signed calls to Cloudinary's REST Admin API using native `fetch` + Basic
 * Auth (`base64(api_key:api_secret)`) — deliberately NOT the official
 * `cloudinary` Node SDK, which isn't compatible with the Workers runtime
 * (ADR-001 task brief). See ADR-002 §3 for the tags/context convention these
 * calls implement.
 */

import type { Env } from './types'

type CloudinaryEnv = Pick<Env, 'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET'>

const ADMIN_API_BASE = 'https://api.cloudinary.com/v1_1'

export class CloudinaryApiError extends Error {
  status: number
  constructor(status: number, detail: string) {
    super(`Cloudinary API error ${status}: ${detail}`)
    this.name = 'CloudinaryApiError'
    this.status = status
  }
}

function authHeader(env: CloudinaryEnv): string {
  return `Basic ${btoa(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`)}`
}

async function cloudinaryPost<T>(env: CloudinaryEnv, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${ADMIN_API_BASE}/${env.CLOUDINARY_CLOUD_NAME}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(env),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new CloudinaryApiError(response.status, detail.slice(0, 500))
  }
  return response.json<T>()
}

export interface CloudinaryResource {
  public_id: string
  secure_url: string
  created_at: string
  tags?: string[]
  /** Only present when the search request asks for `with_field: ['context']`. */
  context?: { custom?: Record<string, string> }
}

export interface SearchPendingResult {
  resources: CloudinaryResource[]
  next_cursor?: string
}

/**
 * Lists submissions tagged `moderation:pending` via the Search API
 * (ADR-001 §B). `with_field: ['context']` is required for Cloudinary to
 * include each resource's context (phrase_text, variant, etc.) — omitting it
 * would return only the default fields.
 */
export async function searchPending(
  env: CloudinaryEnv,
  cursor: string | null,
  maxResults: number,
): Promise<SearchPendingResult> {
  return cloudinaryPost<SearchPendingResult>(env, '/resources/search', {
    // The `:` inside our own tag value ("moderation:pending") collides with
    // Cloudinary's own `field:value` operator in its search expression
    // language — confirmed live: `tags=moderation:pending` (no quotes) fails
    // with "Query Error (at position 16) 'tags=moderation :pending'".
    // Quoting the value makes the inner colon literal instead of an operator.
    expression: 'tags:"moderation:pending"',
    max_results: maxResults,
    with_field: ['context', 'tags'],
    sort_by: [{ created_at: 'asc' }],
    ...(cursor ? { next_cursor: cursor } : {}),
  })
}

/**
 * Sets a resource's tags and context in one call, via the single-resource
 * "update" endpoint (`POST /resources/<resource_type>/<type>/<public_id>`).
 *
 * This replaces an earlier attempt at a "bulk tags"/"bulk context" endpoint
 * (`/resources/image/tags`, `/resources/image/context` with a `public_ids`
 * array) that turned out not to exist at all — confirmed live: it returned
 * Cloudinary's marketing-site 404 HTML page, not a JSON API error, meaning
 * the path itself was never a real endpoint. This one is confirmed against
 * Cloudinary's own official Python SDK source
 * (cloudinary/api.py's `update()`), which builds the exact same
 * `["resources", resource_type, type, public_id]` path and posts `tags`
 * (comma-joined) + `context` (pipe-encoded) as JSON body fields.
 *
 * Both `tags` and `context` here are the FULL desired final value, not an
 * incremental add/remove — the docs don't clearly state whether this
 * endpoint merges or replaces either field, so the caller (moderation.ts)
 * always reconstructs the complete set from the submission's existing data
 * plus the moderation outcome, making this correct either way.
 */
export async function updateResourceTagsAndContext(
  env: CloudinaryEnv,
  publicId: string,
  params: { tags: string[]; context: Record<string, string> },
): Promise<void> {
  const encodedContext = Object.entries(params.context)
    .map(([key, value]) => `${key}=${escapeContextValue(value)}`)
    .join('|')
  // publicId's own slashes (e.g. "marcha-5ta/submissions/<uuid>") are meant
  // to be literal path segments here, matching Cloudinary's own public_id
  // structure — not percent-encoded, unlike when the same string travels as
  // a single path segment elsewhere (worker/src/index.ts's route param).
  await cloudinaryPost(env, `/resources/image/upload/${publicId}`, {
    tags: params.tags.join(','),
    context: encodedContext,
  })
}

function escapeContextValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/=/g, '\\=')
}

/**
 * Obtiene las imágenes aprobadas con la etiqueta "mural-public" (Público, sin Auth)
 */
export async function searchPublicMural(
  env: CloudinaryEnv,
  cursor: string | null = null,
  maxResults = 50,
): Promise {
  return cloudinaryPost(env, '/resources/search', {
    expression: 'tags:"mural-public"',
    max_results: maxResults,
    with_field: ['context', 'tags'],
    sort_by: [{ created_at: 'desc' }],
    ...(cursor ? { next_cursor: cursor } : {}),
  })
}