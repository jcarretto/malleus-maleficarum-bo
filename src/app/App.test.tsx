import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'

describe('App', () => {
  it('renders the title and a button', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Backoffice' })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
