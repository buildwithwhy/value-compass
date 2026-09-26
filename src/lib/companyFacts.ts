import makersRaw from '../data/makers.json'
import evidenceRaw from '../data/evidence.json'
import { alternatives, type PilotAlternative } from './recommend'

// ---------------------------------------------------------------------------
// Company facts.
//
// The five-axis scores were never publishable: the rubric gives no rule for
// combining sub-indicators, so a single sourced finding could not licence a
// 0-4 verdict. The findings themselves are fine, and until now they were only
// reachable through the score that could not carry them.
//
// This surfaces the narrow fact and leaves the score behind.
// ---------------------------------------------------------------------------

export type FactTheme = 'money' | 'data' | 'conduct'

export const THEMES: Record<FactTheme, { label: string; question: string }> = {
  money: {
    label: 'Ownership and money',
    question: 'Who gains money and influence from choosing this?',
  },
  data: {
    label: 'Openness and data',
    question: 'What happens to my data and work?',
  },
  conduct: {
    label: 'Conduct and commitments',
    question: 'How does the company treat people, and does it keep its word?',
  },
}

const AXIS_THEME: Record<string, FactTheme> = {
  wealth_dispersion: 'money',
  transparency: 'data',
  public_sharing: 'conduct',
  culture_esg: 'conduct',
  labour_integrity: 'conduct',
}

const AXIS_LABEL: Record<string, string> = {
  wealth_dispersion: 'Who holds the economics',
  transparency: 'Published transparency',
  public_sharing: 'Commitments made and kept',
  culture_esg: 'Workers, environment and governance',
  labour_integrity: 'Creators and labour',
}

export interface CompanyFact {
  maker: string
  theme: FactTheme
  /** What the topic is, in the reader's terms. */
  topic: string
  /** The fact itself, as recorded. */
  fact: string
  sources: string[]
  date?: string
  /** Scope that changes what the fact means. */
  scope?: string
  /**
   * True where this was also strong enough to drive a recommendation. The
   * distinction matters: a transparency index score is a measurement with an
   * edition and a scope, not a verdict on a company or its current product.
   */
  measured: boolean
}

interface AxisRecord {
  basis?: string
  claim_support?: string
  supported_fact?: string
  source_date?: string
  source_scope?: string | null
  justifies_whole?: boolean
}

const makers = (makersRaw as { makers: { id: string; axes: Record<string, { sources?: string[] }> }[] })
  .makers
const axisEvidence = (evidenceRaw as unknown as {
  axis_evidence: Record<string, Record<string, AxisRecord>>
}).axis_evidence

const clean = (v?: string | null) =>
  !v || /not stated in record/i.test(v) ? undefined : v

/** Every sourced fact we hold about a company, score or no score. */
export function factsFor(makerId: string): CompanyFact[] {
  const axes = axisEvidence[makerId] ?? {}
  const sourceLists = makers.find((m) => m.id === makerId)?.axes ?? {}
  const out: CompanyFact[] = []

  for (const [axis, rec] of Object.entries(axes)) {
    if (rec.basis !== 'sourced') continue
    if (rec.claim_support !== 'establishes_fact') continue
    if (!rec.supported_fact) continue
    out.push({
      maker: makerId,
      theme: AXIS_THEME[axis] ?? 'conduct',
      topic: AXIS_LABEL[axis] ?? axis,
      fact: rec.supported_fact,
      sources: sourceLists[axis]?.sources ?? [],
      date: clean(rec.source_date),
      scope: clean(rec.source_scope),
      measured: rec.justifies_whole === true,
    })
  }
  return out
}

export function factsByTheme(makerId: string): Record<FactTheme, CompanyFact[]> {
  const all = factsFor(makerId)
  return {
    money: all.filter((f) => f.theme === 'money'),
    data: all.filter((f) => f.theme === 'data'),
    conduct: all.filter((f) => f.theme === 'conduct'),
  }
}

/** Products in the recommendation catalogue operated by this company. */
export function productsFor(makerId: string): PilotAlternative[] {
  return alternatives.filter((a) => a.product_provider.maker_id === makerId)
}

/** Companies that have at least one sourced fact or a listed product. */
export function companiesWithSomethingToSay(): string[] {
  return makers
    .map((m) => m.id)
    .filter((id) => factsFor(id).length > 0 || productsFor(id).length > 0)
}

/**
 * A short, honest note on what is missing for this company, named specifically
 * rather than as a general disclaimer.
 */
export function gapsFor(makerId: string): string[] {
  const have = new Set(factsFor(makerId).map((f) => f.theme))
  const gaps: string[] = []
  if (!have.has('money')) gaps.push('who holds the economics')
  if (!have.has('conduct')) gaps.push('conduct and commitments')
  if (!have.has('data')) gaps.push('published transparency')
  return gaps
}
