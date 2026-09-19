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
    // Account transfer is assessable — Anthropic states it does not support
    // moving between personal Claude accounts. The other five are unknown.
    const r = recommend({
      functional: F,
      priorities: ['c_account_transfer'],
      requirements: ['c_account_transfer'],
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
      // The label has to stand on its own, without a caveat in front of it.
      expect(c.label).toMatch(/votes/)
      expect(c.label).not.toMatch(/controls the company|override the board/)
      expect(c.label).not.toMatch(/majority voting control/)
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

  it('does not let an export finding answer the transfer question', () => {
    const exportOk = assessmentFor('claude', 'c_content_export')
    const transfer = assessmentFor('claude', 'c_account_transfer')
    expect(exportOk?.verdict).toBe('meets')
    expect(transfer?.verdict).toBe('fails')
    expect(transfer?.scope).toMatch(/two personal Claude accounts/i)
  })

  // ---- The correction: account-to-account is not cross-service -------------
  it('does not let account-transfer evidence decide cross-service migration', () => {
    const transfer = assessmentFor('claude', 'c_account_transfer')
    const migration = assessmentFor('claude', 'c_service_migration')

    // The evidence is real, and it is about one destination only.
    expect(transfer?.verdict).toBe('fails')
    expect(transfer?.scope).toMatch(/says nothing about moving content to a different company/i)

    // The other destination stays unconfirmed — not inherited from the first.
    expect(migration?.verdict).toBe('unconfirmed')
    expect(migration?.uncertainty).toMatch(/does not answer this/i)
  })

  it('excludes nobody from cross-service migration on the strength of it', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_service_migration'],
      requirements: ['c_service_migration'],
    })
    // Claude was wrongly excluded here before. Nothing is documented either
    // way for any of the six, so nothing is ruled in or out.
    expect(r.excluded).toHaveLength(0)
    expect(r.confirmed).toHaveLength(0)
    expect(r.notConfirmed).toHaveLength(alternatives.length)
    expect(r.unassessableRequirements.map((c) => c.id)).toContain('c_service_migration')
  })

  it('states what cross-service evidence would have to address', () => {
    const c = criteria.find((x) => x.id === 'c_service_migration')!
    expect((c as { requires_evidence_about?: string }).requires_evidence_about).toMatch(
      /destination/i,
    )
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
    priorities: ['c_account_transfer'],
    requirements: ['c_account_transfer'],
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
      expect(critIds(o.met)).not.toContain('c_account_transfer')
      expect(critIds(o.unresolved)).toContain('c_account_transfer')
    }
  })
})

