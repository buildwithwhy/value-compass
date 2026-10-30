import { describe, expect, it } from 'vitest'
import fundersRaw from '../../data/funders.json'
import makersRaw from '../../data/makers.json'
import { buildGraph, getFunder, getMaker, getMakerBySlug, makerPath } from '../data'

// Stable coordinates: maker slugs and funder ids are the URL-safe keys the
// canonical routes and the /api/v1 export hang off. A space or '/' in one
// would produce a broken or ambiguous URL downstream, and a duplicate would
// make one record silently shadow another.

const URL_SAFE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('maker slugs', () => {
  it('every maker has a unique, URL-safe slug', () => {
    const slugs = makersRaw.makers.map((m) => m.slug)
    for (const s of slugs) expect(s).toMatch(URL_SAFE)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every slug resolves back to exactly its own maker', () => {
    for (const m of makersRaw.makers) expect(getMakerBySlug(m.slug)?.id).toBe(m.id)
  })

  it('makerPath emits slug-based paths with no space or extra slash', () => {
    for (const m of makersRaw.makers) {
      const tail = makerPath(m.id).slice('/maker/'.length)
      expect(tail).toMatch(URL_SAFE)
    }
  })
})

describe('funder ids', () => {
  it('every funder has a unique, URL-safe id', () => {
    const ids = fundersRaw.funders.map((f) => f.id)
    for (const id of ids) expect(id).toMatch(URL_SAFE)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getFunder resolves by id (display name stays a field, not the key)', () => {
    expect(getFunder('sequoia-capital')?.name).toContain('Sequoia')
    expect(getFunder('alphabet-google')?.name).toContain('Alphabet')
    expect(getFunder('no-such-funder')).toBeUndefined()
  })
})

describe('funder→maker join integrity', () => {
  it('every makers_backed and owns_outright target resolves to a maker id — 0 dangling edges', () => {
    const dangling: string[] = []
    for (const f of fundersRaw.funders)
      for (const key of ['makers_backed', 'owns_outright'] as const)
        for (const target of f[key] ?? [])
          if (!getMaker(target)) dangling.push(`${f.name} → ${target}`)
    expect(dangling).toEqual([])
  })

  it('the joins actually carry edges (guards an empty-dataset pass)', () => {
    const edges = fundersRaw.funders.flatMap((f) => [
      ...(f.makers_backed ?? []),
      ...(f.owns_outright ?? []),
    ])
    expect(edges.length).toBeGreaterThan(0)
  })

  it('the built graph resolves every edge — backs, owns_outright, owns_economically — with no warnings', () => {
    const g = buildGraph()
    expect(g.warnings).toEqual([])
    expect(g.resolvedEdgeCount).toBeGreaterThan(0)
  })
})
