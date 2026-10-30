// ---------------------------------------------------------------------------
// export-api.mjs — build-time machine-readable export of the Value Compass
// dataset to public/api/v1/, sibling to build-evidence.mjs.
//
// It invents nothing. It re-publishes the reviewed dataset (makers.json,
// funders.json, evidence.json) as a stable, id-joined, versioned surface:
//
//   api/v1/makers.json     one record per maker, keyed by slug, each axis
//                          carrying the basis/claim_support verdicts that
//                          evidence.json assigns to it
//   api/v1/funders.json    funder nodes with makers_backed / owns_outright
//                          expressed as maker ids, display names kept as fields
//   api/v1/evidence.json   the evidence classification layer, re-keyed from
//                          display names to ids — published as-is
//   api/v1/index.json      manifest: version, generated_at, license,
//                          source_commit, content_hash, counts
//   api/v1/openapi.json    OpenAPI 3.1 description of every endpoint, with
//                          each payload's JSON Schema in components.schemas
//   api/v1/schemas/*.schema.json
//                          the same schemas as standalone JSON Schema
//                          (2020-12) files: makers, funders, evidence
//   api/v1/catalog.jsonld  schema.org DataCatalog + Dataset for discovery
//   llms.txt               human/LLM-readable index of the surface
//   sitemap.xml            canonical routes for every maker and funder
//
// The OpenAPI document and the schemas are not hand-written: their controlled
// vocabularies (axis keys, tiers, confidences, basis / claim_support,
// relationship types and statuses) are read out of the normalized payloads the
// export itself produces, so a vocabulary change rewrites the schemas in the
// same build instead of drifting away from the data.
//
// Determinism: all payloads are serialized with deep-sorted keys and a single
// generated_at input (the source commit's timestamp), so identical input
// produces byte-identical output. The script throws rather than exporting
// drifted or dangling data.
//
// Usage: node scripts/export-api.mjs   (wired into `npm run build`)
// ---------------------------------------------------------------------------

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

export const API_VERSION = 'v1'
export const LICENSE = 'CC BY 4.0'
export const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
export const DEFAULT_SITE_URL = 'https://buildwithwhy.github.io/value-compass/'

// Same shape the app's own coordinates tests enforce: a slug or id is
// lowercase words joined by single hyphens — no spaces, no '/'.
const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ---------------------------------------------------------------------------
// Canonical serialization — sorted keys at every level, so the export does not
// inherit (or drift with) the key order of hand-edited source files.
// ---------------------------------------------------------------------------

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k])
    return out
  }
  return value
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value), null, 2) + '\n'
}

export function sha256(value) {
  return 'sha256:' + createHash('sha256').update(stableJson(value), 'utf8').digest('hex')
}

// ---------------------------------------------------------------------------
// Validators — the export refuses to publish drift, dangling joins, or
// non-URL-safe coordinates. Each failure names the records involved.
// ---------------------------------------------------------------------------

function fail(messages, header) {
  if (messages.length) throw new Error(`${header}\n${messages.map((m) => `  - ${m}`).join('\n')}`)
}

function requireUrlSafeIds(records, field, what) {
  const seen = new Map()
  const problems = []
  for (const r of records) {
    const id = r[field]
    if (typeof id !== 'string' || !URL_SAFE.test(id)) {
      problems.push(`${what} "${r.name}" has invalid ${field}: ${JSON.stringify(id)}`)
      continue
    }
    if (seen.has(id)) problems.push(`${what} ${field} "${id}" is shared by "${seen.get(id)}" and "${r.name}"`)
    seen.set(id, r.name)
  }
  fail(problems, `URL-safe ${field} check failed for ${what}`)
  return seen
}

// Exact-coordinate resolution only: a reference must equal a maker's name,
// legacy id, or slug. No fuzzy matching — an invented join is worse than a
// loud failure.
function buildMakerIndex(makers) {
  const byName = new Map()
  const byId = new Map()
  const bySlug = new Map()
  for (const m of makers) {
    for (const [map, key] of [[byName, m.name], [byId, m.id], [bySlug, m.slug]]) {
      if (map.has(key) && map.get(key) !== m) throw new Error(`Ambiguous maker coordinate "${key}"`)
      map.set(key, m)
    }
  }
  return { byName, byId, bySlug, resolve(ref) { return byName.get(ref) ?? byId.get(ref) ?? bySlug.get(ref) } }
}

// makers_backed / owns_outright must resolve 100% — they are the load-bearing
// joins of the capital network, and a dangling edge there fails the build.
// owns_economically may name public anchors that are not scored makers
// (Amazon, Nvidia…); those are published with id: null and the name
// preserved, counted in _meta.unresolved_economic_entries — never dropped,
// never silently resolved.
const RESOLVED_JOINS = ['makers_backed', 'owns_outright']
const LENIENT_JOINS = ['owns_economically']

