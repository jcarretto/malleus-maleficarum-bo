import { getAccessToken, setAccessToken } from '@/services/accessToken'
import { ApiError, apiErrorFromResponse } from '@/services/errors'
import type { Session } from '@/services/types'

export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(
  /\/$/,
  '',
)

/** Name of the Web Lock that serializes refreshes across tabs. */
export const refreshLockName = 'mm.auth.refresh'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the access token and retry once after a refresh on 401. Default true. */
  auth?: boolean
  signal?: AbortSignal
}

type SessionListener = (session: Session | null) => void
const listeners = new Set<SessionListener>()

/**
 * Subscribes to session changes made by the client itself: a successful refresh
 * (new session) or a failed one (null, the user must sign in again).
 */
export function onSessionChange(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(session: Session | null) {
  for (const l of listeners) l(session)
}

/** Stores the access token of a session obtained by sign-in, sign-up or refresh. */
export function applySession(session: Session | null): void {
  setAccessToken(session?.accessToken ?? null)
}

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(`${apiBaseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: 'include', // the refresh cookie travels with every API call
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'network_error')
  }
}

/**
 * Parses a response. The body shape is trusted from the API contract
 * (api/openapi.yaml), which is the one place this client asserts types.
 */
async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) throw await apiErrorFromResponse(res)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- 204 endpoints are typed as undefined
  if (res.status === 204) return undefined as T
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- trust boundary: shape defined by the API contract
  return (await res.json()) as T
}

let inFlightRefresh: Promise<Session> | null = null

/**
 * Exchanges the refresh cookie for a new session. Concurrent callers in this tab
 * share one request, and tabs take turns through a Web Lock: the API revokes the
 * whole session if the same refresh token is presented twice, and while one tab
 * refreshes, the browser has not yet stored the rotated cookie for the others.
 */
export function refreshSession(): Promise<Session> {
  inFlightRefresh ??= withRefreshLock(doRefresh).finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}

async function doRefresh(): Promise<Session> {
  try {
    const session = await parse<Session>(await send('/v1/auth/refresh', { method: 'POST' }, null))
    applySession(session)
    emit(session)
    return session
  } catch (err) {
    // Only a definitive rejection ends the session; a network error might be temporary.
    if (err instanceof ApiError && !err.isNetworkError) {
      applySession(null)
      emit(null)
    }
    throw err
  }
}

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  // Web Locks: Safari 15.4+, Chrome 69+, Firefox 96+. Without it, only this tab is serialized.
  const locks = 'locks' in navigator ? navigator.locks : undefined
  return locks ? locks.request(refreshLockName, fn) : fn()
}

/**
 * Calls the API. Authenticated requests carry the in-memory access token; on 401
 * the client refreshes once (shared with concurrent calls) and retries once.
 * Throws ApiError for API errors and network failures.
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true
  const token = auth ? getAccessToken() : null
  const res = await send(path, opts, token)
  if (!(auth && res.status === 401)) return parse<T>(res)

  // The access token expired (15 min) or was never loaded (fresh page): refresh once.
  await refreshSession()
  return parse<T>(await send(path, opts, getAccessToken()))
}
