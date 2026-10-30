import { describe, expect, it } from 'vitest'
import { funderPath, legacyHashToPath, withBasePath } from '../routes'

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

describe('funderPath', () => {
  it('emits encoded /funder/ paths from funder ids', () => {
    expect(funderPath('sequoia-capital')).toBe('/funder/sequoia-capital')
    expect(funderPath('alphabet-google')).toBe('/funder/alphabet-google')
  })

  it('percent-encodes any id that is not already URL-safe', () => {
    expect(funderPath('a b')).toBe('/funder/a%20b')
  })
})

describe('withBasePath', () => {
  it('leaves in-app paths untouched on root deployments', () => {
    expect(withBasePath('/', '/maker/Anthropic')).toBe('/maker/Anthropic')
    expect(withBasePath('', '/compare?from=OpenAI')).toBe('/compare?from=OpenAI')
  })

  it('joins the deployment base for subpath deployments (GitHub Pages project site)', () => {
    expect(withBasePath('/value-compass/', '/maker/Anthropic')).toBe('/value-compass/maker/Anthropic')
    expect(withBasePath('/value-compass/', '/compare?from=OpenAI')).toBe('/value-compass/compare?from=OpenAI')
  })
})
