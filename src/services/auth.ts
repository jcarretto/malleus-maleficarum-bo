import { apiRequest, applySession, refreshSession } from '@/services/client'
import type { AdminLoginInput, Session } from '@/services/types'

/**
 * Endpoints of /v1/admin/auth used by the back office. Admin sessions are separate
 * from player sessions (own refresh cookie), so signing in or out here never
 * touches the player app. Sign-in stores the access token.
 */
export const adminAuthApi = {
  async login(input: AdminLoginInput): Promise<Session> {
    const s = await apiRequest<Session>('/v1/admin/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    })
    applySession(s)
    return s
  },

  /** Restores the session from the admin refresh cookie (e.g. after a reload). */
  refresh: refreshSession,

  /** Signs out this browser. The local token is dropped even if the request fails. */
  async logout(): Promise<void> {
    try {
      await apiRequest<undefined>('/v1/admin/auth/logout', { method: 'POST', auth: false })
    } finally {
      applySession(null)
    }
  },
}
