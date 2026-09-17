import { describe, expect, it } from 'vitest'
import {
  alternatives,
  assessmentFor,
  criteria,
  criterionIsAssessable,
  functionalState,
  recommend,
  type AlternativeOutcome,
  type CriterionOutcome,
} from '../recommend'

const ids = (list: AlternativeOutcome[]) => list.map((o) => o.alternative.id).sort()
const critIds = (list: CriterionOutcome[]) => list.map((r) => r.criterion.id)
const all = (r: { confirmed: AlternativeOutcome[]; notConfirmed: AlternativeOutcome[] }) => [
  ...r.confirmed,
  ...r.notConfirmed,
]
const F = ['fr_general_chat']

// ---------------------------------------------------------------------------
// 1. An unknown hard requirement is never shown as satisfied
// ---------------------------------------------------------------------------

describe('unknown hard requirements', () => {
  it('never places an option with an unknown requirement in confirmed matches', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_public_benefit'],
      requirements: ['c_public_benefit'],
    })
    for (const o of r.confirmed) {
      expect(critIds(o.met)).toContain('c_public_benefit')
      expect(critIds(o.unresolved)).not.toContain('c_public_benefit')
    }
    // The four with no finding are visible in their own group, not hidden.
    expect(ids(r.notConfirmed)).toEqual(['copilot', 'deepseek_app', 'gemini', 'le_chat'])
    for (const o of r.notConfirmed) expect(critIds(o.unresolved)).toContain('c_public_benefit')
  })

  it('keeps them visible, unshortlisted and unexcluded', () => {
    // Migration is assessable (Claude is evidenced to fail), so the
    // designation stands. The other five are unknown.
    const r = recommend({
      functional: F,
      priorities: ['c_service_migration'],
      requirements: ['c_service_migration'],
    })
    expect(r.confirmed).toHaveLength(0)
    expect(ids(r.excluded)).toEqual(['claude'])
    expect(ids(r.notConfirmed)).toEqual([
      'chatgpt',
      'copilot',
      'deepseek_app',
      'gemini',
      'le_chat',
    ])
  })
})

// ---------------------------------------------------------------------------
// 2. An unknown SOFT preference neither rewards nor penalises
// ---------------------------------------------------------------------------

describe('unknown soft preferences', () => {
  it('does not demote an option out of confirmed matches', () => {
    // Export is a requirement all five meet; model hosting is a soft preference
    // nobody has a finding on. The unknown must not move anyone.
    const withoutPreference = recommend({
      functional: F,
      priorities: ['c_content_export'],
      requirements: ['c_content_export'],
    })
    const withPreference = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_model_hosting'],
      requirements: ['c_content_export'],
    })
    expect(ids(withPreference.confirmed)).toEqual(ids(withoutPreference.confirmed))
    expect(withPreference.confirmed.length).toBeGreaterThan(0)
  })

  it('reports the unknown preference rather than silently dropping it', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_model_hosting'],
      requirements: ['c_content_export'],
    })
    for (const o of r.confirmed) expect(critIds(o.unresolved)).toContain('c_model_hosting')
  })

  it('does not let a soft preference exclude, however bad the finding', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_founder_bloc_majority_voting'],
      requirements: [],
    })
    expect(r.excluded).toHaveLength(0)
    const gemini = all(r).find((o) => o.alternative.id === 'gemini')
    expect(critIds(gemini!.tradeoffs)).toContain('c_founder_bloc_majority_voting')
  })
})

// ---------------------------------------------------------------------------
// 3. Precisely scoped control language
// ---------------------------------------------------------------------------

describe('control criteria stay within what the evidence shows', () => {
  it('states voting power, not control of the company', () => {
    for (const id of ['c_individual_majority_voting', 'c_founder_bloc_majority_voting']) {
      const c = criteria.find((x) => x.id === id)!
      expect(c.label).toMatch(/voting power/)
      expect(c.label).not.toMatch(/controls the company|override the board/)
      expect(c.does_not_establish).toBeTruthy()
    }
    const individual = criteria.find((c) => c.id === 'c_individual_majority_voting')!
    expect(individual.does_not_establish).toMatch(/no individual controls the company/i)
    expect(individual.does_not_establish).toMatch(/override the board/i)
  })

  it('keeps the individual and bloc questions apart on the same filing', () => {
    const individual = assessmentFor('gemini', 'c_individual_majority_voting')
    const bloc = assessmentFor('gemini', 'c_founder_bloc_majority_voting')
    expect(individual?.verdict).toBe('meets')
    expect(bloc?.verdict).toBe('fails')
    expect(individual?.scope).toMatch(/does not establish that no individual controls/i)
    expect(bloc?.scope).toMatch(/does not establish that they vote together/i)
  })
})

