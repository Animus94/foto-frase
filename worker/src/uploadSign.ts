/**
 * ADR-004: `POST /upload/sign` — signs a Cloudinary upload for the PUBLIC
 * app, gated by Cloudflare Turnstile instead of a GitHub permission check
 * (unlike every `/moderation/*` route, see github.ts/authorizeModerationCaller).
 * This is the one route index.ts must NOT wrap with that check: any visitor
 * is allowed to call it, since it's what apps/public's own upload flow uses.
 *
 * Signature algorithm confirmed against Cloudinary's official docs
 * (https://cloudinary.com/documentation/authentication_signatures, fetched
 * 2026-09-27), not assumed from memory:
 *   - `file`, `cloud_name`, `resource_type` and `api_key` are NEVER part of
 *     the string to sign (api_key is not even secret — it's fine to return
 *     it to the client, same as it already travels indirectly today via the
 *     old unsigned upload preset's public config).
 *   - Every other parameter that will be sent to Cloudinary's upload
 *     endpoint IS signed: sort those params alphabetically by name, join as
 *     `key=value&key=value...`, then append the API Secret directly with NO
 *     separator, then SHA-1-hash the whole string and hex-encode it
 *     (Cloudinary's SDKs default to SHA-1; SHA-256 is also accepted but not
 *     used here, no reason to diverge from the default).
 *   - Whatever value is signed here MUST be byte-for-byte identical to what
 *     the client actually sends to Cloudinary afterwards, or Cloudinary's own
 *     signature check rejects the upload — so `public_id`/`tags`/`context`
 *     below are taken verbatim from the request body (apps/public builds
 *     those exact strings today already, see useCloudinaryUpload.js).
 */

import type { Env } from './types'
import { jsonResponse, jsonError } from './http'
import { verifyTurnstileToken } from './turnstile'

interface SignUploadRequestBody {
  turnstileToken?: string
  publicId?: string
  tags?: string
  context?: string
}

async function sha1Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * @param params - every parameter that will ALSO be sent to Cloudinary's
 *   upload endpoint, except `file`/`cloud_name`/`resource_type`/`api_key`
 *   (never signed — see this module's doc comment).
 */
export async function signUploadParams(params: Record<string, string>, apiSecret: string): Promise<string> {
  const stringToSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return sha1Hex(`${stringToSign}${apiSecret}`)
}

export async function signUpload(request: Request, env: Env): Promise<Response> {
  const body = await request.json<SignUploadRequestBody>().catch(() => null)
  if (!body) return jsonError(400, 'Body inválido: se espera JSON.')

  const { turnstileToken, publicId, tags, context } = body
  if (!turnstileToken || !publicId || !tags) {
    return jsonError(400, 'Faltan campos requeridos: turnstileToken, publicId y/o tags.')
  }

  // The real client IP as seen by Cloudflare (not client-supplied, so not
  // spoofable) — Turnstile's docs list it as an optional extra signal, not
  // as required for validation.
  const remoteIp = request.headers.get('CF-Connecting-IP')
  const isHuman = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET_KEY, remoteIp)
  if (!isHuman) {
    return jsonError(
      403,
      'Verificación anti-bot (Cloudflare Turnstile) inválida o expirada. Volvé a completar el desafío e intentá de nuevo.',
    )
  }

  // Generated here (not trusted from the client) so it's always within
  // Cloudinary's own tolerance window for the `timestamp` upload parameter,
  // and returned to the caller to send back verbatim — see this module's
  // doc comment on why the signed value and the sent value must match.
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const paramsToSign: Record<string, string> = { public_id: publicId, tags, timestamp }
  if (context) paramsToSign.context = context

  const signature = await signUploadParams(paramsToSign, env.CLOUDINARY_API_SECRET)

  return jsonResponse({
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  })
}

import { authorizeModerationCaller } from './github'

export async function adminSignUpload(request: Request, env: Env): Promise<Response> {
  const auth = await authorizeModerationCaller(request, env.GITHUB_REPO)
  if (!auth.ok) return jsonError(auth.status, auth.message)

  const timestamp = Math.floor(Date.now() / 1000).toString()
  const randomId = Math.random().toString(36).substring(2, 10);
  const publicId = 'marcos/frame-' + randomId;

  const paramsToSign = { 
    public_id: publicId, 
    folder: 'marcos',
    tags: 'marco',
    timestamp 
  }

  const signature = await signUploadParams(paramsToSign, env.CLOUDINARY_API_SECRET)

  return jsonResponse({
    signature,
    timestamp,
    publicId,
    tags: 'marco',
    folder: 'marcos',
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  })
}
