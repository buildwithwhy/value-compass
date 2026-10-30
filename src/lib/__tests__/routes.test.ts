import { describe, expect, it } from 'vitest'
import { legacyHashToPath } from '../routes'

describe('legacyHashToPath', () => {
  it('rewrites HashRouter deep links to the path they addressed', () => {
    expect(legacyHashToPath('#/maker/Anthropic')).toBe('/maker/Anthropic')
    expect(legacyHashToPath('#/compare?from=OpenAI&products=OpenAI,Anthropic')).toBe(
      '/compare?from=OpenAI&products=OpenAI,Anthropic',
    )
  })

  it('returns null for hashes that are not legacy routes', () => {
    expect(legacyHashToPath('')).toBeNull()
    expect(legacyHashToPath('#')).toBeNull()
    expect(legacyHashToPath('#section-title')).toBeNull()
  })

  it('collapses the empty segment of a double-slash legacy path', () => {
    expect(legacyHashToPath('#//maker/Anthropic')).toBe('/maker/Anthropic')
  })
})
