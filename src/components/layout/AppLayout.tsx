import { Link, Outlet } from '@tanstack/react-router'
import { House } from 'lucide-react'

import { copy } from '@/copy'

const navItems = [{ to: '/', label: copy.nav.home, icon: House }] as const

/** Desktop-first shell: fixed sidebar navigation and a scrollable content area. */
export function AppLayout() {
  return (
    <div className="grid min-h-svh grid-cols-[15rem_1fr]">
      <aside className="bg-muted/40 flex flex-col gap-6 border-r p-4">
        <div className="px-2">
          <p className="text-sm font-semibold">{copy.appName}</p>
          <p className="text-muted-foreground text-xs">{copy.appSection}</p>
        </div>
        <nav aria-label={copy.nav.label}>
          <ul className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: true }}
                  className="hover:bg-muted data-[status=active]:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[status=active]:font-medium"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
