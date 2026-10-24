import { createMemoryHistory } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { App } from '@/app/App'
import { copy } from '@/copy'
import { createAppRouter } from '@/routes/router'
import { getAccessToken } from '@/services/accessToken'
import { refreshSession } from '@/services/client'
import { useAuthStore } from '@/stores/auth'
import {
  adminSession,
  adminUser,
  apiUrl,
  errorResponse,
  refreshAccepted,
  refreshRejected,
} from '@/test/adminAuth'
import { server } from '@/test/msw/server'

function renderAt(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  render(<App router={router} />)
  return router
}

const signInHeading = () => screen.findByRole('heading', { level: 1, name: copy.auth.signInTitle })
const homeHeading = () => screen.findByRole('heading', { level: 1, name: copy.home.title })

const emailField = () => screen.getByLabelText(copy.auth.email)
const passwordField = () => screen.getByLabelText(copy.auth.password)
const codeField = () => screen.getByLabelText(copy.auth.totpCode)
const submitButton = () => screen.getByRole('button', { name: copy.auth.submit })

type User = ReturnType<typeof userEvent.setup>

async function fillForm(user: User, code = '123456') {
  await user.type(emailField(), 'ana@example.com')
  await user.type(passwordField(), 'correct horse')
  if (code) await user.type(codeField(), code)
}

