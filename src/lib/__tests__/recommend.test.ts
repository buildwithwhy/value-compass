import { describe, expect, it } from 'vitest'
import {
  alternatives,
  assessmentFor,
  criteria,
  criterionIsAssessable,
  functionalRequirements,
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
    // Lumo joins Claude and ChatGPT here: Proton's controlling shareholder is a
    // foundation legally bound to its purpose. The ten with no finding stay
    // visible in their own group rather than being hidden.
    expect(ids(r.confirmed).sort()).toEqual(['chatgpt', 'claude', 'lumo'])
    expect(r.notConfirmed).toHaveLength(10)
    for (const o of r.notConfirmed) expect(critIds(o.unresolved)).toContain('c_public_benefit')
  })

  it('keeps them visible, unshortlisted and unexcluded', () => {
    // Account transfer is assessable — Anthropic states it does not support
    // moving between personal Claude accounts. The other twelve are unknown.
    const r = recommend({
      functional: F,
      priorities: ['c_account_transfer'],
      requirements: ['c_account_transfer'],
    })
    expect(r.confirmed).toHaveLength(0)
    expect(ids(r.excluded)).toEqual(['claude'])
    expect(r.notConfirmed).toHaveLength(12)
    expect(ids(r.notConfirmed)).not.toContain('claude')
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
      priorities: ['c_content_export', 'c_service_migration'],
      requirements: ['c_content_export'],
    })
    expect(ids(withPreference.confirmed)).toEqual(ids(withoutPreference.confirmed))
    expect(withPreference.confirmed.length).toBeGreaterThan(0)
  })

  it('reports the unknown preference rather than silently dropping it', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export', 'c_service_migration'],
      requirements: ['c_content_export'],
    })
    for (const o of r.confirmed) expect(critIds(o.unresolved)).toContain('c_service_migration')
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
  it('confirms export for six of thirteen from official documentation', () => {
    const r = recommend({
      functional: F,
      priorities: ['c_content_export'],
      requirements: ['c_content_export'],
    })
    expect(ids(r.confirmed)).toEqual([
      'chatgpt', 'claude', 'copilot', 'gemini', 'le_chat', 'meta_ai',
    ])
    // The seven unconfirmed include both privacy-first additions: neither
    // Proton nor DuckDuckGo documents getting your conversations out.
    expect(ids(r.notConfirmed).sort()).toEqual(
      ['deepseek_app', 'duckai', 'grok', 'kimi', 'lumo', 'perplexity', 'qwen_chat'].sort(),
    )
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
    // Model hosting is now documented for DeepSeek, but it still says nothing
    // about getting your conversations out or into someone else's product.
    const hosting = assessmentFor('deepseek_app', 'c_model_hosting')
    expect(hosting?.verdict).toBe('meets')
    expect(assessmentFor('deepseek_app', 'c_service_migration')?.verdict).toBe('unconfirmed')
    expect(assessmentFor('deepseek_app', 'c_account_transfer')?.verdict).toBe('unconfirmed')
  })

  it('never reads a hostable model as a reproducible service', () => {
    // Running the weights is not running the assistant. Every match has to say so.
    for (const alt of alternatives) {
      const a = assessmentFor(alt.id, 'c_model_hosting')
      if (a?.verdict === 'meets') {
        expect(a.scope).toMatch(/not establish that the assistant service/i)
      }
    }
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

  it('shows one match, two trade-offs and ten unknowns, excluding nobody', () => {
    expect(r.excluded).toHaveLength(0)
    expect(r.confirmed).toHaveLength(alternatives.length)
    const copilot = all(r).find((o) => o.alternative.id === 'copilot')!
    const gemini = all(r).find((o) => o.alternative.id === 'gemini')!
    expect(critIds(copilot.supportingPriorities)).toContain('c_founder_bloc_majority_voting')
    expect(critIds(gemini.tradeoffs)).toContain('c_founder_bloc_majority_voting')
    const unknowns = all(r).filter((o) =>
      critIds(o.unresolved).includes('c_founder_bloc_majority_voting'),
    )
    expect(unknowns).toHaveLength(10)
    // Meta AI joins Gemini as an evidenced conflict, so the criterion now
    // separates on both sides rather than only one.
    const meta = all(r).find((o) => o.alternative.id === 'meta_ai')!
    expect(critIds(meta.tradeoffs)).toContain('c_founder_bloc_majority_voting')
  })
})