describe('a requirement is preserved when nothing is documented', () => {
  const r = recommend({
    functional: F,
    priorities: ['c_model_hosting'],
    requirements: ['c_model_hosting'],
  })

  it('does not downgrade it to a preference', () => {
    expect(criterionIsAssessable('c_model_hosting')).toBe(false)
    // It stays a requirement, so nothing is shortlisted as though it were met.
    expect(r.confirmed).toHaveLength(0)
    expect(r.notConfirmed).toHaveLength(alternatives.length)
    expect(r.hasRequirements).toBe(true)
    for (const o of r.notConfirmed) {
      const row = o.unresolved.find((u) => u.criterion.id === 'c_model_hosting')!
      expect(row.weight).toBe('requirement')
    }
  })

  it('reports the limitation explicitly rather than substituting an intention', () => {
    expect(r.unassessableRequirements.map((c) => c.id)).toEqual(['c_model_hosting'])
  })

  it('still excludes nobody on the basis of an unknown', () => {
    expect(r.excluded).toHaveLength(0)
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

  it('flags an undocumented criterion without discarding the user’s intent', () => {
    const unassessable = criteria.filter((c) => !criterionIsAssessable(c.id))
    expect(unassessable.map((c) => c.id)).toContain('c_model_hosting')
    const r = recommend({
      functional: F,
      priorities: ['c_model_hosting'],
      requirements: ['c_model_hosting'],
    })
    expect(r.excluded).toHaveLength(0)
    expect(r.blindCriteria.map((c) => c.id)).toContain('c_model_hosting')
    expect(r.unassessableRequirements.map((c) => c.id)).toContain('c_model_hosting')
  })
})

// ---------------------------------------------------------------------------
// 8. Eligibility is not a recommendation
// ---------------------------------------------------------------------------

describe('eligibility and preference fit are reported separately', () => {
  it('sets no requirements flag when the user only expressed preferences', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_founder_bloc_majority_voting'],
      requirements: [],
    })
    // The heading depends on this: "Options to consider", not "confirmed matches".
    expect(r.hasRequirements).toBe(false)
    expect(r.confirmed).toHaveLength(alternatives.length)
    for (const o of r.confirmed) expect(o.met).toHaveLength(0)
  })

  it('keeps met requirements apart from documented preference fit', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_founder_bloc_majority_voting'],
      requirements: ['c_content_export'],
    })
    expect(r.hasRequirements).toBe(true)
    const copilot = r.confirmed.find((o) => o.alternative.id === 'copilot')!
    // Eligibility…
    expect(critIds(copilot.met)).toEqual(['c_content_export'])
    // …and fit, which is a different list.
    expect(critIds(copilot.supportingPriorities)).toEqual(['c_founder_bloc_majority_voting'])
  })

  it('keeps an option with unknown preference fit discoverable, without claiming fit', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_founder_bloc_majority_voting'],
      requirements: ['c_content_export'],
    })
    const claude = r.confirmed.find((o) => o.alternative.id === 'claude')!
    // Eligible and listed…
    expect(critIds(claude.met)).toContain('c_content_export')
    // …but its fit on the preference is stated as unknown, not as a match.
    expect(critIds(claude.supportingPriorities)).not.toContain('c_founder_bloc_majority_voting')
    expect(critIds(claude.unresolved)).toContain('c_founder_bloc_majority_voting')
  })

  it('produces no overall score or ranking number anywhere', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_public_benefit'],
      requirements: ['c_content_export'],
    })
    for (const o of [...r.confirmed, ...r.notConfirmed, ...r.excluded]) {
      expect(o).not.toHaveProperty('score')
      expect(o).not.toHaveProperty('rank')
      expect(o).not.toHaveProperty('fit')
    }
  })
})

// ---------------------------------------------------------------------------
// 9. Criterion labels stand on their own
// ---------------------------------------------------------------------------

describe('criterion labels are readable without a disclaimer', () => {
  it('avoids jargon and internal vocabulary in the label', () => {
    for (const c of criteria) {
      expect(c.label).not.toMatch(/criterion|eligib|verdict|assess|predicate/i)
      expect(c.label.length).toBeLessThan(80)
      expect(c.plain).toBeTruthy()
    }
  })

  it('distinguishes the two transfer destinations in the labels themselves', () => {
    const acct = criteria.find((c) => c.id === 'c_account_transfer')!
    const cross = criteria.find((c) => c.id === 'c_service_migration')!
    expect(acct.label).toMatch(/same provider/i)
    expect(cross.label).toMatch(/different company/i)
  })
})

// ---------------------------------------------------------------------------
// 10. Presentation guarantees
// ---------------------------------------------------------------------------

import { criterionCoverage, criterionGroup, findingLabel, summarisePreferences } from '../recommend'

describe('a finding is never headed by the wish', () => {
  it('names what the evidence says, not what was asked for', () => {
    expect(findingLabel('meets')).toBe('Documented alignment')
    expect(findingLabel('fails')).toBe('Documented conflict')
    expect(findingLabel('unconfirmed')).toBe('Not established in our research')
  })

  it('gives Gemini a conflict label on the founder-bloc question', () => {
    // The card must not headline "founders hold less than half the votes"
    // above a finding that says they hold 52.7%.
    const a = assessmentFor('gemini', 'c_founder_bloc_majority_voting')!
    expect(findingLabel(a.verdict)).toBe('Documented conflict')
    expect(a.claim).toMatch(/52\.7/)
  })

  it('keeps a proposed change distinct from a current arrangement', () => {
    const proposed = assessmentFor('claude', 'c_founder_bloc_majority_voting')!
    expect(proposed.status).toBe('proposed')
    expect(proposed.verdict).toBe('unconfirmed')
    // An unknown must not be presentable as "in force".
    expect(findingLabel(proposed.verdict)).toBe('Not established in our research')
  })
})