describe('route guards', () => {
  it('sends a visitor without a session to the sign-in screen', async () => {
    server.use(refreshRejected())

    const router = renderAt('/')

    await signInHeading()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('also guards unknown routes', async () => {
    server.use(refreshRejected())

    const router = renderAt('/no-existe')

    await signInHeading()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('treats an unreachable server as signed out', async () => {
    server.use(http.post(apiUrl('/v1/admin/auth/refresh'), () => HttpResponse.error()))

    const router = renderAt('/')

    await signInHeading()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('restores the session on reload through the refresh cookie', async () => {
    server.use(refreshAccepted())

    const router = renderAt('/')

    await homeHeading()
    expect(router.state.location.pathname).toBe('/')
    expect(getAccessToken()).toBe(adminSession().accessToken)
    expect(useAuthStore.getState().user).toEqual(adminUser)
  })

  it('moves a signed-in admin away from the sign-in screen', async () => {
    server.use(refreshAccepted())

    const router = renderAt('/login')

    await homeHeading()
    expect(router.state.location.pathname).toBe('/')
  })

  it('rejects a restored session that is not an admin', async () => {
    server.use(
      http.post(apiUrl('/v1/admin/auth/refresh'), () =>
        HttpResponse.json(adminSession('tok-player', { ...adminUser, role: 'user' })),
      ),
    )

    renderAt('/')

    await signInHeading()
    expect(getAccessToken()).toBeNull()
  })

  it('returns to the sign-in screen when the session ends while the app is open', async () => {
    server.use(refreshAccepted())
    const router = renderAt('/')
    await homeHeading()
    server.use(refreshRejected())

    // What the HTTP client does when an expired access token cannot be renewed.
    await expect(refreshSession()).rejects.toMatchObject({ code: 'invalid_refresh_token' })

    await signInHeading()
    expect(router.state.location.pathname).toBe('/login')
    expect(getAccessToken()).toBeNull()
  })
})

async function renderSignIn() {
  server.use(refreshRejected())
  const router = renderAt('/login')
  await signInHeading()
  return router
}

describe('sign-in form', () => {
  it('exposes labelled fields with the right input hints', async () => {
    await renderSignIn()

    expect(emailField()).toHaveAttribute('type', 'email')
    expect(emailField()).toHaveAttribute('autocomplete', 'username')
    expect(passwordField()).toHaveAttribute('type', 'password')
    expect(passwordField()).toHaveAttribute('autocomplete', 'current-password')
    expect(codeField()).toHaveAttribute('autocomplete', 'one-time-code')
    expect(codeField()).toHaveAttribute('inputmode', 'numeric')
    expect(codeField()).toHaveAttribute('maxlength', '6')
    expect(codeField()).toHaveAccessibleDescription(copy.auth.totpHint)
  })

  it('signs in with email, password and code, then opens the home page', async () => {
    const user = userEvent.setup()
    const login = vi.fn<(body: unknown) => void>()
    const router = await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), async ({ request }) => {
        login(await request.json())
        return HttpResponse.json(adminSession('tok-login'))
      }),
    )

    await fillForm(user)
    await user.click(submitButton())

    await homeHeading()
    expect(login).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'correct horse',
      totpCode: '123456',
    })
    expect(router.state.location.pathname).toBe('/')
    expect(getAccessToken()).toBe('tok-login')
  })

  it('keeps only digits in the code field', async () => {
    const user = userEvent.setup()
    await renderSignIn()

    await user.type(codeField(), '12a 3-45678')

    expect(codeField()).toHaveValue('123456')
  })

  it('never writes the session to web storage', async () => {
    const user = userEvent.setup()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () =>
        HttpResponse.json(adminSession('tok-secret')),
      ),
    )

    await fillForm(user)
    await user.click(submitButton())
    await homeHeading()

    expect(getAccessToken()).toBe('tok-secret')
    for (const storage of [localStorage, sessionStorage]) {
      expect(storage).toHaveLength(0)
    }
  })

  it('shows one generic message that does not say which credential failed', async () => {
    // Wrong password, wrong code and non-admin accounts all get this same 401 from the API.
    const user = userEvent.setup()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () => errorResponse('invalid_credentials', 401)),
    )

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      new RegExp(`^${copy.apiErrors.invalid_credentials}$`),
    )
    expect(emailField()).not.toBeInvalid()
    expect(passwordField()).not.toBeInvalid()
    expect(codeField()).not.toBeInvalid()
    expect(getAccessToken()).toBeNull()
  })

  it('moves focus to the error, clears the used code and keeps the rest', async () => {
    const user = userEvent.setup()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () => errorResponse('invalid_credentials', 401)),
    )

    await fillForm(user)
    await user.click(submitButton())

    const alert = await screen.findByRole('alert')
    await waitFor(() => {
      expect(alert).toHaveFocus()
    })
    expect(codeField()).toHaveValue('')
    expect(emailField()).toHaveValue('ana@example.com')
    expect(passwordField()).toHaveValue('correct horse')
  })

  it('tells how long to wait when throttled', async () => {
    const user = userEvent.setup()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () =>
        errorResponse('rate_limited', 429, { 'Retry-After': '42' }),
      ),
    )

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.rateLimit.retryIn(42))
  })

  it('reports a network failure', async () => {
    const user = userEvent.setup()
    await renderSignIn()
    server.use(http.post(apiUrl('/v1/admin/auth/login'), () => HttpResponse.error()))

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.apiErrors.network_error)
  })

  it('shows the field messages of a 422 next to the form message', async () => {
    const user = userEvent.setup()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () =>
        HttpResponse.json(
          { error: { code: 'validation_failed', fields: [{ field: 'email', rule: 'email' }] } },
          { status: 422 },
        ),
      ),
    )

    await fillForm(user)
    await user.click(submitButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(copy.apiErrors.validation_failed)
    expect(emailField()).toBeInvalid()
    expect(emailField()).toHaveAccessibleDescription(copy.validation.email)
  })

  it('validates before sending and focuses the first invalid field', async () => {
    const user = userEvent.setup()
    const login = vi.fn<() => void>()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), () => {
        login()
        return HttpResponse.json(adminSession())
      }),
    )

    await user.click(submitButton())

    expect(emailField()).toHaveFocus()
    expect(emailField()).toHaveAccessibleDescription(copy.auth.errors.emailRequired)
    expect(passwordField()).toHaveAccessibleDescription(copy.auth.errors.passwordRequired)
    expect(codeField()).toHaveAccessibleDescription(
      `${copy.auth.totpHint} ${copy.auth.errors.totpInvalid}`,
    )

    await user.type(emailField(), 'ana@example.com')
    await user.type(passwordField(), 'correct horse')
    await user.type(codeField(), '123')
    await user.click(submitButton())

    expect(codeField()).toHaveFocus()
    expect(login).not.toHaveBeenCalled()
  })

  it('disables the form while signing in', async () => {
    const user = userEvent.setup()
    const login = vi.fn<() => void>()
    await renderSignIn()
    server.use(
      http.post(apiUrl('/v1/admin/auth/login'), async () => {
        login()
        await new Promise((resolve) => setTimeout(resolve, 100)) // keeps the request in flight
        return HttpResponse.json(adminSession())
      }),
    )

    await fillForm(user)
    await user.click(submitButton())

    const busy = await screen.findByRole('button', { name: copy.auth.submitting })
    expect(busy).toBeDisabled()
    expect(emailField()).toBeDisabled()

    await homeHeading()
    expect(login).toHaveBeenCalledTimes(1)
  })
})
