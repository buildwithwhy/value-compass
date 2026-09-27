import { describe, expect, it } from 'vitest'
import { alternativesIn, buildAdvice, criteria, type RecommendationInput } from '../recommend'

const ask = (p: Partial<RecommendationInput>) =>
  buildAdvice({ functional: [], priorities: [], requirements: [], ...p })

const names = (xs: { alternative: { product: string } }[]) => xs.map((o) => o.alternative.product)

describe('the recommendation synthesises across all selected preferences', () => {
  // The case the brief asks to reproduce. Lumo is confirmed on both; ChatGPT
  // meets the stake criterion but fails training; Claude and Duck.ai meet
  // training with the stake unconfirmed.
  const combined = ask({
    category: 'everyday_assistant',
    priorities: ['c_public_purpose_stake', 'c_training_default'],
  })

  it('leads with the only option confirmed on both', () => {
    expect(names(combined.lead)).toEqual(['Lumo'])
    expect(combined.headline).toMatch(/^Start by looking at Lumo\./)
    expect(combined.headline).toMatch(/only one with confirmed support for both preferences/)
  })

  it('keeps a confirmed failure in view as a stated compromise, not a deletion', () => {
    const chatgpt = combined.compromises.find((o) => o.alternative.product === 'ChatGPT')
    expect(chatgpt, 'ChatGPT should remain, with its shortfall named').toBeTruthy()
    expect(chatgpt!.failsOn.map((c) => c.id)).toEqual(['c_training_default'])
    expect(chatgpt!.meetsOn.map((c) => c.id)).toEqual(['c_public_purpose_stake'])
  })

  it('puts an unknown in its own group rather than treating it as a failure', () => {
    expect(names(combined.needConfirmation).sort()).toEqual(['Claude', 'Duck.ai'])
    for (const o of combined.needConfirmation) {
      expect(o.failsOn).toHaveLength(0)
      expect(o.unknownOn.map((c) => c.id)).toContain('c_public_purpose_stake')
    }
  })

  it('accounts for every option in the category exactly once', () => {
    const all = [
      ...combined.lead,
      ...combined.compromises,
      ...combined.needConfirmation,
      ...combined.ruledOut,
      ...combined.rest,
    ].map((o) => o.alternative.id)
    expect(new Set(all).size).toBe(all.length)
    expect(all.sort()).toEqual(alternativesIn('everyday_assistant').map((a) => a.id).sort())
  })
})

describe('hard requirements and soft preferences are not the same thing', () => {
  const soft = ask({
    category: 'everyday_assistant',
    priorities: ['c_training_default'],
  })
  const hard = ask({
    category: 'everyday_assistant',
    priorities: ['c_training_default'],
    requirements: ['c_training_default'],
  })

  it('a soft conflict never removes an option from the catalogue', () => {
    expect(soft.ruledOut).toHaveLength(0)
    expect(soft.compromises.length).toBeGreaterThan(0)
  })

  it('a confirmed failure of a hard requirement does remove it', () => {
    expect(hard.ruledOut.length).toBeGreaterThan(0)
    expect(hard.compromises).toHaveLength(0)
    for (const o of hard.ruledOut) expect(o.brokenRequirements.length).toBeGreaterThan(0)
  })

  it('leads with the same options either way — a must-have filters, it does not promote', () => {
    expect(names(soft.lead)).toEqual(names(hard.lead))
  })

  it('an unknown hard requirement leaves an option unconfirmed, never satisfied', () => {
    const a = ask({
      category: 'everyday_assistant',
      priorities: ['c_service_migration'],
      requirements: ['c_service_migration'],
    })
    expect(a.lead).toHaveLength(0)
    expect(a.ruledOut).toHaveLength(0)
  })
})

describe('nothing leads on a count of positive findings', () => {
  it('requires confirmation on every evaluable criterion, not the most of them', () => {
    const a = ask({
      category: 'everyday_assistant',
      priorities: ['c_training_default', 'c_nonprofit_control', 'c_content_export'],
    })
    for (const o of a.lead) {
      for (const c of a.evaluable) {
        expect(
          o.meetsOn.some((m) => m.id === c.id),
          `${o.alternative.product} leads without a finding on ${c.id}`,
        ).toBe(true)
      }
    }
    // Anything with more confirmed findings than a non-leader still does not
    // lead unless it covers all of them.
    for (const o of [...a.compromises, ...a.needConfirmation]) {
      expect(a.evaluable.every((c) => o.meetsOn.some((m) => m.id === c.id))).toBe(false)
    }
  })

  it('nothing leads when no selected criterion can be evaluated', () => {
    const a = ask({ category: 'everyday_assistant', priorities: ['c_service_migration'] })
    expect(a.evaluable).toHaveLength(0)
    expect(a.lead, 'a vacuous "covers everything" must not promote the whole catalogue').toHaveLength(0)
  })
})

