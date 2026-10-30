import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { MakerPage } from '../MakerPage'
import { getMakerBySlug } from '../../lib/data'
import { LocationProbe, renderWithRouter, trackLocation } from '../../test/test-utils'

function mountMakerPage(route: string) {
  const tracked = trackLocation()
  renderWithRouter(
    <Routes>
      <Route
        path="/maker/:id"
        element={
          <>
            <MakerPage />
            <LocationProbe tracked={tracked} />
          </>
        }
      />
    </Routes>,
    { route },
  )
  return tracked
}

describe('MakerPage', () => {
  it('renders the profile for the maker addressed by the slug route param', () => {
    const maker = getMakerBySlug('anthropic')
    expect(maker).toBeDefined()

    mountMakerPage('/maker/anthropic')

    // Name, tier label, jurisdiction — straight from the maker record.
    expect(
      screen.getByRole('heading', { level: 2, name: maker!.name }),
    ).toBeInTheDocument()
    expect(screen.getByText('Frontier lab')).toBeInTheDocument()
    expect(screen.getByText(maker!.jurisdiction)).toBeInTheDocument()

    // Products render as chips.
    for (const product of maker!.products_models) {
      expect(screen.getByText(product)).toBeInTheDocument()
    }

    // Back link to the browse surface.
    expect(screen.getByRole('link', { name: '← All makers' })).toHaveAttribute(
      'href',
      '/browse',
    )
  })

  it('redirects a legacy display-name id to the canonical slug route', () => {
    const maker = getMakerBySlug('anthropic')
    expect(maker).toBeDefined()

    const tracked = mountMakerPage('/maker/Anthropic')

    // The profile renders — after the Navigate, not as the raw legacy id.
    expect(screen.getByRole('heading', { level: 2, name: maker!.name })).toBeInTheDocument()
    expect(tracked.current.pathname).toBe('/maker/anthropic')
  })

  it('shows a real 404 for an unknown maker', () => {
    mountMakerPage('/maker/nobody-here')

    expect(screen.getByText('Maker not found')).toBeInTheDocument()
    expect(screen.getByText(/No maker “nobody-here” is recorded/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
  })
})
