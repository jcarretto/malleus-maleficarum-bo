import type { RequestHandler } from 'msw'

// Default handlers shared by every test. Tests add or override handlers with server.use().
export const handlers: RequestHandler[] = []