describe('a configuration is named, not hidden', () => {
  it('reports a plan-answerable question as a choice rather than a research gap', () => {
    const a = ask({ category: 'app_builder', priorities: ['c_work_training_default'] })
    expect(a.kind).toBe('plan_dependent')
    expect(a.headline).toMatch(/depends on the plan/i)
    expect(a.headline).not.toMatch(/have not researched/i)
    const routes = a.rest.concat(a.needConfirmation).flatMap((o) => o.planRoutes)
    expect(routes.length).toBeGreaterThan(0)
    for (const r of routes) expect(r.qualifying.length).toBeGreaterThan(0)
  })

  it('names the plan the visitor actually chose in the conditions', () => {
    const a = ask({
      category: 'app_builder',
      priorities: ['c_work_training_default'],
      plans: { lovable: 'business' },
    })
    expect(names(a.lead)).toContain('Lovable')
    expect(a.conditions.join(' ')).toMatch(/Lovable on Business, the plan you picked/)
  })

  it('offers a plan route only where the visitor has not already picked one', () => {
    const a = ask({
      category: 'app_builder',
      priorities: ['c_work_training_default'],
      plans: { lovable: 'free' },
    })
    const lovable = [...a.lead, ...a.compromises, ...a.needConfirmation, ...a.rest].find(
      (o) => o.alternative.id === 'lovable',
    )!
    expect(lovable.planRoutes).toHaveLength(0)
  })
})

describe('the advice states its own scope', () => {
  it('says what it did not check when a selection could not be evaluated', () => {
    const a = ask({
      category: 'everyday_assistant',
      priorities: ['c_training_default', 'c_service_migration'],
    })
    expect(a.unevaluable.map((c) => c.id)).toEqual(['c_service_migration'])
    expect(a.headline).toMatch(/have not researched/i)
  })

  it('says a selected topic is read rather than scored', () => {
    const a = ask({
      category: 'everyday_assistant',
      priorities: ['c_training_default'],
      interests: ['worker_creator_treatment'],
    })
    expect(a.interestScope).toBeTruthy()
    expect(a.interestScope!).toMatch(/not scored/)
    expect(a.interestScope!).toMatch(/clean record/)
  })

  it('invites a choice rather than inventing one', () => {
    const a = ask({ category: 'everyday_assistant' })
    expect(a.kind).toBe('nothing_selected')
    expect(a.lead).toHaveLength(0)
    expect(a.headline).toMatch(/browse/i)
  })
})

describe('sentences are written, not concatenated', () => {
  it('never splices a whole criterion statement into the advice copy', () => {
    const cases: Partial<RecommendationInput>[] = [
      { category: 'everyday_assistant', priorities: ['c_training_default'] },
      { category: 'everyday_assistant', priorities: ['c_training_default', 'c_service_migration'] },
      {
        category: 'everyday_assistant',
        priorities: ['c_public_purpose_stake', 'c_training_default'],
      },
      { category: 'app_builder', priorities: ['c_work_training_default', 'c_backend_migration'] },
    ]
    const statements = criteria
      .map((c) => c.label)
      .filter((l) => /^(You|I|My|Your|The|A|No|Past|There)\b/.test(l))
    for (const input of cases) {
      const a = ask(input)
      const copy = [a.headline, a.scopeNote ?? '', ...a.conditions].join(' ')
      for (const st of statements) {
        expect(copy, `spliced "${st}"`).not.toContain(st.toLowerCase())
        expect(copy, `spliced "${st}"`).not.toContain(st)
      }
      expect(copy).not.toMatch(/\ball 1\b|\bAll 2\b|undefined|NaN/)
    }
  })

  it('counts unconfirmed options instead of listing them all', () => {
    const a = ask({
      category: 'everyday_assistant',
      priorities: ['c_public_purpose_stake', 'c_training_default'],
    })
    // The headline names what to do; it does not enumerate the rest.
    expect(a.headline.split(',').length).toBeLessThan(4)
  })
})
