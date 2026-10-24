import { http, HttpResponse } from 'msw'

import { apiBaseUrl } from '@/services/client'
import type { Session, User } from '@/services/types'

export const apiUrl = (path: string) => `${apiBaseUrl}${path}`

export const adminUser: User = {
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

export function adminSession(accessToken = 'tok-admin', user: User = adminUser): Session {
  return { accessToken, tokenType: 'Bearer', expiresIn: 900, user }
}

export function errorResponse(code: string, status: number, headers?: Record<string, string>) {
  return HttpResponse.json({ error: { code } }, { status, ...(headers ? { headers } : {}) })
}

/** A browser holding a valid admin refresh cookie. */
export const refreshAccepted = () =>
  http.post(apiUrl('/v1/admin/auth/refresh'), () => HttpResponse.json(adminSession()))

/** A browser without a session: the refresh cookie is missing. */
export const refreshRejected = () =>
  http.post(apiUrl('/v1/admin/auth/refresh'), () => errorResponse('invalid_refresh_token', 401))
