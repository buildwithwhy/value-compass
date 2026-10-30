import { cleanup, render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PrioritiesProvider } from '../lib/prioritiesContext'

// Re-export so test files pull everything from one harness module.
export { cleanup, render }

/**
 * Renders a page the way App mounts it: MemoryRouter at a chosen address,
 * wrapped in PrioritiesProvider (pages render `useCapitalLens` consumers,
 * which throw without it).
 */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: { route?: string } & RenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <PrioritiesProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </PrioritiesProvider>
    ),
    ...options,
  })
}

export interface TrackedLocation {
  pathname: string
  search: string
}

export function trackLocation(): { current: TrackedLocation } {
  return { current: { pathname: '', search: '' } }
}

/** Renders nothing; mirrors the live router location into a tracked object. */
export function LocationProbe({ tracked }: { tracked: { current: TrackedLocation } }) {
  const location = useLocation()
  tracked.current = { pathname: location.pathname, search: location.search }
  return null
}