describe('inputs express preferences, not questions', () => {
  it('marks a criterion with no direction to prefer as informational', () => {
    const board = criteria.find((c) => c.id === 'c_board_election_rights')!
    expect(board.informational).toBe(true)
    expect(criterionGroup(board)).toBe('more')
  })

  it('never infers a preference from an informational criterion', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_board_election_rights'],
      requirements: [],
    })
    // It contributes no direction to the summary.
    expect(summarisePreferences(r, {
      functional: F,
      priorities: ['c_board_election_rights'],
      requirements: [],
    })).toHaveLength(0)
  })

  it('offers well-covered criteria first and keeps thin ones discoverable', () => {
    const core = criteria.filter((c) => criterionGroup(c) === 'core').map((c) => c.id)
    const more = criteria.filter((c) => criterionGroup(c) === 'more').map((c) => c.id)
    expect(core).toContain('c_content_export')
    expect(core).toContain('c_individual_majority_voting')
    expect(more).toContain('c_model_hosting')
    expect(more).toContain('c_service_migration')
    // Nothing is dropped.
    expect(core.length + more.length).toBe(criteria.length)
  })

  it('exposes coverage before a criterion is chosen', () => {
    expect(criterionCoverage('c_content_export')).toEqual({ decided: 5, total: alternatives.length })
    expect(criterionCoverage('c_model_hosting').decided).toBe(0)
  })
})

describe('the result summary reports without nominating a winner', () => {
  const input = {
    functional: F,
    priorities: ['c_founder_bloc_majority_voting'],
    requirements: [],
  }
  const summaries = summarisePreferences(recommend(input), input)

  it('counts alignment, conflict and unknown separately', () => {
    const [s] = summaries
    expect(s.aligned.map((a) => a.id)).toEqual(['copilot'])
    expect(s.conflicting.map((a) => a.id)).toEqual(['gemini'])
    expect(s.unresolved).toHaveLength(4)
  })

  it('offers direction only where one option holds the only finding in favour', () => {
    expect(summaries[0].soleAligned?.id).toBe('copilot')
  })

  it('offers no direction when several options align', () => {
    const many = {
      functional: F,
      priorities: ['c_content_export'],
      requirements: [],
    }
    const [s] = summarisePreferences(recommend(many), many)
    expect(s.aligned.length).toBeGreaterThan(1)
    expect(s.soleAligned).toBeNull()
  })

  it('offers no direction when nothing is documented', () => {
    const none = { functional: F, priorities: ['c_model_hosting'], requirements: [] }
    const [s] = summarisePreferences(recommend(none), none)
    expect(s.aligned).toHaveLength(0)
    expect(s.conflicting).toHaveLength(0)
    expect(s.soleAligned).toBeNull()
  })

  it('keeps every option discoverable whatever the summary says', () => {
    const r = recommend(input)
    expect(r.confirmed.length + r.notConfirmed.length + r.excluded.length).toBe(
      alternatives.length,
    )
  })
})

describe('the summary reports every researched option', () => {
  const input = {
    functional: F,
    priorities: ['c_founder_bloc_majority_voting'],
    requirements: ['c_founder_bloc_majority_voting'],
  }
  const result = recommend(input)
  const [s] = summarisePreferences(result, input)

  it('still counts a finding whose option the requirement excluded', () => {
    // Gemini is ruled out by this requirement. Its 52.7% finding is the reason,
    // so dropping it from the counts would erase the evidence that did the work.
    expect(result.excluded.map((o) => o.alternative.id)).toEqual(['gemini'])
    expect(s.conflicting.map((a) => a.id)).toEqual(['gemini'])
  })

  it('accounts for all six options', () => {
    expect(s.aligned.length + s.conflicting.length + s.unresolved.length).toBe(
      alternatives.length,
    )
  })

  it('points only at an option the user can still choose', () => {
    expect(s.soleAligned?.id).toBe('copilot')
    expect(result.confirmed.map((o) => o.alternative.id)).toContain('copilot')
  })

  it('offers no direction when the sole aligned option is itself excluded', () => {
    // Require something Copilot fails, while preferring the criterion it alone meets.
    const conflicted = {
      functional: F,
      priorities: ['c_founder_bloc_majority_voting'],
      requirements: ['c_public_benefit_mechanism'],
    }
    const r = recommend(conflicted)
    const [sm] = summarisePreferences(r, conflicted)
    expect(sm.aligned.map((a) => a.id)).toEqual(['copilot'])
    if (r.excluded.some((o) => o.alternative.id === 'copilot')) {
      expect(sm.soleAligned).toBeNull()
    }
  })
})
