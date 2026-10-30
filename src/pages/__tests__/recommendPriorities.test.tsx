// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { PrioritiesProvider } from '../../lib/prioritiesContext'
import { RecommendView } from '../RecommendView'

// The new priorities flow: pick axes in the tool finder, see the selection in
// the address bar, see it reorder the submitted results. Rendered with real
// data — the ordering claims are only meaningful against real eligibility.

function SearchProbe() {
  const { search } = useLocation()
  return <span data-testid="search">{search}</span>
}

function View({ url = '/recommend' }: { url?: string }) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <PrioritiesProvider>
        <RecommendView />
        <SearchProbe />
      </PrioritiesProvider>
    </MemoryRouter>
  )
}

/** The product-card headings inside the full-evidence grid, in document order. */
function cardNames() {
  const details = screen
    .getByText('Every option with its full evidence')
    .closest('details') as HTMLElement
  return within(details)
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('axis priorities in the tool finder', () => {
  it('starts with nothing selected and the submit disabled', () => {
    render(<View />)
    expect(screen.getByTestId('search').textContent).toBe('')
    const submit = screen.getByRole('button', { name: 'Show my options' })
    expect(submit).toHaveProperty('disabled', true)
    // The panel is reachable: its five axis rows are on the page.
    expect(
      screen.getByRole('radiogroup', { name: 'How much Transparency matters to you' }),
    ).toBeTruthy()
  })

  it('reflects a shared link in the panel and the address bar', () => {
    render(<View url="/recommend?axes=transparency:2" />)
    const group = screen.getByRole('radiogroup', {
      name: 'How much Transparency matters to you',
    })
    const selected = within(group).getByRole('radio', { name: 'Matters a lot' })
    expect(selected.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByTestId('search').textContent).toBe('?axes=transparency:2')
  })

  it('puts a clicked axis weight in the address bar', () => {
    render(<View />)
    const group = screen.getByRole('radiogroup', {
      name: 'How much Transparency matters to you',
    })
    fireEvent.click(within(group).getByRole('radio', { name: 'Matters a lot' }))
    expect(screen.getByTestId('search').textContent).toBe('?axes=transparency:2')
  })

  it('removes the params when everything is cleared', () => {
    render(<View url="/recommend?axes=transparency:2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(screen.getByTestId('search').textContent).toBe('')
  })

  it('applies the editorial example and encodes it in the URL', () => {
    render(<View />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview the example priorities' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply the example' }))
    expect(screen.getByTestId('search').textContent).toBe(
      '?axes=transparency:2,culture_esg:1,labour_integrity:2,wealth_dispersion:1,public_sharing:1',
    )
  })

  it('orders the submitted results by the shared priorities and says so', () => {
    render(<View url="/recommend?axes=transparency:2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show my options' }))

    // The ordering is stated, not implied by position.
    expect(screen.getByText('Ordered by your priorities')).toBeTruthy()
    expect(screen.getByText('Transparency: Matters a lot')).toBeTruthy()

    // Placed options first — Claude (Anthropic) leads — and the grid still
    // carries every option in the category.
    const names = cardNames()
    expect(names[0]).toBe('Claude')
    expect(names.length).toBe(13)
  })

  it('keeps the default alphabetical order when no priorities are set', () => {
    render(<View />)
    fireEvent.click(
      screen.getByLabelText(/not used for model training unless you allow it/),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show my options' }))
    expect(screen.queryByText('Ordered by your priorities')).toBeNull()
    expect(cardNames()[0]).toBe('ChatGPT')
  })

  it('survives a garbled share link without inventing priorities', () => {
    render(<View url="/recommend?axes=garbage" />)
    const group = screen.getByRole('radiogroup', {
      name: 'How much Transparency matters to you',
    })
    const none = within(group).getByRole('radio', { name: 'Not a priority' })
    expect(none.getAttribute('aria-checked')).toBe('true')
  })
})
