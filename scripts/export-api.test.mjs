// ---------------------------------------------------------------------------
// export-api.test.mjs — invariants of the /api/v1 export.
//
// Two layers:
//   1. fixture tests — small synthetic inputs that prove each validator and
//      normalizer behaves as specified (counts, joins, slugs, determinism,
//      license, verdicts);
//   2. real-data invariants — the export must also hold for the actual
//      src/data/*.json files, so a dataset edit that breaks the export fails
//      the test suite, not a future consumer.
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildExportPayloads, canonicalize, stableJson, sha256, LICENSE } from './export-api.mjs'

const readSource = (p) => JSON.parse(readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8'))

const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const GENERATED_AT = '2026-10-30T12:00:00Z'
const SOURCE_COMMIT = 'a'.repeat(40)
const SITE_URL = 'https://example.org/value-compass/'

// -- Fixtures ----------------------------------------------------------------

const makerAlpha = {
  name: 'Alpha Labs',
  id: 'Alpha Labs',
  slug: 'alpha-labs',
  tier: 'startup',
  jurisdiction: 'US',
  vc_independent: 'vc-backed',
  products_models: ['Alpha 1'],
  founders: ['F. Founder'],
  lead_backers: ['Beta Ventures'],
  structure: 'LLC',
  stated_values: 'Open for all.',
  tension_hook: 'Open weights vs. venture returns.',
  axes: {
    transparency: { score: 3, confidence: 'A', note: 'Documented disclosures.', sources: ['https://example.org/fmti'] },
    culture_esg: { score: null, confidence: null, note: 'No research finding yet.', sources: [] },
  },
  capital_profile: { independence_type: 'vc_backed', founder_control: null, big_tech_capital: [] },
}

const makerBeta = {
  name: 'Beta Inc',
  id: 'Beta Inc',
  slug: 'beta',
  tier: 'frontier',
  jurisdiction: 'US',
  vc_independent: 'public',
  axes: {
    transparency: { score: 'n/a', confidence: null, note: 'Not a model developer.', sources: [] },
  },
}

const makersFile = {
  _meta: { count: 2, polarity: 'HIGHER = more pro-social', scale: { '0': 'worst', '4': 'best' } },
  makers: [makerAlpha, makerBeta],
}

const funderBeta = {
  name: 'Beta Ventures',
  id: 'beta-ventures',
  parent_type: 'vc',
  rolled_up_vehicles: ['Beta Seed Fund'],
  makers_backed: ['Alpha Labs'],
  maker_count: 1,
  owns_outright: ['Beta Inc'],
  flag: null,
  key_people: [],
  also_funds: null,
}

// A funder whose owns_economically names a public anchor that is NOT a scored
// maker — the shape the real data has for Amazon / Nvidia / Alphabet.
const funderAnchor = {
  name: 'Anchor Capital',
  id: 'anchor-capital',
  parent_type: 'index_manager',
  makers_backed: [],
  maker_count: 0,
  owns_economically: ['Amazon', 'Beta Inc'],
}

const fundersFile = {
  _meta: { count: 2, rollup_rule: 'rolled up to parents', inclusion_rule: 'strategic or 2+ makers' },
  funders: [funderBeta, funderAnchor],
}

const evidenceFile = {
  _meta: {
    bases: { sourced: 'On record, sourced about this maker.', not_established: 'No finding yet.' },
    claim_support: { establishes_fact: 'Directly establishes a narrow fact.', none: 'No source to review.' },
    eligibility_rule: 'traceable support required',
    display_rule: 'no score without a finding',
    provenance_note: 'automated, provisional',
  },
  axis_evidence: {
    'Alpha Labs': {
      transparency: {
        basis: 'sourced',
        claim_support: 'establishes_fact',
        decision_eligible: true,
        entity_sources: ['https://example.org/fmti'],
      },
      // culture_esg deliberately absent — the export must publish nulls there.
    },
  },
  relationships: {
    'Beta Ventures→Alpha Labs': {
      funder: 'Beta Ventures',
      maker: 'Alpha Labs',
      type: 'equity_investment',
      status: 'completed',
      as_of: null,
      quote: 'Led the seed.',
      quoted_from: 'makers.json → Alpha Labs.lead_backers',
    },
  },
  funder_association_status: { 'Beta Ventures': { associations_status: 'sourced' } },
  absence_evidence: {},
  background_sources: {},
}

const build = (overrides = {}) =>
  buildExportPayloads({
    makersFile,
    fundersFile,
    evidenceFile,
    generatedAt: GENERATED_AT,
    sourceCommit: SOURCE_COMMIT,
    siteUrl: SITE_URL,
    ...overrides,
  })

const parseFile = (files, path) => JSON.parse(files[path])

// -- Counts ------------------------------------------------------------------

describe('fixture export: counts match source files', () => {
  it('makers.json / funders.json carry the source record counts', () => {
    const { files } = build()
    const makers = parseFile(files, 'api/v1/makers.json')
    const funders = parseFile(files, 'api/v1/funders.json')
    expect(makers.makers).toHaveLength(2)
    expect(makers._meta.count).toBe(2)
    expect(funders.funders).toHaveLength(2)
    expect(funders._meta.count).toBe(2)
  })

  it('the manifest counts match the exported payloads and name the sources', () => {
    const { manifest } = build()
    expect(manifest._meta.counts).toEqual({ makers: 2, funders: 2, evidence_relationships: 1 })
    expect(manifest.endpoints.makers).toBe('/api/v1/makers.json')
    expect(manifest.endpoints.index).toBe('/api/v1/index.json')
  })

  it('drifted _meta.count fails the build', () => {
    const drifted = { ...makersFile, _meta: { ...makersFile._meta, count: 99 } }
    expect(() => build({ makersFile: drifted })).toThrow(/drifted from record counts/)
  })
})

// -- Join integrity ----------------------------------------------------------

describe('fixture export: join integrity', () => {
  it('every makers_backed / owns_outright entry resolves to an exported maker id', () => {
    const { fundersPayload, makersPayload } = build()
    const makerIds = new Set(makersPayload.makers.map((m) => m.id))
    for (const f of fundersPayload.funders) {
      for (const field of ['makers_backed', 'owns_outright']) {
        for (const entry of f[field]) expect(makerIds.has(entry.id)).toBe(true)
      }
    }
  })

  it('joins are expressed in ids with display names kept as fields', () => {
    const { fundersPayload } = build()
    const beta = fundersPayload.funders.find((f) => f.id === 'beta-ventures')
    expect(beta.makers_backed).toEqual([{ id: 'alpha-labs', name: 'Alpha Labs' }])
    expect(beta.owns_outright).toEqual([{ id: 'beta', name: 'Beta Inc' }])
  })

  it('owns_economically entries that are not scored makers keep their name with id: null, flagged in _meta', () => {
    const { fundersPayload } = build()
    const anchor = fundersPayload.funders.find((f) => f.id === 'anchor-capital')
    expect(anchor.owns_economically).toEqual([
      { id: null, name: 'Amazon' },
      { id: 'beta', name: 'Beta Inc' },
    ])
    expect(fundersPayload._meta.unresolved_economic_entries).toBe(1)
  })

  it('a dangling makers_backed edge fails the build', () => {
    const dangling = {
      _meta: { ...fundersFile._meta, count: 1 },
      funders: [{ ...funderBeta, makers_backed: ['Ghost AI'], maker_count: 1 }],
    }
    expect(() => build({ fundersFile: dangling })).toThrow(/join integrity check failed[\s\S]*Ghost AI/)
  })

  it('legacy ids and slugs resolve as join coordinates, not just display names', () => {
    const legacy = {
      _meta: { ...makersFile._meta, count: 2 },
      makers: [{ ...makerAlpha, name: 'Alpha Labs (AI)', id: 'Alpha Labs' }, makerBeta],
    }
    const { fundersPayload } = build({ makersFile: legacy })
    const beta = fundersPayload.funders.find((f) => f.id === 'beta-ventures')
    expect(beta.makers_backed[0]).toEqual({ id: 'alpha-labs', name: 'Alpha Labs (AI)' })
  })
})

// -- Slug validity -----------------------------------------------------------

describe('fixture export: slug validity', () => {
  it('every exported maker id/slug and funder id is URL-safe and unique', () => {
    const { makersPayload, fundersPayload } = build()
    for (const m of makersPayload.makers) {
      expect(m.id).toMatch(URL_SAFE)
      expect(m.slug).toMatch(URL_SAFE)
      expect(m.id).toBe(m.slug) // one canonical coordinate, not two that can drift
    }
    for (const f of fundersPayload.funders) expect(f.id).toMatch(URL_SAFE)
    const makerIds = makersPayload.makers.map((m) => m.id)
    expect(new Set(makerIds).size).toBe(makerIds.length)
    const funderIds = fundersPayload.funders.map((f) => f.id)
    expect(new Set(funderIds).size).toBe(funderIds.length)
  })

  it('a slug with a space or slash fails the build', () => {
    const spaced = {
      _meta: { ...makersFile._meta, count: 1 },
      makers: [{ ...makerAlpha, slug: 'alpha labs' }],
    }
    expect(() => build({ makersFile: spaced })).toThrow(/URL-safe slug check failed/)
    const slashed = {
      _meta: { ...fundersFile._meta, count: 1 },
      funders: [{ ...funderBeta, id: 'beta/ventures' }],
    }
    expect(() => build({ fundersFile: slashed })).toThrow(/URL-safe id check failed/)
  })

  it('a duplicate slug fails the build', () => {
    const duped = { ...makersFile, makers: [makerAlpha, { ...makerBeta, slug: 'alpha-labs' }] }
    expect(() => build({ makersFile: duped })).toThrow(/shared by/)
  })
})

// -- Determinism -------------------------------------------------------------

describe('fixture export: hash determinism', () => {
  it('identical inputs produce byte-identical files', () => {
    const a = build()
    const b = build()
    expect(a.files).toEqual(b.files)
  })

  it('input key order does not change the output bytes', () => {
    const reversedMakers = { ...makersFile, makers: [...makersFile.makers].reverse() }
    const a = build()
    const b = build({ makersFile: reversedMakers })
    // Record order is itself normalized (sorted by id), so a reversed input
    // list must not change a single byte.
    expect(a.files['api/v1/makers.json']).toBe(b.files['api/v1/makers.json'])
  })

  it('content_hash is stable across runs and sensitive to data changes', () => {
    const a = build().manifest._meta.content_hash
    const b = build().manifest._meta.content_hash
    expect(a).toBe(b)
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/)

    const scored = {
      ...makersFile,
      makers: [
        makerAlpha,
        { ...makerBeta, axes: { transparency: { score: 1, confidence: 'C', note: 'x', sources: [] } } },
      ],
    }
    const c = build({ makersFile: scored }).manifest._meta.content_hash
    expect(c).not.toBe(a)
  })

  it('every payload carries the single generated_at input', () => {
    const { makersPayload, fundersPayload, evidencePayload, manifest, files } = build()
    for (const payload of [makersPayload, fundersPayload, evidencePayload, manifest]) {
      expect(payload._meta.generated_at).toBe(GENERATED_AT)
    }
    expect(files['llms.txt']).toContain(GENERATED_AT)
    expect(files['sitemap.xml']).toContain(GENERATED_AT.slice(0, 10))
  })

  it('changing generated_at changes the output — it is an input, not a clock read', () => {
    const a = build()
    const b = build({ generatedAt: '2026-11-01T00:00:00Z' })
    expect(a.files['api/v1/makers.json']).not.toBe(b.files['api/v1/makers.json'])
  })

  it('malformed inputs are rejected, not silently serialized', () => {
    expect(() => build({ generatedAt: 'not-a-date' })).toThrow(/generatedAt must be an ISO 8601 timestamp/)
    expect(() => build({ sourceCommit: 'abc123' })).toThrow(/sourceCommit must be a full git sha/)
  })
})

