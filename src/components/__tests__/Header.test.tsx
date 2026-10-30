import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../Header'
import { LocationProbe, trackLocation } from '../../test/test-utils'

function mountHeader(route = '/') {
  const tracked = trackLocation()
  render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
      <LocationProbe tracked={tracked} />
    </MemoryRouter>,
  )
  return tracked
}

describe('Header', () => {
  it('renders the primary navigation with its three destinations', () => {
    mountHeader()

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find an AI tool' })).toHaveAttribute(
      'href',
      '/recommend',
    )
    expect(screen.getByRole('link', { name: 'Compare tools' })).toHaveAttribute(
      'href',
      '/compare',
    )
    expect(screen.getByRole('link', { name: 'Explore companies' })).toHaveAttribute(
      'href',
      '/browse',
    )
  })

  it('marks only the brand link as current on the home route', () => {
    mountHeader()

    const brand = screen.getByRole('link', { name: /Value Compass/ })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Compare tools' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('navigates to the clicked destination and marks it current', async () => {
    const user = userEvent.setup()
    const tracked = mountHeader()

    await user.click(screen.getByRole('link', { name: 'Explore companies' }))

    expect(tracked.current.pathname).toBe('/browse')
    expect(screen.getByRole('link', { name: 'Explore companies' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: /Value Compass/ })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
