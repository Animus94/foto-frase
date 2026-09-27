/**
 * GitHub bearer-token validation for the moderation routes (ADR-001 §B).
 * The Worker never persists this token — it's used only to validate the
 * in-flight request, exactly as ADR-001 specifies.
 */

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'foto-frase-worker'

export interface AuthorizedCaller {
  /** The GitHub bearer token the caller sent (only forwarded, never stored). */
  token: string
  /** GitHub login resolved via `GET /user`, used as `context.moderated_by`. */
  login: string
}

export type AuthResult =
  | { ok: true; caller: AuthorizedCaller }
  | { ok: false; status: 401 | 403; message: string }

interface GithubRepoResponse {
  permissions?: { push?: boolean; admin?: boolean; maintain?: boolean }
}

interface GithubUserResponse {
  login?: string
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

async function githubGet(path: string, token: string): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
}

/**
 * Validates the caller's GitHub bearer token has push access to
 * `env.GITHUB_REPO` (ADR-001 §B, step 1) and resolves their login (step 2),
 * in parallel. Returns a 401/403 AuthResult without touching Cloudinary if
 * either check fails (step 3).
 */
export async function authorizeModerationCaller(request: Request, repo: string): Promise<AuthResult> {
  const token = extractBearerToken(request)
  if (!token) {
    return { ok: false, status: 401, message: 'Falta el header Authorization: Bearer <token>.' }
  }

  let repoResponse: Response
  let userResponse: Response
  try {
    ;[repoResponse, userResponse] = await Promise.all([
      githubGet(`/repos/${repo}`, token),
      githubGet('/user', token),
    ])
  } catch {
    return { ok: false, status: 403, message: 'No se pudo contactar a la API de GitHub para validar el token.' }
  }

  if (repoResponse.status === 401 || userResponse.status === 401) {
    return { ok: false, status: 401, message: 'Token de GitHub inválido o expirado.' }
  }

  if (!repoResponse.ok) {
    return {
      ok: false,
      status: 403,
      message: 'No se pudo validar el permiso sobre el repositorio (¿token sin acceso a este repo?).',
    }
  }

  const repoPayload = await repoResponse.json<GithubRepoResponse>().catch(() => ({}) as GithubRepoResponse)
  const hasWriteAccess = Boolean(repoPayload.permissions?.push || repoPayload.permissions?.admin)
  if (!hasWriteAccess) {
    return {
      ok: false,
      status: 403,
      message: 'Tu usuario de GitHub no tiene permiso de escritura sobre este repositorio.',
    }
  }

  if (!userResponse.ok) {
    return { ok: false, status: 403, message: 'No se pudo resolver el usuario de GitHub autenticado.' }
  }
  const userPayload = await userResponse.json<GithubUserResponse>().catch(() => ({}) as GithubUserResponse)
  if (!userPayload.login) {
    return { ok: false, status: 403, message: 'La respuesta de GitHub no incluyó un login de usuario.' }
  }

  return { ok: true, caller: { token, login: userPayload.login } }
}
