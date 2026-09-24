import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { ErrorFallback } from '@/components/ErrorFallback'
import { copy } from '@/copy'
import { createAppRouter } from '@/routes/router'

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  return render(<App router={router} />)
}

describe('App shell', () => {
  it('renders the layout with navigation and the home page', async () => {
    renderAt('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: copy.home.title }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: copy.nav.label })
    expect(within(nav).getByRole('link', { name: copy.nav.home })).toHaveAttribute(
      'data-status',
      'active',
    )
  })

  it('keeps the layout and shows not-found for unknown routes', async () => {
    renderAt('/no-existe')

    expect(
      await screen.findByRole('heading', { name: copy.errors.notFoundTitle }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: copy.nav.label })).toBeInTheDocument()
  })
})

function Bomb({ explode }: { explode: boolean }) {
  if (explode) {
    throw new Error('boom')
  }
  return <p>recovered</p>
}

function Harness() {
  const [explode, setExplode] = useState(true)
  function handleReset() {
    setExplode(false)
  }
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={handleReset}>
      <Bomb explode={explode} />
    </ErrorBoundary>
  )
}

describe('ErrorFallback', () => {
  it('shows the fallback when rendering throws and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined) // React logs caught errors
    render(<Harness />)

    expect(screen.getByRole('alert')).toHaveTextContent(copy.errors.unexpectedTitle)

    await userEvent.click(screen.getByRole('button', { name: copy.actions.retry }))

    expect(screen.getByText('recovered')).toBeInTheDocument()
  })
})