function normalizeJoinEntries(entries, makerIndex, funderName, field, problems, lenientUnresolved) {
  return entries.map((ref) => {
    const maker = makerIndex.resolve(ref)
    if (maker) return { id: maker.slug, name: maker.name }
    if (LENIENT_JOINS.includes(field)) {
      lenientUnresolved.push(`${funderName}.${field} → "${ref}"`)
      return { id: null, name: ref }
    }
    problems.push(`${funderName}.${field} → "${ref}" does not resolve to any maker`)
    return { id: null, name: ref }
  })
}

// ---------------------------------------------------------------------------
// Normalizers — one per exported payload. Pure: inputs in, payload object out.
// generatedAt is THE single time input, threaded into every file's _meta.
// ---------------------------------------------------------------------------

function fileMeta(title, generatedAt, extra = {}) {
  return {
    title,
    api_version: API_VERSION,
    generated_at: generatedAt,
    license: LICENSE,
    license_url: LICENSE_URL,
    ...extra,
  }
}

function normalizeAxes(maker, evidenceForMaker) {
  const out = {}
  for (const [axis, record] of Object.entries(maker.axes ?? {})) {
    const verdict = evidenceForMaker?.[axis]
    out[axis] = {
      score: record.score ?? null,
      confidence: record.confidence ?? null,
      note: record.note ?? null,
      sources: record.sources ?? [],
      // Evidence verdicts, published as-is. Where evidence.json classifies
      // nothing (known scored-but-unsourced gap) they stay null — the export
      // must not launder an unsourced score into a sourced one.
      basis: verdict?.basis ?? null,
      claim_support: verdict?.claim_support ?? null,
    }
  }
  return out
}

export function normalizeMakers(makersFile, evidenceFile, generatedAt) {
  const axisEvidence = evidenceFile.axis_evidence ?? {}
  // Record order is normalized (sorted by id), so reordering the source file
  // cannot change a byte of output.
  const makers = [...makersFile.makers]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((m) => {
    const verdicts = axisEvidence[m.name]
    return {
      id: m.slug,
      slug: m.slug,
      name: m.name,
      tier: m.tier ?? null,
      jurisdiction: m.jurisdiction ?? null,
      vc_independent: m.vc_independent ?? null,
      products_models: m.products_models ?? [],
      founders: m.founders ?? [],
      lead_backers: m.lead_backers ?? [],
      structure: m.structure ?? null,
      stated_values: m.stated_values ?? null,
      tension_hook: m.tension_hook ?? null,
      capital_profile: m.capital_profile ?? null,
      axes: normalizeAxes(m, verdicts),
    }
  })
  return {
    _meta: fileMeta('Value Compass — scored makers', generatedAt, {
      count: makers.length,
      polarity: makersFile._meta.polarity,
      scale: makersFile._meta.scale,
      note: 'id equals slug; joins reference makers by this id. Per-axis basis and claim_support repeat the verdicts evidence.json assigns; null means no classification exists, not that a source exists.',
    }),
    makers,
  }
}

export function normalizeFunders(fundersFile, makerIndex, generatedAt) {
  const problems = []
  const lenientUnresolved = []
  const funders = [...fundersFile.funders]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => {
    const joins = {}
    for (const field of [...RESOLVED_JOINS, ...LENIENT_JOINS]) {
      joins[field] = normalizeJoinEntries(f[field] ?? [], makerIndex, f.name, field, problems, lenientUnresolved)
    }
    if (f.maker_count !== (f.makers_backed ?? []).length) {
      problems.push(`${f.name}: maker_count ${f.maker_count} ≠ ${f.makers_backed?.length ?? 0} makers_backed entries`)
    }
    return {
      id: f.id,
      name: f.name,
      parent_type: f.parent_type ?? null,
      rolled_up_vehicles: f.rolled_up_vehicles ?? [],
      makers_backed: joins.makers_backed,
      maker_count: f.maker_count ?? null,
      owns_outright: joins.owns_outright,
      owns_economically: joins.owns_economically,
      flag: f.flag ?? null,
      key_people: f.key_people ?? [],
      also_funds: f.also_funds ?? null,
      also_backs_outside_18: f.also_backs_outside_18 ?? null,
      portfolio_sources: f.portfolio_sources ?? null,
      notable_for: f.notable_for ?? null,
      reputation_sources: f.reputation_sources ?? null,
    }
  })
  const payload = {
    _meta: fileMeta('Value Compass — important funder nodes (parent-rolled-up)', generatedAt, {
      count: funders.length,
      rollup_rule: fundersFile._meta.rollup_rule,
      inclusion_rule: fundersFile._meta.inclusion_rule,
      unresolved_economic_entries: lenientUnresolved.length,
      note: 'makers_backed and owns_outright reference maker ids (slugs); display names ride along as fields. id: null marks a named entity that is not a scored maker — owns_economically legitimately contains such public anchors, counted in unresolved_economic_entries.',
    }),
    funders,
  }
  return { payload, problems }
}

