import {
  createRootRoute,
  createRoute,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router'

import { ErrorFallback } from '@/components/ErrorFallback'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/components/NotFound'
import { HomePage } from '@/features/home/HomePage'

const rootRoute = createRootRoute({
  component: AppLayout,
  notFoundComponent: NotFound,
  // Per-route boundary: the layout and navigation stay usable when a screen fails.
  errorComponent: ({ reset }) => <ErrorFallback resetErrorBoundary={reset} />,
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const routeTree = rootRoute.addChildren([homeRoute])

/** Creates the router. Tests pass a memory history. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, ...(history ? { history } : {}) })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
