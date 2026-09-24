import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/msw/server'

describe('MSW test server', () => {
  it('serves handlers registered by a test', async () => {
    server.use(http.get('http://api.test/healthz', () => HttpResponse.json({ status: 'ok' })))

    const res = await fetch('http://api.test/healthz')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  it('rejects requests without a handler', async () => {
    await expect(fetch('http://api.test/unhandled')).rejects.toThrow(
      '[MSW] Cannot bypass a request',
    )
  })
})