// -- License -----------------------------------------------------------------

describe('fixture export: license field presence', () => {
  it('every exported payload carries the CC BY 4.0 license', () => {
    const { makersPayload, fundersPayload, evidencePayload, manifest } = build()
    for (const payload of [makersPayload, fundersPayload, evidencePayload, manifest]) {
      expect(payload._meta.license).toBe('CC BY 4.0')
      expect(payload._meta.license_url).toBe('https://creativecommons.org/licenses/by/4.0/')
    }
    expect(LICENSE).toBe('CC BY 4.0')
  })

  it('llms.txt and the JSON-LD catalog state the license terms', () => {
    const { files } = build()
    const catalog = parseFile(files, 'api/v1/catalog.jsonld')
    expect(files['llms.txt']).toContain('CC BY 4.0')
    expect(files['llms.txt']).toContain('attribution-only')
    const graph = catalog['@graph']
    expect(graph.find((n) => n['@type'] === 'DataCatalog').license).toBe('https://creativecommons.org/licenses/by/4.0/')
    expect(graph.find((n) => n['@type'] === 'Dataset').license).toBe('https://creativecommons.org/licenses/by/4.0/')
  })
})

// -- Evidence verdicts -------------------------------------------------------

describe('fixture export: per-axis basis / claim_support verdicts', () => {
  it('exposes the verdicts evidence.json assigns, exactly', () => {
    const { makersPayload } = build()
    const alpha = makersPayload.makers.find((m) => m.id === 'alpha-labs')
    expect(alpha.axes.transparency.basis).toBe('sourced')
    expect(alpha.axes.transparency.claim_support).toBe('establishes_fact')
  })

  it('axes evidence.json does not classify stay null — no laundering', () => {
    const { makersPayload } = build()
    const alpha = makersPayload.makers.find((m) => m.id === 'alpha-labs')
    expect(alpha.axes.culture_esg).toMatchObject({ score: null, basis: null, claim_support: null })
  })

  it('re-keyed evidence axis records match the exported maker verdicts', () => {
    const { makersPayload, evidencePayload } = build()
    for (const maker of makersPayload.makers) {
      const classified = evidencePayload.axis_evidence[maker.id] ?? {}
      for (const [axis, record] of Object.entries(maker.axes)) {
        if (classified[axis]) {
          expect(record.basis).toBe(classified[axis].basis)
          expect(record.claim_support).toBe(classified[axis].claim_support)
        } else {
          expect(record.basis).toBeNull()
          expect(record.claim_support).toBeNull()
        }
      }
    }
  })

  it('relationships carry id joins and unresolved edges are counted, not dropped', () => {
    const { evidencePayload } = build()
    expect(evidencePayload.relationships).toEqual([
      {
        funder: { id: 'beta-ventures', name: 'Beta Ventures' },
        maker: { id: 'alpha-labs', name: 'Alpha Labs' },
        type: 'equity_investment',
        status: 'completed',
        as_of: null,
        quote: 'Led the seed.',
        quoted_from: 'makers.json → Alpha Labs.lead_backers',
      },
    ])
  })

  it('orphaned evidence keys (no such maker / funder) fail the build', () => {
    const orphaned = {
      ...evidenceFile,
      axis_evidence: { ...evidenceFile.axis_evidence, 'Ghost AI': evidenceFile.axis_evidence['Alpha Labs'] },
    }
    expect(() => build({ evidenceFile: orphaned })).toThrow(/orphaned keys[\s\S]*Ghost AI/)
  })
})

