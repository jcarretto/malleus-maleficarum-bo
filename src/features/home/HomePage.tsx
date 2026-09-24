import { copy } from '@/copy'

export function HomePage() {
  return (
    <section className="flex flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">{copy.home.title}</h1>
      <p className="text-muted-foreground">{copy.home.description}</p>
    </section>
  )
}
