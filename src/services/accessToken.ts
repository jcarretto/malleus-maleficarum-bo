/**
 * The access token lives only in memory: never in localStorage, sessionStorage or
 * IndexedDB, where injected scripts could read it. A reload loses it on purpose;
 * the refresh cookie (HttpOnly) gets a new one.
 */
let token: string | null = null

export function getAccessToken(): string | null {
  return token
}

export function setAccessToken(value: string | null): void {
  token = value
}
