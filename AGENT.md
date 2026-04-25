# AGENT.md — MFI (Más Fácil Imposible)

> Contexto para agentes (Claude Code u otros). Describe el repo **tal cual está hoy** (versión 1.0.0).
> Detalles extendidos: [CLAUDE.md](CLAUDE.md) (raíz) y [app/CLAUDE.md](app/CLAUDE.md). Este archivo es el resumen operativo.

---

## 1. Overview

App web de finanzas personales para Argentina. Registra ingresos, gastos, ahorros e inversiones en ARS y USD (sin conversión entre ambas), con cifrado at-rest de campos sensibles, escaneo de tickets/PDFs con IA, comunidad social, chat 1-a-1 y resumen mensual estilo Wrapped. Single-user por cuenta, auth Supabase. UI 100% en español es-AR. Dos modos de UI conviven: `classic` (rutas `(app)/`) y `mfi` (rutas `mfi/`), elegidos por `profiles.preferred_mode`.

## 2. Stack

| Capa | Tech | Versión |
|------|------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.0 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | 5.7.3 |
| DB / Auth | Supabase (PostgreSQL + RLS) | ssr 0.6.1 / js 2.49.4 |
| Estilos | Tailwind CSS | 4.x |
| UI | Radix UI + shadcn (lucide), 57 primitivas en `components/ui/` | — |
| Charts | Recharts | 2.15.0 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Data fetching | SWR | 2.3.3 |
| Toasts | Sonner | 1.7.1 |
| Tours | driver.js | 1.4.0 |
| Rich text | TipTap (community + chat editors) | 3.22 |
| Drawer mobile | vaul | 1.1.2 |
| Reportes | jsPDF + jspdf-autotable + xlsx | 4 / 5 / 0.18 |
| Theming | next-themes | 0.4 |
| Analytics | @vercel/analytics | 1.6.1 |
| Tests | Vitest | 4.1.2 |
| Gestor paquetes | **pnpm** (Netlify usa frozen-lockfile) | — |
| Runtime mínimo | Node.js 20+ (declarado en `engines`) | — |

Fuentes Google: Sora, DM Sans, DM Mono (configuradas en [app/layout.tsx](app/layout.tsx)).

## 3. Estructura

```
mas-facil-imposible/
├── app/
│   ├── (app)/                  # Rutas protegidas
│   │   ├── dashboard/ transactions/ goals/ goals/[id]/
│   │   ├── analytics/ investments/ notifications/ settings/
│   │   ├── friends/ friends/[username]/ chat/ chat/[userId]/
│   │   ├── comunidad/ comunidad/[postId]/ admin/sugerencias/
│   │   └── layout.tsx          # AppShell (sidebar + topbar + toaster + realtime mounts)
│   ├── mfi/                    # Modo MFI (UI alternativa, mismos datos)
│   ├── auth/                   # login, register, forgot-password, verify-email + actions.ts
│   ├── onboarding/             # Flow nuevos usuarios (profiles.onboarding_completed)
│   ├── legal/{privacy,tos}/    # Páginas legales públicas
│   ├── add/[username]/         # Landing pública de invitación
│   ├── api/market-proxy/       # Única API route — proxy Yahoo Finance whitelist
│   ├── actions/user.ts
│   ├── layout.tsx              # Root layout (fuentes, Analytics, metadata)
│   ├── globals.css             # Tailwind + tw-animate-css
│   ├── tour.css                # Theming driver.js (tokens MFI)
│   └── page.tsx                # Redirect según auth/onboarding/preferred_mode
├── components/
│   ├── ui/                     # 57 primitivas Radix/shadcn
│   ├── nav.tsx                 # DesktopSidebar + MobileBottomNav
│   ├── app-{topbar,shell}.tsx
│   ├── quick-add-transaction.tsx       # Carga manual
│   ├── scan-transaction-dialog.tsx     # Escaneo Gemini (cámara/archivo/PDF)
│   ├── bulk-review-transactions.tsx    # Revisión multi-tx (resúmenes)
│   ├── feature-tour.tsx                # Driver.js wrapper
│   ├── edit-transaction-modal.tsx, category-manager.tsx
│   ├── pending-{loans,debts,transactions-bar}.tsx
│   ├── market-card.tsx, usd-cotizacion-widget.tsx, ar-datos-widget.tsx
│   ├── monthly-summary-banner.tsx, month-alerts-banner.tsx
│   ├── mfi-portfolio-widget.tsx, investment-streak-widget.tsx
│   ├── command-palette.tsx, feedback-modal.tsx
│   ├── chat-composer.tsx, message-bubble.tsx, presence-dot.tsx, typing-indicator.tsx
│   ├── friend-{picker,request-button}.tsx, friends-topbar-button.tsx
│   └── theme-{provider,toggle}.tsx
├── lib/
│   ├── supabase/               # client, server (incluye admin), middleware
│   ├── types.ts                # Todos los tipos del dominio
│   ├── crypto.ts               # AES-256-GCM
│   ├── gemini.ts               # Wrapper REST Gemini 2.5 Flash
│   ├── changelog.ts            # NUNCA editar a mano
│   ├── analytics-utils.ts, ar-{holidays,datos}.ts, weather.ts
│   ├── dolar-cotizacion.ts, market-data.ts, crypto-data.ts
│   ├── investment-{streak,utils}.ts, portfolio-events.ts
│   ├── monthly-report.ts, month-utils.ts, non-trading-messages.ts
│   ├── goals.ts, legal-texts.ts
│   ├── social/                 # 12 archivos (chat, friendships, presence, …)
│   ├── wrapped/                # 15 archivos (compute, personality, share, pdf)
│   └── *.test.ts               # 9 specs Vitest
├── hooks/                      # 9 hooks (use-mobile, use-toast, use-polling,
│                               #          use-heartbeat, use-presence,
│                               #          use-social-realtime, use-typing,
│                               #          use-messages, use-usd-rate)
├── scripts/
│   ├── 001…029_*.sql           # 36 migraciones (ver §8)
│   ├── add-changelog.mjs       # Bump versión + entrada (USAR al cerrar feature)
│   ├── release.mjs             # Interactivo (commit + push, solo si user pide)
│   └── migrate-encrypt.ts      # One-shot plaintext → enc_data
├── middleware.ts               # Auth guard
├── next.config.mjs             # ignoreBuildErrors:true, images.unoptimized:true
├── tsconfig.json               # strict, alias "@/*" → "./*"
├── components.json             # shadcn
├── package.json                # version 1.0.0, engines node>=20
├── CLAUDE.md, app/CLAUDE.md, README.md
```

