/**
 * Worker environment bindings (ADR-001 §B "Secretos del Worker"). `vars` are
 * plain strings set in wrangler.toml; the two Cloudinary credentials are
 * Cloudflare secrets (`wrangler secret put`), never present in wrangler.toml
 * or in any file committed to the repo.
 */
export interface Env {
  /** `owner/repo` whose push permission gates every moderation route. */
  GITHUB_REPO: string
  /** Single allowed CORS origin (never `*`) for the backoffice's Pages site. */
  ALLOWED_ORIGIN: string
  /** Cloudinary cloud name — not secret, already public in apps/public's bundle. */
  CLOUDINARY_CLOUD_NAME: string
  /** Cloudflare secret — set with `wrangler secret put CLOUDINARY_API_KEY`. */
  CLOUDINARY_API_KEY: string
  /** Cloudflare secret — set with `wrangler secret put CLOUDINARY_API_SECRET`. */
  CLOUDINARY_API_SECRET: string
  /**
   * Cloudflare secret — set with `wrangler secret put TURNSTILE_SECRET_KEY`
   * (ADR-004). Gates `POST /upload/sign`: validated against
   * `https://challenges.cloudflare.com/turnstile/v0/siteverify`, never sent
   * to or readable by the client.
   */
  TURNSTILE_SECRET_KEY: string
}