// -- Discovery artifacts -----------------------------------------------------

describe('fixture export: sitemap, llms.txt, catalog', () => {
  it('sitemap covers home, every maker route, and every funder route', () => {
    const { files } = build()
    const xml = files['sitemap.xml']
    expect(xml).toContain('<loc>https://example.org/value-compass/</loc>')
    expect(xml).toContain('<loc>https://example.org/value-compass/maker/alpha-labs/</loc>')
    expect(xml).toContain('<loc>https://example.org/value-compass/funder/beta-ventures/</loc>')
    expect(xml.match(/<loc>/g)).toHaveLength(1 + 2 + 2)
  })

  it('llms.txt indexes every endpoint and the score semantics', () => {
    const { files } = build()
    const txt = files['llms.txt']
    for (const path of ['api/v1/makers.json', 'api/v1/funders.json', 'api/v1/evidence.json', 'api/v1/index.json']) {
      expect(txt).toContain(path)
    }
    expect(txt).toContain('0–4')
    expect(txt).toContain('sourced')
  })

  it('catalog.jsonld is a schema.org DataCatalog with a Dataset and distributions', () => {
    const { files } = build()
    const catalog = parseFile(files, 'api/v1/catalog.jsonld')
    expect(catalog['@context']).toBe('https://schema.org')
    const graph = catalog['@graph']
    expect(graph.find((n) => n['@type'] === 'DataCatalog')).toBeTruthy()
    const dataset = graph.find((n) => n['@type'] === 'Dataset')
    expect(dataset.distribution).toHaveLength(4)
    expect(dataset.distribution[0].contentUrl).toBe('https://example.org/value-compass/api/v1/makers.json')
  })
})

