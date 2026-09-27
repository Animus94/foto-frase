/**
 * Cloudinary tags/context convention shared between apps/public (upload) and
 * apps/backoffice (moderation). See ADR-002 §3 for the full rationale.
 */

/** Fixed campaign namespace tag applied to every submission. */
export const CAMPAIGN_TAG = 'marcha-5ta'

/** Mutually-exclusive moderation status tags. Only the Worker (ADR-001) rewrites these. */
export const MODERATION_TAG = {
  PENDING: 'moderation:pending',
  APPROVED: 'moderation:approved',
  REJECTED: 'moderation:rejected',
}

/** Capture variant tags. */
export const VARIANT_TAG = {
  SELFIE: 'variant:selfie',
  ALTERNATIVE: 'variant:alternative',
}

/**
 * Tag added ONLY at approval time (never at upload, never for pending/rejected).
 * This is the single tag the public Mural lists via the unsigned resource-list endpoint.
 */
export const MURAL_PUBLIC_TAG = 'mural-public'

/** Capture variant values (also duplicated as readable context.variant). */
export const VARIANTS = {
  SELFIE: 'selfie',
  ALTERNATIVE: 'alternative',
}

/** Readable status values duplicated in context.status. */
export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

/**
 * Cloudinary folder/public_id convention for every submission.
 * @param {string} uuid - client-generated uuid v4.
 * @returns {string}
 */
export function buildPublicId(uuid) {
  return `marcha-5ta/submissions/${uuid}`
}

/**
 * @typedef {Object} SubmissionContext
 * @property {string} phrase_id
 * @property {string} phrase_text - resolved snapshot ("prefix + label") at submission time.
 * @property {'selfie'|'alternative'} variant
 * @property {string} [sticker_name] - only present for variant "alternative", max 20 chars.
 * @property {'pending'|'approved'|'rejected'} status
 * @property {string} submitted_at - ISO 8601.
 * @property {string} device_id - anonymous per-device uuid, internal moderation use only.
 * @property {string} [moderated_at]
 * @property {string} [moderated_by]
 */

/**
 * @typedef {Object} PhraseOption
 * @property {string} id - stable slug, never reused/renamed once published.
 * @property {string} label
 * @property {boolean} active
 */

/**
 * @typedef {Object} PhrasesConfig
 * @property {number} version
 * @property {string} prefix
 * @property {PhraseOption[]} options
 */

/**
 * @typedef {Object} CampaignConfig
 * @property {number} version
 * @property {string} submissionsCloseAt - ISO 8601 with offset.
 * @property {number} maxSubmissionsPerDevice
 * @property {number} gridPageSize
 */
