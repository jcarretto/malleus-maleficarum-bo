import { copy } from '@/copy'

/** Shown while the session is restored on a fresh page load. */
export function SessionPending() {
  return (
    <output className="text-muted-foreground grid min-h-svh place-items-center text-sm">
      {copy.auth.restoring}
    </output>
  )
}
