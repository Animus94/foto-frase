/**
 * Router for the foto-frase Cloudflare Worker (ADR-001/ADR-004). Six routes total:
 *   POST /gh/device/code          — oauthProxy.ts, no secret
 *   POST /gh/oauth/token          — oauthProxy.ts, no secret
 *   GET  /moderation/pending      — moderation.ts, signed Cloudinary Search
 *   POST /moderation/:id/approve  — moderation.ts, signed Cloudinary tags/context
 *   POST /moderation/:id/reject   — moderation.ts, signed Cloudinary tags/context
 *   POST /upload/sign             — uploadSign.ts, Turnstile-gated (ADR-004),
 *                                    NOT behind authorizeModerationCaller —
 *                                    any public visitor may call this one.
 * Anything else is a clean 404; unhandled exceptions become a generic 500 —
 * the client never sees a raw stack trace or upstream error body.
 */

import type { Env } from './types'
import { corsHeaders, withCors, jsonError, jsonResponse } from './http'
import { forwardDeviceCode, forwardAccessToken } from './oauthProxy'
import { listPending, moderate } from './moderation'
import { signUpload } from './uploadSign'
import { searchPublicMural } from './cloudinary'

const MODERATION_ACTION_PATTERN = /^\/moderation\/([^/]+)\/(approve|reject)$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) })
    }

    try {

      // Nueva ruta pública para tu frontend en GitHub Pages
      if ((pathname === '/' || pathname === '/murales') && request.method === 'GET') {
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        const result = await searchPublicMural(env, cursor)
        
        return withCors(jsonResponse({
          resources: result.resources,
          next_cursor: result.next_cursor ?? null
        }), env, request)
      }

      if (pathname === '/gh/device/code' && request.method === 'POST') {
        return withCors(await forwardDeviceCode(request), env, request)
      }

      if (pathname === '/gh/oauth/token' && request.method === 'POST') {
        return withCors(await forwardAccessToken(request), env, request)
      }

      if (pathname === '/moderation/pending' && request.method === 'GET') {
        return withCors(await listPending(request, env), env, request)
      }

      // ADR-004: deliberately NOT wrapped by authorizeModerationCaller
      // (github.ts) — this route's caller is any public visitor of
      // apps/public, not the admin. Authorization here is Turnstile alone,
      // checked inside signUpload itself.
      if (pathname === '/upload/sign' && request.method === 'POST') {
        return withCors(await signUpload(request, env), env, request)
      }

      const moderationMatch = MODERATION_ACTION_PATTERN.exec(pathname)
      if (moderationMatch && request.method === 'POST') {
        // public_id contains slashes (marcha-5ta/submissions/<uuid>, ADR-002
        // §3) and the client sends it `encodeURIComponent`-ed as a single
        // path segment (useModerationApi.js) — decode it back here.
        const publicId = decodeURIComponent(moderationMatch[1])
        const action = moderationMatch[2] as 'approve' | 'reject'
        // Body carries the submission's existing context (useModerationApi.js
        // sends it from what listPending already returned) so moderate() can
        // reconstruct the full tags/context without a second Cloudinary
        // round-trip. Malformed/missing body degrades to an empty context
        // rather than failing the request outright.
        const body = await request
          .json<{ context?: Record<string, string> }>()
          .catch(() => ({}) as { context?: Record<string, string> })
        return withCors(await moderate(request, env, publicId, action, body.context ?? {}), env, request)
      }

      return withCors(jsonError(404, 'Ruta no encontrada.'), env, request)
    } catch (err) {
      console.error('Unhandled worker error:', err)
      return withCors(jsonError(500, 'Error interno del Worker.'), env, request)
    }
  },
} satisfies ExportedHandler<Env>
