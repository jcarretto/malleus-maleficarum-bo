import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'

import { ErrorFallback } from '@/components/ErrorFallback'
import { AppLayout } from '@/components/layout/AppLayout'
import { NotFound } from '@/components/NotFound'
import { LoginPage } from '@/features/auth/LoginPage'
import { SessionPending } from '@/features/auth/SessionPending'
import { HomePage } from '@/features/home/HomePage'
import { ensureSessionRestored, isSignedIn } from '@/stores/auth'

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
  // Per-route boundary: the layout and navigation stay usable when a screen fails.
  errorComponent: ({ reset }) => <ErrorFallback resetErrorBoundary={reset} />,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    await ensureSessionRestored()
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router's redirect() is thrown by design
    if (isSignedIn()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

/** Layout of every screen that needs an admin session; the API enforces it too. */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authed',
  beforeLoad: async () => {
    await ensureSessionRestored()
    // oxlint-disable-next-line typescript/only-throw-error -- TanStack Router's redirect() is thrown by design
    if (!isSignedIn()) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

const homeRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '/',
  component: HomePage,
})

// Unknown URLs: signed-out visitors are sent to sign-in, admins see not-found inside the layout.
const notFoundRoute = createRoute({
  getParentRoute: () => authedRoute,
  path: '$',
  component: NotFound,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  authedRoute.addChildren([homeRoute, notFoundRoute]),
])

/** Creates the router. Tests pass a memory history. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    defaultPendingComponent: SessionPending,
    ...(history ? { history } : {}),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
