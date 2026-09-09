# Messy — Mess Meal Tracker & Settlement

Track shared meals per day, see who owes what, and settle periods into locked
historical batches. Single-admin app.

## Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- MongoDB via Mongoose
- Auth: `jose` JWT in an httpOnly cookie (30-day), bcrypt password hash
- `sonner` toasts, `next-themes` (dark/light/system), `html-to-image` share cards
- Data fetching: SWR

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Configure env** — copy the example and point it at a MongoDB instance
   (local `mongod`, Docker, or Atlas):

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Purpose |
   | --- | --- |
   | `MONGODB_URI` | Mongo connection string |
   | `AUTH_SECRET` | Secret for signing session JWTs (use a long random string) |
   | `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | First-boot admin credentials |

3. **Run**

   ```bash
   npm run dev
   ```

   The admin account (`admin` / `admin@1234` by default) and the settings
   singleton are seeded automatically on the first database connection. To seed
   explicitly:

   ```bash
   npm run seed
   ```

4. Open http://localhost:3000 and sign in.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run seed` | Seed admin user + default settings |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Domain model

- **MealEntry** — one day. `fullEaters[]` each pay `pricePerMeal`; `halfPairs[][]`
  are 2-person pairs that share one meal (½ each). `pricePerMeal` is snapshotted
  at creation and never changes when the settings price is later edited.
  `mealCount` and `totalAmount` are always derived server-side.
- **Settlement** — freezes a date range (or "all unsettled up to date X"). Its
  entries get a `settlementId` and become read-only.
- **Settings** — singleton: price per meal, mess name, currency symbol.

## Structure

```
src/
  app/
    (auth)/login            login page
    (app)/dashboard         entries: Unsettled | Settled tabs, filters, add/edit, settle
    (app)/persons           per-person history, amounts, share card
    (app)/settings          price / name / currency / password / theme
    api/                    route handlers (zod-validated, session-guarded)
  components/
    ui/                     shadcn primitives
    feature/                app components
  lib/
    auth/                   jwt (edge-safe) + session cookie + bcrypt
    db/                     mongoose connection + seed
    client/                 SWR hooks, fetch wrappers, share helper
    validation.ts           zod schemas (shared client/server)
  models/                   Mongoose models
  types/                    shared TS types
  proxy.ts                  auth middleware (redirects pages, 401s API)
```
