import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { copy } from '@/copy'
import { getAccessToken, setAccessToken } from '@/services/accessToken'
import { authApi } from '@/services/auth'
import { apiBaseUrl, apiRequest, onSessionChange, refreshLockName } from '@/services/client'
import { ApiError, apiErrorCodes, fieldErrorMessage, validationRules } from '@/services/errors'
import type { Session, User } from '@/services/types'
import { server } from '@/test/msw/server'

const api = (path: string) => `${apiBaseUrl}${path}`

const admin: User = {
  id: 'u1',
  email: 'ana@example.com',
  displayName: 'Ana',
  avatarUrl: null,
  role: 'admin',
  tier: 'free',
  locale: 'es',
  hasPassword: true,
  createdAt: '2026-09-24T12:00:00Z',
}

function session(token: string): Session {
  return { accessToken: token, tokenType: 'Bearer', expiresIn: 900, user: admin }
}

function apiError(code: string, status: number) {
  return HttpResponse.json({ error: { code } }, { status })
}

/** /v1/me answers 200 only with the given token, like the real API. */
function meAcceptsOnly(token: string) {
  return http.get(api('/v1/me'), ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${token}`
      ? HttpResponse.json(admin)
      : apiError('unauthorized', 401),
  )
}

/** Records every session change emitted by the client during a test. */
function recordSessionChanges() {
  const changes: (Session | null)[] = []
  const unsubscribe = onSessionChange((s) => changes.push(s))
  return { changes, unsubscribe }
}

/** Awaits a promise that must reject with an ApiError and returns it. */
async function catchApiError(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p
  } catch (err) {
    if (err instanceof ApiError) return err
    throw err
  }
  throw new Error('expected the promise to reject with an ApiError')
}

type Resolver = () => Response | Promise<Response>

beforeEach(() => {
  setAccessToken(null)
})

afterEach(() => {
  setAccessToken(null)
})

describe('apiRequest', () => {
  it('sends the access token and includes credentials', async () => {
    let seen: Request | undefined
    server.use(
      http.get(api('/v1/me'), ({ request }) => {
        seen = request
        return HttpResponse.json(admin)
      }),
    )
    setAccessToken('tok-1')

    await expect(apiRequest<User>('/v1/me')).resolves.toEqual(admin)

    expect(seen?.headers.get('Authorization')).toBe('Bearer tok-1')
    expect(seen?.credentials).toBe('include')
  })

  it('refreshes once on 401 and retries with the new token', async () => {
    const refresh = vi.fn<Resolver>(() => HttpResponse.json(session('tok-new')))
    server.use(meAcceptsOnly('tok-new'), http.post(api('/v1/auth/refresh'), refresh))
    const { changes, unsubscribe } = recordSessionChanges()
    setAccessToken('tok-expired')

    await expect(authApi.me()).resolves.toEqual(admin)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBe('tok-new')
    expect(changes).toEqual([session('tok-new')])
    unsubscribe()
  })

  it('does not refresh a second time when the retry is still unauthorized', async () => {
    const refresh = vi.fn<Resolver>(() => HttpResponse.json(session('tok-new')))
    server.use(meAcceptsOnly('never'), http.post(api('/v1/auth/refresh'), refresh))
    setAccessToken('tok-expired')

    const err = await catchApiError(apiRequest('/v1/me'))

    expect(err.status).toBe(401)
    expect(err.code).toBe('unauthorized')
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('shares one refresh between concurrent requests', async () => {
    const refresh = vi.fn<Resolver>(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return HttpResponse.json(session('tok-new'))
    })
    server.use(meAcceptsOnly('tok-new'), http.post(api('/v1/auth/refresh'), refresh))
    setAccessToken('tok-expired')

    await Promise.all([apiRequest('/v1/me'), apiRequest('/v1/me'), apiRequest('/v1/me')])

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('ends the session when the refresh token is rejected', async () => {
    server.use(
      meAcceptsOnly('never'),
      http.post(api('/v1/auth/refresh'), () => apiError('invalid_refresh_token', 401)),
    )
    const { changes, unsubscribe } = recordSessionChanges()
    setAccessToken('tok-expired')

    const err = await catchApiError(apiRequest('/v1/me'))

    expect(err.code).toBe('invalid_refresh_token')
    expect(err.userMessage).toBe(copy.apiErrors.invalid_refresh_token)
    expect(getAccessToken()).toBeNull()
    expect(changes).toEqual([null])
    unsubscribe()
  })

  it('keeps the session when the refresh fails for network reasons', async () => {
    server.use(
      meAcceptsOnly('never'),
      http.post(api('/v1/auth/refresh'), () => HttpResponse.error()),
    )
    const { changes, unsubscribe } = recordSessionChanges()
    setAccessToken('tok-old')

    const err = await catchApiError(apiRequest('/v1/me'))

    expect(err.isNetworkError).toBe(true)
    expect(getAccessToken()).toBe('tok-old')
    expect(changes).toEqual([])
    unsubscribe()
  })

  it('does not refresh for unauthenticated requests', async () => {
    const refresh = vi.fn<Resolver>(() => HttpResponse.json(session('x')))
    server.use(
      http.post(api('/v1/auth/login'), () => apiError('invalid_credentials', 401)),
      http.post(api('/v1/auth/refresh'), refresh),
    )

    const err = await catchApiError(authApi.login({ email: 'a@b.co', password: 'wrong' }))

    expect(err.userMessage).toBe('Email o contraseña incorrectos.')
    expect(refresh).not.toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
  })

  it('neither refreshes nor ends the session on 403 forbidden', async () => {
    const refresh = vi.fn<Resolver>(() => HttpResponse.json(session('x')))
    server.use(
      http.get(api('/v1/admin/thing'), () => apiError('forbidden', 403)),
      http.post(api('/v1/auth/refresh'), refresh),
    )
    const { changes, unsubscribe } = recordSessionChanges()
    setAccessToken('tok-user')

    const err = await catchApiError(apiRequest('/v1/admin/thing'))

    expect(err.status).toBe(403)
    expect(err.userMessage).toBe(copy.apiErrors.forbidden)
    expect(refresh).not.toHaveBeenCalled()
    expect(getAccessToken()).toBe('tok-user')
    expect(changes).toEqual([])
    unsubscribe()
  })

  it('reports network failures as network_error', async () => {
    server.use(http.get(api('/v1/me'), () => HttpResponse.error()))

    const err = await catchApiError(apiRequest('/v1/me', { auth: false }))

    expect(err.status).toBe(0)
    expect(err.code).toBe('network_error')
    expect(err.userMessage).toBe(copy.apiErrors.network_error)
  })

  it('serializes refreshes across tabs with a Web Lock when available', async () => {
    const request = vi.fn<(name: string, fn: () => Promise<Session>) => Promise<Session>>(
      (_name, fn) => fn(),
    )
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } })
    server.use(http.post(api('/v1/auth/refresh'), () => HttpResponse.json(session('tok-new'))))

    try {
      await expect(authApi.refresh()).resolves.toEqual(session('tok-new'))
      expect(request).toHaveBeenCalledWith(refreshLockName, expect.any(Function))
    } finally {
      Reflect.deleteProperty(navigator, 'locks')
    }
  })
})

describe('error mapping', () => {
  it('parses validation errors with fields', async () => {
    server.use(
      http.post(api('/v1/auth/login'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_failed',
              fields: [
                { field: 'email', rule: 'email' },
                { field: 'password', rule: 'min', param: '8' },
                { bogus: true },
              ],
            },
          },
          { status: 422 },
        ),
      ),
    )

    const err = await catchApiError(authApi.login({ email: 'a', password: 'x' }))

    expect(err.status).toBe(422)
    expect(err.userMessage).toBe(copy.apiErrors.validation_failed)
    expect(err.fields).toEqual([
      { field: 'email', rule: 'email' },
      { field: 'password', rule: 'min', param: '8' },
    ])
    expect(err.fields.map(fieldErrorMessage)).toEqual([
      'Ingresá un email válido.',
      'Debe tener al menos 8 caracteres.',
    ])
  })

  it('falls back for unknown rules and missing parameters', () => {
    expect(fieldErrorMessage({ field: 'x', rule: 'weird' })).toBe(copy.validation.invalid)
    expect(fieldErrorMessage({ field: 'x', rule: 'max' })).toBe(copy.validation.invalid)
    expect(fieldErrorMessage({ field: 'x', rule: 'max', param: '50' })).toBe(
      'Debe tener como máximo 50 caracteres.',
    )
  })

  it('falls back for unknown codes and non-JSON bodies', async () => {
    server.use(
      http.get(api('/v1/unknown-code'), () => apiError('brand_new_code', 409)),
      http.get(api('/v1/html'), () => new HttpResponse('<h1>Bad Gateway</h1>', { status: 502 })),
    )

    const unknown = await catchApiError(apiRequest('/v1/unknown-code', { auth: false }))
    const html = await catchApiError(apiRequest('/v1/html', { auth: false }))

    expect(unknown.code).toBe('brand_new_code')
    expect(unknown.userMessage).toBe(copy.apiErrors.internal_error)
    expect(html.status).toBe(502)
    expect(html.code).toBe('internal_error')
    expect(html.userMessage).toBe(copy.apiErrors.internal_error)
  })

  it.each(apiErrorCodes)('has a Spanish message for the %s code', (code) => {
    expect(copy.apiErrors[code]).toBeTruthy()
    expect(new ApiError(400, code).userMessage).toBe(copy.apiErrors[code])
  })

  it.each(validationRules)('has a Spanish message for the %s rule', (rule) => {
    const message = fieldErrorMessage({ field: 'f', rule, param: '3' })
    expect(message).toBeTruthy()
    expect(message).not.toBe(copy.validation.invalid)
  })
})

describe('authApi', () => {
  it('stores the access token after Google sign-in', async () => {
    let body: unknown
    server.use(
      http.post(api('/v1/auth/google'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(session('tok-google'), { status: 201 })
      }),
    )

    await expect(authApi.googleSignIn({ idToken: 'id-token' })).resolves.toEqual(
      session('tok-google'),
    )

    expect(body).toEqual({ idToken: 'id-token' })
    expect(getAccessToken()).toBe('tok-google')
  })

  it('stores the access token after sign-in and drops it on logout even if the request fails', async () => {
    server.use(
      http.post(api('/v1/auth/login'), () => HttpResponse.json(session('tok-login'))),
      http.post(api('/v1/auth/logout'), () => HttpResponse.error()),
    )

    await authApi.login({ email: 'a@b.co', password: 'correct horse' })
    expect(getAccessToken()).toBe('tok-login')

    await expect(authApi.logout()).rejects.toBeInstanceOf(ApiError)
    expect(getAccessToken()).toBeNull()
  })

  it('handles 204 responses', async () => {
    server.use(http.post(api('/v1/auth/logout'), () => new HttpResponse(null, { status: 204 })))
    setAccessToken('tok-1')

    await expect(authApi.logout()).resolves.toBeUndefined()
    expect(getAccessToken()).toBeNull()
  })
})