// The evidence layer is published as-is: same verdicts, same fields, only
// re-keyed from display names to stable ids. Orphaned keys (evidence for a
// maker or funder that no longer exists) fail the build — that is drift.
export function normalizeEvidence(evidenceFile, makerIndex, funderIndex, generatedAt) {
  const orphans = []
  const axisEvidence = {}
  for (const [name, axes] of Object.entries(evidenceFile.axis_evidence ?? {})) {
    const maker = makerIndex.resolve(name)
    if (!maker) { orphans.push(`axis_evidence key "${name}" does not resolve to a maker`); continue }
    axisEvidence[maker.slug] = axes
  }

  const funderAssociationStatus = {}
  for (const [name, status] of Object.entries(evidenceFile.funder_association_status ?? {})) {
    const funder = funderIndex.get(name)
    if (!funder) { orphans.push(`funder_association_status key "${name}" does not resolve to a funder`); continue }
    funderAssociationStatus[funder.id] = status
  }

  const relationships = []
  const unresolvedEdges = { maker: 0, funder: 0 }
  for (const rel of Object.values(evidenceFile.relationships ?? {})) {
    const funder = funderIndex.get(rel.funder)
    const maker = makerIndex.resolve(rel.maker)
    if (!funder) unresolvedEdges.funder += 1
    if (!maker) unresolvedEdges.maker += 1
    // Passive-economic edges may legitimately point at public anchors that are
    // not scored makers (Amazon, Nvidia…). Published as-is with id: null.
    relationships.push({
      funder: { id: funder?.id ?? null, name: rel.funder },
      maker: { id: maker?.slug ?? null, name: rel.maker },
      type: rel.type,
      status: rel.status,
      as_of: rel.as_of ?? null,
      quote: rel.quote ?? null,
      quoted_from: rel.quoted_from ?? null,
    })
  }
  relationships.sort(
    (a, b) =>
      (a.funder.id ?? '').localeCompare(b.funder.id ?? '') || a.maker.name.localeCompare(b.maker.name),
  )

  fail(orphans, 'evidence.json export: orphaned keys (data drift)')

  return {
    _meta: fileMeta('Value Compass — evidence classification', generatedAt, {
      generated_by: 'scripts/export-api.mjs (normalized from src/data/evidence.json; classifications unchanged)',
      unresolved_relationship_edges: unresolvedEdges,
      bases: evidenceFile._meta.bases,
      claim_support: evidenceFile._meta.claim_support,
      eligibility_rule: evidenceFile._meta.eligibility_rule,
      display_rule: evidenceFile._meta.display_rule,
      provenance_note: evidenceFile._meta.provenance_note,
    }),
    relationship_types: evidenceFile.relationship_types,
    relationship_statuses: evidenceFile.relationship_statuses,
    axis_evidence: axisEvidence,
    funder_association_status: funderAssociationStatus,
    relationships,
    absence_evidence: evidenceFile.absence_evidence ?? {},
    absence_evidence_requirements: evidenceFile.absence_evidence_requirements ?? null,
    background_sources: evidenceFile.background_sources ?? {},
  }
}

export function buildManifest(makersPayload, fundersPayload, evidencePayload, ctx) {
  return {
    _meta: {
      title: 'Value Compass — open data manifest',
      api_version: API_VERSION,
      generated_at: ctx.generatedAt,
      license: LICENSE,
      license_url: LICENSE_URL,
      source_commit: ctx.sourceCommit,
      content_hash: sha256({ makers: makersPayload, funders: fundersPayload, evidence: evidencePayload }),
      counts: {
        makers: makersPayload.makers.length,
        funders: fundersPayload.funders.length,
        evidence_relationships: evidencePayload.relationships.length,
      },
    },
    endpoints: {
      makers: `/api/${API_VERSION}/makers.json`,
      funders: `/api/${API_VERSION}/funders.json`,
      evidence: `/api/${API_VERSION}/evidence.json`,
      index: `/api/${API_VERSION}/index.json`,
      catalog: `/api/${API_VERSION}/catalog.jsonld`,
      openapi: `/api/${API_VERSION}/openapi.json`,
      schemas: {
        makers: `/api/${API_VERSION}/schemas/makers.schema.json`,
        funders: `/api/${API_VERSION}/schemas/funders.schema.json`,
        evidence: `/api/${API_VERSION}/schemas/evidence.schema.json`,
      },
    },
    note: "Scores are 0–4 or null/'n/a'; basis + claim_support per axis carry the evidence verdicts. Higher = more pro-social. See llms.txt.",
  }
}

