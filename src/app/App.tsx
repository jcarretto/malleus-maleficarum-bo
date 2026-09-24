import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider, type AnyRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { createQueryClient } from '@/app/queryClient'
import { ErrorFallback } from '@/components/ErrorFallback'
import { createAppRouter } from '@/routes/router'

interface AppProps {
  router?: AnyRouter
  queryClient?: QueryClient
}

/** Composition root: providers, router and the root error boundary. */
export function App({ router: routerProp, queryClient: clientProp }: AppProps) {
  const [router] = useState(() => routerProp ?? createAppRouter())
  const [queryClient] = useState(() => clientProp ?? createQueryClient())

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
