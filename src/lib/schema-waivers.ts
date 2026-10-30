// ---------------------------------------------------------------------------
// Legacy data-debt waivers for the schema guards.
//
// The guard tests enforce "no score without a source" and non-empty required
// fields, but the dataset carries pre-existing debt the approved blueprint
// (art_6CEV6h95, "Out of scope") explicitly deferred to the sourced-research
// workstream: legacy makers entered before the evidence discipline existed.
//
// This is a one-way ratchet, not an escape hatch:
//   • A violation NOT listed here fails the build. New scores always need a
//     source URL — add one, or leave the axis null/'n/a' with a reason.
//   • A waiver whose data debt has been fixed (sources added / field filled)
//     also fails the build, so the list can only ever shrink. Delete the
//     waiver line in the same PR that fixes the data.
//   • Adding a new waiver line is a review-blocking decision: it means
//     knowingly shipping another unsourced score.
// ---------------------------------------------------------------------------

/**
 * Scored axis entries with no source URL, keyed `makerId|axis`.
 * Tracked for the sourced-data research workstream; fix = add real source
 * URLs to the entry, then remove the line.
 */
export const UNSOURCED_SCORE_WAIVERS: readonly string[] = [
  'Canva|labour_integrity',
  'Cohere|culture_esg',
  'Cohere|wealth_dispersion',
  'Cursor|culture_esg',
  'Cursor|public_sharing',
  'Cursor|wealth_dispersion',
  'DeepSeek|culture_esg',
  'DeepSeek|wealth_dispersion',
  'ElevenLabs|culture_esg',
  'ElevenLabs|public_sharing',
  'ElevenLabs|wealth_dispersion',
  'Gamma|culture_esg',
  'Gamma|public_sharing',
  'Gamma|wealth_dispersion',
  'Google DeepMind|public_sharing',
  'Google DeepMind|wealth_dispersion',
  'Lovable|culture_esg',
  'Lovable|public_sharing',
  'Lovable|wealth_dispersion',
  'Meta|wealth_dispersion',
  'Microsoft|culture_esg',
  'Microsoft|public_sharing',
  'Microsoft|wealth_dispersion',
  'Midjourney|culture_esg',
  'Midjourney|public_sharing',
  'Midjourney|wealth_dispersion',
  'Mistral|culture_esg',
  'Mistral|public_sharing',
  'Mistral|wealth_dispersion',
  'Moonshot|culture_esg',
  'Moonshot|public_sharing',
  'Moonshot|wealth_dispersion',
  'Perplexity|culture_esg',
  'Perplexity|public_sharing',
  'Perplexity|wealth_dispersion',
  'Replit|culture_esg',
  'Replit|public_sharing',
  'Replit|wealth_dispersion',
  'xAI|public_sharing',
  'xAI|wealth_dispersion',
]

/**
 * Required maker fields that are present but empty. Keyed `makerId|field`.
 * Empty because the batch research established nothing for them yet; fix =
 * fill from sourced research, then remove the line.
 */
export const EMPTY_FIELD_WAIVERS: readonly string[] = [
  'StackBlitz|founders',
  'Vercel|founders',
  'Vercel|structure',
]