// ---------------------------------------------------------------------------
// Discovery artifacts — sitemap.xml, llms.txt, catalog.jsonld.
// ---------------------------------------------------------------------------

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildSitemap(makersPayload, fundersPayload, ctx) {
  const urls = [
    ctx.siteUrl,
    ...makersPayload.makers.map((m) => `${ctx.siteUrl}maker/${m.id}/`),
    ...fundersPayload.funders.map((f) => `${ctx.siteUrl}funder/${f.id}/`),
  ]
  const lastmod = ctx.generatedAt.slice(0, 10)
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc><lastmod>${lastmod}</lastmod></url>`),
    '</urlset>',
    '',
  ].join('\n')
}

export function buildLlmsTxt(makersPayload, fundersPayload, evidencePayload, manifest, ctx) {
  const counts = manifest._meta.counts
  const vocab = (entries) =>
    Object.entries(entries ?? {})
      .map(([k, v]) => `    - ${k}: ${v}`)
      .join('\n')
  return `# Value Compass

> Evidence-aware scores for ${counts.makers} AI makers across five axes (transparency, culture/ESG, labour integrity, wealth dispersion, public sharing), with the funding network of ${counts.funders} funder nodes. Scores are 0–4 or null/'n/a'; higher = more pro-social. A score is only published where sources support it, and per-axis \`basis\` and \`claim_support\` verdicts say what each score rests on.

A tool for evaluating AI makers through documented practices, ownership and funding relationships, and evidence-aware comparison. It distinguishes sourced facts, Value Compass assessments, research gaps, and insufficient evidence, and never names a universal winner.

## How to read a score

- \`score\`: 0–4, or null/'n/a' where research supports none. Higher = more pro-social (more transparent, better culture/ESG, more labour & supply-chain integrity, more dispersed ownership, more public wealth-sharing).
- \`basis\`: what the written rationale rests on — sourced, unsourced, contextual, or not_established.
- \`claim_support\`: whether the cited material directly establishes a narrow fact about the maker — establishes_fact, partial, unreviewed, or none.
- A score without a source stays null. The export publishes these classifications as-is and does not launder them.

Basis vocabulary:

${vocab(evidencePayload._meta.bases)}

Claim-support vocabulary:

${vocab(evidencePayload._meta.claim_support)}

## Endpoints

- ${manifest.endpoints.index} — this manifest: version, generated_at, license, source_commit, counts, content_hash.
- ${manifest.endpoints.makers} — ${counts.makers} scored makers; per-axis score, confidence, note, sources, basis, claim_support.
- ${manifest.endpoints.funders} — ${counts.funders} funder nodes; joins reference maker ids, display names kept as fields.
- ${manifest.endpoints.evidence} — the full evidence classification layer, re-keyed by id; ${counts.evidence_relationships} relationship records.
- ${manifest.endpoints.catalog} — schema.org DataCatalog/Dataset JSON-LD.
- ${manifest.endpoints.openapi} — OpenAPI 3.1 description of every endpoint above, with each payload's JSON Schema under components.schemas.
- ${manifest.endpoints.schemas.makers}, ${manifest.endpoints.schemas.funders}, ${manifest.endpoints.schemas.evidence} — the same schemas as standalone JSON Schema (2020-12) files, generated from the data they describe.
- ${ctx.siteUrl}sitemap.xml — canonical routes for every maker and funder.
- ${ctx.siteUrl} — the app itself.

GET-only, no auth, CORS open on /api/*.

## License

Value Compass's own data — scores, notes, tension hooks, evidence classifications — is licensed ${LICENSE} (${LICENSE_URL}). Third-party material (verbatim quotes in relationships, linked sources) remains with its original owners and is included attribution-only, with pointers to the originals.

## Citing

Every payload carries \`generated_at\`; the manifest additionally carries \`source_commit\` and a \`content_hash\` (sha256 over the canonical JSON — sorted keys — of the makers, funders, and evidence payloads combined). Generated ${ctx.generatedAt} from commit ${ctx.sourceCommit}.

## Methodology

The scoring rubric and method are documented in the repository: src/data/rubric.md and src/data/methodology.md.
`
}

