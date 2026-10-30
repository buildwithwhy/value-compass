import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from '../NotFoundPage'
import { render } from '../../test/test-utils'

describe('NotFoundPage', () => {
  it('renders a real 404 with navigation home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()

    // The escape hatches: home, browse, graph.
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Browse makers' })).toHaveAttribute(
      'href',
      '/browse',
    )
    expect(screen.getByRole('link', { name: 'Ownership graph' })).toHaveAttribute(
      'href',
      '/graph',
    )
  })

  it('lets maker and funder pages name what was not found', () => {
    render(
      <MemoryRouter>
        <NotFoundPage title="Funder not found" message="No funder with id “x”." />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Funder not found' })).toBeInTheDocument()
    expect(screen.getByText('No funder with id “x”.')).toBeInTheDocument()
  })
})
