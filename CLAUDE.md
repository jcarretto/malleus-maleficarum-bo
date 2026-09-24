# CLAUDE.md — malleus-maleficarum-bo

Admin back office for the card game platform: users, activation codes, and match telemetry.
Stack: React 18+ · Vite · strict TypeScript · Tailwind · shadcn/ui · Lucide · TanStack Query / Router / Table.
Online only (not a PWA). Desktop-first. UI in Spanish only.
Related repos: `malleus-maleficarum-api` (Go), `malleus-maleficarum-pwa` (player app).
Spec and decisions: `docs/architecture.md`. Work plan: `docs/tasks.md`.

## ⛔ Domain restriction (in effect)

- Current stage: **scaffolding and technical infrastructure only**.
- Do NOT implement, model, or infer game logic. Match telemetry is shown as opaque data until the functional spec arrives.

## Commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck                 # tsc --noEmit (required before closing a task)
pnpm test                      # Vitest + React Testing Library
pnpm lint
pnpm dlx shadcn@latest add <component>
```

## Structure

```
PRODUCT.md, DESIGN.md   # impeccable context (generated with /impeccable init)
docs/                   # architecture.md, tasks.md
src/
  app/            # App.tsx, providers, root ErrorBoundary
  routes/         # TanStack Router route tree
  features/<f>/   # auth, users, activation-codes, matches (components/, hooks/, api.ts)
  components/ui/  # generated shadcn; no logic here
  components/     # shared components (data table, layout, filters)
  services/       # HTTP client
  stores/         # Zustand: auth session only
  copy/           # Spanish UI strings, centralized
  styles/         # tokens.css + globals
  lib/            # pure utilities
  test/           # Vitest setup, MSW handlers
```

## Skill router

| Task | Skill | Focus |
|---|---|---|
| Art direction, visual identity | `frontend-design` | Consistent with the player app, tuned for dense admin screens |
| UI quality, anti-patterns | `impeccable` | Data density, table readability, contrast, keyboard navigation |
| Components, hooks, state, tests | `react-expert` | Ignore Server Components, Next.js, and `use client`: this app is a Vite SPA |

## Rules

- TypeScript `strict`; no implicit `any`. Error boundaries per route.
- Server data via TanStack Query; lists via TanStack Table with server-side pagination and filters.
- Every route requires an authenticated user with `role=admin`; the API enforces it too.
- Access token in memory only; the refresh token is an `httpOnly` cookie handled by the browser.
- UI strings in Spanish, centralized in `copy/`. API errors arrive as codes and are mapped there.
- Sensitive values (activation codes) are shown once and never cached or logged.
- Style only with tokens. Tests with Testing Library (query by role) and MSW.

## Conventions

- **All Markdown files (`*.md`) must be written in English.**
- Small, focused changes. Tests next to the code (`*.test.ts(x)`).
- No over-engineering: do not add layers or libraries without a concrete use case.
- Config via `import.meta.env` (`VITE_*`); see `.env.example`. Never commit `.env`.
