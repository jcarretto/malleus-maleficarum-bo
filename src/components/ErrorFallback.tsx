import type { FallbackProps } from 'react-error-boundary'

import { Button } from '@/components/ui/button'
import { copy } from '@/copy'

/** Shown when rendering fails, at the root and per route. */
export function ErrorFallback({ resetErrorBoundary }: Pick<FallbackProps, 'resetErrorBoundary'>) {
  return (
    <section role="alert" className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-xl font-semibold">{copy.errors.unexpectedTitle}</h1>
      <p className="text-muted-foreground">{copy.errors.unexpectedBody}</p>
      <Button onClick={resetErrorBoundary}>{copy.actions.retry}</Button>
    </section>
  )
}
