# Tasks — malleus-maleficarum-bo

Atomic tasks in dependency order. Each task ends in a commit that builds and passes its tests.
Cross-repo IDs: `API-*` (Go API), `PWA-*` (player app), `BO-*` (this repo).
Decisions: `docs/architecture.md` § 5.
Status: ✅ merged into `develop` · ⏸ on hold by owner decision · blank = pending.

## Phase 0 — Foundation

| ID | Task | Depends on | Done when | Status |
|-|-|-|-|-|
| BO-01 | `.gitattributes` (`* text=auto eol=lf`), `.gitignore`, `.editorconfig`, complete `.env.example` | — | No CRLF warnings; `.env` ignored | ✅ |
| BO-02 | Vite `react-ts` with pnpm, strict `tsconfig`, `@/` alias, oxlint + oxfmt | BO-01 | `pnpm dev`, `build`, `typecheck`, `lint` pass | ✅ |
| BO-03 | Tailwind + `shadcn init` + Lucide | BO-02 | A shadcn `Button` renders | ✅ |
| BO-04 | Vitest + React Testing Library + MSW | BO-02 | Sample test passes | ✅ |
| BO-05 | App shell: TanStack Router, root `ErrorBoundary`, `QueryClientProvider`, sidebar layout | BO-03 | Thrown error shows fallback | ✅ |
| BO-06 | Design direction: `/impeccable init`, `frontend-design` tokens (dense, desktop-first admin UI) | BO-03 | Tokens applied; no literal colors | ⏸ |
| BO-07 | Docs: release merge policy, Go toolchain and frontend tooling decisions | — | CLAUDE.md, decision log and tasks updated | ✅ |
| BO-08 | Docs: admin sign-in decision; BO-11 and BO-12 updated | — | Decision log and tasks updated | ✅ |
| BO-09 | Docs: status column in `docs/tasks.md` | — | Every task shows whether it is done | ✅ |
| BO-13 | Docs: fraud and tampering decisions; tasks BO-22, BO-33 | — | Decision log and tasks updated | ✅ |

## Phase 1 — Admin access

| ID | Task | Depends on | Done when | Status |
|-|-|-|-|-|
| BO-10 | HTTP client: `credentials: 'include'`, access token in memory, single refresh retry on 401, API error codes → Spanish messages | BO-05 | MSW tests | ✅ |
| BO-11 | Sign-in with email + password + TOTP code against `/v1/admin/auth/*` (no Google), session restore, guarded routes | BO-10, API-47, API-48 | Wrong credentials, wrong code and non-admin accounts show the same error; reload keeps the session |  |
| BO-12 | Sign-out (`/v1/admin/auth/logout`) | BO-11 | Admin cookie cleared; refresh revoked; the player app session is unaffected |  |

## Phase 2 — Activation codes

| ID | Task | Depends on | Done when | Status |
|-|-|-|-|-|
| BO-20 | Generate code batch (quantity, label) and export CSV once | BO-11, API-54 | Codes shown once; CSV downloaded |  |
| BO-21 | Batch list with redeemed / available counts | BO-20 | TanStack Table with pagination |  |
| BO-22 | Void a batch or a single unused code, with confirmation | BO-20, API-69 | Voided codes stop working; the batch shows how many were voided |  |

## Phase 3 — Telemetry and delivery

| ID | Task | Depends on | Done when | Status |
|-|-|-|-|-|
| BO-30 | Match list: filter by user, installation, date | BO-11, API-61 | Paginated table |  |
| BO-31 | User list (read-only) | BO-11 | Paginated table |  |
| BO-32 | GitHub Actions: typecheck, lint, test, build | BO-04 | Green on `develop` | ✅ |
| BO-33 | Revoke a user's Premium with a reason, with confirmation | BO-31, API-68 | The user shows as free afterwards; the reason is required |  |
