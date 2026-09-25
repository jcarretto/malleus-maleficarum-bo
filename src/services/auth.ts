import { apiRequest, applySession, refreshSession } from '@/services/client'
import type { LoginInput, Session, User } from '@/services/types'

/** Endpoints of /v1/auth and /v1/me used by the back office. Sign-in calls store the access token. */
export const authApi = {
  async login(input: LoginInput): Promise<Session> {
    const s = await apiRequest<Session>('/v1/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    })
    applySession(s)
    return s
  },

  /** Restores the session from the refresh cookie (e.g. after a reload). */
  refresh: refreshSession,

  /** Signs out this browser. The local token is dropped even if the request fails. */
  async logout(): Promise<void> {
    try {
      await apiRequest<undefined>('/v1/auth/logout', { method: 'POST', auth: false })
    } finally {
      applySession(null)
    }
  },

  me(signal?: AbortSignal): Promise<User> {
    return apiRequest<User>('/v1/me', { signal })
  },
}
