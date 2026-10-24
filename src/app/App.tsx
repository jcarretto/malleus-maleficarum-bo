import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider, type AnyRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { createQueryClient } from '@/app/queryClient'
import { ErrorFallback } from '@/components/ErrorFallback'
import { createAppRouter } from '@/routes/router'
import { useAuthStore } from '@/stores/auth'

interface AppProps {
  router?: AnyRouter
  queryClient?: QueryClient
}

/** Composition root: providers, router and the root error boundary. */
export function App({ router: routerProp, queryClient: clientProp }: AppProps) {
  const [router] = useState(() => routerProp ?? createAppRouter())
  const [queryClient] = useState(() => clientProp ?? createQueryClient())

  // When the session ends while the app is open (refresh rejected), re-run the route
  // guards so the user lands on the sign-in screen.
  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        if (previous.status === 'authenticated' && state.status === 'unauthenticated') {
          void router.invalidate()
        }
      }),
    [router],
  )

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
