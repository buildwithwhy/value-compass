import { describe, expect, it } from 'vitest'
import { getMaker, makers } from '../data'
import {
  axisEvidenceFor,
  comparableExtremes,
  coverageFor,
  displayScore,
  isDecisionEligible,
  pendingRelationshipsFor,
  relationshipFor,
} from '../evidence'
import { EMPTY_LENS, EXAMPLE_LENS, evaluateMaker } from '../lens'
import { absenceEvidenceFor, absenceRequirements } from '../evidence'
import {
  EMPTY_WEIGHTS,
  EXAMPLE_WEIGHTS,
  criterionComparison,
  evaluatePriorities,
  orderByPriorities,
  orderingIntegrity,
  prioritiesLabel,
  priorityChanges,
  type Priorities,
} from '../priorities'
import type { AxisKey } from '../types'

const maker = (id: string) => {
  const m = getMaker(id)
  if (!m) throw new Error(`fixture missing: ${id}`)
  return m
}

// ---------------------------------------------------------------------------
// 1. Unsupported winner markers
//
// The live bug: DeepSeek vs Microsoft showed highest/lowest on wealth
// dispersion and public sharing while both cells were labelled "No source".
// ---------------------------------------------------------------------------

describe('comparison markers require support for the claim', () => {
  const deepseek = maker('DeepSeek')
  const microsoft = maker('Microsoft')

  it('marks no winner where both sides are unsourced (the reported bug)', () => {
    for (const axis of ['wealth_dispersion', 'public_sharing'] as AxisKey[]) {
      expect(displayScore(deepseek, axis).basis).toBe('unsourced')
      expect(displayScore(microsoft, axis).basis).toBe('unsourced')
      const { best, worst } = comparableExtremes([deepseek, microsoft], axis)
      expect(best).toBeNull()
      expect(worst).toBeNull()
    }
  })

  it('never marks a winner using an ineligible cell', () => {
    for (const a of makers) {
      for (const b of makers) {
        if (a.id === b.id) continue
        for (const axis of ['transparency', 'culture_esg', 'labour_integrity'] as AxisKey[]) {
          const { best } = comparableExtremes([a, b], axis)
          if (best == null) continue
          expect(displayScore(a, axis).eligible).toBe(true)
          expect(displayScore(b, axis).eligible).toBe(true)
        }
      }
    }
  })

  it('does not let a confidence flag alone qualify an assessment', () => {
    const highConfidenceButUnsourced = makers.flatMap((m) =>
      (Object.keys(m.axes) as AxisKey[])
        .filter((axis) => {
          const ev = axisEvidenceFor(m.id, axis)
          return ev.basis !== 'sourced' && m.axes[axis].confidence !== 'C'
        })
        .map((axis) => ({ id: m.id, axis })),
    )
    expect(highConfidenceButUnsourced.length).toBeGreaterThan(0)
    for (const { id, axis } of highConfidenceButUnsourced) {
      expect(isDecisionEligible(id, axis)).toBe(false)
    }
  })

  it('accepts a single authoritative source for a narrow claim', () => {
    // One source, and it settles the fact — count is not the test.
    const ev = axisEvidenceFor('Anthropic', 'wealth_dispersion')
    expect(ev.entity_sources).toHaveLength(1)
    expect(ev.claim_support).toBe('establishes_fact')
    expect(ev.supported_fact).toBeTruthy()
  })

  it('rejects a sourced assessment whose source covers only part of the claim', () => {
    expect(axisEvidenceFor('Meta', 'culture_esg').basis).toBe('sourced')
    expect(axisEvidenceFor('Meta', 'culture_esg').claim_support).toBe('partial')
    expect(isDecisionEligible('Meta', 'culture_esg')).toBe(false)
  })

  it('separates establishing a fact from justifying a whole-axis score', () => {
    // Anthropic's ownership stakes are established; the 1/4 across four
    // sub-indicators is not, and no rule in the rubric combines them.
    const ev = axisEvidenceFor('Anthropic', 'wealth_dispersion')
    expect(ev.claim_support).toBe('establishes_fact')
    expect(ev.justifies_whole).toBe(false)
    expect(ev.decision_eligible).toBe(false)
    expect(ev.scoring_rule).toMatch(/no rule|None\./i)
  })

  it('preserves the supported fact wherever the score is ineligible', () => {
    const preserved = makers.flatMap((m) =>
      (Object.keys(m.axes) as AxisKey[])
        .map((axis) => axisEvidenceFor(m.id, axis))
        .filter((ev) => ev.supported_fact && !ev.decision_eligible),
    )
    expect(preserved.length).toBeGreaterThan(0)
    for (const ev of preserved) {
      expect(ev.supported_fact).toBeTruthy()
      expect(ev.justification_note).toBeTruthy()
    }
  })

  it('only justifies a whole score under a rule that exists in the rubric', () => {
    for (const m of makers) {
      for (const axis of Object.keys(m.axes) as AxisKey[]) {
        const ev = axisEvidenceFor(m.id, axis)
        if (!ev.justifies_whole) continue
        // The FMTI anchor is the only whole-axis rule in the rubric.
        expect(axis).toBe('transparency')
        expect(ev.scoring_rule).toMatch(/FMTI/)
      }
    }
  })

  it('leaves xAI culture/ESG unresolved: no rule lets one sub-indicator set the axis', () => {
    const ev = axisEvidenceFor('xAI', 'culture_esg')
    // The environmental finding is real, sourced and kept.
    expect(ev.claim_support).toBe('establishes_fact')
    expect(ev.supported_fact).toMatch(/Clean Air Act/)
    // The 0/4 across four sub-indicators is not licensed by it.
    expect(ev.justifies_whole).toBe(false)
    expect(ev.decision_eligible).toBe(false)
    expect(ev.scoring_rule).toMatch(/states no rule for combining/i)
    // And the recorded score is untouched — no replacement invented.
    expect(displayScore(maker('xAI'), 'culture_esg').recorded).toBe(0)
  })

  it('never labels an automated classification as human-reviewed', () => {
    for (const m of makers) {
      for (const axis of Object.keys(m.axes) as AxisKey[]) {
        expect(axisEvidenceFor(m.id, axis).provenance).toBe('automated_provisional')
      }
    }
  })

  it('keeps background reading and contextual inference out of eligibility', () => {
    for (const m of makers) {
      for (const axis of Object.keys(m.axes) as AxisKey[]) {
        const ev = axisEvidenceFor(m.id, axis)
        if (ev.basis === 'contextual' || ev.entity_sources.length === 0) {
          expect(ev.decision_eligible).toBe(false)
        }
      }
    }
  })

  it('preserves unsupported legacy records rather than deleting them', () => {
    const ev = axisEvidenceFor('Microsoft', 'wealth_dispersion')
    expect(ev.decision_eligible).toBe(false)
    // Still on record, still displayable, just not decisive.
    expect(displayScore(maker('Microsoft'), 'wealth_dispersion').recorded).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// 2. Unknown capital attributes
// ---------------------------------------------------------------------------

describe('capital attributes are tri-state', () => {
  it('treats an empty list as unknown, never as a clean result', () => {
    // Midjourney records no sovereign, Big Tech or circular-vendor entries.
    const r = evaluateMaker(maker('Midjourney'), EXAMPLE_LENS)
    const sovereign = r.findings.find((f) => f.key === 'sovereign')
    expect(sovereign?.state).toBe('unknown')
    expect(r.unknown.map((f) => f.key)).toContain('sovereign')
    expect(r.absent.map((f) => f.key)).not.toContain('sovereign')
  })

  it('does not accept an authored false as a documented absence', () => {
    // Anthropic records index_held: false. That is a typed value, not a finding.
    const r = evaluateMaker(maker('Anthropic'), { ...EMPTY_LENS, index_concentration: true })
    const idx = r.findings.find((f) => f.key === 'index_concentration')
    expect(idx?.state).toBe('unknown')
    expect(idx?.recordedValue).toBe('no')
    expect(idx?.unknownBecause).toMatch(/not evidence of absence/i)
    expect(r.absent).toHaveLength(0)
  })

  it('accepts a documented absence only with source, scope and date', () => {
    // The dataset holds no absence evidence meeting the bar, so nothing is
    // currently absent-documented anywhere. None is invented to fill the gap.
    expect(absenceRequirements.current_count).toBe(0)
    for (const m of makers) {
      const r = evaluateMaker(m, EXAMPLE_LENS)
      expect(r.absent).toHaveLength(0)
    }
    // Every absence record that does exist must carry all four fields.
    for (const m of makers) {
      for (const attr of ['founder_control', 'index_held', 'competitor_entanglement']) {
        const ev = absenceEvidenceFor(m.id, attr)
        if (!ev) continue
        expect(ev.source).toBeTruthy()
        expect(ev.scope).toBeTruthy()
        expect(ev.as_of).toBeTruthy()
        expect(['self_report', 'independent']).toContain(ev.attribution)
      }
    }
  })

  it('preserves the unsupported recorded value for review', () => {
    const r = evaluateMaker(maker('Microsoft'), { ...EMPTY_LENS, founder_autocracy: true })
    const f = r.findings.find((f) => f.key === 'founder_autocracy')
    expect(f?.state).toBe('unknown')
    expect(f?.recordedValue).toBe('no')
    // The source record itself is untouched.
    expect(maker('Microsoft').capital_profile?.founder_control).toBe(false)
  })

  it('does not let a non-matching sovereign entry establish absence', () => {
    // xAI records Gulf capital only. Asking about Singapore is unknown, not absent.
    const r = evaluateMaker(maker('xAI'), {
      ...EMPTY_LENS,
      sovereign: true,
      sovereign_singapore: true,
    })
    expect(r.findings.find((f) => f.key === 'sovereign')?.state).toBe('unknown')
  })

  it('exposes no 0-100 fit number anywhere in the result', () => {
    const r = evaluateMaker(maker('OpenAI'), EXAMPLE_LENS)
    expect(r).not.toHaveProperty('fit')
    expect(r).not.toHaveProperty('clearCount')
    expect(r.present.length + r.absent.length + r.unknown.length).toBe(r.activeCount)
  })

  it('never counts an unverified association as a concern', () => {
    // Every Moonshot backer carrying associations is unverified, so there is
    // nothing established to find — and unverified entries must not fill the gap.
    const r = evaluateMaker(maker('Moonshot'), { ...EMPTY_LENS, backer_reputation: true })
    expect(r.unverifiedAssociations).toEqual(
      expect.arrayContaining(['Tencent', 'Alibaba', 'HongShan (ex-Sequoia China)']),
    )
    expect(r.present.map((f) => f.key)).not.toContain('backer_reputation')
    expect(r.unknown.map((f) => f.key)).toContain('backer_reputation')
  })

  it('counts only the sourced backers where a maker has a mix', () => {
    // Replit: a16z is sourced; QIA and Khosla are not.
    const r = evaluateMaker(maker('Replit'), { ...EMPTY_LENS, backer_reputation: true })
    const hit = r.present.find((f) => f.key === 'backer_reputation')
    expect(hit?.detail).toContain('Andreessen Horowitz')
    expect(hit?.detail).not.toContain('Qatar Investment Authority')
    expect(hit?.detail).not.toContain('Khosla')
    expect(r.unverifiedAssociations).toEqual(
      expect.arrayContaining(['Qatar Investment Authority (QIA)', 'Khosla Ventures']),
    )
  })

  it('reports coverage so a one-attribute answer cannot read as a full picture', () => {
    const r = evaluateMaker(maker('Gamma'), EXAMPLE_LENS)
    expect(r.coverage).toBeLessThan(1)
    expect(r.unknown.length).toBeGreaterThan(0)
  })

  it('distinguishes self-report from an independently established absence', () => {
    // Nothing qualifies yet, but the distinction is carried, not collapsed.
    const attributions = makers
      .flatMap((m) => evaluateMaker(m, EXAMPLE_LENS).absent)
      .map((f) => f.attribution)
    for (const a of attributions) expect(['self_report', 'independent']).toContain(a)
  })
})

// ---------------------------------------------------------------------------
// 3. Pending relationships
// ---------------------------------------------------------------------------

describe('pending relationships stay out of present-tense findings', () => {
  it('keeps a not-yet-closed round separate', () => {
    const rel = relationshipFor('Tencent', 'DeepSeek')
    expect(rel?.status).toBe('pending')
    const r = evaluateMaker(maker('DeepSeek'), EXAMPLE_LENS)
    expect(r.pending.some((p) => p.label.startsWith('Tencent'))).toBe(true)
  })

  it('does not promote a contingent commitment to current ownership', () => {
    const rel = relationshipFor('Amazon', 'OpenAI')
    expect(rel?.status).toBe('contingent')
    expect(rel?.type).not.toBe('outright_ownership')
    expect(rel?.type).not.toBe('controlling_stake')
    expect(pendingRelationshipsFor('OpenAI').map((r) => r.funder)).toContain('Amazon')
  })

  it('surfaces a reported-but-unclosed capital entry as pending', () => {
    const r = evaluateMaker(maker('DeepSeek'), EXAMPLE_LENS)
    expect(r.pending.some((p) => /reported/i.test(p.detail))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 4. Unequal coverage
// ---------------------------------------------------------------------------

describe('unequal coverage is not presented as a definitive ordering', () => {
  const withExample: Priorities = {
    weights: EXAMPLE_WEIGHTS,
    capital: EMPTY_LENS,
    mode: 'example',
  }

  it('flags an ordering built on different criteria per maker', () => {
    // Unit-level, so the guard is tested independently of how much evidence the
    // dataset happens to hold on a given day.
    const a = evaluatePriorities(maker('Midjourney'), withExample)
    const b = evaluatePriorities(maker('Anthropic'), withExample)
    const uneven = orderingIntegrity([
      { maker: maker('Midjourney'), result: a },
      {
        maker: maker('Anthropic'),
        result: { ...b, evidenced: [{ axis: 'public_sharing', weight: 1, score: 3, missingReason: null }] },
      },
    ])
    expect(uneven.uniform).toBe(false)
    expect(uneven.unevenAxes.length).toBeGreaterThan(0)
  })

  it('places nobody under the example priorities on the current evidence', () => {
    // A consequence of the tightened rule, recorded so it cannot regress
    // silently: with only the four FMTI-anchored transparency scores eligible,
    // no maker reaches half the assigned weight across five criteria.
    const { placed, unplaced } = orderByPriorities(makers, withExample)
    expect(placed).toHaveLength(0)
    expect(unplaced).toHaveLength(makers.length)
  })

  it('places the makers whose one eligible criterion is the one asked for', () => {
    const transparencyOnly: Priorities = {
      weights: { ...EMPTY_WEIGHTS, transparency: 2 },
      capital: EMPTY_LENS,
      mode: 'custom',
    }
    const { placed } = orderByPriorities(makers, transparencyOnly)
    expect(placed.map((p) => p.maker.id).sort()).toEqual(['Meta', 'Midjourney', 'Mistral', 'xAI'])
  })

  it('reports a uniform ordering as uniform', () => {
    const transparencyOnly: Priorities = {
      weights: { ...EMPTY_WEIGHTS, transparency: 2 },
      capital: EMPTY_LENS,
      mode: 'custom',
    }
    const { placed } = orderByPriorities(makers, transparencyOnly)
    expect(placed.length).toBeGreaterThan(1)
    expect(orderingIntegrity(placed).uniform).toBe(true)
  })

  it('keeps criterion-level comparison available regardless', () => {
    const rows = criterionComparison([maker('Anthropic'), maker('Midjourney')], withExample)
    expect(rows.length).toBe(5)
    const transparency = rows.find((r) => r.axis === 'transparency')
    // Midjourney's FMTI value is transcribed; Anthropic's is not, so only one
    // side is eligible — and the row still shows both, with a reason.
    expect(transparency?.scored.map((s) => s.maker.id)).toEqual(['Midjourney'])
    expect(transparency?.missing.map((m) => m.maker.id)).toEqual(['Anthropic'])
    const labour = rows.find((r) => r.axis === 'labour_integrity')
    expect(labour?.missing.map((m) => m.maker.id)).toContain('Anthropic')
    expect(labour?.missing[0].reason).toBeTruthy()
  })

  it('holds unplaceable makers apart instead of ranking them last', () => {
    const { placed, unplaced } = orderByPriorities(makers, withExample)
    expect(unplaced.length).toBeGreaterThan(0)
    for (const row of unplaced) expect(row.result.placeable).toBe(false)
    for (const row of placed) expect(row.result.placeable).toBe(true)
  })

  it('calls a switching difference unknown rather than "no change" when unsupported', () => {
    const changes = priorityChanges(maker('Cursor'), maker('Replit'), withExample)
    expect(changes.length).toBeGreaterThan(0)
    for (const c of changes) {
      expect(c.direction).toBe('unknown')
      expect(c.unknownBecause).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Example / reset behaviour
// ---------------------------------------------------------------------------

describe('examples are opt-in and stay labelled', () => {
  it('keeps axis weights and capital attributes separable', () => {
    // The two halves are distinct constants, so one can be applied alone.
    expect(Object.values(EXAMPLE_WEIGHTS).some((w) => w > 0)).toBe(true)
    expect(Object.values(EXAMPLE_LENS).some(Boolean)).toBe(true)
    expect(Object.values(EMPTY_LENS).every((v) => v === false)).toBe(true)
    expect(Object.values(EMPTY_WEIGHTS).every((w) => w === 0)).toBe(true)
  })

  it('never calls example-derived settings the visitor’s own', () => {
    expect(prioritiesLabel('example')).toBe('the example priorities')
    expect(prioritiesLabel('custom')).toBe('your priorities')
  })

  it('produces no findings at all from an empty lens', () => {
    const r = evaluateMaker(maker('OpenAI'), EMPTY_LENS)
    expect(r.activeCount).toBe(0)
    expect(r.present).toHaveLength(0)
    expect(r.absent).toHaveLength(0)
    expect(r.unknown).toHaveLength(0)
  })

  it('treats an empty priority set as nothing to order by', () => {
    const none: Priorities = { weights: EMPTY_WEIGHTS, capital: EMPTY_LENS, mode: 'unset' }
    const { placed, unplaced } = orderByPriorities(makers, none)
    expect(unplaced).toHaveLength(0)
    expect(placed).toHaveLength(makers.length)
  })
})

// ---------------------------------------------------------------------------
// 6. Language guarantees
// ---------------------------------------------------------------------------

describe('unestablished records are not claims of non-disclosure', () => {
  it('uses the not_established basis, not a non-disclosure finding', () => {
    const ev = axisEvidenceFor('Moonshot', 'culture_esg')
    expect(ev.basis).toBe('not_established')
    expect(ev.rule).toMatch(/our research/i)
    expect(ev.rule).not.toMatch(/nobody has published|has published nothing/i)
  })

  it('withholds the score but preserves the record', () => {
    const d = displayScore(maker('Moonshot'), 'culture_esg')
    expect(d.value).toBeNull()
    expect(d.recorded).toBe(1)
    expect(d.eligible).toBe(false)
  })

  it('keeps every unassessed maker in the dataset and searchable', () => {
    const cov = coverageFor()
    expect(cov.total).toBe(makers.length * 5)
    expect(cov.eligible).toBeGreaterThan(0)
    expect(cov.eligible).toBeLessThan(cov.total)
  })
})
