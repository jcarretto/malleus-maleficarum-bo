import { create } from 'zustand'

import { adminAuthApi } from '@/services/auth'
import { applySession, onSessionChange } from '@/services/client'
import type { Session, User } from '@/services/types'

/**
 * Who is signed in. `unknown` until the first restore attempt finishes, so the
 * route guard can wait instead of flashing the sign-in screen on every reload.
 * The access token itself stays in `services/accessToken` (memory only).
 */
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: User | null
}

const initialState: AuthState = { status: 'unknown', user: null }

export const useAuthStore = create<AuthState>(() => initialState)

/** Records a session, or its absence. Only admins are accepted in the back office. */
export function setSession(session: Session | null): void {
  if (session?.user.role === 'admin') {
    useAuthStore.setState({ status: 'authenticated', user: session.user })
    return
  }
  // A non-admin session must not keep its token around either.
  applySession(null)
  useAuthStore.setState({ status: 'unauthenticated', user: null })
}

/** Back to the pristine state. For tests. */
export function resetAuthStore(): void {
  useAuthStore.setState(initialState)
}

// Refreshes and failed refreshes done by the HTTP client reach the store here.
onSessionChange(setSession)

let restoring: Promise<void> | null = null

async function restore(): Promise<void> {
  try {
    await adminAuthApi.refresh() // the client reports the new session through onSessionChange
  } catch {
    // A rejected cookie already reached the store the same way; this covers the
    // rest (offline, throttled, server down). Either way the user must sign in.
    setSession(null)
  }
}

/**
 * Makes sure the first restore attempt happened: exchanges the refresh cookie for a
 * session. Concurrent callers share one attempt.
 */
export function ensureSessionRestored(): Promise<void> {
  if (useAuthStore.getState().status !== 'unknown') return Promise.resolve()
  restoring ??= restore().finally(() => {
    restoring = null
  })
  return restoring
}

/** True when the last known state is a signed-in admin. Read by the route guards. */
export function isSignedIn(): boolean {
  return useAuthStore.getState().status === 'authenticated'
}