describe('exercise: a hard requirement with confirmed matches and unknown options', () => {
  const r = recommend({
    functional: F,
    priorities: ['c_content_export'],
    requirements: ['c_content_export'],
  })

  it('shortlists only the evidenced six and isolates the unknowns', () => {
    expect(r.confirmed).toHaveLength(6)
    expect(r.notConfirmed).toHaveLength(7)
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

  it('returns no match, one evidenced exclusion and twelve unconfirmed', () => {
    expect(r.noConfirmedMatch).toBe(true)
    expect(r.confirmed).toHaveLength(0)
    // Excluded only because Anthropic states it — not because five are unknown.
    expect(ids(r.excluded)).toEqual(['claude'])
    expect(r.notConfirmed).toHaveLength(12)
  })

  it('does not invent a winner from the unconfirmed twelve', () => {
    for (const o of r.notConfirmed) {
      expect(critIds(o.met)).not.toContain('c_account_transfer')
      expect(critIds(o.unresolved)).toContain('c_account_transfer')
    }
  })
})

describe('a requirement is preserved when nothing is documented', () => {
  // c_model_hosting used to be the empty criterion. The expansion documented it
  // for four options, so the unknown-requirement case moves to the one criterion
  // still undocumented for every option.
  const r = recommend({
    functional: F,
    priorities: ['c_service_migration'],
    requirements: ['c_service_migration'],
  })

  it('does not downgrade it to a preference', () => {
    expect(criterionIsAssessable('c_service_migration')).toBe(false)
    // It stays a requirement, so nothing is shortlisted as though it were met.
    expect(r.confirmed).toHaveLength(0)
    expect(r.notConfirmed).toHaveLength(alternatives.length)
    expect(r.hasRequirements).toBe(true)
    for (const o of r.notConfirmed) {
      const row = o.unresolved.find((u) => u.criterion.id === 'c_service_migration')!
      expect(row.weight).toBe('requirement')
    }
  })

  it('reports the limitation explicitly rather than substituting an intention', () => {
    expect(r.unassessableRequirements.map((c) => c.id)).toEqual(['c_service_migration'])
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
    // Lumo joins on the individual reading: Proton's controlling shareholder
    // is a foundation, so no person holds a majority.
    expect(ids(asIndividual.confirmed)).toEqual(['copilot', 'gemini', 'lumo'])
    expect(ids(asBloc.confirmed)).toEqual(['copilot'])
    expect(ids(asBloc.excluded)).toEqual(['gemini', 'meta_ai'])
    // Meta AI is excluded under BOTH readings — one person clears the bar alone.
    expect(ids(asIndividual.excluded)).toEqual(['meta_ai'])
  })

  it('still answers the two readings differently for the same filing', () => {
    // Alphabet is the case that makes the distinction matter.
    expect(ids(asIndividual.confirmed)).toContain('gemini')
    expect(ids(asBloc.excluded)).toContain('gemini')
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
    expect(unassessable.map((c) => c.id)).toContain('c_service_migration')
    const r = recommend({
      functional: F,
      priorities: ['c_service_migration'],
      requirements: ['c_service_migration'],
    })
    expect(r.excluded).toHaveLength(0)
    expect(r.blindCriteria.map((c) => c.id)).toContain('c_service_migration')
    expect(r.unassessableRequirements.map((c) => c.id)).toContain('c_service_migration')
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
    expect(more).toContain('c_service_migration')
    // Nothing is dropped.
    expect(core.length + more.length).toBe(criteria.length)
  })

  it('exposes coverage before a criterion is chosen', () => {
    expect(criterionCoverage('c_content_export')).toEqual({ decided: 6, total: alternatives.length })
    expect(criterionCoverage('c_service_migration').decided).toBe(0)
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
    expect(s.conflicting.map((a) => a.id)).toEqual(['gemini', 'meta_ai'])
    expect(s.unresolved).toHaveLength(10)
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
    const none = { functional: F, priorities: ['c_service_migration'], requirements: [] }
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
    expect(result.excluded.map((o) => o.alternative.id)).toEqual(['gemini', 'meta_ai'])
    expect(s.conflicting.map((a) => a.id)).toEqual(['gemini', 'meta_ai'])
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

// ---------------------------------------------------------------------------
// 11. The expanded catalogue
// ---------------------------------------------------------------------------

import makersRaw from '../../data/makers.json'
import {
  alternativeById,
  baselineCapabilityIds,
  makerInDirectory,
  verifiedCapabilities,
  FUNCTIONAL_STATUSES,
} from '../recommend'

const directoryIds = new Set((makersRaw as { makers: { id: string }[] }).makers.map((m) => m.id))

describe('the pilot and the maker directory agree', () => {
  it('reuses the existing maker entity rather than creating a second one', () => {
    // Meta was already a maker. Adding Meta AI must attach to that entity, not
    // mint a parallel record that could drift from it.
    const meta = alternativeById.get('meta_ai')!
    expect(meta.product_provider.maker_id).toBe('Meta')
    expect(directoryIds.has('Meta')).toBe(true)
    expect(meta.maker_in_directory).toBe(true)
  })

  it('attaches every product whose operator already had a directory page', () => {
    for (const id of ['meta_ai', 'grok', 'perplexity', 'kimi']) {
      const alt = alternativeById.get(id)!
      expect(directoryIds.has(alt.product_provider.maker_id)).toBe(true)
      expect(alt.maker_in_directory).toBe(true)
    }
  })

  it('marks operators with no directory page instead of implying one', () => {
    const outside = alternatives.filter((a) => !a.maker_in_directory).map((a) => a.id)
    expect(outside.sort()).toEqual(['duckai', 'lumo', 'qwen_chat'])
    for (const a of alternatives) {
      expect(a.maker_in_directory).toBe(makerInDirectory(a.product_provider.maker_id))
    }
  })

  it('never claims a directory page that does not exist', () => {
    for (const a of alternatives) {
      if (a.maker_in_directory) expect(directoryIds.has(a.product_provider.maker_id)).toBe(true)
    }
  })
})

describe('product distinctions are descriptive, never comparative', () => {
  it('shows only capabilities we actually verified', () => {
    for (const alt of alternatives) {
      for (const c of verifiedCapabilities(alt)) {
        const v = alt.functional[c.id]
        expect(['verified_official_documentation', 'verified_secondary']).toContain(v)
        expect(c.secondhand).toBe(v === 'verified_secondary')
      }
    }
  })

  it('carries no ranking, score or performance field on any alternative', () => {
    for (const alt of alternatives) {
      for (const banned of ['score', 'rank', 'rating', 'quality', 'benchmark']) {
        expect(alt).not.toHaveProperty(banned)
      }
    }
  })

  it('flags the services that answer with other companies models', () => {
    const thirdParty = alternatives.filter((a) => a.uses_third_party_models).map((a) => a.id)
    expect(thirdParty.sort()).toEqual(['copilot', 'duckai', 'lumo', 'perplexity'])
  })

  it('sources every access constraint it states', () => {
    for (const alt of alternatives) {
      for (const n of alt.access_notes ?? []) {
        expect(n.label.length).toBeGreaterThan(0)
        expect(n.source.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('every option is assessed on every criterion', () => {
  it('leaves no alternative-criterion pair unrecorded', () => {
    for (const alt of alternatives) {
      for (const c of criteria) {
        expect(assessmentFor(alt.id, c.id)).toBeDefined()
      }
    }
  })

  it('keeps the safeguards across the larger set', () => {
    // A soft preference still excludes nobody, whatever the finding.
    const soft = recommend({
      functional: F,
      priorities: ['c_individual_majority_voting'],
      requirements: [],
    })
    expect(soft.excluded).toHaveLength(0)
    expect(soft.confirmed).toHaveLength(alternatives.length)

    // An exclusion still needs a documented failure, never an absence.
    const hard = recommend({
      functional: F,
      priorities: ['c_individual_majority_voting'],
      requirements: ['c_individual_majority_voting'],
    })
    for (const o of hard.excluded) {
      expect(assessmentFor(o.alternative.id, 'c_individual_majority_voting')?.verdict).toBe('fails')
    }
    expect(hard.confirmed.length + hard.notConfirmed.length + hard.excluded.length).toBe(
      alternatives.length,
    )
  })

  it('does not let the additions quietly become the best-covered options', () => {
    // A guard against rewarding our own research effort: the new entries must
    // not hold more documented findings on average than the originals.
    const decided = (id: string) =>
      criteria.filter((c) => assessmentFor(id, c.id)?.verdict !== 'unconfirmed').length
    const original = ['chatgpt', 'claude', 'gemini', 'copilot', 'le_chat', 'deepseek_app']
    const added = ['meta_ai', 'grok', 'perplexity', 'kimi', 'qwen_chat', 'lumo', 'duckai']
    const mean = (xs: string[]) => xs.reduce((s, id) => s + decided(id), 0) / xs.length
    expect(mean(added)).toBeLessThanOrEqual(mean(original))
  })
})

describe('one definition of a verified capability', () => {
  it('rejects any functional status outside the known vocabulary', () => {
    // A third spelling of "verified" would silently read as unknown, turning
    // researched capabilities into gaps. Fail loudly instead.
    for (const alt of alternatives) {
      for (const [req, status] of Object.entries(alt.functional)) {
        expect(FUNCTIONAL_STATUSES, `${alt.id}.${req}`).toContain(status)
      }
    }
  })

  it('agrees between the filter and the tags', () => {
    for (const alt of alternatives) {
      const tagged = new Set(verifiedCapabilities(alt).map((c) => c.id))
      for (const f of functionalRequirements) {
        expect(functionalState(alt, f.id) === 'confirmed').toBe(tagged.has(f.id))
      }
    }
  })

  it('treats a capability shared by everything as the entry price, not a distinction', () => {
    for (const id of baselineCapabilityIds) {
      expect(alternatives.every((a) => functionalState(a, id) === 'confirmed')).toBe(true)
    }
    // Something must still vary, or the tags would carry nothing at all.
    const varying = functionalRequirements.filter((f) => !baselineCapabilityIds.has(f.id))
    expect(varying.length).toBeGreaterThan(0)
  })
})
