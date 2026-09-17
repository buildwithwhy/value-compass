import { describe, expect, it } from 'vitest'
import {
  alternatives,
  assessmentFor,
  criteria,
  criterionIsAssessable,
  functionalState,
  recommend,
} from '../recommend'

const ids = (list: { alternative: { id: string } }[]) => list.map((o) => o.alternative.id).sort()

describe('the corrected predicates are kept apart', () => {
  it('does not let a founder bloc stand in for individual control', () => {
    const individual = assessmentFor('gemini', 'c_individual_control')
    const bloc = assessmentFor('gemini', 'c_founder_bloc_control')
    // Same underlying filing, opposite verdicts — because they are different questions.
    expect(individual?.verdict).toBe('meets')
    expect(bloc?.verdict).toBe('fails')
    expect(individual?.claim).toMatch(/27\.1|25\.2/)
    expect(bloc?.claim).toMatch(/52\.7/)
  })

  it('does not treat published weights as proof a hosted assistant is portable', () => {
    // R1's licence is solid; the link to the product is not, so the verdict is
    // unconfirmed rather than a pass.
    const a = assessmentFor('deepseek_app', 'c_model_hosting')
    expect(a?.verdict).toBe('unconfirmed')
    expect(a?.scope).toMatch(/NOT the consumer assistant/)
    expect(a?.uncertainty).toMatch(/which model .* routes to is unverified/i)
  })

  it('keeps content export and service migration as separate, unresearched criteria', () => {
    for (const id of ['c_content_export', 'c_service_migration']) {
      const c = criteria.find((x) => x.id === id)
      expect(c?.supported).toBe(false)
      expect(criterionIsAssessable(id)).toBe(false)
    }
  })

  it('records a withdrawn mechanism under continuity, not under current arrangements', () => {
    const current = assessmentFor('chatgpt', 'c_public_benefit')
    const continuity = assessmentFor('chatgpt', 'c_commitment_continuity')
    expect(current?.verdict).toBe('meets')
    expect(current?.status).toBe('in_force')
    expect(continuity?.verdict).toBe('fails')
    expect(continuity?.status).toBe('withdrawn')
  })

  it('records a proposed change as proposed, never as in force', () => {
    const a = assessmentFor('claude', 'c_individual_control')
    expect(a?.status).toBe('proposed')
    expect(a?.verdict).toBe('unconfirmed')
  })
})

describe('priorities are soft unless explicitly made requirements', () => {
  it('never excludes on a soft priority, however bad the finding', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_founder_bloc_control'],
      requirements: [],
    })
    // Gemini is evidenced to fail, but as a preference that is a trade-off.
    expect(r.excluded).toHaveLength(0)
    const gemini = [...r.confirmed, ...r.potential].find((o) => o.alternative.id === 'gemini')
    expect(gemini?.tradeoffs.map((t) => t.criterion.id)).toContain('c_founder_bloc_control')
  })

  it('excludes only on evidence of failure against a stated requirement', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_founder_bloc_control'],
      requirements: ['c_founder_bloc_control'],
    })
    expect(ids(r.excluded)).toEqual(['gemini'])
    // The other five are unconfirmed, not excluded.
    expect(ids(r.potential)).not.toContain('gemini')
    expect(r.potential.length + r.confirmed.length).toBe(alternatives.length - 1)
  })

  it('never lets an unknown exclude anything', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_model_hosting'],
      requirements: ['c_model_hosting'],
    })
    expect(r.excluded).toHaveLength(0)
    expect(r.confirmed).toHaveLength(0)
    expect(r.potential).toHaveLength(alternatives.length)
  })

  it('refuses to make an unassessable criterion a requirement', () => {
    expect(criterionIsAssessable('c_content_export')).toBe(false)
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_content_export'],
      requirements: ['c_content_export'],
    })
    // The designation is ignored rather than excluding all six.
    expect(r.excluded).toHaveLength(0)
    expect(r.blindCriteria.map((c) => c.id)).toContain('c_content_export')
  })
})

