import makersRaw from '../data/makers.json'
import evidenceRaw from '../data/evidence.json'
import researchRaw from '../data/company-research.json'
import { alternatives, assessmentFor, type PilotAlternative } from './recommend'

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
  wealth_dispersion: 'Who owns the company',
  transparency: 'What it publishes about itself',
  public_sharing: 'Commitments made and kept',
  culture_esg: 'How it has treated people',
  labour_integrity: 'How it has treated people',
}

export interface CompanyFact {
  maker: string
  theme: FactTheme
  /** Short headline, where the finding has one. */
  headline?: string
  /** Where a claim is unresolved, disputed or narrow, stated beside it. */
  limitation?: string
  /** Why this might bear on a choice. */
  matters?: string
  /** allegation / ruling / settlement / company statement, where it applies. */
  status?: string
  /** What the topic is, in the reader's terms. */
  topic: string
  /** The fact itself, as recorded. */
  fact: string
  sources: string[]
  date?: string
  /** Scope that changes what the fact means. */
  scope?: string
  /** The span the finding covers, where it differs from its publication date. */
  period?: string
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

const clean = (v?: string | null) => {
  if (!v || /not stated in record/i.test(v)) return undefined
  // Dates carried internal notes about how they were extracted.
  return v.replace(/\s*\((?:from the cited URL path|stated on the page|the [^)]*Index)\)/gi, '').trim()
}

interface ResearchFinding {
  maker: string
  group: 'money' | 'control' | 'contribution' | 'conduct'
  headline: string
  detail: string
  status?: string
  date?: string
  period?: string
  sources: string[]
  matters_for?: string
  does_not_settle?: string
}
const research = (researchRaw as { findings: ResearchFinding[] }).findings

const GROUP_THEME: Record<string, FactTheme> = {
  money: 'money',
  control: 'money',
  contribution: 'conduct',
  conduct: 'conduct',
}
const GROUP_TOPIC: Record<string, string> = {
  money: 'Who has invested',
  control: 'Who makes the decisions',
  contribution: 'What it gives back',
  conduct: 'How it has treated people',
}

/**
 * Facts we already hold in other shapes: the investors listed on the maker
 * record, and the ownership findings recorded against that company's
 * products. Both were previously invisible on the company profile.
 */
function carriedOverFacts(makerId: string): CompanyFact[] {
  const out: CompanyFact[] = []
  const m = makers.find((x) => x.id === makerId) as
    | { lead_backers?: string[]; structure?: string }
    | undefined

  const hasResearchedMoney = research.some(
    (r) => r.maker === makerId && r.group === 'money',
  )
  if (m?.lead_backers?.length && !hasResearchedMoney) {
    out.push({
      maker: makerId,
      theme: 'money',
      topic: 'Who has invested',
      headline: 'Investors named in its funding announcements',
      fact: m.lead_backers.join('; ') + '.',
      limitation:
        'Announced participation only. It does not establish ownership percentages, voting control, or that any part of a subscription reaches these investors.',
      sources: [],
      measured: false,
    })
  }

  const hasControlFinding = productsFor(makerId).some((p) =>
    ['c_nonprofit_control', 'c_individual_majority_voting', 'c_parent_independence'].some(
      (id) => assessmentFor(p.id, id)?.verdict !== 'unconfirmed',
    ),
  )
  if (m?.structure && m.structure !== 'Not established in this pass.' && !hasControlFinding) {
    out.push({
      maker: makerId,
      theme: 'money',
      topic: 'Who makes the decisions',
      headline: 'How the company is structured',
      fact: m.structure,
      sources: [],
      measured: false,
    })
  }

  // Ownership findings live on the product records. They are facts about the
  // company and belong here too -- but four criteria describing one
  // arrangement is one finding, not four, so take at most one of each kind.
  const CONTROL = [
    'c_nonprofit_control',
    'c_individual_majority_voting',
    'c_parent_independence',
  ]
  for (const product of productsFor(makerId)) {
    const control = CONTROL.map((id) => assessmentFor(product.id, id)).find(
      (a) => a && a.verdict !== 'unconfirmed',
    )
    const stakeRaw = assessmentFor(product.id, 'c_public_purpose_stake')
    const stake = stakeRaw?.verdict !== 'unconfirmed' ? stakeRaw : undefined

    for (const pair of [
      [control, 'Who makes the decisions'] as const,
      [stake, 'Who owns the company'] as const,
    ]) {
      const [a, topic] = pair
      if (!a) continue
      out.push({
        maker: makerId,
        theme: 'money',
        topic,
        fact: a.claim,
        limitation: a.scope ?? undefined,
        date: a.source_date ?? undefined,
        sources: a.source_url ? [a.source_url] : [],
        measured: false,
      })
    }
  }
  return out
}

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

  for (const f of research.filter((r) => r.maker === makerId)) {
    out.push({
      maker: makerId,
      theme: GROUP_THEME[f.group] ?? 'conduct',
      topic: GROUP_TOPIC[f.group] ?? 'On the record',
      headline: f.headline,
      fact: f.detail,
      limitation: f.does_not_settle,
      matters: f.matters_for,
      status: f.status,
      date: f.date,
      period: f.period,
      sources: f.sources,
      measured: false,
    })
  }

  out.push(...carriedOverFacts(makerId))

  // The same ownership fact is recorded against several criteria and against
  // the maker record. Showing it four times is not four findings.
  const seen = new Set<string>()
  return out.filter((f) => {
    const key = f.fact.slice(0, 70).toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
  const topics = new Set(factsFor(makerId).map((f) => f.topic))
  const gaps: string[] = []
  if (!topics.has('Who has invested')) gaps.push('who has invested')
  if (!topics.has('Who makes the decisions')) gaps.push('who controls the company')
  if (!topics.has('How it has treated people')) gaps.push('how it has treated workers and creators')
  if (!topics.has('What it gives back')) gaps.push('what it contributes beyond its own products')
  return gaps
}