// ---------------------------------------------------------------------------
// 4. Product provider / model provider / model release
// ---------------------------------------------------------------------------

describe('the three identities are applied only where they answer the question', () => {
  it('leaves product-provider identity intact when model routing is unknown', () => {
    const copilot = alternatives.find((a) => a.id === 'copilot')!
    expect(copilot.model_provider.maker_id).toBe('unknown')
    // Unknown model, established operator.
    expect(copilot.product_provider.maker_id).toBe('Microsoft')
    expect(copilot.product_provider.status).toMatch(/verified_official/)
  })

  it('still applies provider-level governance findings despite unknown routing', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_individual_majority_voting'],
      requirements: ['c_individual_majority_voting'],
    })
    // Copilot's model is unknown; Microsoft's share structure is not.
    expect(ids(r.confirmed)).toContain('copilot')
  })

  it('attaches each criterion to the identity it can speak to', () => {
    const byId = Object.fromEntries(criteria.map((c) => [c.id, c.applies_to]))
    expect(byId.c_individual_majority_voting).toBe('product_provider')
    expect(byId.c_public_benefit).toBe('product_provider')
    expect(byId.c_content_export).toBe('product')
    expect(byId.c_model_hosting).toBe('model_release')
  })

  it('records a retrieval failure separately from factual uncertainty', () => {
    const chatgpt = alternatives.find((a) => a.id === 'chatgpt')!
    expect(chatgpt.product_provider.retrieval_status).toBe('blocked')
    // A 403 did not stop the product identity being established.
    expect(chatgpt.product_provider.status).toMatch(/verified_official/)
    expect(chatgpt.product_provider.retrieval_note).toMatch(/not uncertainty about the product/i)
  })
})

// ---------------------------------------------------------------------------
// 5. Export, migration and model hosting stay separate
// ---------------------------------------------------------------------------

describe('the three portability questions are distinct', () => {
  it('confirms export for five of six from official documentation', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export'],
      requirements: ['c_content_export'],
    })
    expect(ids(r.confirmed)).toEqual(['chatgpt', 'claude', 'copilot', 'gemini', 'le_chat'])
    expect(ids(r.notConfirmed)).toEqual(['deepseek_app'])
    expect(r.excluded).toHaveLength(0)
  })

  it('does not let an export finding answer the migration question', () => {
    const exportOk = assessmentFor('claude', 'c_content_export')
    const migration = assessmentFor('claude', 'c_service_migration')
    expect(exportOk?.verdict).toBe('meets')
    expect(migration?.verdict).toBe('fails')
    expect(migration?.scope).toMatch(/does not address importing Claude data/i)
  })

  it('does not let a model licence answer either of them', () => {
    const hosting = assessmentFor('deepseek_app', 'c_model_hosting')
    expect(hosting?.verdict).toBe('unconfirmed')
    expect(hosting?.scope).toMatch(/R1 model release only/i)
  })
})

// ---------------------------------------------------------------------------
// 6. The four exercise cases from the brief
// ---------------------------------------------------------------------------

describe('exercise: a soft preference with mixed evidence', () => {
  const r = recommend({
    functional: F,
    priorities: ['c_founder_bloc_majority_voting'],
    requirements: [],
  })

  it('shows one match, one trade-off and four unknowns, excluding nobody', () => {
    expect(r.excluded).toHaveLength(0)
    expect(r.confirmed).toHaveLength(alternatives.length)
    const copilot = all(r).find((o) => o.alternative.id === 'copilot')!
    const gemini = all(r).find((o) => o.alternative.id === 'gemini')!
    expect(critIds(copilot.supportingPriorities)).toContain('c_founder_bloc_majority_voting')
    expect(critIds(gemini.tradeoffs)).toContain('c_founder_bloc_majority_voting')
    const unknowns = all(r).filter((o) =>
      critIds(o.unresolved).includes('c_founder_bloc_majority_voting'),
    )
    expect(ids(unknowns)).toEqual(['chatgpt', 'claude', 'deepseek_app', 'le_chat'])
  })
})

describe('exercise: a hard requirement with confirmed matches and unknown options', () => {
  const r = recommend({
    functional: F,
    priorities: ['c_content_export'],
    requirements: ['c_content_export'],
  })

  it('shortlists only the evidenced five and isolates the unknown', () => {
    expect(r.confirmed).toHaveLength(5)
    expect(ids(r.notConfirmed)).toEqual(['deepseek_app'])
    expect(r.excluded).toHaveLength(0)
    expect(r.noConfirmedMatch).toBe(false)
  })

  it('carries the evidence for each shortlisted option', () => {
    for (const o of r.confirmed) {
      const row = o.met.find((m) => m.criterion.id === 'c_content_export')!
      expect(row.assessment?.claim).toBeTruthy()
      expect(row.assessment?.source).toBeTruthy()
      expect(row.assessment?.source_date).toBeTruthy()
    }
  })
})

