import { describe, expect, it } from 'vitest'
import fundersRaw from '../../data/funders.json'
import makersRaw from '../../data/makers.json'

// Drift guard: _meta.count must equal the actual record count in both data
// files, so a newly added maker or funder cannot ship with stale metadata.
describe('data file count metadata', () => {
  it('makers.json _meta.count equals the number of maker records', () => {
    expect(makersRaw._meta.count).toBe(makersRaw.makers.length)
    expect(makersRaw.makers.length).toBeGreaterThan(0)
  })

  it('funders.json _meta.count equals the number of funder records', () => {
    expect(fundersRaw._meta.count).toBe(fundersRaw.funders.length)
    expect(fundersRaw.funders.length).toBeGreaterThan(0)
  })
})
