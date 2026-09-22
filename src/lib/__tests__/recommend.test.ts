import { describe, expect, it } from 'vitest'
import {
  alternatives,
  assessmentFor,
  buildGuidance,
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

  it('marks a criterion as separating only when documented BOTH ways', () => {
    // Alignment against a conflict points somewhere. Alignment against an
    // unknown does not — it only means we did not look.
    expect(summaries[0].separates).toBe(true)

    const oneSided = { functional: F, priorities: ['c_content_export'], requirements: [] }
    const [exportSm] = summarisePreferences(recommend(oneSided), oneSided)
    expect(exportSm.aligned.length).toBeGreaterThan(1)
    expect(exportSm.conflicting).toHaveLength(0)
    expect(exportSm.separates).toBe(false)
  })

  it('offers no direction when nothing is documented', () => {
    const none = { functional: F, priorities: ['c_service_migration'], requirements: [] }
    const [s] = summarisePreferences(recommend(none), none)
    expect(s.aligned).toHaveLength(0)
    expect(s.conflicting).toHaveLength(0)
    expect(s.separates).toBe(false)
  })

  it('gives several aligned options guidance rather than demanding exactly one', () => {
    const many = { functional: F, priorities: ['c_content_export'], requirements: [] }
    const g = buildGuidance(recommend(many), many)
    expect(g.considered.length).toBeGreaterThan(1)
    for (const n of g.considered) expect(n.alignsOn.map((c) => c.id)).toContain('c_content_export')
    expect(g.cannotDistinguish).toBe(false)
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

  it('considers only options the user can still choose', () => {
    const g = buildGuidance(result, input)
    const ids = g.considered.map((n) => n.alternative.id)
    expect(ids).toContain('copilot')
    // Excluded options keep their finding in the counts but are not offered.
    for (const o of result.excluded) expect(ids).not.toContain(o.alternative.id)
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

describe('ordering carries no signal at all', () => {
  const input = {
    functional: F,
    priorities: ['c_public_benefit', 'c_content_export', 'c_commitment_continuity'],
    requirements: [],
  }
  const r = recommend(input)
  const at = (id: string) => r.confirmed.find((o) => o.alternative.id === id)!

  const alphabetical = (list: AlternativeOutcome[]) =>
    list.map((o) => o.alternative.product)

  it('sorts every group alphabetically and by nothing else', () => {
    for (const group of [r.confirmed, r.notConfirmed, r.excluded]) {
      const names = alphabetical(group)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    }
  })

  it('does not let a documented conflict change placement', () => {
    // ChatGPT carries a withdrawn commitment; Claude carries an unknown on the
    // same criterion. Both have two documented alignments. Placement must come
    // from the name, not from either of those facts.
    const chatgpt = at('chatgpt')
    const claude = at('claude')
    expect(chatgpt.tradeoffs).toHaveLength(1)
    expect(claude.tradeoffs).toHaveLength(0)
    expect(r.confirmed.indexOf(chatgpt)).toBeLessThan(r.confirmed.indexOf(claude))
    expect('ChatGPT'.localeCompare('Claude')).toBeLessThan(0)
  })

  it('does not let research completeness change placement either', () => {
    // The mirror failure. An option we happen to know more about must not rise.
    const documented = (o: AlternativeOutcome) =>
      o.met.length + o.supportingPriorities.length + o.tradeoffs.length
    const pairs = r.confirmed.slice(0, -1).map((o, i) => [o, r.confirmed[i + 1]] as const)
    const anyDescending = pairs.some(([a, b]) => documented(a) > documented(b))
    const anyAscending = pairs.some(([a, b]) => documented(a) < documented(b))
    // Both directions occur, so the list is demonstrably not sorted by volume.
    expect(anyDescending && anyAscending).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 12. Guidance: what the summary may and may not say
// ---------------------------------------------------------------------------

import { motivationForCriterion, motivations, motivationCoverage } from '../recommend'

describe('the reported ChatGPT / Claude case', () => {
  const input = {
    functional: F,
    priorities: ['c_public_benefit', 'c_content_export', 'c_commitment_continuity'],
    requirements: [],
  }
  const g = buildGuidance(recommend(input), input)
  const group = g.matchedGroups.find((x) =>
    x.members.some((m) => m.alternative.id === 'chatgpt'),
  )!

  it('puts them in one group on identical documented support', () => {
    const ids = group.members.map((m) => m.alternative.id).sort()
    expect(ids).toEqual(['chatgpt', 'claude'])
    expect(group.alignsOn.map((c) => c.id).sort()).toEqual([
      'c_content_export',
      'c_public_benefit',
    ])
  })

  it('names the conflict against ChatGPT and refuses to promote Claude', () => {
    const diff = group.differences.find((d) => d.criterion.id === 'c_commitment_continuity')!
    expect(diff.conflicting.map((a) => a.id)).toEqual(['chatgpt'])
    expect(diff.unknown.map((a) => a.id)).toEqual(['claude'])
    const claude = group.members.find((m) => m.alternative.id === 'claude')!
    expect(claude.conflictsOn).toHaveLength(0)
    expect(claude.unknownOn.map((c) => c.id)).toContain('c_commitment_continuity')
  })

  it('offers the next question rather than an answer', () => {
    expect(g.nextQuestion?.id).toBe('c_commitment_continuity')
  })

  it('keeps ChatGPT in consideration despite the conflict', () => {
    const chatgpt = g.considered.find((n) => n.alternative.id === 'chatgpt')!
    expect(chatgpt.alignsOn).toHaveLength(2)
    expect(chatgpt.conflictsOn.map((c) => c.id)).toEqual(['c_commitment_continuity'])
  })
})

describe('guidance principles', () => {
  it('lets alignment against a documented conflict inform the advice', () => {
    const input = { functional: F, priorities: ['c_individual_majority_voting'], requirements: [] }
    const [sep] = buildGuidance(recommend(input), input).separations
    expect(sep.separates).toBe(true)
    expect(sep.aligned.map((a) => a.id)).toContain('lumo')
    expect(sep.conflicting.map((a) => a.id)).toEqual(['meta_ai'])
  })

  it('does not let alignment against an unknown claim the same', () => {
    const input = { functional: F, priorities: ['c_content_export'], requirements: [] }
    const [sep] = buildGuidance(recommend(input), input).separations
    expect(sep.aligned.length).toBeGreaterThan(0)
    expect(sep.conflicting).toHaveLength(0)
    expect(sep.separates).toBe(false)
  })

  it('shows an option carrying both support and a conflict as a trade-off', () => {
    const input = {
      functional: F,
      priorities: ['c_content_export', 'c_commitment_continuity'],
      requirements: [],
    }
    const g = buildGuidance(recommend(input), input)
    const chatgpt = g.considered.find((n) => n.alternative.id === 'chatgpt')!
    expect(chatgpt.alignsOn.map((c) => c.id)).toEqual(['c_content_export'])
    expect(chatgpt.conflictsOn.map((c) => c.id)).toEqual(['c_commitment_continuity'])
  })

  it('keeps unknown and failed must-haves in distinct groups', () => {
    const input = {
      functional: F,
      priorities: ['c_individual_majority_voting'],
      requirements: ['c_individual_majority_voting'],
    }
    const r = recommend(input)
    const excluded = r.excluded.map((o) => o.alternative.id)
    const unconfirmed = r.notConfirmed.map((o) => o.alternative.id)
    expect(excluded).toEqual(['meta_ai'])
    expect(unconfirmed).not.toContain('meta_ai')
    expect(unconfirmed.length).toBeGreaterThan(0)
    for (const id of excluded) {
      expect(assessmentFor(id, 'c_individual_majority_voting')?.verdict).toBe('fails')
    }
    for (const id of unconfirmed) {
      expect(assessmentFor(id, 'c_individual_majority_voting')?.verdict).toBe('unconfirmed')
    }
  })

  it('says plainly when the chosen priorities cannot separate anything', () => {
    const input = { functional: F, priorities: ['c_service_migration'], requirements: [] }
    const g = buildGuidance(recommend(input), input)
    expect(g.cannotDistinguish).toBe(true)
    expect(g.considered).toHaveLength(0)
    expect(g.openQuestions.map((c) => c.id)).toEqual(['c_service_migration'])
  })

  it('gives several aligned options guidance without truncating to a top three', () => {
    const input = { functional: F, priorities: ['c_content_export'], requirements: [] }
    const g = buildGuidance(recommend(input), input)
    expect(g.considered.length).toBe(6)
    const grouped = g.matchedGroups.reduce((n, x) => n + x.members.length, 0)
    expect(grouped).toBe(g.considered.length)
    expect(g.considered.length + g.unevidenced.length).toBe(alternatives.length)
  })
})

describe('motivations are starting questions, not bundles', () => {
  it('covers every criterion exactly once', () => {
    const assigned = motivations.flatMap((m) => m.criterionIds)
    expect(assigned.slice().sort()).toEqual(criteria.map((c) => c.id).sort())
    expect(new Set(assigned).size).toBe(assigned.length)
    for (const c of criteria) expect(motivationForCriterion.get(c.id)).toBeDefined()
  })

  it('selects nothing by itself', () => {
    // Opening a motivation cannot change the result: guidance is a pure
    // function of the criteria the user actually ticked.
    const empty = { functional: F, priorities: [], requirements: [] }
    const g = buildGuidance(recommend(empty), empty)
    expect(g.separations).toHaveLength(0)
    expect(g.considered).toHaveLength(0)
  })

  it('states a limit for every motivation and a gap where it rests on one question', () => {
    for (const m of motivations) {
      expect(m.limits.length).toBeGreaterThan(0)
      expect(motivationCoverage(m).total).toBe(m.criterionIds.length)
      if (m.criterionIds.length === 1) expect(m.gap).toBeTruthy()
    }
  })

  it('does not imply worker or creator coverage the dataset lacks', () => {
    const conduct = motivations.find((m) => m.id === 'm_conduct')!
    expect(conduct.limits.join(' ')).toMatch(/workers|creators/i)
  })

  it('keeps control separate from financial benefit', () => {
    const power = motivations.find((m) => m.id === 'm_power')!
    expect(power.limits.join(' ')).toMatch(/controlling a company and benefiting financially/i)
    expect(power.limits.join(' ')).toMatch(/does not mean your subscription is paid/i)
    // And the separation is real, not just asserted in prose.
    expect(power.criterionIds).toContain('c_nonprofit_control')
    expect(power.criterionIds).toContain('c_public_purpose_stake')
  })

  it('keeps voting power separate from board control', () => {
    const power = motivations.find((m) => m.id === 'm_power')!
    expect(power.limits.join(' ')).toMatch(/no voting majority does not mean/i)
    expect(power.criterionIds).toContain('c_board_election_rights')
  })

  it('does not treat a commitment as evidence of an outcome', () => {
    const conduct = motivations.find((m) => m.id === 'm_conduct')!
    expect(conduct.limits.join(' ')).toMatch(/not evidence of any outcome/i)
  })

  it('keeps export and portability reachable', () => {
    const control = motivations.find((m) => m.id === 'm_control')!
    expect(control.criterionIds).toContain('c_content_export')
    expect(control.criterionIds).toContain('c_service_migration')
  })

  it('advertises no value dimension it cannot yet answer', () => {
    // Connected actors and where economic value goes are real research areas,
    // but they live in the roadmap doc until they have coverage. The live
    // product must not offer a question it cannot answer.
    for (const m of motivations) {
      for (const id of m.criterionIds) {
        expect(criteria.some((c) => c.id === id)).toBe(true)
      }
      expect(motivationCoverage(m).documented).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 13. Training on your data
// ---------------------------------------------------------------------------

describe('the training criteria model the user outcome, not the mechanism', () => {
  it('treats never-trained and opt-in alike on the default question', () => {
    // Lumo and Duck.ai never train; Claude trains only where the user allows.
    // All three give the user the same substantive outcome.
    for (const id of ['lumo', 'duckai', 'claude']) {
      expect(assessmentFor(id, 'c_training_default')?.verdict).toBe('meets')
    }
  })

  it('records default-on providers as a documented conflict', () => {
    const on = ['chatgpt', 'gemini', 'copilot', 'le_chat', 'grok', 'perplexity',
                'deepseek_app', 'kimi', 'qwen_chat']
    for (const id of on) {
      expect(assessmentFor(id, 'c_training_default')?.verdict).toBe('fails')
    }
    expect(assessmentFor('meta_ai', 'c_training_default')?.verdict).toBe('unconfirmed')
  })

  it('does not require a toggle where there is nothing to switch off', () => {
    // The control criterion asks whether the user can stay out alone. Lumo and
    // Duck.ai meet it by outcome; recording them unconfirmed would be wrong.
    for (const id of ['lumo', 'duckai']) {
      const a = assessmentFor(id, 'c_training_control')
      expect(a?.verdict).toBe('meets')
      expect(a?.scope).toMatch(/outcome rather than by a setting/i)
    }
  })

  it('leaves email-only opt-outs unresolved rather than failed', () => {
    // Naming a contact route is not evidence that no setting exists.
    for (const id of ['deepseek_app', 'kimi', 'qwen_chat']) {
      const a = assessmentFor(id, 'c_training_control')
      expect(a?.verdict).toBe('unconfirmed')
      expect(a?.claim).toMatch(/email|customer service|notifying/i)
      // The mechanism survives as evidence rather than being flattened away.
      expect(a?.uncertainty).toMatch(/not evidence that no setting exists/i)
    }
  })

  it('keeps the two questions genuinely distinct', () => {
    // A provider can train by default and still give you a switch.
    for (const id of ['chatgpt', 'gemini', 'copilot', 'grok', 'perplexity', 'le_chat']) {
      expect(assessmentFor(id, 'c_training_default')?.verdict).toBe('fails')
      expect(assessmentFor(id, 'c_training_control')?.verdict).toBe('meets')
    }
  })

  it('separates on the default question, documented both ways', () => {
    const input = { functional: F, priorities: ['c_training_default'], requirements: [] }
    const [sep] = buildGuidance(recommend(input), input).separations
    expect(sep.separates).toBe(true)
    expect(sep.aligned).toHaveLength(3)
    expect(sep.conflicting).toHaveLength(9)
    expect(sep.unresolved).toHaveLength(1)
  })

  it('preserves the detailed mechanism as evidence under every finding', () => {
    for (const alt of alternatives) {
      for (const c of ['c_training_default', 'c_training_control']) {
        const a = assessmentFor(alt.id, c)!
        expect(a.claim.length).toBeGreaterThan(40)
        expect(a.source.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('ownership shape is shown, never ranked', () => {
  it('is informational, so it can never become a preference', () => {
    const shape = criteria.find((c) => c.id === 'c_ownership_shape')!
    expect(shape.informational).toBe(true)
    const input = { functional: F, priorities: ['c_ownership_shape'], requirements: [] }
    expect(buildGuidance(recommend(input), input).separations).toHaveLength(0)
  })

  it('only records a shape where this pilot has sourced it', () => {
    // makers.json carries independence_type for ten operators, but
    // capital_profile has no sources field. Importing it would put unsourced
    // directory claims behind a recommendation.
    const documented = alternatives.filter(
      (a) => assessmentFor(a.id, 'c_ownership_shape')?.verdict === 'meets',
    )
    expect(documented.map((a) => a.id).sort()).toEqual(
      ['chatgpt', 'claude', 'copilot', 'gemini', 'lumo', 'meta_ai'].sort(),
    )
  })

  it('never claims a shape implies anything about where money goes', () => {
    for (const alt of alternatives) {
      const a = assessmentFor(alt.id, 'c_ownership_shape')!
      if (a.verdict === 'meets') expect(a.scope).toMatch(/where revenue ends up/i)
    }
  })
})

describe('share-voting findings support rather than lead', () => {
  it('marks them nested', () => {
    for (const id of ['c_individual_majority_voting', 'c_founder_bloc_majority_voting',
                      'c_board_election_rights', 'c_model_hosting']) {
      expect(criteria.find((c) => c.id === id)?.nested).toBe(true)
    }
  })

  it('leaves them fully able to exclude when chosen as a must-have', () => {
    // Nested means "not what the section leads with", not "declawed".
    const input = {
      functional: F,
      priorities: ['c_individual_majority_voting'],
      requirements: ['c_individual_majority_voting'],
    }
    expect(recommend(input).excluded.map((o) => o.alternative.id)).toEqual(['meta_ai'])
  })

  it('does not put a nested criterion at the head of any motivation', () => {
    for (const m of motivations) {
      const first = criteria.find((c) => c.id === m.criterionIds[0])!
      expect(first.nested).not.toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// 14. Control, financial benefit and dependency are different things
// ---------------------------------------------------------------------------

describe('control is never read as financial benefit', () => {
  it('splits Anthropic: the trust controls the board and gets nothing', () => {
    // The whole point of the separation. Same company, same filing, opposite
    // answers -- and the second one is a documented conflict, not an unknown.
    expect(assessmentFor('claude', 'c_nonprofit_control')?.verdict).toBe('meets')
    expect(assessmentFor('claude', 'c_public_purpose_stake')?.verdict).toBe('fails')
    expect(assessmentFor('claude', 'c_public_purpose_stake')?.claim).toMatch(/no economic interest/i)
  })

  it('does not treat a public-benefit duty as a profit-distribution arrangement', () => {
    // A PBC duty obliges directors to weigh other interests. It distributes
    // nothing, so it must never carry the economic-stake criterion by itself.
    for (const alt of alternatives) {
      const duty = assessmentFor(alt.id, 'c_public_benefit')?.verdict
      const stake = assessmentFor(alt.id, 'c_public_purpose_stake')?.verdict
      if (duty === 'meets' && stake === 'meets') {
        // Allowed only where a SEPARATE economic fact was documented.
        const a = assessmentFor(alt.id, 'c_public_purpose_stake')!
        expect(a.claim).toMatch(/equity|revenue|shareholder/i)
      }
    }
    // Anthropic is the proof: duty yes, stake no.
    expect(assessmentFor('claude', 'c_public_benefit')?.verdict).toBe('meets')
    expect(assessmentFor('claude', 'c_public_purpose_stake')?.verdict).toBe('fails')
  })

  it('states what an economic stake does not establish', () => {
    for (const alt of alternatives) {
      const a = assessmentFor(alt.id, 'c_public_purpose_stake')!
      if (a.verdict === 'meets') {
        expect(a.scope).toMatch(/only if|conditional|does not publish|not committed/i)
      }
    }
  })
})

describe('no money flow is inferred from investment or supply', () => {
  it('never claims subscription revenue reaches an investor', () => {
    for (const alt of alternatives) {
      const r = alt.relationships!
      const text = [r.pays, ...r.owners, ...r.suppliers].join(' ')
      // An investor stake may be described; it must not be described as being paid.
      expect(text).not.toMatch(/subscription (?:revenue |money )?(?:is |goes |flows )?(?:paid )?to .*investor/i)
    }
  })

  it('names a specific unknown wherever commercial terms are unestablished', () => {
    for (const alt of alternatives) {
      const r = alt.relationships!
      expect(r.unknowns.length).toBeGreaterThan(0)
      for (const u of r.unknowns) expect(u.length).toBeGreaterThan(15)
    }
  })

  it('does not turn a supplier into an owner', () => {
    // Duck.ai and Perplexity run other companies' models and own none of them.
    for (const id of ['duckai', 'perplexity']) {
      const r = alternativeById.get(id)!.relationships!
      expect(r.suppliers.join(' ')).toMatch(/third-party|Anthropic|OpenAI/i)
      expect(r.owners.join(' ')).not.toMatch(/Anthropic|OpenAI/i)
      expect(r.unknowns.join(' ')).toMatch(/pays/i)
    }
  })

  it('describes free services without inventing a payment', () => {
    const free = alternativeById.get('duckai')!.relationships!
    expect(free.pays).toMatch(/free tier takes no payment/i)
    expect(alternativeById.get('meta_ai')!.relationships!.free_tier).toMatch(/without a subscription/i)
  })
})

describe('the ownership criteria inform decisions without double-counting', () => {
  it('lets a user prefer foundation control', () => {
    const input = { functional: F, priorities: ['c_nonprofit_control'], requirements: [] }
    const [sep] = buildGuidance(recommend(input), input).separations
    expect(sep.separates).toBe(true)
    expect(sep.aligned.map((a) => a.id).sort()).toEqual(['chatgpt', 'claude', 'lumo'])
    expect(sep.conflicting.map((a) => a.id).sort()).toEqual(['copilot', 'gemini', 'meta_ai'])
  })

  it('lets a user ask who benefits financially and get a different answer', () => {
    const input = { functional: F, priorities: ['c_public_purpose_stake'], requirements: [] }
    const [sep] = buildGuidance(recommend(input), input).separations
    // Claude drops out of the aligned set even though it led on control.
    expect(sep.aligned.map((a) => a.id).sort()).toEqual(['chatgpt', 'lumo'])
    expect(sep.conflicting.map((a) => a.id)).toEqual(['claude'])
  })

  it('does not let two criteria on the same fact stack', () => {
    // Control and economic stake must be capable of disagreeing, or they are
    // the same fact wearing two hats and would double an option's strength.
    const disagree = alternatives.filter((alt) => {
      const c = assessmentFor(alt.id, 'c_nonprofit_control')?.verdict
      const e = assessmentFor(alt.id, 'c_public_purpose_stake')?.verdict
      return c === 'meets' && e === 'fails'
    })
    expect(disagree.map((a) => a.id)).toEqual(['claude'])
  })

  it('keeps unknown preferences and requirements behaving as before', () => {
    const soft = { functional: F, priorities: ['c_public_purpose_stake'], requirements: [] }
    expect(recommend(soft).excluded).toHaveLength(0)

    const hard = {
      functional: F,
      priorities: ['c_public_purpose_stake'],
      requirements: ['c_public_purpose_stake'],
    }
    const r = recommend(hard)
    expect(r.excluded.map((o) => o.alternative.id)).toEqual(['claude'])
    expect(r.confirmed.map((o) => o.alternative.id).sort()).toEqual(['chatgpt', 'lumo'])
    for (const o of r.notConfirmed) {
      expect(assessmentFor(o.alternative.id, 'c_public_purpose_stake')?.verdict).toBe('unconfirmed')
    }
  })

  it('keeps ownership shape as context rather than a preference', () => {
    const shape = criteria.find((c) => c.id === 'c_ownership_shape')!
    expect(shape.informational).toBe(true)
    expect((shape as { context_note?: string }).context_note).toMatch(/overlap/i)
  })
})