describe('exercise: a requirement with no confirmed match', () => {
  const r = recommend({
    functional: F,
    priorities: ['c_service_migration'],
    requirements: ['c_service_migration'],
  })

  it('returns no match, one evidenced exclusion and five unconfirmed', () => {
    expect(r.noConfirmedMatch).toBe(true)
    expect(r.confirmed).toHaveLength(0)
    // Excluded only because Anthropic states it — not because five are unknown.
    expect(ids(r.excluded)).toEqual(['claude'])
    expect(r.notConfirmed).toHaveLength(5)
  })

  it('does not invent a winner from the unconfirmed five', () => {
    for (const o of r.notConfirmed) {
      expect(critIds(o.met)).not.toContain('c_service_migration')
      expect(critIds(o.unresolved)).toContain('c_service_migration')
    }
  })

  it('an unassessable requirement is ignored rather than emptying the list', () => {
    // Model hosting has no decided finding anywhere, so it cannot be a
    // requirement. It degrades to a preference instead of excluding all six.
    expect(criterionIsAssessable('c_model_hosting')).toBe(false)
    const hosting = recommend({
      functional: F,
      priorities: ['c_model_hosting'],
      requirements: ['c_model_hosting'],
    })
    expect(hosting.excluded).toHaveLength(0)
    expect(hosting.confirmed).toHaveLength(alternatives.length)
    expect(hosting.blindCriteria.map((c) => c.id)).toContain('c_model_hosting')
  })
})

describe('exercise: the two distinct voting-control preferences', () => {
  const asIndividual = recommend({
    functional: F,
    priorities: ['c_individual_majority_voting'],
    requirements: ['c_individual_majority_voting'],
  })
  const asBloc = recommend({
    functional: F,
    priorities: ['c_founder_bloc_majority_voting'],
    requirements: ['c_founder_bloc_majority_voting'],
  })

  it('shortlists Gemini under one reading and excludes it under the other', () => {
    expect(ids(asIndividual.confirmed)).toEqual(['copilot', 'gemini'])
    expect(ids(asBloc.confirmed)).toEqual(['copilot'])
    expect(ids(asBloc.excluded)).toEqual(['gemini'])
    expect(asIndividual.excluded).toHaveLength(0)
  })

  it('leaves the same four unconfirmed under both readings', () => {
    expect(ids(asIndividual.notConfirmed)).toEqual(['chatgpt', 'claude', 'deepseek_app', 'le_chat'])
    expect(ids(asBloc.notConfirmed)).toEqual(['chatgpt', 'claude', 'deepseek_app', 'le_chat'])
  })
})

// ---------------------------------------------------------------------------
// 7. Functional eligibility stays light and honest
// ---------------------------------------------------------------------------

describe('light functional eligibility', () => {
  it('counts official documentation as confirmation', () => {
    const gemini = alternatives.find((a) => a.id === 'gemini')!
    expect(functionalState(gemini, 'fr_general_chat')).toBe('confirmed')
  })

  it('treats an unresearched capability as unknown, not a pass', () => {
    const gemini = alternatives.find((a) => a.id === 'gemini')!
    expect(functionalState(gemini, 'fr_mobile')).toBe('unknown')
  })

  it('moves an option to requirement-not-confirmed on a functional gap, never excludes', () => {
    const r = recommend({
      functional: ['fr_general_chat', 'fr_mobile'],
      priorities: ['c_content_export'],
      requirements: ['c_content_export'],
    })
    expect(r.excluded).toHaveLength(0)
    const gemini = r.notConfirmed.find((o) => o.alternative.id === 'gemini')
    expect(gemini?.functionalGaps.map((g) => g.id)).toContain('fr_mobile')
  })

  it('refuses to make an unassessable criterion a requirement', () => {
    const unassessable = criteria.filter((c) => !criterionIsAssessable(c.id))
    expect(unassessable.map((c) => c.id)).toContain('c_model_hosting')
    const r = recommend({
      functional: F,
      priorities: ['c_model_hosting'],
      requirements: ['c_model_hosting'],
    })
    expect(r.excluded).toHaveLength(0)
    expect(r.blindCriteria.map((c) => c.id)).toContain('c_model_hosting')
  })
})
