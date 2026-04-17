# AGENT.md — MFI (Más Fácil Imposible)

> Contexto para agentes (Claude Code u otros). Describe el repo **tal cual está hoy**.
> Para detalles extendidos ver [CLAUDE.md](CLAUDE.md) (raíz) y [app/CLAUDE.md](app/CLAUDE.md) — este archivo es el resumen operativo; los CLAUDE.md son fuentes canónicas más granulares.

---

## 1. Overview

App web de finanzas personales para Argentina. Registra ingresos, gastos, ahorros e inversiones en ARS y USD (sin conversión entre ambas). Single-user por cuenta, con auth Supabase. UI en español (es-AR). Dos modos de interfaz conviven: `classic` (rutas `(app)/`) y `mfi` (rutas `mfi/`), seleccionados por `profiles.preferred_mode`.

## 2. Stack

| Capa | Tech | Versión |
|------|------|---------|
| Framework | Next.js (App Router) | 16.2.0 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | 5.7.3 |
| DB / Auth | Supabase (Postgres + RLS) | ssr 0.6.1 / js 2.49.4 |
| Estilos | Tailwind CSS | 4.x (`@tailwindcss/postcss`) |
| UI | Radix UI + shadcn (style `new-york`, `neutral`, lucide) | — |
| Charts | Recharts | 2.15.0 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Data fetching | SWR | 2.3.3 |
| Toasts | Sonner | 1.7.1 |
| Reportes | jspdf / jspdf-autotable / xlsx | 4 / 5 / 0.18 |
| Theming | next-themes | 0.4 |
| Analytics | @vercel/analytics | 1.6.1 |
| Tests | Vitest | 4.1.2 |
| Gestor paquetes | **npm** (oficial) | — |

- Fuentes Google: Sora, DM Sans, DM Mono (configuradas en [app/layout.tsx](app/layout.tsx)).
- Engines: no declarado en `package.json`. <!-- TODO: clarificar versión mínima de Node -->

## 3. Estructura

```
mas-facil-imposible/
├── app/
│   ├── (app)/                  # Rutas protegidas (classic mode)
│   │   ├── dashboard/          # page.tsx + dashboard-client.tsx + actions.ts
│   │   ├── transactions/
│   │   ├── goals/
│   │   ├── analytics/
│   │   ├── investments/
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── admin/sugerencias/  # Panel de feedback
│   │   └── layout.tsx          # AppShell (sidebar + topbar) + Toaster + WhatsNewModal
│   ├── mfi/                    # Modo MFI alternativo (analytics, goals, settings, transactions)
│   ├── auth/                   # Rutas públicas: login, register, forgot-password, verify-email + actions.ts
│   ├── onboarding/             # Flujo para usuarios nuevos (profiles.onboarding_completed)
│   ├── api/market-proxy/       # ÚNICA API route — proxy Yahoo Finance (bypass CORS, whitelist de tickers)
│   ├── actions/user.ts
│   ├── layout.tsx              # Root layout (fuentes, Analytics, metadata)
│   ├── globals.css             # CSS vivo (imports tailwind + tw-animate-css)
│   └── page.tsx                # Redirige según auth + onboarding + preferred_mode
├── components/
│   ├── ui/                     # Primitivas Radix/shadcn (~55 archivos)
│   ├── nav.tsx                 # DesktopSidebar + MobileBottomNav
│   ├── app-topbar.tsx
│   ├── app-shell.tsx
│   ├── quick-add-transaction.tsx
│   ├── edit-transaction-modal.tsx
│   ├── pending-transactions-bar.tsx
│   ├── pending-loans.tsx / pending-debts.tsx
│   ├── market-card.tsx / usd-cotizacion-widget.tsx / mfi-portfolio-widget.tsx
│   └── ...                     # ~25 componentes de feature
├── lib/
│   ├── supabase/               # client.ts (browser), server.ts (SSR), middleware.ts (updateSession)
│   ├── types.ts                # Todas las interfaces y enums del dominio
│   ├── crypto.ts               # AES-256-GCM para campos sensibles
│   ├── analytics-utils.ts / ar-holidays.ts / market-data.ts / crypto-data.ts
│   ├── dolar-cotizacion.ts / investment-streak.ts / investment-utils.ts
│   ├── monthly-report.ts / month-utils.ts / non-trading-messages.ts
│   ├── changelog.ts            # Historial de versiones (editado por script, no a mano)
│   └── *.test.ts               # Specs de Vitest (conviven con los módulos)
├── hooks/                      # use-mobile, use-polling, use-toast
├── scripts/
│   ├── 001_schema.sql ... 010_fix_savings_withdraw_currency.sql   # Migraciones en orden
│   ├── add-changelog.mjs       # Non-interactive — USAR al final de sesión
│   ├── release.mjs             # Interactive — commit + push (solo si el user pide)
│   └── migrate-encrypt.ts
├── middleware.ts               # Auth guard — llama updateSession()
├── next.config.mjs             # ignoreBuildErrors:true, images.unoptimized:true, jspdf externalized
├── tsconfig.json               # strict, alias "@/*": "./*"
├── components.json             # Config shadcn
├── CLAUDE.md                   # Instrucciones canónicas raíz
├── app/CLAUDE.md               # Detalles de rutas y componentes
└── README.md                   # Doc de producto (parcialmente desactualizado — ver Gotchas)
```