describe('the three worked scenarios', () => {
  it('scenario 1 — portability: no confirmed match, two options unresolved', () => {
    const r = recommend({
      functional: ['fr_general_chat', 'fr_web'],
      priorities: ['c_model_hosting'],
      requirements: ['c_model_hosting'],
    })
    expect(r.noConfirmedMatch).toBe(true)
    expect(r.excluded).toHaveLength(0)
    // Every option carries the same unresolved requirement, and says so.
    for (const o of r.potential) {
      expect(o.unresolved.map((u) => u.criterion.id)).toContain('c_model_hosting')
    }
  })

  it('scenario 2 — control: the answer depends on which predicate is meant', () => {
    const asIndividual = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_individual_control'],
      requirements: ['c_individual_control'],
    })
    const asBloc = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_founder_bloc_control'],
      requirements: ['c_founder_bloc_control'],
    })
    // Same provider, same filing, opposite outcomes.
    expect(asIndividual.excluded).toHaveLength(0)
    expect(ids(asBloc.excluded)).toEqual(['gemini'])
    const geminiIndividual = [...asIndividual.confirmed, ...asIndividual.potential].find(
      (o) => o.alternative.id === 'gemini',
    )
    expect(geminiIndividual?.met.map((m) => m.criterion.id)).toContain('c_individual_control')
  })

  it('scenario 3 — public benefit: two options match on current arrangements, unranked', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_public_benefit'],
      requirements: ['c_public_benefit'],
    })
    const matching = [...r.confirmed, ...r.potential].filter((o) =>
      o.met.some((m) => m.criterion.id === 'c_public_benefit'),
    )
    expect(ids(matching)).toEqual(['chatgpt', 'claude'])
    expect(r.excluded).toHaveLength(0)
  })

  it('scenario 3 + continuity separates a withdrawn mechanism from a current one', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_public_benefit', 'c_commitment_continuity'],
      requirements: ['c_public_benefit'],
    })
    const chatgpt = [...r.confirmed, ...r.potential].find((o) => o.alternative.id === 'chatgpt')
    // Still meets the current-arrangements requirement…
    expect(chatgpt?.met.map((m) => m.criterion.id)).toContain('c_public_benefit')
    // …and the withdrawal shows up as a trade-off, not as an exclusion.
    expect(chatgpt?.tradeoffs.map((t) => t.criterion.id)).toContain('c_commitment_continuity')
    expect(r.excluded).toHaveLength(0)
  })

  it('combining portability with public benefit yields no confirmed match, not incompatibility', () => {
    const r = recommend({
      functional: ['fr_general_chat'],
      priorities: ['c_public_benefit', 'c_model_hosting'],
      requirements: ['c_public_benefit', 'c_model_hosting'],
    })
    expect(r.noConfirmedMatch).toBe(true)
    // Crucially: nothing is excluded. Nothing establishes incompatibility.
    expect(r.excluded).toHaveLength(0)
  })
})

describe('light functional eligibility is honest about itself', () => {
  it('reads an assumption carried from older records as unknown, not as a pass', () => {
    const gemini = alternatives.find((a) => a.id === 'gemini')!
    expect(gemini.functional.fr_general_chat).toBe('assumed_from_dataset')
    expect(functionalState(gemini, 'fr_general_chat')).toBe('unknown')
  })

  it('counts an officially verified capability as confirmed', () => {
    const claude = alternatives.find((a) => a.id === 'claude')!
    expect(functionalState(claude, 'fr_mobile')).toBe('confirmed')
  })

  it('never excludes on a functional gap alone', () => {
    const r = recommend({
      functional: ['fr_general_chat', 'fr_mobile', 'fr_free_entry'],
      priorities: ['c_public_benefit'],
      requirements: [],
    })
    expect(r.excluded).toHaveLength(0)
  })
})
