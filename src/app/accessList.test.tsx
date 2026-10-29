import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { copy } from '@/copy'
import { formatDate } from '@/lib/format'
import { createAppRouter } from '@/routes/router'
import type { AccessListEntry } from '@/services/types'
import { apiUrl, errorResponse, refreshAccepted } from '@/test/adminAuth'
import { server } from '@/test/msw/server'

const listUrl = apiUrl('/v1/admin/access-list')
const entryUrl = apiUrl('/v1/admin/access-list/:email')

/** An in-memory access list served like API-102. */
function serveAccessList(initial: AccessListEntry[]) {
  let items = [...initial]
  const requests = { add: [] as { email: string }[], remove: [] as string[] }
  server.use(
    http.get(listUrl, () => {
      return HttpResponse.json({
        items: items.toSorted((a, b) => a.email.localeCompare(b.email)),
      })
    }),
    http.post<never, { email: string }>(listUrl, async ({ request }) => {
      const body = await request.json()
      requests.add.push(body)
      const { email } = body
      if (items.some((i) => i.email === email)) return errorResponse('already_listed', 409)
      const entry = { email, createdAt: '2026-10-28T12:00:00Z' }
      items.push(entry)
      return HttpResponse.json(entry, { status: 201 })
    }),
    http.delete(entryUrl, ({ request }) => {
      const segment = new URL(request.url).pathname.split('/').at(-1) ?? ''
      requests.remove.push(segment)
      const email = decodeURIComponent(segment)
      if (!items.some((i) => i.email === email)) return errorResponse('not_found', 404)
      items = items.filter((i) => i.email !== email)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return requests
}

const ana: AccessListEntry = { email: 'ana@example.com', createdAt: '2026-10-20T15:00:00Z' }
const beto: AccessListEntry = { email: 'beto+test@example.com', createdAt: '2026-10-21T15:00:00Z' }

function renderAccessList() {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/access-list'] }))
  render(<App router={router} />)
  return router
}

const heading = () => screen.findByRole('heading', { level: 1, name: copy.accessList.title })
const table = () => screen.findByRole('table', { name: copy.accessList.tableCaption })
const emailField = () => screen.getByLabelText(copy.accessList.email)
const addButton = () => screen.getByRole('button', { name: copy.accessList.add })

type User = ReturnType<typeof userEvent.setup>

async function addEmail(user: User, email: string) {
  await user.type(emailField(), email)
  await user.click(addButton())
}

async function openConfirm(user: User, email: string) {
  await user.click(
    within(await table()).getByRole('button', { name: copy.accessList.removeLabel(email) }),
  )
  return screen.findByRole('alertdialog', { name: copy.accessList.confirmTitle(email) })
}

beforeEach(() => {
  server.use(refreshAccepted())
})

describe('access list screen', () => {
  it('is reachable from the navigation and explains what the list is for', async () => {
    serveAccessList([ana])
    renderAccessList()

    await heading()
    expect(screen.getByText(copy.accessList.description)).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: copy.nav.label })
    expect(within(nav).getByRole('link', { name: copy.nav.accessList })).toHaveAttribute(
      'data-status',
      'active',
    )
  })

  it('shows a loading state, then each email with the date it was added', async () => {
    serveAccessList([beto, ana])
    renderAccessList()

    expect(await screen.findByText(copy.accessList.loading)).toBeInTheDocument()
    const rows = within(await table())
      .getAllByRole('row')
      .slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[0]?.textContent)).toEqual([
      ana.email,
      beto.email,
    ])
    const [first] = rows
    if (!first) throw new Error('expected a row for each email')
    expect(first).toHaveTextContent(formatDate(ana.createdAt))
    expect(within(first).getByRole('button')).toHaveAccessibleName(
      copy.accessList.removeLabel(ana.email),
    )
  })

  it('says when the list is empty', async () => {
    serveAccessList([])
    renderAccessList()

    expect(await screen.findByText(copy.accessList.empty)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(emailField()).toBeInTheDocument()
  })

  it('explains that the list is not configured, without retrying or offering the form', async () => {
    const list = vi.fn<() => void>()
    server.use(
      http.get(listUrl, () => {
        list()
        return errorResponse('access_list_not_configured', 503)
      }),
    )
    renderAccessList()

    expect(await screen.findByText(copy.accessList.notConfiguredTitle)).toBeInTheDocument()
    expect(screen.getByText(copy.accessList.notConfiguredBody)).toBeInTheDocument()
    expect(screen.queryByLabelText(copy.accessList.email)).not.toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('reports an upstream failure and loads the list on retry', async () => {
    const user = userEvent.setup()
    let failing = true
    server.use(
      http.get(listUrl, () =>
        failing ? errorResponse('upstream_error', 502) : HttpResponse.json({ items: [ana] }),
      ),
    )
    renderAccessList()

    // The query retries once on its own before showing the error.
    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent(copy.accessList.loadErrorTitle)
    expect(alert).toHaveTextContent(copy.apiErrors.upstream_error)

    failing = false
    await user.click(within(alert).getByRole('button', { name: copy.actions.retry }))

    expect(within(await table()).getByText(ana.email)).toBeInTheDocument()
  })
})

describe('adding an email', () => {
  it('sends the trimmed email, announces it and refreshes the list', async () => {
    const user = userEvent.setup()
    const requests = serveAccessList([ana])
    renderAccessList()
    await table()

    await addEmail(user, '  carla@example.com ')

    expect(await screen.findByRole('status')).toHaveTextContent(
      copy.accessList.added('carla@example.com'),
    )
    expect(requests.add).toEqual([{ email: 'carla@example.com' }])
    expect(await within(await table()).findByText('carla@example.com')).toBeInTheDocument()
    expect(emailField()).toHaveValue('')
    await waitFor(() => {
      expect(emailField()).toHaveFocus()
    })
  })

  it('shows a duplicate next to the field', async () => {
    const user = userEvent.setup()
    serveAccessList([ana])
    renderAccessList()
    await table()

    await addEmail(user, ana.email)

    await waitFor(() => {
      expect(emailField()).toBeInvalid()
    })
    expect(emailField()).toHaveAccessibleDescription(copy.apiErrors.already_listed)
    expect(emailField()).toHaveValue(ana.email)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('checks the email before sending it', async () => {
    const user = userEvent.setup()
    const requests = serveAccessList([ana])
    renderAccessList()
    await table()

    await user.click(addButton())
    expect(emailField()).toHaveAccessibleDescription(copy.accessList.errors.emailRequired)

    await addEmail(user, 'no-es-un-email')
    expect(emailField()).toBeInvalid()
    expect(emailField()).toHaveAccessibleDescription(copy.accessList.errors.emailInvalid)
    expect(emailField()).toHaveFocus()
    expect(requests.add).toEqual([])
  })

  it('shows the field error the API reports for an invalid email', async () => {
    const user = userEvent.setup()
    serveAccessList([ana])
    server.use(
      http.post(listUrl, () =>
        HttpResponse.json(
          { error: { code: 'validation_failed', fields: [{ field: 'email', rule: 'email' }] } },
          { status: 422 },
        ),
      ),
    )
    renderAccessList()
    await table()

    await addEmail(user, 'ana@ejemplo')

    await waitFor(() => {
      expect(emailField()).toBeInvalid()
    })
    expect(emailField()).toHaveAccessibleDescription(copy.validation.email)
  })

  it.each([
    ['upstream_error', 502],
    ['access_list_not_configured', 503],
  ] as const)('shows %s in the form alert', async (code, status) => {
    const user = userEvent.setup()
    serveAccessList([ana])
    server.use(http.post(listUrl, () => errorResponse(code, status)))
    renderAccessList()
    await table()

    await addEmail(user, 'carla@example.com')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(copy.apiErrors[code])
    await waitFor(() => {
      expect(alert).toHaveFocus()
    })
    expect(emailField()).not.toBeInvalid()
  })
})

describe('removing an email', () => {
  it('asks for confirmation and does nothing on cancel', async () => {
    const user = userEvent.setup()
    const requests = serveAccessList([ana])
    renderAccessList()

    const dialog = await openConfirm(user, ana.email)
    expect(dialog).toHaveAccessibleDescription(copy.accessList.confirmBody)
    await user.click(within(dialog).getByRole('button', { name: copy.accessList.cancel }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(requests.remove).toEqual([])
    expect(within(await table()).getByText(ana.email)).toBeInTheDocument()
  })

  it('removes the email after confirming and refreshes the list', async () => {
    const user = userEvent.setup()
    const requests = serveAccessList([ana, beto])
    renderAccessList()

    const dialog = await openConfirm(user, beto.email)
    await user.click(within(dialog).getByRole('button', { name: copy.accessList.remove }))

    expect(await screen.findByRole('status')).toHaveTextContent(copy.accessList.removed(beto.email))
    expect(requests.remove).toEqual(['beto%2Btest%40example.com'])
    await waitFor(() => {
      expect(screen.queryByText(beto.email)).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: copy.accessList.title })).toHaveFocus()
  })

  it('treats an email someone else already removed as removed', async () => {
    const user = userEvent.setup()
    serveAccessList([ana])
    server.use(http.delete(entryUrl, () => errorResponse('not_found', 404)))
    renderAccessList()

    const dialog = await openConfirm(user, ana.email)
    await user.click(within(dialog).getByRole('button', { name: copy.accessList.remove }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      copy.accessList.alreadyRemoved(ana.email),
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('keeps the dialog open and shows the error when the removal fails', async () => {
    const user = userEvent.setup()
    serveAccessList([ana])
    server.use(http.delete(entryUrl, () => errorResponse('upstream_error', 502)))
    renderAccessList()

    const dialog = await openConfirm(user, ana.email)
    await user.click(within(dialog).getByRole('button', { name: copy.accessList.remove }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      copy.apiErrors.upstream_error,
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
