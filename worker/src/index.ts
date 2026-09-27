/**
 * Router for the foto-frase Cloudflare Worker (ADR-001). Five routes total:
 *   POST /gh/device/code          — oauthProxy.ts, no secret
 *   POST /gh/oauth/token          — oauthProxy.ts, no secret
 *   GET  /moderation/pending      — moderation.ts, signed Cloudinary Search
 *   POST /moderation/:id/approve  — moderation.ts, signed Cloudinary tags/context
 *   POST /moderation/:id/reject   — moderation.ts, signed Cloudinary tags/context
 * Anything else is a clean 404; unhandled exceptions become a generic 500 —
 * the client never sees a raw stack trace or upstream error body.
 */

import type { Env } from './types'
import { corsHeaders, withCors, jsonError } from './http'
import { forwardDeviceCode, forwardAccessToken } from './oauthProxy'
import { listPending, moderate } from './moderation'

const MODERATION_ACTION_PATTERN = /^\/moderation\/([^/]+)\/(approve|reject)$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    try {
      if (pathname === '/gh/device/code' && request.method === 'POST') {
        return withCors(await forwardDeviceCode(request), env)
      }

      if (pathname === '/gh/oauth/token' && request.method === 'POST') {
        return withCors(await forwardAccessToken(request), env)
      }

      if (pathname === '/moderation/pending' && request.method === 'GET') {
        return withCors(await listPending(request, env), env)
      }

      const moderationMatch = MODERATION_ACTION_PATTERN.exec(pathname)
      if (moderationMatch && request.method === 'POST') {
        // public_id contains slashes (marcha-5ta/submissions/<uuid>, ADR-002
        // §3) and the client sends it `encodeURIComponent`-ed as a single
        // path segment (useModerationApi.js) — decode it back here.
        const publicId = decodeURIComponent(moderationMatch[1])
        const action = moderationMatch[2] as 'approve' | 'reject'
        return withCors(await moderate(request, env, publicId, action), env)
      }

      return withCors(jsonError(404, 'Ruta no encontrada.'), env)
    } catch (err) {
      console.error('Unhandled worker error:', err)
      return withCors(jsonError(500, 'Error interno del Worker.'), env)
    }
  },
} satisfies ExportedHandler<Env>
