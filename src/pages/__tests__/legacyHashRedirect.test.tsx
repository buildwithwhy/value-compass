import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { legacyHashToPath, withBasePath } from '../../lib/routes'
import { LocationProbe, trackLocation } from '../../test/test-utils'

/**
 * Replicates the main.tsx boot sequence for a legacy HashRouter deep link:
 * `/#/maker/Anthropic` is rewritten onto the real path before the router
 * mounts, the route matches on the legacy display-name id, and the page
 * itself canonicalizes it to the slug.
 */
function bootFromHash() {
  const tracked = trackLocation()
  const legacyPath = legacyHashToPath(window.location.hash)
  if (legacyPath) window.history.replaceState(null, '', withBasePath('/', legacyPath))

  render(
    <MemoryRouter
      initialEntries={[window.location.pathname + window.location.search]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
      <LocationProbe tracked={tracked} />
    </MemoryRouter>,
  )
  return tracked
}

/** jsdom persists window state across tests in a file; model a fresh load. */
function freshPage() {
  window.history.replaceState(null, '', '/')
  window.location.hash = ''
}

describe('legacy hash deep links', () => {
  it('land on the canonical slug route for the maker they address', async () => {
    freshPage()
    window.location.hash = '#/maker/Anthropic'
    expect(legacyHashToPath(window.location.hash)).toBe('/maker/Anthropic')

    const tracked = bootFromHash()

    // The maker profile renders (lazy route — wait for the suspense boundary
    // to resolve) and the address converged on the slug.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Anthropic' }),
    ).toBeInTheDocument()
    expect(tracked.current.pathname).toBe('/maker/anthropic')
  })

  it('redirect a legacy compare link onto /compare with its params intact', async () => {
    freshPage()
    window.location.hash = '#/compare?from=OpenAI&products=OpenAI,Anthropic'
    expect(legacyHashToPath(window.location.hash)).toBe(
      '/compare?from=OpenAI&products=OpenAI,Anthropic',
    )

    bootFromHash()

    expect(await screen.findByRole('heading', { level: 1, name: 'Compare tools' })).toBeInTheDocument()
  })

  it('leave section-style hashes alone — no rewrite, no route change', async () => {
    freshPage()
    window.location.hash = '#section-title'
    expect(legacyHashToPath(window.location.hash)).toBeNull()

    // Without a rewrite the app boots at its real path (/) — the home view,
    // not the 404, not a maker page.
    const tracked = bootFromHash()
    expect(
      await screen.findByText(/Value Compass — what the companies behind AI tools own/),
    ).toBeInTheDocument()
    expect(tracked.current.pathname).toBe('/')
  })
})
