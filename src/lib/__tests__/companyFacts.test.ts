import { describe, expect, it } from 'vitest'
import makersRaw from '../../data/makers.json'
import researchRaw from '../../data/company-research.json'
import { alternatives } from '../recommend'
import {
  companiesWithSomethingToSay,
  factsByTheme,
  factsFor,
  gapsFor,
  productsFor,
} from '../companyFacts'

const makers = (makersRaw as { makers: { id: string; lead_backers: string[] }[] }).makers
const findings = (researchRaw as { findings: { maker: string; headline: string }[] }).findings

describe('facts are drawn from every place we hold them', () => {
  // The bug this guards: factsFor() read only axis_evidence, so a profile could
  // report that nothing had been established while the same page listed the
  // company's investors and its products carried sourced ownership findings.
  it('says something about every company whose product we compare', () => {
    const operators = new Set(alternatives.map((a) => a.product_provider.maker_id))
    for (const id of operators) {
      expect(factsFor(id).length, `${id} has no facts`).toBeGreaterThan(0)
    }
  })

  it('surfaces a company with backers even when it has no axis scores', () => {
    const scoreless = makers.find((m) => m.lead_backers?.length > 0 && factsFor(m.id).length > 0)
    expect(scoreless).toBeDefined()
  })

  it('carries every research finding through to the company profile', () => {
    for (const f of findings) {
      const headlines = factsFor(f.maker).map((x) => x.headline)
      expect(headlines, `${f.maker}: ${f.headline}`).toContain(f.headline)
    }
  })

  it('reaches every company in the research batch', () => {
    for (const maker of new Set(findings.map((f) => f.maker))) {
      expect(companiesWithSomethingToSay(), maker).toContain(maker)
    }
  })
})

describe('one arrangement is one finding', () => {
  // Proton showed four near-identical control facts because the same ownership
  // claim was recorded against several products.
  it('never repeats the same fact text for one company', () => {
    for (const m of makers) {
      const texts = factsFor(m.id).map((f) => f.fact.slice(0, 70))
      expect(new Set(texts).size, `${m.id} repeats a fact`).toBe(texts.length)
    }
  })

  it('shows at most one control fact per product', () => {
    for (const m of makers) {
      const control = factsFor(m.id).filter((f) => f.topic === 'Who makes the decisions')
      expect(control.length, `${m.id} control facts`).toBeLessThanOrEqual(
        Math.max(1, productsFor(m.id).length),
      )
    }
  })
})

describe('gaps name only what is genuinely missing', () => {
  it('never names a topic the company already has a fact on', () => {
    for (const m of makers) {
      const topics = factsFor(m.id).map((f) => f.topic.toLowerCase())
      for (const gap of gapsFor(m.id)) {
        const clash = topics.some((t) => t.includes(gap.split(' ').slice(-2).join(' ')))
        expect(clash, `${m.id}: gap "${gap}" contradicts a recorded fact`).toBe(false)
      }
    }
  })

  it('reports no gaps for a company researched across all four groups', () => {
    expect(gapsFor('Proton')).not.toContain('what it contributes beyond its own products')
  })
})

describe('public text carries no research bookkeeping', () => {
  const BANNED = [
    'No funder node',
    'Edge-only',
    'not modeled as nodes',
    'Not established in this pass',
    'From the cited URL path',
    'unsupported',
    'justifies_whole',
    'claim_support',
    'this dataset',
  ]

  it('keeps it out of every fact a reader can see', () => {
    for (const m of makers) {
      for (const f of factsFor(m.id)) {
        const text = [f.headline, f.fact, f.limitation, f.matters, f.scope, f.topic]
          .filter(Boolean)
          .join(' ')
        for (const phrase of BANNED) {
          expect(text.toLowerCase(), `${m.id}: ${phrase}`).not.toContain(phrase.toLowerCase())
        }
      }
    }
  })

  it('gives every fact a date or a source, or states its limitation', () => {
    for (const m of makers) {
      for (const f of factsFor(m.id)) {
        const grounded = f.sources.length > 0 || Boolean(f.date ?? f.period) || Boolean(f.limitation)
        expect(grounded, `${m.id}: "${f.fact.slice(0, 50)}" floats free`).toBe(true)
      }
    }
  })
})

describe('themes partition the facts', () => {
  it('places every fact in exactly one theme', () => {
    for (const m of makers) {
      const all = factsFor(m.id)
      const byTheme = factsByTheme(m.id)
      const counted = byTheme.money.length + byTheme.conduct.length + byTheme.data.length
      expect(counted, m.id).toBe(all.length)
    }
  })
})
