import { QueryClient } from '@tanstack/react-query'

/** Creates the TanStack Query client. A factory so tests get an isolated cache. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        // Admins expect current data when they come back to the tab.
        refetchOnWindowFocus: true,
      },
    },
  })
}