export function buildCatalogJsonLd(makersPayload, fundersPayload, manifest, ctx) {
  const distribution = (path, name, encodingFormat = 'application/json') => ({
    '@type': 'DataDownload',
    name,
    contentUrl: `${ctx.siteUrl}${path.replace(/^\//, '')}`,
    encodingFormat,
  })
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DataCatalog',
        '@id': `${ctx.siteUrl}#datacatalog`,
        name: 'Value Compass',
        url: ctx.siteUrl,
        description:
          'Evidence-aware scores for AI makers across five pro-social axes, with the funding network behind them.',
        license: LICENSE_URL,
        dateModified: ctx.generatedAt,
        dataset: { '@id': `${ctx.siteUrl}api/${API_VERSION}/#makers-dataset` },
      },
      {
        '@type': 'Dataset',
        '@id': `${ctx.siteUrl}api/${API_VERSION}/#makers-dataset`,
        name: 'Value Compass — scored makers and funders',
        description:
          `${makersPayload.makers.length} AI makers scored 0–4 on five axes (transparency, culture/ESG, labour integrity, wealth dispersion, public sharing), with per-axis evidence verdicts and a ${fundersPayload.funders.length}-node funder network.`,
        license: LICENSE_URL,
        isAccessibleForFree: true,
        dateModified: ctx.generatedAt,
        distribution: [
          distribution(manifest.endpoints.makers, 'makers.json'),
          distribution(manifest.endpoints.funders, 'funders.json'),
          distribution(manifest.endpoints.evidence, 'evidence.json'),
          distribution(manifest.endpoints.index, 'index.json'),
          distribution(manifest.endpoints.openapi, 'openapi.json', 'application/openapi+json'),
          distribution(manifest.endpoints.schemas.makers, 'makers.schema.json', 'application/schema+json'),
          distribution(manifest.endpoints.schemas.funders, 'funders.schema.json', 'application/schema+json'),
          distribution(manifest.endpoints.schemas.evidence, 'evidence.schema.json', 'application/schema+json'),
        ],
        variableMeasured:
          'score (0–4, higher = more pro-social), confidence, basis, claim_support per axis; funding relationships by type and status',
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// JSON Schema / OpenAPI — generated, not hand-written.
//
// buildEntityDefs reads its controlled vocabularies out of the normalized
// payloads the export itself produces (the same objects stableJson writes to
// disk). A new basis term, tier, confidence grade, axis, or relationship type
// therefore rewrites the schemas in the same build; a payload the schemas
// cannot describe fails the test suite instead of shipping. Publishing-as-is
// fields (capital_profile, axis_evidence record extras) stay permissive — the
// schemas classify the controlled fields and do not over-promise the rest.
// ---------------------------------------------------------------------------

const ID_STRING = { type: 'string', pattern: URL_SAFE.source }
const STRING_ARRAY = { type: 'array', items: { type: 'string' } }

// `_meta` shape shared by every payload file; file-specific extras (counts,
// rule texts, hashes) ride along as-is.
const FILE_META_SCHEMA = {
  type: 'object',
  required: ['title', 'api_version', 'generated_at', 'license', 'license_url'],
  properties: {
    title: { type: 'string' },
    api_version: { const: API_VERSION },
    generated_at: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}T' },
    license: { const: LICENSE },
    license_url: { const: LICENSE_URL },
  },
  additionalProperties: true,
}

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

// A derived enum: the data's values plus null (every optional field exports
// null where the source carries nothing).
function enumWithNull(values) {
  return { enum: [...uniqueSorted(values), null] }
}

