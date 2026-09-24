import { Link } from '@tanstack/react-router'

import { copy } from '@/copy'

export function NotFound() {
  return (
    <section className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-xl font-semibold">{copy.errors.notFoundTitle}</h1>
      <Link to="/" className="underline underline-offset-4">
        {copy.actions.backHome}
      </Link>
    </section>
  )
}