## 4. Comandos

```bash
npm run dev      # next dev (Turbopack)
npm run build    # next build
npm run start    # next start
npm run lint     # eslint .
npm run release  # node scripts/release.mjs (interactivo, commit + push)
```

Sin script `npm test`. Tests con Vitest:

```bash
npx vitest run                    # one-shot
npx vitest                        # watch
npx vitest run lib/foo.test.ts    # archivo específico
```

Changelog (no-interactivo, USAR al cerrar feature):

```bash
node scripts/add-changelog.mjs patch "Cambio 1" "Cambio 2"
# Niveles: patch | minor | major (bumpea package.json y prepends a lib/changelog.ts)
```

## 5. Variables de entorno

`.env.local` en raíz. Nunca commitear.

**Obligatorias**:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Key de servicio (admin client + migraciones) |
| `ENCRYPTION_KEY` | 64 hex chars, AES-256-GCM. **Única env sensible no-Supabase**. `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google AI Studio (Gemini 2.5 Flash, free tier sin billing) |

**Opcionales**:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Override redirect URL en dev |
| `NEXT_PUBLIC_SITE_URL` | Base URL para links de email |
| `NEXT_PUBLIC_DEBUG_PANELS` | `'true'` muestra debug panels en goals |
| `NEXT_PUBLIC_WRAPPED_{ENABLED,DESKTOP,DEV}` | Feature flags Wrapped mensual |

## 6. Convenciones

- **Path alias**: `@/*` → `./*` (tsconfig + components.json).
- **Naming**:
  - Pages server: `page.tsx`.
  - Clients: `[feature]-client.tsx` con `'use client'`.
  - Mutaciones server: `actions.ts` con `'use server'` (uno por sección).
  - Privadas de sección: `app/(app)/[ruta]/_components/` (subrayado = no es ruta).
  - Tests: `[modulo].test.ts` al lado del módulo en `lib/`.
  - Componentes: kebab-case en `components/` y `components/ui/`.
- **i18n**: copy en español AR. `Intl.NumberFormat` / `Intl.DateTimeFormat` con `'es-AR'`.
- **Moneda**: ARS y USD **nunca** se suman. Helpers `formatCurrency`, `CURRENCY_SYMBOLS` en [lib/types.ts](lib/types.ts).
- **Imports**: vía alias `@/...`, no rutas relativas largas.
- **Tipos**: interfaces en [lib/types.ts](lib/types.ts) (excepto features con types propios, p.ej. `lib/wrapped/types.ts`).

## 7. Arquitectura

### Server vs client

- `page.tsx` (server) hace fetch con `createClient()` de [lib/supabase/server.ts](lib/supabase/server.ts).
- `*-client.tsx` (`'use client'`) maneja UI.
- `actions.ts` (`'use server'`) cuando hay cifrado, secretos (API keys), o mutaciones multi-fila.
- Mutaciones simples sobre tablas no-cifradas pueden ir directo desde browser client (RLS las protege).

### API routes

Solo una: [app/api/market-proxy/route.ts](app/api/market-proxy/route.ts) — proxy Yahoo Finance con whitelist de tickers AR. Cache 60s. Resto de integraciones externas en server components / actions.

### Auth

[middleware.ts](middleware.ts) corre `updateSession()` global. Rutas protegidas (redirect a `/auth/login` si no hay user): `/dashboard`, `/transactions`, `/goals`, `/analytics`, `/investments`, `/settings`, `/notifications`, `/mfi`, `/friends`, `/chat`, `/comunidad`, `/onboarding`. Públicas: `/auth/*`, `/legal/*`, `/add/[username]`, `/api/market-proxy`.

[app/page.tsx](app/page.tsx) deriva: sin user → `/auth/login`, sin onboarding → `/onboarding`, `preferred_mode === 'mfi'` → `/mfi`, default → `/dashboard`.

### Modos `classic` vs `mfi`

Misma data, distinta UI. Se elige por `profiles.preferred_mode`. `classic` vive en `app/(app)/*`, `mfi` en `app/mfi/*`. Cambiar el modo solo cambia routing inicial y UI; tablas, RLS, server actions y crypto son los mismos.

### Realtime y polling

- **Realtime** (Supabase WS): chat (`messages` con `REPLICA IDENTITY FULL`), presence, social signals.
- **Polling** (SWR): notificaciones cada 30s, mercado cada 5 min con pausa en background.

### Hidratación

`PieChart` y otros Recharts con IDs internos van guardados con `mounted` state.

### Mutaciones

Después de write: `window.location.reload()` (default), update local de estado (DashboardClient), SWR revalidate, o `router.refresh()`. Sin patrón único — seguir el del componente vecino.

## 8. Base de datos

Schema base en [scripts/001_schema.sql](scripts/001_schema.sql) + 35 migraciones incrementales. **Aplicar en orden** en el SQL editor de Supabase. RLS activado en todas: policy `auth.uid() = user_id` (graph-tables como friendships usan policies más complejas).

### Migraciones agrupadas

- **Schema base** (`001`, `002`)
- **Encriptación** (`003_add_enc_columns`)
- **Recurring** (`003_recurring_transactions`)
- **Comunidad** (`003_community`, `004_community_media`, `024-027_community_*`, `020_wrapped_embed_kind`)
- **Compliance** (`004_profiles_last_seen_version`, `013_add_compliance_fields`)
- **Profile UX** (`005_profiles_mood_nickname`, `011_add_user_location`, `012_fix_location_lat_lng_type`, `014_add_social_identity`, `016_profile_privacy`)
- **AI/Scan** (`004_ai_usage`, `005_ai_usage_n_extracted`)
- **Tours** (`006_profiles_tours_seen`)
- **Loans/Debts** (`019_loans_debts_friend`, `008_resolved_transaction_id`)
- **Chat** (`017_chat`, `018_chat_presence`, `021/022/023_chat_*`)
- **Social graph** (`015_social_graph`, `020_suggested_users`)
- **Goals redesign** (`028_goals_redesign`, `029_goals_liquidation`)
- **Otras**: `006_fix_cocos_currency`, `007_add_payment_method`, `009_portfolio_log_type`, `010_fix_savings_withdraw_currency`

> **Numeración**: hay duplicados históricos (003×3, 004×3, 005×2, 006×2, 020×2) por paralelismo de features. **De ahora en más, las migraciones nuevas empiezan en `030` y siguen secuenciales sin reusar números.**

### Tablas principales

`profiles`, `categories`, `transactions`, `goals`, `loans`, `debts`, `notifications`, `portfolios`, `portfolio_logs`, `mfi_sheets`, `feedback`, `ai_usage`, `community_{posts,comments,votes,saves}`, `conversations`, `messages`, `friend_requests`, `friendships`, `blocks`.

Cifrado at-rest (AES-256-GCM) en columna `enc_data text` de **transactions, goals, loans, debts**. Plaintext columns son placeholders (0 / null).

### Enums (de [lib/types.ts](lib/types.ts))

```
Currency           = 'ARS' | 'USD'
TransactionType    = 'expense' | 'income' | 'savings' | 'investment'
TransactionStatus  = 'confirmed' | 'pending' | 'cancelled'
TransactionSource  = 'manual' | 'auto_goal' | 'goal_deposit' | 'goal_liquidation'
PaymentMethod      = 'cash' | 'debit' | 'credit'
GoalStatus         = 'active' | 'completed' | 'paused' | 'liquidated'
GoalCategory       = 'viaje' | 'auto' | 'casa' | 'emergencia' | 'inversion' | 'otro'
NotificationType   = 'info' | 'warning' | 'success' | 'alert'
AppMode            = 'classic' | 'mfi'
PortfolioLogType   = 'yield' | 'deposit' | 'rescue'
FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
CommunityCategoryId = 'inversiones' | 'ahorros' | 'dolar' | 'plazosfijos' | 'cripto' | 'gastos' | 'metas' | 'preguntas'
WrappedPersonalityId = 'ahorrista' | 'inversor' | 'social' | 'equilibrado' | 'austero'
```

## 9. Encriptación at-rest

[lib/crypto.ts](lib/crypto.ts) — AES-256-GCM con IV de 12 bytes, authTag de 16. Wire format: `base64(iv || tag || ciphertext)`. Helpers: `encrypt`, `decrypt`, `encryptFields`, `decryptFields`, `decryptRow`. Tablas con `enc_data`: transactions, goals, loans, debts. En reads: `decryptRow(row)`. En writes: `encryptFields({ amount, note })`. Migración legacy en [scripts/migrate-encrypt.ts](scripts/migrate-encrypt.ts).

## 10. AI scanning (Gemini)

[lib/gemini.ts](lib/gemini.ts) — REST `gemini-2.5-flash`, sin SDK. Server-side only. Free tier sin billing.

Flow: `ScanTransactionDialog` → base64 → Server Action `extractTransactionFromImage(b64, mime)` en [app/(app)/transactions/actions.ts](app/(app)/transactions/actions.ts) → valida + Gemini con `responseSchema` JSON → sanea cada item → devuelve `{ ok, data: { transactions: ExtractedTransaction[] } }`. 1 tx → QuickAdd con prefill, >1 → BulkReview. Bulk insert via `createManyTransactions` (cifra cada fila, single insert).

Rate limit: 20/usuario/24h rolling, contado en tabla `ai_usage` (1 row por llamada, no por movimiento extraído). 429/503 de Google **no consume** cuota. Soporta PNG/JPG/WebP (≤4 MB) y PDF (≤10 MB). Nunca persistimos imagen ni PDF.

## 11. Tours

[components/feature-tour.tsx](components/feature-tour.tsx) — driver.js v1.4 con theming en [app/tour.css](app/tour.css). Persistencia dual: `profiles.tours_seen JSONB` (cross-device) + localStorage (same-tab backup). Server action `markTourSeen(tourKey)` en [app/(app)/settings/actions.ts](app/(app)/settings/actions.ts). TOUR_KEYs hardcoded actuales: **`image_upload_v1`**.

Para agregar un tour: extender el componente con TOUR_KEY nuevo, sumar `data-tour="..."` al ancla. La tabla genérica soporta N keys sin migrar.

## 12. Integraciones externas

| Servicio | Wrapper | Auth |
|---|---|---|
| Gemini 2.5 Flash | `lib/gemini.ts` | `GEMINI_API_KEY` |
| Yahoo Finance | `app/api/market-proxy/route.ts` (whitelist) | sin clave |
| DolarAPI | `lib/dolar-cotizacion.ts` | sin clave |
| CoinGecko | `lib/crypto-data.ts` | sin clave |
| datos.gob.ar | `lib/ar-datos.ts` | sin clave |
| Open-Meteo | `lib/weather.ts` | sin clave |

Solo Gemini y Supabase requieren credenciales privadas.

## 13. Server Actions — resumen

| Archivo | Funciones |
|---|---|
| `auth/actions.ts` | login, signUp, signOut, resetPassword, updatePassword |
| `(app)/dashboard/actions.ts` | createLoan, updateLoan, markLoanPaid, deleteLoan, createDebt, updateDebt, markDebtPaid, deleteDebt, fetchMonthlyReportData, fetchMonthlyWrappedData |
| `(app)/transactions/actions.ts` | createTransaction, updateTransaction, deleteTransaction, updateTransactionAmount, deleteManyTransactions, fetch{Investment,All,ForMonth}Transactions, markCreditCardPaid, confirmAllPending, generateRecurringTransactions, **extractTransactionFromImage**, **createManyTransactions** |
| `(app)/goals/actions.ts` | createGoal, updateGoal, setGoalStatus, depositToGoal, liquidateGoal, deleteGoal |
| `(app)/chat/actions.ts` | ensureConversation, sendMessage, deleteMessage, markConversationRead |
| `(app)/friends/actions.ts` | sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeFriend, blockUser, unblockUser, markFriendRequestNotificationsRead |
| `(app)/admin/sugerencias/actions.ts` | updateFeedbackStatus |
| `(app)/settings/actions.ts` | markTourSeen |

## 14. Cómo agregar X

### Nueva ruta protegida (modo classic)

1. `app/(app)/[ruta]/page.tsx` (server): `createClient()` → fetchs → render `<[Ruta]Client />`.
2. `app/(app)/[ruta]/[ruta]-client.tsx` con `'use client'`.
3. Si hay mutaciones cifradas o llamadas a APIs externas, `actions.ts` con `'use server'`.
4. Sumar `request.nextUrl.pathname.startsWith('/[ruta]')` al `isAppRoute` de [lib/supabase/middleware.ts](lib/supabase/middleware.ts).
5. Link en [components/nav.tsx](components/nav.tsx) (DesktopSidebar y MobileBottomNav).

### Nueva tabla

1. `scripts/0XX_<nombre>.sql` con `CREATE TABLE` + `ENABLE ROW LEVEL SECURITY` + policies. Numerar desde **030** en adelante.
2. Interface en [lib/types.ts](lib/types.ts).
3. Si tiene campos sensibles, agregar `enc_data text` y usar `encryptFields` / `decryptRow` en server actions.
4. Aplicar en Supabase SQL editor.

### Cerrar sesión de trabajo

```bash
node scripts/add-changelog.mjs patch "Cambio 1" "Cambio 2"
```

Niveles: `patch` (default), `minor` (feature), `major` (breaking). Una entrada por bullet, español es-AR. **Acumular** entradas si la feature toca varios turnos — disparar el script una sola vez al cerrar.

## 15. Zonas sensibles / no tocar

- **`scripts/00*_*.sql`**: migraciones aplicadas en prod. Nunca editar — crear nuevas desde 030.
- **`lib/crypto.ts` + `ENCRYPTION_KEY`**: cambiar la key rompe descifrado de datos existentes.
- **`components/ui/`**: primitivas shadcn. Editar a mano con cuidado, preferir regenerar.
- **`next.config.mjs`** con `ignoreBuildErrors: true`: tech debt intencional. No "arreglar" sin avisar — fixear los errores en código.
- **`lib/changelog.ts`**: NO editar a mano.
- **CLAUDE.md / app/CLAUDE.md / AGENT.md / README.md**: si cambia el contrato (rutas, env vars, schema, server actions), actualizar los cuatro.

## 16. Gotchas

- **Dos lockfiles trackeados**: `package-lock.json` (npm) y `pnpm-lock.yaml` (pnpm). Netlify usa **pnpm** con `--frozen-lockfile`. Usar `pnpm install` para agregar/quitar deps. Pendiente decidir si se borra el de npm.
- **`next.config.mjs` con `typescript.ignoreBuildErrors: true`**: errores de tipos no rompen el build. No es excusa.
- **ESLint sin config**: `npm run lint` corre con defaults.
- **Vitest sin script `test`**: usar `npx vitest run`. Mejora futura: agregar `"test": "vitest run"` al `package.json`.
- **Hydration Recharts**: PieChart y similares con `mounted` guard.
- **ARS vs USD**: nunca sumarlas. Agrupar spending por `categoria + currency`. Dashboard usa 3 ejes Y.
- **Post-mutación**: mezcla entre reload y update local. Seguir el patrón del componente vecino.
- **`images.unoptimized: true`**: el `<Image>` de Next no optimiza.
- **`SUPABASE_JWT_SECRET`**: documentada en versiones anteriores como obligatoria pero **no se usa en el código** (no hay `process.env.SUPABASE_JWT_SECRET` en ningún lado). Removida de la lista.