export function buildEntityDefs({ makersPayload, fundersPayload, evidencePayload }) {
  const makers = makersPayload.makers
  // Axes every maker carries become required; an axis only some makers have
  // is still described (and validated) via additionalProperties.
  const axisKeys = uniqueSorted(makers.flatMap((m) => Object.keys(m.axes ?? {})))
  const requiredAxisKeys = makers.length ? axisKeys.filter((axis) => makers.every((m) => axis in m.axes)) : []
  const tiers = uniqueSorted(makers.map((m) => m.tier).filter((t) => t !== null))
  const confidences = uniqueSorted(
    makers.flatMap((m) => Object.values(m.axes ?? {}).map((a) => a.confidence).filter((c) => c !== null)),
  )
  const bases = Object.keys(evidencePayload._meta.bases ?? {}).sort()
  const claimSupport = Object.keys(evidencePayload._meta.claim_support ?? {}).sort()
  // Relationship vocabulary = the declared dictionary ∪ the values actually in
  // use, so a record published as-is never fails its own schema.
  const relationshipTypes = uniqueSorted([
    ...Object.keys(evidencePayload.relationship_types ?? {}),
    ...evidencePayload.relationships.map((r) => r.type),
  ])
  const relationshipStatuses = uniqueSorted([
    ...Object.keys(evidencePayload.relationship_statuses ?? {}),
    ...evidencePayload.relationships.map((r) => r.status),
  ])

  const joinEntryArray = (refsMustResolve) => ({
    type: 'array',
    items: refsMustResolve
      ? { $ref: '#/$defs/JoinEntry' }
      // owns_economically legitimately carries id: null public anchors.
      : { anyOf: [{ $ref: '#/$defs/JoinEntry' }, { type: 'object', required: ['name'], properties: { id: { const: null }, name: { type: 'string' } }, additionalProperties: false }] },
  })

  const axisRef = { $ref: '#/$defs/AxisScore' }
  const axisSchema = {
    // Declared per known axis (the union) with the every-maker subset required;
    // anything else is still validated via additionalProperties.
    type: 'object',
    required: requiredAxisKeys,
    properties: Object.fromEntries(axisKeys.map((axis) => [axis, axisRef])),
    additionalProperties: axisRef,
  }

  const optionalStringArray = { type: ['array', 'null'], items: { type: 'string' } }

  return {
    FileMeta: FILE_META_SCHEMA,
    JoinEntry: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name'],
      properties: { id: { type: ['string', 'null'] }, name: { type: 'string' } },
    },
    AxisScore: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'confidence', 'note', 'sources', 'basis', 'claim_support'],
      properties: {
        score: { anyOf: [{ type: 'integer', minimum: 0, maximum: 4 }, { const: 'n/a' }, { type: 'null' }] },
        confidence: enumWithNull(confidences),
        note: { type: ['string', 'null'] },
        sources: STRING_ARRAY,
        basis: enumWithNull(bases),
        claim_support: enumWithNull(claimSupport),
      },
    },
    Maker: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'slug', 'name', 'tier', 'jurisdiction', 'vc_independent', 'products_models', 'founders', 'lead_backers', 'structure', 'stated_values', 'tension_hook', 'capital_profile', 'axes'],
      properties: {
        id: ID_STRING,
        slug: ID_STRING,
        name: { type: 'string' },
        tier: enumWithNull(tiers),
        jurisdiction: { type: ['string', 'null'] },
        vc_independent: { type: ['string', 'null'] },
        products_models: STRING_ARRAY,
        founders: STRING_ARRAY,
        lead_backers: STRING_ARRAY,
        structure: { type: ['string', 'null'] },
        stated_values: { type: ['string', 'null'] },
        tension_hook: { type: ['string', 'null'] },
        // Published as-is — its fields vary per maker.
        capital_profile: { type: ['object', 'null'], additionalProperties: true },
        axes: axisSchema,
      },
    },
    Funder: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'name', 'parent_type', 'rolled_up_vehicles', 'makers_backed', 'maker_count', 'owns_outright', 'owns_economically', 'flag', 'key_people', 'also_funds', 'also_backs_outside_18', 'portfolio_sources', 'notable_for', 'reputation_sources'],
      properties: {
        id: ID_STRING,
        name: { type: 'string' },
        parent_type: { type: ['string', 'null'] },
        rolled_up_vehicles: STRING_ARRAY,
        makers_backed: joinEntryArray(true),
        maker_count: { type: ['integer', 'null'] },
        owns_outright: joinEntryArray(true),
        owns_economically: joinEntryArray(false),
        flag: { type: ['string', 'null'] },
        key_people: STRING_ARRAY,
        also_funds: { type: ['string', 'null'] },
        also_backs_outside_18: optionalStringArray,
        portfolio_sources: optionalStringArray,
        notable_for: optionalStringArray,
        reputation_sources: optionalStringArray,
      },
    },
    Relationship: {
      type: 'object',
      additionalProperties: false,
      required: ['funder', 'maker', 'type', 'status', 'as_of', 'quote', 'quoted_from'],
      properties: {
        funder: { $ref: '#/$defs/JoinEntry' },
        maker: { $ref: '#/$defs/JoinEntry' },
        type: { enum: relationshipTypes },
        status: { enum: relationshipStatuses },
        as_of: { type: ['string', 'null'] },
        quote: { type: ['string', 'null'] },
        quoted_from: { type: ['string', 'null'] },
      },
    },
    AxisEvidenceRecord: {
      type: 'object',
      additionalProperties: true,
      required: ['basis', 'claim_support', 'decision_eligible'],
      properties: {
        basis: { enum: bases },
        claim_support: { enum: claimSupport },
        decision_eligible: { type: 'boolean' },
      },
    },
    MakersFile: {
      type: 'object',
      additionalProperties: false,
      required: ['_meta', 'makers'],
      properties: { _meta: { $ref: '#/$defs/FileMeta' }, makers: { type: 'array', items: { $ref: '#/$defs/Maker' } } },
    },
    FundersFile: {
      type: 'object',
      additionalProperties: false,
      required: ['_meta', 'funders'],
      properties: { _meta: { $ref: '#/$defs/FileMeta' }, funders: { type: 'array', items: { $ref: '#/$defs/Funder' } } },
    },
    EvidenceFile: {
      type: 'object',
      additionalProperties: false,
      required: ['_meta', 'relationship_types', 'relationship_statuses', 'axis_evidence', 'funder_association_status', 'relationships'],
      properties: {
        _meta: { $ref: '#/$defs/FileMeta' },
        relationship_types: { type: 'object', additionalProperties: { type: 'string' } },
        relationship_statuses: { type: 'object', additionalProperties: { type: 'string' } },
        axis_evidence: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { $ref: '#/$defs/AxisEvidenceRecord' } } },
        funder_association_status: { type: 'object', additionalProperties: { type: 'object', additionalProperties: true } },
        relationships: { type: 'array', items: { $ref: '#/$defs/Relationship' } },
        absence_evidence: { type: 'object', additionalProperties: true },
        background_sources: { type: 'object', additionalProperties: { type: ['string', 'object'] } },
      },
    },
    Manifest: {
      type: 'object',
      additionalProperties: false,
      required: ['_meta', 'endpoints', 'note'],
      properties: {
        _meta: { $ref: '#/$defs/FileMeta' },
        endpoints: { type: 'object', additionalProperties: { type: ['string', 'object'] } },
        note: { type: 'string' },
      },
    },
  }
}

