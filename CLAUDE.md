# MFI — Más Fácil Imposible

Personal finance web app built for Argentina. Tracks income, expenses, savings, and investments in ARS and USD. All UI copy is in Spanish (es-AR locale).

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Database/Auth | Supabase (PostgreSQL + Auth + RLS) |
| Styling | Tailwind CSS 4 |
| UI Primitives | Radix UI (via shadcn/ui) |
| Charts | Recharts 2 |
| Forms | React Hook Form + Zod |
| Data fetching | SWR (client polling) |
| Icons | Lucide React |
| Theming | next-themes (light/dark) |
| Notifications | Sonner |
| Analytics | Vercel Analytics |
| Fonts | Sora, DM Sans, DM Mono (Google Fonts) |

## Project Structure

```
mas-facil-imposible/
├── app/
│   ├── (app)/          # Protected route group — requires auth
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── goals/
│   │   ├── analytics/
│   │   ├── notifications/
│   │   ├── settings/
│   │   └── layout.tsx  # Sidebar + topbar shell
│   ├── auth/           # Public auth routes
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── verify-email/
│   │   └── actions.ts  # Server actions (login, signUp, signOut, resetPassword)
│   ├── layout.tsx      # Root layout — fonts, ThemeProvider, metadata
│   └── page.tsx        # Root redirect to /dashboard or /auth/login
├── components/
│   ├── ui/             # Radix/shadcn primitives (100+ components)
│   ├── quick-add-transaction.tsx
│   ├── edit-transaction-modal.tsx
│   ├── category-manager.tsx
│   ├── pending-loans.tsx
│   ├── nav.tsx         # DesktopSidebar + MobileBottomNav
│   ├── app-topbar.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── types.ts        # All TS interfaces and type definitions
│   ├── utils.ts        # cn() helper
│   └── supabase/
│       ├── server.ts   # Cookie-based SSR client
│       ├── client.ts   # Browser client
│       └── middleware.ts # updateSession() for auth middleware
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
├── scripts/
│   ├── 001_schema.sql  # DB schema (profiles, categories, transactions, goals, notifications)
│   └── 002_seed_categories.sql
├── middleware.ts        # Auth guard — redirects unauthenticated to /auth/login
├── .env.local          # Never commit. See Environment Variables below.
└── CLAUDE.md           # This file
```

## Architecture

### Server vs Client components

- **page.tsx** files are always server components. They fetch data from Supabase and pass it as props.
- **\*-client.tsx** files are always `'use client'`. They own interactivity, modals, forms, and local state.
- **actions.ts** files use `'use server'` — used for auth mutations.
- Mutations (insert/update/delete) happen directly from the browser client via Supabase RLS, not through API routes. There are no Next.js API routes in this project.

### Data flow

```
page.tsx (server)
  └── await createClient()         # lib/supabase/server.ts
  └── supabase.from(...).select()  # SSR fetch
  └── <XyzClient data={data} />   # Pass to client
        └── useState(initialData) # Hydrate
        └── supabase browser client for mutations
        └── window.location.reload() or setState() after mutations
```

### Auth

- `middleware.ts` calls `updateSession()` on every request
- Protected routes: `/dashboard`, `/transactions`, `/goals`, `/analytics`, `/notifications`, `/settings`
- Public routes: `/auth/*`
- If unauthenticated on a protected route → redirect to `/auth/login`
- If authenticated on `/auth/*` → redirect to `/dashboard`

## Database Schema

All tables have RLS enabled. Policy: `auth.uid() = user_id`.

| Table | Key Fields |
|-------|-----------|
| `profiles` | id (FK auth.users), full_name, avatar_url, default_currency |
| `categories` | id, user_id, name, icon, color, type |
| `transactions` | id, user_id, category_id, type, amount, currency, date, note, status |
| `goals` | id, user_id, name, target_amount, current_amount, currency, deadline, color, icon, status |
| `notifications` | id, user_id, title, message, type, read |
| `loans` | id, user_id, person_name, amount, currency, note, date, paid, paid_at |

Note: `loans` table is not in `001_schema.sql` yet — it exists only in Supabase and in `lib/types.ts`.

### Enums

```ts
Currency          = 'ARS' | 'USD'
TransactionType   = 'expense' | 'income' | 'savings' | 'investment'
TransactionStatus = 'confirmed' | 'pending' | 'cancelled'
GoalStatus        = 'active' | 'completed' | 'paused'
NotificationType  = 'info' | 'warning' | 'success' | 'alert'
```

## Currency Handling

The app supports two currencies: ARS (Argentine Peso) and USD.

- Display: ARS → `$ 1.000`, USD → `U$S 100`
- Formatted with `es-AR` locale via `Intl.NumberFormat`
- Transactions are stored with their own `currency` field
- The dashboard separates ARS and USD expenses on the chart (separate Y-axes)
- The spending distribution groups by `category + currency` to avoid mixing values
- There is no exchange rate conversion — never mix ARS and USD totals in the same sum

## Naming Conventions

- Pages: `page.tsx` (server component, data fetching only)
- Client components: `[feature]-client.tsx`
- Shared components: `components/[name].tsx` (PascalCase exports)
- UI primitives: `components/ui/[name].tsx`
- Server actions: `app/[section]/actions.ts` with `'use server'`
- Types: all in `lib/types.ts`
- Utility hooks: `hooks/use-[name].ts`

## Environment Variables

Required in `.env.local` (root of project — never in subdirectories):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

## Key Design Decisions

- **No API routes**: All Supabase access is direct (client or server SDK), protected by RLS.
- **No exchange rates**: ARS and USD are displayed and tracked separately. Never add them together.
- **Reload after mutations**: Many client components call `window.location.reload()` after a successful mutation rather than maintaining complex server sync state.
- **Month navigation**: Dashboard supports `?month=YYYY-MM` query param for historical viewing.
- **Hydration**: Recharts PieChart must be rendered client-side only (use `mounted` state) to avoid SSR ID mismatch errors.
- **TypeScript errors ignored in build**: `next.config.mjs` has `typescript.ignoreBuildErrors: true`. Don't rely on this — fix type errors properly.
- **Image optimization disabled**: `images.unoptimized: true` in next config.

## Upcoming / Coming Soon

- Transfer funds between accounts
- Generate financial reports (PDF/CSV)
- Loans table needs to be added to `001_schema.sql`
- Notification creation logic (server-side triggers or actions)