## 4. Comandos

Desde `package.json` (textual):

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint     # eslint .
npm run release  # node scripts/release.mjs  (interactivo, hace commit + push)
```

Extras no declarados como script:

```bash
npx vitest                          # Corre tests (hay *.test.ts en lib/ — no existe script "test")
node scripts/add-changelog.mjs patch "Cambio 1" "Cambio 2"   # Bump + changelog no interactivo
```

## 5. Variables de entorno

Requeridas en `.env.local` (raíz, nunca commitear):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key pública (cliente browser y SSR) |
| `SUPABASE_SERVICE_ROLE_KEY` | Key de servicio (operaciones privilegiadas) |
| `SUPABASE_JWT_SECRET` | Secret JWT del proyecto |
| `ENCRYPTION_KEY` | 64 hex chars para AES-256-GCM (`lib/crypto.ts`) |

## 6. Convenciones

- **Path alias**: `@/*` → `./*` (configurado en [tsconfig.json](tsconfig.json) + [components.json](components.json)).
- **Naming de archivos**:
  - Páginas server: `page.tsx` (fetch + pasa props).
  - Clients: `[feature]-client.tsx` con `'use client'`.
  - Mutaciones server: `actions.ts` con `'use server'`.
  - Tests: `[módulo].test.ts` al lado del módulo en `lib/`.
  - Componentes feature: kebab-case (`quick-add-transaction.tsx`). Componentes UI: kebab-case en `components/ui/`.
- **i18n**: todo copy en español AR. Formato `es-AR` vía `Intl.NumberFormat` / `Intl.DateTimeFormat`.
- **Moneda**: ARS y USD **nunca** se suman. Se muestran y agregan por separado. Ver `formatCurrency` y `CURRENCY_SYMBOLS` en [lib/types.ts](lib/types.ts).
- **Imports**: siempre vía alias `@/...`, nunca rutas relativas largas.
- **Tipos**: interfaces compartidas en [lib/types.ts](lib/types.ts) (Profile, Transaction, Goal, Loan, Debt, Portfolio, PortfolioLog, MfiSheet, Notification, Feedback + enums).

## 7. Arquitectura

- **Server vs client**: `page.tsx` (server) hace fetch con `createClient()` de [lib/supabase/server.ts](lib/supabase/server.ts); `*-client.tsx` hace mutaciones con [lib/supabase/client.ts](lib/supabase/client.ts). Auth server actions en `actions.ts` por sección.
- **Sin API routes** excepto una: [app/api/market-proxy/route.ts](app/api/market-proxy/route.ts) — proxy Yahoo Finance con whitelist de tickers (`^MERV`, `GGAL.BA`, etc.). Todo el resto pasa por SDK de Supabase protegido por RLS.
- **Auth guard**: [middleware.ts](middleware.ts) → `updateSession(request)`. Matcher excluye `_next/static`, `_next/image`, favicon, imágenes. Redirige no autenticados a `/auth/login`.
- **Ruteo inicial**: [app/page.tsx](app/page.tsx) redirige:
  - sin user → `/auth/login`
  - sin `onboarding_completed` → `/onboarding`
  - `preferred_mode === 'mfi'` → `/mfi`
  - default → `/dashboard`
- **Mutaciones**: patrón habitual es browser client directo → RLS (`auth.uid() = user_id`) → `window.location.reload()` o update optimista local.
- **Polling**: SWR con intervalo (ver [hooks/use-polling.ts](hooks/use-polling.ts)). Notificaciones cada 30s, mercado cada 5m.
- **Charts**: Recharts con guard `mounted` para evitar mismatch SSR en componentes que generan IDs (PieChart).
- **PDF/Excel**: `jspdf` + `jspdf-autotable` listados en `serverExternalPackages` de [next.config.mjs](next.config.mjs).

## 8. Base de datos

Schema en [scripts/001_schema.sql](scripts/001_schema.sql) + 9 migraciones incrementales (`002` a `010`). **Aplicar en orden** en el SQL editor de Supabase. Tablas principales: `profiles`, `categories`, `transactions`, `goals`, `notifications`, `loans`, `debts`, `portfolios`, `portfolio_logs`, `mfi_sheets`, `feedbacks`. RLS activado en todas: policy `auth.uid() = user_id`.

Enums relevantes (de [lib/types.ts](lib/types.ts)):
```
Currency          = 'ARS' | 'USD'
TransactionType   = 'expense' | 'income' | 'savings' | 'investment'
TransactionStatus = 'confirmed' | 'pending' | 'cancelled'
PaymentMethod     = 'cash' | 'debit' | 'credit'
GoalStatus        = 'active' | 'completed' | 'paused'
NotificationType  = 'info' | 'warning' | 'success' | 'alert'
AppMode           = 'classic' | 'mfi'
PortfolioLogType  = 'yield' | 'deposit' | 'rescue'
```

## 9. Zonas sensibles / no tocar

- **`scripts/00*_*.sql`**: migraciones ya aplicadas en prod. Nunca editar una existente — crear `0XX_*.sql` nueva.
- **`lib/crypto.ts` + `ENCRYPTION_KEY`**: cambiarla rompe desencriptado de datos existentes. Ver [memory/project_encryption.md] si corresponde.
- **`components/ui/`**: primitivas shadcn generadas. Editar a mano solo si se sabe lo que se hace; preferir regenerar.
- **`next.config.mjs`**: `ignoreBuildErrors: true` está intencional pero es tech debt (ver Gotchas). No "arreglar" sin hablar.
- **`lib/changelog.ts`**: NO editar a mano. Usar `scripts/add-changelog.mjs`.
- **[CLAUDE.md](CLAUDE.md) / [app/CLAUDE.md](app/CLAUDE.md)**: fuentes canónicas — si cambia el contrato de arquitectura, actualizar allí también.

## 10. Cómo agregar X

### Nueva ruta protegida (modo classic)

1. Crear `app/(app)/[ruta]/page.tsx` (server component): `createClient()` → `getUser()` → fetchs → render `<[Ruta]Client data={...} />`.
2. Crear `app/(app)/[ruta]/[ruta]-client.tsx` con `'use client'` y la UI interactiva.
3. Si hay mutaciones server-side con cifrado, agregar `app/(app)/[ruta]/actions.ts` con `'use server'`.
4. Agregar el link en [components/nav.tsx](components/nav.tsx) (DesktopSidebar y MobileBottomNav).

### Nueva tabla

1. Crear `scripts/0XX_<nombre>.sql` con `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + policies `auth.uid() = user_id` para select/insert/update/delete.
2. Agregar la interfaz en [lib/types.ts](lib/types.ts).
3. Aplicar manualmente en Supabase SQL editor.

### Cerrar sesión de trabajo

Siempre correr antes de terminar (regla del [CLAUDE.md](CLAUDE.md)):
```bash
node scripts/add-changelog.mjs patch "Descripción del cambio 1" "Descripción del cambio 2"
```
Entradas en español es-AR, una por bullet. Default `patch`.

## 11. Gotchas

- **Import roto en [middleware.ts](middleware.ts)**: importa `@/lib/supabase/proxy`, archivo que **no existe** en [lib/supabase/](lib/supabase/) (solo `client.ts`, `server.ts`, `middleware.ts` con `updateSession`). Probablemente pasa porque `next.config.mjs` tiene `ignoreBuildErrors: true`. Verificar si el middleware está efectivamente activo o es dead code antes de tocarlo.
- **`next.config.mjs` con `typescript.ignoreBuildErrors: true`**: los errores de tipos no rompen el build. No es excusa para dejar tipos rotos — es un workaround.
- **ESLint sin config**: el script `npm run lint` ejecuta `eslint .` pero **no hay `.eslintrc*` ni `eslint.config.*`** en el repo → corre con defaults de ESLint. <!-- TODO: definir config explícita -->
- **Vitest sin script `test`**: hay specs en [lib/](lib/) pero `package.json` no expone `"test"`. Correr con `npx vitest` directo.
- **Dos lockfiles**: conviven `package-lock.json` (Abr 16, el vivo) y `pnpm-lock.yaml` (Abr 3, legacy). **Usar npm**. No borrar el pnpm lock sin avisar, pero está para limpieza eventual.
- **`styles/globals.css` probablemente muerto**: el root layout importa `./globals.css` → [app/globals.css](app/globals.css). [styles/globals.css](styles/globals.css) no está referenciado. Candidato a limpieza pero no se removió aún.
- **README desactualizado**: [README.md](README.md) afirma "no existen API routes", pero [app/api/market-proxy/route.ts](app/api/market-proxy/route.ts) sí existe. Confiar en el código, no en el README.
- **Hydration Recharts**: `PieChart` y similares generan IDs secuenciales que difieren entre SSR y CSR. Renderizar solo client-side: `{mounted && <PieChart …/>}`.
- **ARS vs USD**: nunca sumarlas. Agrupar spending por `categoria + currency`. El dashboard usa 3 ejes Y para no mezclar escalas.
- **Post-mutación**: mezcla entre `window.location.reload()` (QuickAdd) y update local (DashboardClient). No hay un patrón único — seguir el que use el componente vecino.
- **`images.unoptimized: true`**: el componente `<Image>` de Next no optimiza; cualquier tamaño/formato se sirve tal cual.