// Standalone schema files anchor refs at '#/$defs/…'; the OpenAPI document
// re-anchors the very same defs at '#/components/schemas/…'. One definition
// source, two views — they cannot disagree.
function reanchorRefs(value, prefix) {
  if (Array.isArray(value)) return value.map((v) => reanchorRefs(v, prefix))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = k === '$ref' ? v.replace('#/$defs/', prefix) : reanchorRefs(v, prefix)
    return out
  }
  return value
}

function standaloneSchema(title, description, properties, defs) {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title,
    description,
    type: 'object',
    properties,
    $defs: defs,
  }
}

export function buildStandaloneSchemas(defs, { generatedAt, sourceCommit }) {
  const description = (subject) =>
    `JSON Schema (2020-12) for the Value Compass open-data payload. Generated ${generatedAt} from commit ${sourceCommit} by scripts/export-api.mjs — do not edit; vocabulary is derived from the data itself. ${subject} Licensed ${LICENSE} (${LICENSE_URL}).`
  return {
    'api/v1/schemas/makers.schema.json': stableJson(
      standaloneSchema(
        'Value Compass — makers payload schema',
        description('Scores are 0–4, "n/a", or null; per-axis basis and claim_support carry the evidence verdicts.'),
        { _meta: { $ref: '#/$defs/FileMeta' }, makers: { type: 'array', items: { $ref: '#/$defs/Maker' } } },
        defs,
      ),
    ),
    'api/v1/schemas/funders.schema.json': stableJson(
      standaloneSchema(
        'Value Compass — funders payload schema',
        description('makers_backed / owns_outright reference maker ids (slugs); owns_economically may carry id: null public anchors.'),
        { _meta: { $ref: '#/$defs/FileMeta' }, funders: { type: 'array', items: { $ref: '#/$defs/Funder' } } },
        defs,
      ),
    ),
    'api/v1/schemas/evidence.schema.json': stableJson(
      standaloneSchema(
        'Value Compass — evidence payload schema',
        description('The evidence classification layer published as-is; basis, claim_support, and decision_eligible are the controlled fields.'),
        {
          _meta: { $ref: '#/$defs/FileMeta' },
          relationship_types: { type: 'object', additionalProperties: { type: 'string' } },
          relationship_statuses: { type: 'object', additionalProperties: { type: 'string' } },
          axis_evidence: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { $ref: '#/$defs/AxisEvidenceRecord' } } },
          funder_association_status: { type: 'object', additionalProperties: { type: 'object', additionalProperties: true } },
          relationships: { type: 'array', items: { $ref: '#/$defs/Relationship' } },
          absence_evidence: { type: 'object', additionalProperties: true },
          background_sources: { type: 'object', additionalProperties: { type: ['string', 'object'] } },
        },
        defs,
      ),
    ),
  }
}

export function buildOpenApiDocument({ makersPayload, fundersPayload, evidencePayload, manifest, siteUrl, defs }) {
  const componentSchemas = reanchorRefs(defs, '#/components/schemas/')
  const get = (schemaName, summary) => ({
    get: {
      tags: ['open data'],
      summary,
      description: `Licensed ${LICENSE} (${LICENSE_URL}). GET-only, no auth, CORS open.`,
      responses: {
        '200': {
          description: 'The payload, serialized with sorted keys.',
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } } },
        },
      },
    },
  })
  return {
    openapi: '3.1.0',
    info: {
      title: 'Value Compass — open data API',
      version: API_VERSION,
      summary: 'Evidence-aware scores for AI makers across five pro-social axes, with the funding network behind them.',
      description:
        "Build-time static export of the Value Compass dataset: scored makers, funder nodes with id-joined capital relationships, and the evidence classification layer. Scores are 0–4 or null/'n/a' (higher = more pro-social); per-axis basis and claim_support verdicts say what each score rests on. Every payload carries generated_at and license; the manifest pins source_commit and a content_hash.",
      license: { name: LICENSE, url: LICENSE_URL },
    },
    servers: [{ url: siteUrl }],
    paths: {
      [manifest.endpoints.makers]: get('MakersFile', `Scored makers (${manifest._meta.counts.makers})`),
      [manifest.endpoints.funders]: get('FundersFile', `Funder nodes (${manifest._meta.counts.funders})`),
      [manifest.endpoints.evidence]: get('EvidenceFile', `Evidence classification layer (${manifest._meta.counts.evidence_relationships} relationships)`),
      [manifest.endpoints.index]: get('Manifest', 'Manifest: version, generated_at, license, source_commit, content_hash, counts'),
    },
    components: { schemas: componentSchemas },
  }
}

