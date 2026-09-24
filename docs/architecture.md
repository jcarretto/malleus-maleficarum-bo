# Technical Architecture and Technology Stack Specification

## Card Game Match Assistant (PWA + Go Backend)

---

## 1. Executive Summary and System Goals

The system is a real-time card game match assistance and tracking application for mobile devices, complemented by a transactional support backend.

### Key Requirements

1. **Client-side game logic (Offline-First):** Rules engine, classes, entities, and match lifecycle running locally with low CPU usage.
2. **Extreme resilience to context loss:** If the mobile device locks, suspends, restarts, or runs out of battery, the match must resume exactly at the last valid state.
3. **Frictionless design and UX:** Intuitive interface adapted to thumb interaction on mobile screens, built without requiring advanced prior visual design experience.
4. **Lightweight, transactional backend:** REST services dedicated to user authentication, Premium plan management and billing, and collection/auditing of finished match statistics (with a review panel exclusive to administrators).

---

## 2. Frontend Technology Stack (PWA)

```
+-------------------------------------------------------------+
|                      PWA Mobile Client                      |
+-------------------------------------------------------------+
| UI & Layout        : React 18+ + Tailwind CSS + shadcn/ui   |
| Icons & Gestures   : Lucide React + Framer Motion           |
| Bundling & PWA     : Vite + vite-plugin-pwa (Workbox)       |
| Game Domain        : Pure TypeScript (OOP Classes)          |
| Local Persistence  : Dexie.js (Transactional IndexedDB)     |
+-------------------------------------------------------------+
```

### 2.1 Stack Components

* **Vite + React + TypeScript:** Provides a fast-compiling development environment and strict typing. Allows modeling game entities (`Card`, `Player`, `Board`, `TurnManager`) with object orientation decoupled from the UI.
* **shadcn/ui + Tailwind CSS:** Prebuilt, accessible component system with modern design (native dark mode, bottom sheets/`Drawer`, cards, confirmation dialogs, and status badges), removing the need to design complex styles from scratch.
* **Lucide React:** Vector icon collection for game actions (damage, defense, resources, settings).
* **Dexie.js (IndexedDB):** Indexed, asynchronous local persistence layer.
* **`vite-plugin-pwa`:** Web manifest configuration, offline caching strategy, and automatic Service Worker registration.

### 2.2 Anti-Context-Loss Strategy

To prevent the operating system from purging the match when the screen locks or the browser is suspended:

1. **Persistent Storage:** Call the native persistence API at startup:

   ```typescript
   if (navigator.storage && navigator.storage.persist) {
     await navigator.storage.persist();
   }
   ```

2. **Per-Event Persistence (lightweight Event Sourcing):** Every turn action (life change, card played, turn pass) persists a transactional action record in Dexie.js before updating the view.
3. **Mobile lifecycle:** Subscribe to the `visibilitychange` event to force a synchronous snapshot flush on visibility changes:

   ```typescript
   document.addEventListener("visibilitychange", () => {
     if (document.visibilityState === "hidden") {
       gameEngine.flushSnapshot();
     }
   });
   ```

---

## 3. Backend Technology Stack (Go)

```
+-------------------------------------------------------------+
|                       Go REST Backend                       |
+-------------------------------------------------------------+
| HTTP Router        : Chi v5 (Idiomatic, lightweight, std)   |
| Authentication     : golang-jwt/jwt/v5 + x/crypto/bcrypt    |
| Database           : PostgreSQL + GORM or pgx               |
| Payments & Webhooks: Stripe SDK / Mercado Pago SDK          |
| Data Validation    : go-playground/validator/v10            |
+-------------------------------------------------------------+
```

### 3.1 Stack Components

* **Chi (`github.com/go-chi/chi/v5`):** Ultra-lightweight HTTP router that implements `net/http` directly. Makes it easy to build middleware chains (JWT authentication, role verification, rate limiting, and CORS).
* **Security and Accounts:**
  * Password hashing with **`golang.org/x/crypto/bcrypt`**.
  * Session tokens issued with **`github.com/golang-jwt/jwt/v5`**, including in their claims the user identifier (`sub`), role (`user` or `admin`), and subscription tier (`tier: free | premium`).
* **Subscriptions and Plans:**
  * Integration with payment gateways via **`github.com/stripe/stripe-go`** or **`github.com/mercadopago/sdk-go`**.
  * **Webhook**-driven architecture with cryptographic signature validation for automatic Premium plan activation.
