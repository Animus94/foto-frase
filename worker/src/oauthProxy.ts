/**
 * ADR-001 §A: plain 1:1 forwarding of GitHub's Device Flow endpoints, with
 * no secret involved — it exists purely because those two GitHub endpoints
 * don't send CORS headers for `https://*.github.io` origins. The Worker
 * never reads, stores, or inspects the device code / access token; it just
 * relays the request body and passes the upstream response straight back.
 */

const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/oauth/device/code'
const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

async function forwardToGithub(url: string, request: Request): Promise<Response> {
  const body = await request.text()
  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // GitHub's device-flow endpoints reply form-urlencoded by default;
        // this makes them reply JSON, which is what the backoffice expects.
        Accept: 'application/json',
      },
      body,
    })
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function forwardDeviceCode(request: Request): Promise<Response> {
  return forwardToGithub(GITHUB_DEVICE_CODE_URL, request)
}

export function forwardAccessToken(request: Request): Promise<Response> {
  return forwardToGithub(GITHUB_ACCESS_TOKEN_URL, request)
}
