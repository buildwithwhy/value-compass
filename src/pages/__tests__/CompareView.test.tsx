import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CompareView } from '../CompareView'
import { LocationProbe, renderWithRouter, trackLocation } from '../../test/test-utils'

const ROUTE = '/compare?category=everyday_assistant&from=chatgpt&products=chatgpt,claude'

describe('CompareView', () => {
  it('renders the products named in the URL params as the selection', () => {
    renderWithRouter(<CompareView />, { route: ROUTE })

    expect(screen.getByRole('heading', { level: 1, name: 'Compare tools' })).toBeInTheDocument()

    // Selected products are pressed pickers.
    expect(screen.getByRole('button', { name: 'ChatGPT' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Claude' })).toHaveAttribute('aria-pressed', 'true')

    // Unselected same-category products are available, off, and capped at four.
    const gemini = screen.getByRole('button', { name: 'Gemini' })
    expect(gemini).toHaveAttribute('aria-pressed', 'false')
    expect(gemini).toBeEnabled()

    // Other categories never leak into this picker.
    expect(screen.queryByRole('button', { name: 'Lovable' })).not.toBeInTheDocument()
  })

  it('names the tool the visitor is comparing against, from the `from` param', () => {
    renderWithRouter(<CompareView />, { route: ROUTE })

    expect(screen.getByText('ChatGPT', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/Comparing against/)).toBeInTheDocument()
  })

  it('opens with the editorial questions when no `q` param narrows them', () => {
    renderWithRouter(<CompareView />, { route: ROUTE })

    expect(
      screen.getByText('Your conversations are not used for model training unless you allow it'),
    ).toBeInTheDocument()
    expect(screen.getByText('You can download your own conversations')).toBeInTheDocument()
  })

  it('updates the selection in the URL when a product is picked', async () => {
    const user = userEvent.setup()
    const tracked = trackLocation()
    renderWithRouter(
      <>
        <CompareView />
        <LocationProbe tracked={tracked} />
      </>,
      { route: ROUTE },
    )

    await user.click(screen.getByRole('button', { name: 'Gemini' }))

    expect(screen.getByRole('button', { name: 'Gemini' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // URLSearchParams encodes the commas; compare the decoded param value.
    expect(new URLSearchParams(tracked.current.search).get('products')).toBe(
      'chatgpt,claude,gemini',
    )
  })
})