* **Persistence and Telemetry:**
  * **PostgreSQL:** Relational database for account and user management.
  * `jsonb` column to store the structured telemetry payload of each match (turn sequence, cards used, duration, result metrics) without requiring rigid, changing schemas.
  * **`gorm.io/gorm`** or **`github.com/jackc/pgx/v5`** for database interaction.
  * **`github.com/go-playground/validator/v10`** to sanitize and validate payloads before insertion.

---

## 4. Architectural Decision Matrix

| Technical Challenge | Adopted Solution | Rationale |
|-|-|-|
| **Distribution and Cost** | Installable PWA | Avoids App Store/Play Store fees and review processes; immediate deployments. |
| **Resilience to Lock/Shutdown** | Dexie.js + `storage.persist()` | IndexedDB does not block the UI and guarantees durable storage on iOS and Android. |
| **Design and Visual Learning Curve** | React + Tailwind + shadcn/ui | Allows assembling a stylish mobile interface without hand-writing complex CSS. |
| **Backend Performance** | Go + Chi + PostgreSQL | Minimal memory footprint (<30 MB RAM), instant startup, and efficient analytical queries over `jsonb`. |
| **Plan Management** | Payment gateway webhooks | Decouples card processing and delegates recurring subscription billing. |

---

## 5. Decision Log

| Topic | Decision |
|-|-|
| Repositories | `malleus-maleficarum-pwa` (player app), `malleus-maleficarum-api` (Go API), `malleus-maleficarum-bo` (admin back office). Branches: `master` (default) and `develop` (work). |
| Database access | `pgx/v5` with explicit SQL. No ORM. Migrations with golang-migrate. |
| Authentication | Email + password (bcrypt) or Google Sign-In (Google Identity Services ID token verified by the API). Password recovery by email is required. |
| Account linking | A Google sign-in with an email already registered with a password links automatically (Google verifies the email). A Google-only account that requests a password reset receives an email saying the account uses Google. |
| Session | Access JWT (15 min) kept in memory. Opaque refresh token in an `httpOnly; Secure; SameSite=Lax` cookie, rotated on every use, reuse detection, sliding 60-day lifetime. PWA, BO, and API must share the same registrable domain. |
| Offline play | Every user can play offline. An account is optional and only required for Premium. |
| Anonymous telemetry | Each install gets a server-registered `installation_id` with a signed installation token. Matches are grouped by installation and linked to a user when the user signs in on that install. |
| Premium | Lifetime. Obtained by purchase (Mercado Pago, one-time payment) or by redeeming a single-use code shipped with the physical edition. Activation requires connectivity. |
| Offline Premium | The API issues an ES256-signed entitlement (`sub`, `tier`, `source`, `iat`, `exp`) valid for 1 year and renewed silently when online. The PWA stores it in Dexie and verifies it offline with WebCrypto. Premium content that is data is served by the API, not bundled. |
| Payments | Mercado Pago via `mercadopago/sdk-go` behind a `PaymentProvider` interface. |
| Transactional email | Resend (free tier is enough for expected traffic), behind an `EmailSender` interface. |
| Languages | Player PWA: Spanish (default), English, Portuguese. Back office: Spanish only. The API returns error codes; clients translate them. |
| Target platforms | Android and iOS (installed PWA). Both must be tested on real devices. |
| Back office stack | Vite + React + TypeScript + shadcn/ui + TanStack Query/Router/Table. Online only, not a PWA. |
| Git workflow | Work branches `feature/TASK-{nn}-{short-description}` start from `develop` and are squash-merged through pull requests. `release/{version}` branches are cut from `develop` ad hoc and merged into `master` with a merge commit. |
| Go toolchain | Module minimum is Go 1.26 (required by `validator/v10` and current `golang.org/x` modules). Local development and CI use the latest stable Go (1.27 as of 2026-09). |
| Frontend lint and format | oxlint (type-aware rules through `oxlint-tsgolint`) and oxfmt (Prettier-compatible) instead of ESLint and Prettier. They cover typed TypeScript rules, React hooks and React Compiler rules, jsx-a11y and layer boundaries, with no plugin peer conflicts and sub-second runs. |
| Pending | Hosting and domain. Google OAuth Client ID (provided later). |
