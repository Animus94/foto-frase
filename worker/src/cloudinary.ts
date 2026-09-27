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
 * Adds or removes one or more tags on a single resource. `tag` may be a
 * comma-separated list (Cloudinary supports assigning/removing several tags
 * in one call this way). Both add and remove are idempotent on Cloudinary's
 * side: adding a tag the resource already has, or removing one it doesn't
 * have, is a no-op rather than an error — which is what lets `approve`/
 * `reject` be called twice in a row safely (ADR-001 QA notes).
 */
export async function setTags(
  env: CloudinaryEnv,
  publicId: string,
  tag: string,
  command: 'add' | 'remove',
): Promise<void> {
  await cloudinaryPost(env, '/resources/image/tags', {
    public_ids: [publicId],
    tag,
    command,
  })
}

/**
 * Merges (`command: "add"`) the given key/value pairs into the resource's
 * context. Values are escaped per Cloudinary's context string format
 * (pipe-separated pairs, `=` inside a pair — a literal `\`, `|` or `=` in a
 * value must be backslash-escaped or it would corrupt the encoding).
 */
export async function setContext(env: CloudinaryEnv, publicId: string, context: Record<string, string>): Promise<void> {
  const encoded = Object.entries(context)
    .map(([key, value]) => `${key}=${escapeContextValue(value)}`)
    .join('|')
  await cloudinaryPost(env, '/resources/image/context', {
    public_ids: [publicId],
    context: encoded,
    command: 'add',
  })
}

function escapeContextValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/=/g, '\\=')
}
