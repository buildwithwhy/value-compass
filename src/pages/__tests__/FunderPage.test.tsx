import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { FunderPage } from '../FunderPage'
import { funders, getFunder, makers } from '../../lib/data'
import { renderWithRouter } from '../../test/test-utils'

function mountFunderPage(route: string) {
  renderWithRouter(
    <Routes>
      <Route path="/funder/:slug" element={<FunderPage />} />
    </Routes>,
    { route },
  )
}

describe('FunderPage', () => {
  it('renders the funder record addressed by the slug route param', () => {
    const funder = getFunder('nvidia')
    expect(funder).toBeDefined()

    mountFunderPage('/funder/nvidia')

    expect(screen.getByRole('heading', { level: 1, name: funder!.name })).toBeInTheDocument()

    // The stake heading is derived from data — recompute it the same way the
    // component does (makers_backed + owns_outright, deduplicated).
    const backed = [...(funder!.makers_backed ?? []), ...(funder!.owns_outright ?? [])].filter(
      (id, i, arr) => arr.indexOf(id) === i,
    )
    expect(
      screen.getByText(`Holds a stake in ${backed.length} of the ${makers.length} makers`),
    ).toBeInTheDocument()
  })

  it('links each backed maker to its canonical maker page', () => {
    const funder = getFunder('nvidia')
    expect(funder).toBeDefined()

    mountFunderPage('/funder/nvidia')

    for (const id of funder!.makers_backed) {
      const maker = makers.find((m) => m.id === id)
      expect(maker).toBeDefined()
      expect(screen.getByRole('link', { name: maker!.name })).toHaveAttribute(
        'href',
        `/maker/${maker!.slug}`,
      )
    }
  })

  it('shows a real 404 for an unknown funder id', () => {
    expect(funders.find((f) => f.id === 'not-a-funder')).toBeUndefined()

    mountFunderPage('/funder/not-a-funder')

    expect(screen.getByText('Funder not found')).toBeInTheDocument()
    expect(screen.getByText(/No funder with id “not-a-funder”/)).toBeInTheDocument()
  })
})
