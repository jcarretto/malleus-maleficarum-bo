import { LayoutDashboard } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Placeholder root component. BO-05 replaces it with the app shell (router, providers, layout).
export function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Backoffice</h1>
      <Button>
        <LayoutDashboard aria-hidden="true" />
        shadcn/ui
      </Button>
    </main>
  )
}
