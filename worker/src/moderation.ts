/**
 * ADR-001 §B: `/moderation/pending`, `/moderation/:public_id/approve` and
 * `/moderation/:public_id/reject`. Every route validates the caller's GitHub
 * bearer token first (github.ts) and only then talks to Cloudinary
 * (cloudinary.ts), per the tags/context convention fixed by ADR-002 §3.
 */

import type { Env } from './types'
import { jsonResponse, jsonError } from './http'
import { authorizeModerationCaller } from './github'
import { searchPending, updateResourceTagsAndContext, CloudinaryApiError } from './cloudinary'

const DEFAULT_MAX_RESULTS = 50

export async function listPending(request: Request, env: Env): Promise<Response> {
  const auth = await authorizeModerationCaller(request, env.GITHUB_REPO)
  if (!auth.ok) return jsonError(auth.status, auth.message)

  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')

  try {
    const result = await searchPending(env, cursor, DEFAULT_MAX_RESULTS)
    // Temporary diagnostic (remove once the empty-result mystery from
    // 2026-09-27 is confirmed/resolved): logs whether Cloudinary's Search
    // API genuinely matched nothing, vs. matched something our mapping
    // below then dropped.
    console.log('searchPending raw result:', JSON.stringify(result).slice(0, 1000))
    const items = result.resources.map((resource) => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      created_at: resource.created_at,
      // Cloudinary nests custom context under `context.custom`; flatten it
      // to the plain object the backoffice UI reads (SubmissionCard.vue).
      context: resource.context?.custom ?? {},
    }))
    return jsonResponse({ items, next_cursor: result.next_cursor ?? null })
  } catch (err) {
    return jsonError(502, cloudinaryErrorMessage(err, 'No se pudo listar los envíos pendientes en Cloudinary.'))
  }
}

export type ModerationAction = 'approve' | 'reject'

/**
 * Idempotent by construction: both branches always reconstruct the FULL
 * desired tag list and context from scratch (never an incremental
 * add/remove relative to whatever is already there — see
 * updateResourceTagsAndContext's own doc comment for why), so calling
 * approve or reject twice in a row on the same public_id converges to the
 * same end state regardless of what state it started from.
 *
 * @param submissionContext - the submission's context as already known by
 *   the caller from a prior `listPending` (phrase_id, phrase_text, variant,
 *   sticker_name, submitted_at, device_id, ...) — sent by the backoffice
 *   with the approve/reject request precisely so this function never has to
 *   guess or re-fetch it. Preserved as-is aside from the moderation fields
 *   this function itself overrides.
 */
export async function moderate(
  request: Request,
  env: Env,
  publicId: string,
  action: ModerationAction,
  submissionContext: Record<string, string>,
): Promise<Response> {
  const auth = await authorizeModerationCaller(request, env.GITHUB_REPO)
  if (!auth.ok) return jsonError(auth.status, auth.message)

  const status = action === 'approve' ? 'approved' : 'rejected'
  const variant = submissionContext.variant
  const tags = [
    'marcha-5ta',
    ...(variant ? [`variant:${variant}`] : []),
    `moderation:${status}`,
    // mural-public only ever appears for approved submissions (REQ-001:
    // rejected ones stay archived, never exposed on the public Mural, and
    // are never deleted).
    ...(action === 'approve' ? ['mural-public'] : []),
  ]
  const context = {
    ...submissionContext,
    status,
    moderated_at: new Date().toISOString(),
    moderated_by: auth.caller.login,
  }

  try {
    await updateResourceTagsAndContext(env, publicId, { tags, context })
    return jsonResponse({ ok: true, public_id: publicId, status })
  } catch (err) {
    const verb = action === 'approve' ? 'aprobar' : 'rechazar'
    return jsonError(502, cloudinaryErrorMessage(err, `No se pudo ${verb} el envío en Cloudinary.`))
  }
}

function cloudinaryErrorMessage(err: unknown, fallback: string): string {
  // The raw Cloudinary error body is logged server-side only (visible via
  // `wrangler tail` or the Cloudflare dashboard's Logs for this Worker) —
  // this correction replaces a stale comment that claimed index.ts's
  // top-level catch already did this; it doesn't, since these two callers
  // (listPending/moderate) catch the error themselves and never rethrow it.
  if (err instanceof CloudinaryApiError) {
    console.error('Cloudinary API error:', err.status, err.message)
    if (err.status === 404) {
      return 'El envío no existe en Cloudinary (public_id incorrecto o ya fue eliminado manualmente).'
    }
    if (err.status === 401 || err.status === 403) {
      return `${fallback} Cloudinary respondió ${err.status}: la API key/secret del Worker no tiene permiso suficiente (revisar el rol asignado a esa Access Key en Cloudinary).`
    }
    // Any other Cloudinary-side status: still safe to surface the bare
    // number (not the response body) so this is diagnosable without digging
    // through Worker logs for the common cases.
    return `${fallback} Cloudinary respondió HTTP ${err.status}.`
  }
  console.error('Unexpected error calling Cloudinary:', err)
  return fallback
}
