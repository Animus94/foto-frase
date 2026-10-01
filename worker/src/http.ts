import type { Env } from './types'

/**
 * CORS restricted to a single allowlisted origin (ADR-001/CLAUDE.md: never
 * `*`, since these routes accept a GitHub bearer token). The Worker always
 * answers with this fixed origin — the browser itself refuses the response
 * if it doesn't match the page's actual origin, so there's no need (and no
 * safe way) to reflect an arbitrary request Origin header back.
 */
export function corsHeaders(env: Env, request?: Request): Record<string, string> {
  // Lista de sitios autorizados
  const allowedOrigins = [
    'https://animus94.github.io',
    'https://mural-backoffice.pages.dev',
    env.ALLOWED_ORIGIN
  ].filter(Boolean)

  let origin = 'https://animus94.github.io'

  if (request) {
    const reqOrigin = request.headers.get('Origin')
    if (reqOrigin) {
      const isAllowed = allowedOrigins.includes(reqOrigin) || /^https?:\/\/localhost(:\d+)?$/.test(reqOrigin)
      if (isAllowed) {
        origin = reqOrigin
      }
    }
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

/** Returns a new Response with CORS headers merged in, preserving the body/status. */
export function withCors(response: Response, env: Env, request?: Request): Response {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders(env, request))) {
    headers.set(key, value)
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Uniform error envelope — never a raw stack trace or upstream body reaches
 * the client, only a short message (see index.ts's catch-all too).
 */
export function jsonError(status: number, message: string): Response {
  return jsonResponse({ error: message }, status)
}
