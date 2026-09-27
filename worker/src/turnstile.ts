/**
 * Cloudflare Turnstile server-side token validation (ADR-004). Gates
 * `POST /upload/sign` — the only anti-abuse check on that route, since it
 * has no GitHub-permission check (unlike `/moderation/*`, see github.ts).
 *
 * Endpoint/parameters/response shape confirmed against Cloudflare's own docs
 * (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/,
 * fetched 2026-09-27): `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`
 * accepts either `application/json` or `application/x-www-form-urlencoded`
 * with fields `secret` (required), `response` (required, the client's
 * token) and `remoteip` (optional); it always replies JSON with a boolean
 * `success` field and an `error-codes` array on failure. This module uses
 * the JSON body form.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/**
 * @param token - the client-side widget's token (`turnstile.getResponse()` /
 *   the widget's own callback payload — see apps/public's useTurnstile.js).
 * @param secretKey - `env.TURNSTILE_SECRET_KEY`, never exposed to the client.
 * @param remoteIp - optional; the real client IP as seen by Cloudflare
 *   (`request.headers.get('CF-Connecting-IP')`), which the caller cannot
 *   spoof — passed along only because Cloudflare's docs list it as an
 *   optional signal, not because it's required for validation to work.
 * @returns whether the token is valid. Never throws — any network/parse
 *   failure is treated as "not valid" so callers can uniformly respond 403
 *   without a separate error branch, and the failure detail is logged
 *   server-side for diagnosis instead of leaking upstream response bodies.
 */
export async function verifyTurnstileToken(
  token: string,
  secretKey: string,
  remoteIp?: string | null,
): Promise<boolean> {
  if (!token) return false

  let response: Response
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    })
  } catch (err) {
    console.error('Turnstile siteverify unreachable:', err)
    return false
  }

  if (!response.ok) {
    console.error('Turnstile siteverify HTTP error:', response.status)
    return false
  }

  const payload = await response.json<SiteverifyResponse>().catch(() => null)
  if (!payload?.success) {
    console.error('Turnstile validation failed:', payload?.['error-codes'] ?? 'unknown response shape')
    return false
  }
  return true
}
