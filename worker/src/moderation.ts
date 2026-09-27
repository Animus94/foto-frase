/**
 * ADR-001 §B: `/moderation/pending`, `/moderation/:public_id/approve` and
 * `/moderation/:public_id/reject`. Every route validates the caller's GitHub
 * bearer token first (github.ts) and only then talks to Cloudinary
 * (cloudinary.ts), per the tags/context convention fixed by ADR-002 §3.
 */

import type { Env } from './types'
import { jsonResponse, jsonError } from './http'
import { authorizeModerationCaller } from './github'
import { searchPending, setTags, setContext, CloudinaryApiError } from './cloudinary'

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
 * Both branches are idempotent: removing/adding a tag the resource already
 * doesn't/does have is a no-op on Cloudinary's side (see cloudinary.ts), so
 * calling approve or reject twice in a row on the same public_id converges
 * to the same end state without error or duplicate tags.
 */
export async function moderate(request: Request, env: Env, publicId: string, action: ModerationAction): Promise<Response> {
  const auth = await authorizeModerationCaller(request, env.GITHUB_REPO)
  if (!auth.ok) return jsonError(auth.status, auth.message)

  const moderatedAt = new Date().toISOString()
  const moderatedBy = auth.caller.login

  try {
    await setTags(env, publicId, 'moderation:pending', 'remove')
    if (action === 'approve') {
      // Single call: Cloudinary accepts a comma-separated tag list.
      await setTags(env, publicId, 'moderation:approved,mural-public', 'add')
    } else {
      await setTags(env, publicId, 'moderation:rejected', 'add')
      // Never adds mural-public (REQ-001: rejected submissions stay archived,
      // never exposed on the public Mural, and are never deleted).
    }
    await setContext(env, publicId, {
      status: action === 'approve' ? 'approved' : 'rejected',
      moderated_at: moderatedAt,
      moderated_by: moderatedBy,
    })
    return jsonResponse({ ok: true, public_id: publicId, status: action === 'approve' ? 'approved' : 'rejected' })
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
