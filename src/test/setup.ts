import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { setAccessToken } from '@/services/accessToken'
import { resetAuthStore } from '@/stores/auth'
import { server } from '@/test/msw/server'

// jsdom does not implement scrolling; the router calls it when navigating.
window.scrollTo = () => undefined

// Any request without a handler fails the test: tests never reach the real network.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => {
  server.resetHandlers()
  cleanup()
  setAccessToken(null)
  resetAuthStore()
})
afterAll(() => {
  server.close()
})