// ---------------------------------------------------------------------------
// Assembly — one entry point for both the CLI and the tests.
// ---------------------------------------------------------------------------

// generatedAt is THE single time input: every timestamp in every payload is
// derived from it, so identical inputs produce byte-identical output.
export function buildExportPayloads({ makersFile, fundersFile, evidenceFile, generatedAt, sourceCommit, siteUrl }) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(generatedAt)) {
    throw new Error(`generatedAt must be an ISO 8601 timestamp, got: ${JSON.stringify(generatedAt)}`)
  }
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) {
    throw new Error(`sourceCommit must be a full git sha, got: ${JSON.stringify(sourceCommit)}`)
  }

  fail(
    [
      ...(makersFile._meta.count !== makersFile.makers.length
        ? [`makers.json _meta.count ${makersFile._meta.count} ≠ ${makersFile.makers.length} records`]
        : []),
      ...(fundersFile._meta.count !== fundersFile.funders.length
        ? [`funders.json _meta.count ${fundersFile._meta.count} ≠ ${fundersFile.funders.length} records`]
        : []),
    ],
    'source metadata drifted from record counts',
  )

  requireUrlSafeIds(makersFile.makers, 'slug', 'maker')
  requireUrlSafeIds(fundersFile.funders, 'id', 'funder')
  const makerIndex = buildMakerIndex(makersFile.makers)

  const makersPayload = normalizeMakers(makersFile, evidenceFile, generatedAt)
  const { payload: fundersPayload, problems } = normalizeFunders(fundersFile, makerIndex, generatedAt)
  const funderIndex = new Map(fundersFile.funders.map((f) => [f.name, f]))
  const evidencePayload = normalizeEvidence(evidenceFile, makerIndex, funderIndex, generatedAt)
  const manifest = buildManifest(makersPayload, fundersPayload, evidencePayload, { generatedAt, sourceCommit })

  fail(problems, 'funder→maker join integrity check failed (0 dangling edges required)')

  // One def source feeds both the standalone schema files and the OpenAPI
  // components — the two views cannot disagree.
  const defs = buildEntityDefs({ makersPayload, fundersPayload, evidencePayload })
  const schemaFiles = buildStandaloneSchemas(defs, { generatedAt, sourceCommit })
  const openApi = buildOpenApiDocument({ makersPayload, fundersPayload, evidencePayload, manifest, siteUrl, defs })

  const files = {
    'api/v1/makers.json': stableJson(makersPayload),
    'api/v1/funders.json': stableJson(fundersPayload),
    'api/v1/evidence.json': stableJson(evidencePayload),
    'api/v1/index.json': stableJson(manifest),
    'api/v1/catalog.jsonld': stableJson(buildCatalogJsonLd(makersPayload, fundersPayload, manifest, { siteUrl })),
    'api/v1/openapi.json': stableJson(openApi),
    ...schemaFiles,
    'llms.txt': buildLlmsTxt(makersPayload, fundersPayload, evidencePayload, manifest, {
      generatedAt,
      sourceCommit,
      siteUrl,
    }),
    'sitemap.xml': buildSitemap(makersPayload, fundersPayload, { generatedAt, siteUrl }),
  }
  return { files, makersPayload, fundersPayload, evidencePayload, manifest, defs }
}

// ---------------------------------------------------------------------------
// CLI shell — gathers the single time input from git and writes public/.
// ---------------------------------------------------------------------------

// The single generated_at input: the source commit's timestamp. A rebuild of
// the same commit therefore reproduces byte-identical files.
function readHeadCommit() {
  const out = execFileSync('git', ['log', '-1', '--format=%H%n%cI'], { encoding: 'utf8', cwd: root })
  const [sha, isoDate] = out.trim().split('\n')
  if (!sha || !isoDate) throw new Error('could not read HEAD commit (git log returned no sha/date)')
  return { sourceCommit: sha, generatedAt: isoDate }
}

function main() {
  const { sourceCommit, generatedAt } = readHeadCommit()
  const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/?$/, '/')
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

  const { files, manifest } = buildExportPayloads({
    makersFile: read('src/data/makers.json'),
    fundersFile: read('src/data/funders.json'),
    evidenceFile: read('src/data/evidence.json'),
    generatedAt,
    sourceCommit,
    siteUrl,
  })

  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, 'public', rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }

  console.log(`export-api: wrote ${Object.keys(files).length} files to public/ (api ${API_VERSION})`)
  console.log(`  counts: ${JSON.stringify(manifest._meta.counts)}`)
  console.log(`  generated_at: ${manifest._meta.generated_at} (from commit ${manifest._meta.source_commit.slice(0, 12)})`)
  console.log(`  content_hash: ${manifest._meta.content_hash}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