// -- Real data ---------------------------------------------------------------

describe('real-data invariants (src/data/*.json)', () => {
  const makersFile = readSource('../src/data/makers.json')
  const fundersFile = readSource('../src/data/funders.json')
  const evidenceFile = readSource('../src/data/evidence.json')

  it('the real dataset exports cleanly and counts match the source files', () => {
    const { manifest } = buildExportPayloads({
      makersFile,
      fundersFile,
      evidenceFile,
      generatedAt: GENERATED_AT,
      sourceCommit: SOURCE_COMMIT,
      siteUrl: SITE_URL,
    })
    expect(manifest._meta.counts.makers).toBe(makersFile.makers.length)
    expect(manifest._meta.counts.funders).toBe(fundersFile.funders.length)
    expect(manifest._meta.counts.makers).toBeGreaterThan(0)
  })

  it('real funder joins resolve with zero dangling edges', () => {
    const { makersPayload, fundersPayload } = buildExportPayloads({
      makersFile,
      fundersFile,
      evidenceFile,
      generatedAt: GENERATED_AT,
      sourceCommit: SOURCE_COMMIT,
      siteUrl: SITE_URL,
    })
    const makerIds = new Set(makersPayload.makers.map((m) => m.id))
    for (const f of fundersPayload.funders) {
      for (const entry of f.makers_backed) expect(makerIds.has(entry.id), `${f.id} → ${entry.id}`).toBe(true)
      for (const entry of f.owns_outright) expect(makerIds.has(entry.id), `${f.id} → ${entry.id}`).toBe(true)
    }
  })

  it('every exported verdict is consistent with evidence.json', () => {
    const { makersPayload } = buildExportPayloads({
      makersFile,
      fundersFile,
      evidenceFile,
      generatedAt: GENERATED_AT,
      sourceCommit: SOURCE_COMMIT,
      siteUrl: SITE_URL,
    })
    for (const maker of makersPayload.makers) {
      const classified = evidenceFile.axis_evidence[maker.name] ?? {}
      for (const [axis, record] of Object.entries(maker.axes)) {
        // As-is publication: null where evidence.json classifies nothing, the
        // exact verdict where it does. The evidence layer, not the export,
        // owns what 'sourced' beside a null score means (a sourced rationale
        // whose claim fit is unreviewed and whose score was never entered).
        expect(record.basis).toBe(classified[axis]?.basis ?? null)
        expect(record.claim_support).toBe(classified[axis]?.claim_support ?? null)
      }
    }
  })

  it('exported JSON is canonical: sorted keys, stable serialization', () => {
    const { makersPayload } = buildExportPayloads({
      makersFile,
      fundersFile,
      evidenceFile,
      generatedAt: GENERATED_AT,
      sourceCommit: SOURCE_COMMIT,
      siteUrl: SITE_URL,
    })
    expect(stableJson(makersPayload)).toBe(JSON.stringify(canonicalize(makersPayload), null, 2) + '\n')
  })

  it('sha256 of a payload is reproducible', () => {
    const payload = { b: 1, a: [2, { d: 3, c: 4 }] }
    expect(sha256(payload)).toBe(sha256({ a: [2, { c: 4, d: 3 }], b: 1 }))
  })
})

// -- Real data ---------------------------------------------------------------