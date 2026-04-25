# MFI — Más Fácil Imposible

App web de finanzas personales para Argentina. Registra ingresos, gastos, ahorros e inversiones en ARS y USD, con cifrado at-rest de campos sensibles, escaneo de tickets/PDFs con IA, comunidad social, chat 1-a-1 y resumen mensual estilo Wrapped. UI 100% en español (es-AR). Versión actual: **1.0.0**.

## Stack

| Capa | Tech | Versión |
|------|------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.0 |
| Runtime | React | 19.2.4 |
| Lenguaje | TypeScript | 5.7.3 |
| DB / Auth | Supabase (PostgreSQL + Auth + RLS) | ssr 0.6.1 / js 2.49.4 |
| Estilos | Tailwind CSS | 4.x |
| UI Primitives | Radix UI (vía shadcn/ui), 57 archivos en `components/ui/` | — |
| Charts | Recharts | 2.15.0 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Data fetching | SWR | 2.3.3 |
| Rich text | TipTap (editor de community + chat) | 3.22 |
| Drawer mobile | vaul | 1.1.2 |
| Notificaciones | Sonner | 1.7.1 |
| Theming | next-themes | 0.4 |
| Tours / onboarding | driver.js | 1.4.0 |
| Reportes | jsPDF + jspdf-autotable + xlsx | 4 / 5 / 0.18 |
| Iconos | Lucide React | 0.564 |
| Emojis | emoji-mart | 5.6 |
| Analytics | @vercel/analytics | 1.6.1 |
| Tests | Vitest | 4.1.2 |
| Fuentes | Sora, DM Sans, DM Mono (Google Fonts) | — |
| Runtime mínimo | Node.js 20+ | (declarado en `package.json` `engines`) |
| Gestor de paquetes | **pnpm** (Netlify usa pnpm con frozen-lockfile) | — |

## Estructura del proyecto

```
mas-facil-imposible/
├── app/
│   ├── (app)/                       # Rutas protegidas
│   │   ├── dashboard/               # Inicio: KPIs, área chart, recent tx, FAB scanner
│   │   ├── transactions/            # Lista + filtros + bulk + scanner FAB
│   │   ├── goals/ + goals/[id]/     # Metas con detalle
│   │   ├── analytics/               # Análisis con period selector
│   │   ├── investments/             # Portfolios + chart de evolución
│   │   ├── notifications/
│   │   ├── settings/
│   │   ├── friends/ + friends/[username]/
│   │   ├── chat/ + chat/[userId]/
│   │   ├── comunidad/ + comunidad/[postId]/
│   │   ├── admin/sugerencias/       # Panel feedback (solo admin)
│   │   └── layout.tsx               # AppShell (sidebar + topbar + Toaster)
│   ├── mfi/                         # Modo MFI alternativo (analytics, goals, settings, transactions)
│   ├── auth/                        # login, register, forgot-password, verify-email + actions.ts
│   ├── onboarding/                  # Flujo de usuarios nuevos
│   ├── legal/{privacy,tos}/         # Páginas legales públicas
│   ├── add/[username]/              # Landing pública de invitación (deep link a /friends)
│   ├── api/market-proxy/            # Única API route — proxy Yahoo Finance con whitelist
│   ├── actions/user.ts              # Server actions de scope app-wide
│   ├── layout.tsx                   # Root layout (fuentes, metadata, Analytics)
│   ├── globals.css                  # Tailwind + tw-animate-css
│   ├── tour.css                     # Theming de driver.js (consume tokens MFI)
│   └── page.tsx                     # Redirect según auth/onboarding/preferred_mode
├── components/
│   ├── ui/                          # 57 primitivas Radix/shadcn
│   ├── nav.tsx                      # DesktopSidebar + MobileBottomNav
│   ├── app-shell.tsx, app-topbar.tsx
│   ├── quick-add-transaction.tsx    # Modal de carga manual
│   ├── edit-transaction-modal.tsx
│   ├── scan-transaction-dialog.tsx  # Escaneo Gemini (cámara/archivo/PDF)
│   ├── bulk-review-transactions.tsx # Revisión multi-tx (resúmenes de tarjeta)
│   ├── feature-tour.tsx             # Driver.js wrapper (tour image_upload_v1)
│   ├── category-manager.tsx
│   ├── pending-{loans,debts,transactions-bar}.tsx
│   ├── monthly-summary-banner.tsx
│   ├── month-alerts-banner.tsx
│   ├── market-card.tsx              # MERVAL + acciones AR + crypto
│   ├── usd-cotizacion-widget.tsx    # Dólar MEP/Blue
│   ├── ar-datos-widget.tsx, weather-clock-widget.tsx
│   ├── mfi-portfolio-widget.tsx
│   ├── investment-streak-widget.tsx
│   ├── command-palette.tsx          # Cmd+K
│   ├── feedback-modal.tsx
│   ├── chat-composer.tsx, message-bubble.tsx, typing-indicator.tsx, presence-dot.tsx
│   ├── friend-{picker,request-button}.tsx, friends-topbar-button.tsx
│   ├── messages-topbar-button.tsx
│   ├── tos-reacceptance-modal.tsx, username-setup-modal.tsx, whats-new-modal.tsx
│   └── theme-{provider,toggle}.tsx
├── lib/
│   ├── supabase/                    # client (browser), server (SSR + admin), middleware
│   ├── types.ts                     # Todos los tipos del dominio
│   ├── crypto.ts                    # AES-256-GCM para campos sensibles
│   ├── gemini.ts                    # Wrapper REST de Gemini 2.5 Flash
│   ├── changelog.ts                 # NUNCA editar a mano — usar add-changelog.mjs
│   ├── analytics-utils.ts, ar-holidays.ts, ar-datos.ts, weather.ts
│   ├── dolar-cotizacion.ts, market-data.ts, crypto-data.ts
│   ├── investment-{streak,utils}.ts, portfolio-events.ts
│   ├── monthly-report.ts, month-utils.ts, non-trading-messages.ts
│   ├── goals.ts, legal-texts.ts
│   ├── social/                      # 12 archivos: chat, friendships, presence, validate-username, ...
│   ├── wrapped/                     # 15 archivos: compute, personality, share, equivalents, pdf
│   └── *.test.ts                    # Specs Vitest junto a sus módulos
├── hooks/                           # 9 hooks: use-mobile, use-toast, use-polling, use-heartbeat,
│                                    #         use-presence, use-social-realtime, use-typing,
│                                    #         use-messages, use-usd-rate
├── scripts/
│   ├── 001…029_*.sql                # 36 migraciones (ver "Schema de DB")
│   ├── 004/005/006_ai_usage*.sql    # Rate limit Gemini + tours
│   ├── add-changelog.mjs            # Bump versión + entrada en lib/changelog.ts
│   ├── release.mjs                  # Interactivo: commit + push (solo si user pide)
│   └── migrate-encrypt.ts           # Migración one-shot de plaintext → enc_data
├── middleware.ts                    # Auth guard global (matcher excluye assets)
├── next.config.mjs                  # ignoreBuildErrors:true, images.unoptimized:true, jspdf externalized
├── tsconfig.json                    # strict, alias "@/*" → "./*"
├── components.json                  # Config shadcn
├── package.json                     # version 1.0.0, engines: node >=20
├── CLAUDE.md                        # Este archivo (raíz, canónico)
├── app/CLAUDE.md                    # Detalle de rutas y componentes app-side
├── AGENT.md                         # Versión resumida agent-agnostic
└── README.md                        # Documento público
```

## Arquitectura

### Server vs client components

- `page.tsx` siempre es server component. Hace fetch con `createClient()` de `lib/supabase/server.ts` y pasa data como props.
- `*-client.tsx` siempre es `'use client'`. Maneja interactividad, modals, formularios, estado local.
- `actions.ts` con `'use server'` para mutaciones que necesitan lógica server-side (p.ej. cifrado, validación, llamadas a APIs externas con secretos).
- Las mutaciones simples (sin cifrado) pueden ir directo desde el browser client de Supabase, protegidas por RLS.

### Server Actions vs mutación directa

**Usar Server Action cuando**:
- El campo va cifrado (transactions, goals, loans, debts → `enc_data`).
- Hay llamada a API externa con secreto (`GEMINI_API_KEY`).
- La operación toca múltiples filas de manera consistente (bulk insert, liquidación de meta, etc.).
- Hay validación que no se puede hacer con check constraint solo.

**Usar mutación directa desde browser cuando**:
- Es CRUD simple sobre tablas no encriptadas (`categories`, `notifications`, `mfi_sheets`, votos de community, etc.).
- RLS + check constraints alcanzan para garantizar invariantes.

### API routes

**Hay una sola**: `app/api/market-proxy/route.ts`. Proxy a Yahoo Finance v8 con whitelist de 10 tickers AR (`^MERV`, `GGAL.BA`, `YPFD.BA`, `MELI.BA`, `BMA.BA`, `PAMP.BA`, `TXAR.BA`, `SUPV.BA`, `BBAR.BA`, `LOMA.BA`). Cache 60s con `next.revalidate`. No requiere auth — la whitelist limita el blast radius.

Toda otra integración externa (Gemini, DolarAPI, CoinGecko, datos.gob.ar, Open-Meteo) corre en server components o server actions, no en API routes.

### Auth y ruteo inicial

- `middleware.ts` corre `updateSession()` en `lib/supabase/middleware.ts` en cada request (matcher excluye `_next/static`, `_next/image`, favicon, imágenes).
- Rutas protegidas (redirect a `/auth/login` si no hay user): `/dashboard`, `/transactions`, `/goals`, `/analytics`, `/investments`, `/settings`, `/notifications`, `/mfi`, `/friends`, `/chat`, `/comunidad`, `/onboarding`.
- Rutas públicas: `/auth/*`, `/legal/{privacy,tos}`, `/add/[username]`, `/api/market-proxy`.
- Si hay user en `/auth/*` → redirect a `/`.
- `app/page.tsx` deriva:
  - sin user → `/auth/login`
  - `!profile.onboarding_completed` → `/onboarding`
  - `profile.preferred_mode === 'mfi'` → `/mfi`
  - default → `/dashboard`

### Modos de UI: classic vs mfi

El proyecto sirve dos UIs distintas sobre los **mismos datos**:

- **classic**: rutas en `app/(app)/*`. UI por defecto. Es el dashboard maduro con sidebar + topbar.
- **mfi**: rutas en `app/mfi/*`. UI experimental orientada a tabla mensual estilo planilla.

Se elige por columna `profiles.preferred_mode` (`'classic' | 'mfi'`). Cambiar el modo solo cambia el routing inicial y la UI; las tablas de Supabase, RLS, server actions y crypto son las mismas para ambos.

### Mutaciones — patrones de refresh

Después de un write exitoso, los clients usan uno de estos patrones (no hay un único válido — seguir el del componente vecino):

1. `window.location.reload()` — simple, usado en QuickAdd, BulkReview, ScanDialog post-success.
2. Update local de estado — usado en DashboardClient para edits/deletes (evita flicker).
3. Revalidación SWR — usado en topbar para notifs.
4. `router.refresh()` — server-data refetch sin reload.

### Realtime

Chat y community dependen de Supabase Realtime con `REPLICA IDENTITY FULL` en `messages`. Hooks: `use-presence`, `use-social-realtime`, `use-typing`, `use-messages`, `use-heartbeat`.

### Polling

SWR con intervalo (`hooks/use-polling.ts`):
- Notificaciones: cada 30s.
- Mercado / cotización: cada 5 min con pausa cuando la pestaña está oculta.

### Hidratación con Recharts

`PieChart` y similares generan IDs internos secuenciales que difieren entre SSR y CSR. Renderizar solo cliente:

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
return mounted ? <PieChart …/> : null
```

## Schema de base de datos

Todas las tablas tienen RLS habilitado. Política por defecto: `auth.uid() = user_id`. Las tablas de relaciones (friendships, blocks) usan policies más complejas.

| Tabla | Propósito | Migración(es) |
|---|---|---|
| `profiles` | Perfil + preferencias + privacy + tours_seen + karma | 001 + 004/005/011/013/014/016/018/026/006_tours |
| `categories` | Categorías de movimientos | 001 |
| `transactions` | Movimientos (campos sensibles cifrados) | 001 + 003_enc + 003_recurring + 007 |
| `goals` | Metas (campos sensibles cifrados) | 001 + 003_enc + 028 + 029 |
| `loans` / `debts` | Préstamos otorgados / contraídos (cifrados) | 019 + 003_enc + 008 |
| `notifications` | Centro de notificaciones | 001 |
| `portfolios` / `portfolio_logs` | Inversiones + tracking diario | (creadas externamente, ver tipos en `lib/types.ts`) |
| `mfi_sheets` | Hojas custom modo MFI | (idem) |
| `feedback` | Sugerencias de usuarios | (idem) |
| `ai_usage` | Rate limit AI scanning (1 row por llamada a Gemini) | 004_ai_usage + 005_ai_usage_n_extracted |
| `community_posts` / `community_comments` / `community_votes` / `community_saves` | Feed social tipo Reddit | 003_community + 004_media + 020_wrapped + 024 + 025 + 027 |
| `conversations` / `messages` | Chat 1-a-1 | 017 + 018 + 021 + 022 + 023 |
| `friend_requests` / `friendships` / `blocks` | Grafo social | 015 + 020_suggested |

### Migraciones — agrupadas por feature

| Grupo | Archivos | Qué hace |
|---|---|---|
| Schema base | `001_schema.sql`, `002_seed_categories.sql` | Tablas core + seed |
| Encriptación | `003_add_enc_columns.sql` | Columnas `enc_data` en transactions/goals/loans/debts |
| Recurring | `003_recurring_transactions.sql` | `is_recurring`, `recurring_source_id` en transactions |
| Comunidad | `003_community.sql`, `004_community_media.sql`, `024_community_notifications.sql`, `025_community_posts_edited_at.sql`, `026_community_karma.sql`, `027_community_mentions.sql`, `020_wrapped_embed_kind.sql` | Posts, comentarios, votos, saves, media, mentions, karma, embed wrapped |
| Compliance | `004_profiles_last_seen_version.sql`, `013_add_compliance_fields.sql` | TOS / privacy timestamps + cascade FK |
| Profile UX | `005_profiles_mood_nickname.sql`, `006_fix_cocos_currency.sql`, `011_add_user_location.sql`, `012_fix_location_lat_lng_type.sql`, `014_add_social_identity.sql`, `016_profile_privacy.sql` | Mood, nickname, location, username, bio, privacy flags |
| Pagos / méto.do | `007_add_payment_method.sql` | `transactions.payment_method` |
| Loans / Debts | `008_resolved_transaction_id.sql`, `019_loans_debts_friend.sql` | Tablas loans/debts + FK a friend |
| Inversiones | `009_portfolio_log_type.sql`, `010_fix_savings_withdraw_currency.sql` | Tipo de log, fix histórico |
| Chat | `017_chat.sql`, `018_chat_presence.sql`, `021_chat_replica_identity.sql`, `022_chat_reply.sql`, `023_client_message_id.sql` | Conversations + messages + realtime + replies + idempotencia |
| Social graph | `015_social_graph.sql`, `020_suggested_users.sql` | Friend requests, friendships, blocks, sugerencias |
| AI / Scan | `004_ai_usage.sql`, `005_ai_usage_n_extracted.sql` | Rate limit + métrica |
| Tours | `006_profiles_tours_seen.sql` | `profiles.tours_seen JSONB` |
| Goals redesign | `028_goals_redesign.sql`, `029_goals_liquidation.sql` | Categoría, monthly_target, auto-débito declarativo, liquidación |

> **Numeración**: hay duplicados históricos (003×3, 004×3, 005×2, 006×2, 020×2) por paralelismo de features. **De ahora en más, las migraciones nuevas empiezan en `030` y siguen secuenciales sin reusar números.**

### Enums (de `lib/types.ts`)

```ts
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

## Encriptación at-rest (`lib/crypto.ts`)

- AES-256-GCM con IV de 12 bytes y authTag de 16. Wire format: `base64(iv || tag || ciphertext)`.
- Requiere `ENCRYPTION_KEY` (64 chars hex). Generar con `openssl rand -hex 32`.
- Helpers: `encrypt`, `decrypt`, `encryptFields`, `decryptFields`, `decryptRow`.
- Las columnas plaintext (`amount`, `note`, `monthly_target`, `auto_amount`, `current_amount`, etc.) se mantienen pero quedan en placeholder (0 o null). Los valores reales viven en `enc_data text` (JSON cifrado).
- Tablas con `enc_data`: **transactions**, **goals**, **loans**, **debts** (creadas en `003_add_enc_columns.sql`).
- En reads server-side: `decryptRow(row)` mergea los campos descifrados sobre la fila. En writes: `encryptFields({ amount, note })` construye el blob.
- Migración one-shot: `scripts/migrate-encrypt.ts`. Solo correr si hay datos legacy en plaintext.
- **Nunca cambiar la `ENCRYPTION_KEY` de un entorno con data**. Pierde acceso a todo lo cifrado.

## Integración con Gemini (escaneo de tickets/PDFs)

- Modelo: **`gemini-2.5-flash`** vía REST (`v1beta/models/.../generateContent`). Sin SDK — fetch directo desde `lib/gemini.ts`.
- Free tier de Google AI Studio. **Sin billing configurado** — Google nos rate-limita ellos si nos pasamos.
- Server-side only. La key (`GEMINI_API_KEY`) **nunca** sale del server. El flow del cliente es:
  1. Usuario sube imagen/PDF en `ScanTransactionDialog` (cámara, galería o file picker).
  2. Cliente convierte a base64 y llama Server Action `extractTransactionFromImage(base64, mimeType)`.
  3. Server valida mime/tamaño, chequea rate limit, llama Gemini con `responseSchema` (forzando JSON), valida cada item.
  4. Devuelve `{ ok: true, data: { transactions: ExtractedTransaction[] } }` — siempre array.
- **Rate limit**: 20 invocaciones por usuario por rolling 24h, contadas en tabla `ai_usage` (1 row por llamada). Un PDF con 20 movimientos cuenta como **1 llamada**, no 20. La columna `n_extracted` es analytics, no afecta el límite.
- 429 / 503 de Google → `service_unavailable` y **no se cuenta** contra la cuota del usuario.
- UI:
  - 1 movimiento → abre `QuickAddTransaction` con prefill.
  - >1 movimientos → abre `BulkReviewTransactions` con todos los items, checkbox por fila, edición inline.
  - Bulk insert via Server Action `createManyTransactions(items)` que cifra cada uno y hace una sola `insert(arr)`.
- Soporta: PNG, JPG, WebP (≤4 MB) y PDF (≤10 MB).
- Mobile: el FAB scanner (`ScanLine`) en `/dashboard` y `/transactions` es la entrada principal. Tiene también link "Prefiero cargarlo a mano" → abre QuickAdd.
- Nunca persistimos la imagen ni el PDF — solo el resultado JSON.

## Sistema de tours (`components/feature-tour.tsx`)

- Tours one-shot con **driver.js v1.4** (instalado, sin SDK custom).
- Persistencia dual:
  - **DB**: `profiles.tours_seen JSONB NOT NULL DEFAULT '{}'` (formato `{ tour_key: ISO_timestamp }`). Sobrevive cross-device.
  - **localStorage**: `localStorage[\`tour_${tour_key}\`] = '1'`. Backup contra escrituras flaky a la DB.
- Server action: `markTourSeen(tourKey)` en `app/(app)/settings/actions.ts` (read-modify-write idempotente).
- Tema visual: `app/tour.css` con overrides de driver.js consumiendo tokens MFI (`--card`, `--primary`, etc.). Se importa en `app/layout.tsx`. La clase `mfi-tour` (popoverClass) scopea los selectors.
- TOUR_KEYs activos: **`image_upload_v1`** (uno solo).

### Cómo agregar un tour nuevo

1. Crear copia de `feature-tour.tsx` con TOUR_KEY nuevo, o extender el existente para que reciba el key como prop.
2. Agregar `data-tour="<selector>"` al elemento ancla (desktop y/o mobile distintos si hace falta).
3. En el cliente que lo monta, el componente lee `seenTours` del Profile y decide si correr.
4. No agregar más infra de DB — `tours_seen` es genérico para N keys.

## Currency handling

- ARS y USD son **monedas independientes**, sin conversión automática entre ellas.
- Display: `$ 1.000` (ARS), `U$S 100` (USD). Helpers en `lib/types.ts`: `formatCurrency`, `CURRENCY_SYMBOLS`.
- Locale `es-AR` vía `Intl.NumberFormat` y `Intl.DateTimeFormat`.
- En el dashboard, gastos ARS y USD comparten chart pero con ejes Y separados (3 axes).
- Spending distribution agrupa por `categoria + currency` para no mezclar valores.
- **Nunca sumar ARS + USD en un mismo número**. Si hace falta mostrar "total", hacer dos rows o mostrarlos por separado.

## Naming conventions

- **Páginas server**: `page.tsx` (fetch + render del client).
- **Clients**: `[feature]-client.tsx` con `'use client'`.
- **Mutaciones**: `actions.ts` con `'use server'` (uno por sección de ruta).
- **Componentes feature**: kebab-case en `components/` (`scan-transaction-dialog.tsx`).
- **Componentes UI**: kebab-case en `components/ui/`.
- **Privadas de sección**: `app/(app)/[ruta]/_components/` (subrayado prefija = no es ruta).
- **Tests**: `[modulo].test.ts` al lado del módulo en `lib/`.
- **Hooks**: `use-[name].ts` en `hooks/`.
- **Tipos**: todo en `lib/types.ts` (excepto los específicos de features que viven en su carpeta, p.ej. `lib/wrapped/types.ts`).
- **Path alias**: `@/*` → `./*` (configurado en `tsconfig.json` y `components.json`).

## Variables de entorno

Requeridas en `.env.local` (raíz, nunca commitear):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Key pública (cliente browser y SSR) |
| `SUPABASE_SERVICE_ROLE_KEY` | Key de servicio (admin client en `lib/supabase/server.ts` y migraciones) |
| `ENCRYPTION_KEY` | 64 chars hex para AES-256-GCM (ver `lib/crypto.ts`). **Única env var sensible no-Supabase**. Generar con `openssl rand -hex 32`. |
| `GEMINI_API_KEY` | API key de Google AI Studio para Gemini 2.5 Flash. Free tier sin billing. |

Opcionales:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | Override del redirect URL en dev (auth confirm/reset) |
| `NEXT_PUBLIC_SITE_URL` | Base URL para construir links de email (auth confirm/reset) |
| `NEXT_PUBLIC_DEBUG_PANELS` | `'true'` muestra paneles de debug en goals (`debug-panel.tsx`) |
| `NEXT_PUBLIC_WRAPPED_ENABLED` | Feature flag — activa el Wrapped mensual |
| `NEXT_PUBLIC_WRAPPED_DESKTOP` | Activa el Wrapped en desktop (default: solo mobile) |
| `NEXT_PUBLIC_WRAPPED_DEV` | Activa Wrapped en dev sin importar fecha |

> Nota: `SUPABASE_JWT_SECRET` no se usa en el código actual — quedó documentada como obligatoria en versiones previas pero no aparece en ningún `process.env`. Si se vuelve a necesitar para verificación de tokens custom, sumarla acá.

## Server Actions — mapa por archivo

| Archivo | Funciones exportadas |
|---|---|
| `app/auth/actions.ts` | `login`, `signUp`, `signOut`, `resetPassword`, `updatePassword` |
| `app/(app)/dashboard/actions.ts` | `createLoan`, `updateLoan`, `markLoanPaid`, `deleteLoan`, `createDebt`, `updateDebt`, `markDebtPaid`, `deleteDebt`, `fetchMonthlyReportData`, `fetchMonthlyWrappedData` |
| `app/(app)/transactions/actions.ts` | `createTransaction`, `updateTransaction`, `deleteTransaction`, `updateTransactionAmount`, `deleteManyTransactions`, `fetchInvestmentTransactions`, `fetchTransactions`, `fetchTransactionsForMonth`, `markCreditCardPaid`, `confirmAllPending`, `generateRecurringTransactions`, **`extractTransactionFromImage`**, **`createManyTransactions`** |
| `app/(app)/goals/actions.ts` | `createGoal`, `updateGoal`, `setGoalStatus`, `depositToGoal`, `liquidateGoal`, `deleteGoal` |
| `app/(app)/chat/actions.ts` | `ensureConversation`, `sendMessage`, `deleteMessage`, `markConversationRead` |
| `app/(app)/friends/actions.ts` | `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `cancelFriendRequest`, `removeFriend`, `blockUser`, `unblockUser`, `markFriendRequestNotificationsRead` |
| `app/(app)/admin/sugerencias/actions.ts` | `updateFeedbackStatus` |
| `app/(app)/settings/actions.ts` | `markTourSeen` |
| `app/actions/user.ts` | acciones app-wide de scope user |

## Integraciones externas

| Servicio | Wrapper | Endpoint | Auth |
|---|---|---|---|
| Gemini 2.5 Flash | `lib/gemini.ts` | `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` | `GEMINI_API_KEY` |
| Yahoo Finance | `app/api/market-proxy/route.ts` (proxy con whitelist) | `query1.finance.yahoo.com/v8/finance/chart/{TICKER}` | sin clave |
| DolarAPI | `lib/dolar-cotizacion.ts` | `dolarapi.com/v1/dolares` (MEP, Blue) | sin clave |
| CoinGecko | `lib/crypto-data.ts` | `api.coingecko.com/api/v3/coins/markets` | sin clave |
| datos.gob.ar | `lib/ar-datos.ts` | API pública AR | sin clave |
| Open-Meteo | `lib/weather.ts` | `api.open-meteo.com` | sin clave |

Solo Gemini y Supabase requieren credenciales privadas.

## Tests

- Vitest 4.1, sin script `npm test` declarado.
- Specs viven al lado del módulo en `lib/`. Hay 9 archivos `*.test.ts` (analytics-utils, ar-holidays, crypto-data, goals, investment-streak, market-data, non-trading-messages, usd-cotizacion, wrapped/compute).
- Comandos:
  ```bash
  npx vitest run                # one-shot
  npx vitest                    # watch
  npx vitest run lib/foo.test.ts  # archivo específico
  ```
- Idea de mejora: agregar `"test": "vitest run"` al `package.json` (no se hizo todavía — decisión del owner).

## Lockfiles

El repo tiene **dos lockfiles trackeados** simultáneamente:

- `package-lock.json` (npm)
- `pnpm-lock.yaml` (pnpm) — **es el que usa Netlify** (`pnpm install --frozen-lockfile`).

Cualquier `npm install` actualiza solo el de npm; el de pnpm queda atrás y rompe el deploy. **Regla operativa**: usar `pnpm install` para agregar/quitar deps. Pendiente decidir si se borra `package-lock.json` del repo.

## Key design decisions

- **Casi sin API routes**: solo el proxy de Yahoo Finance. Todo lo demás pasa por SDK Supabase (cliente o server) protegido por RLS, o por Server Actions cuando hace falta lógica server-side.
- **Sin tipos de cambio**: ARS y USD se tratan como monedas separadas. Nunca se suman.
- **Encriptación at-rest**: campos sensibles en transactions/goals/loans/debts viven en `enc_data` (AES-256-GCM). Plaintext columns son placeholders.
- **AI scanning con Gemini, server-side, free tier sin billing**: rate-limit propio en `ai_usage` (20 análisis/usuario/24h rolling). Una llamada cuenta 1, no importa cuántos movimientos extraiga.
- **Bulk insert de transactions vía Server Action**: para preservar la encriptación al cargar muchos movimientos a la vez. No se usa insert directo desde el browser para tablas con `enc_data`.
- **Onboarding tours con persistencia DB+localStorage**: `profiles.tours_seen JSONB` es genérico para N keys; localStorage es backup.
- **Modos `classic` vs `mfi`**: misma data, distinta UI. Se elige por `profiles.preferred_mode`.
- **Realtime para chat y community**: depende de `REPLICA IDENTITY FULL` en `messages`. No tocar sin entender.
- **Hidratación**: Recharts components que generan IDs deben ir guardados con `mounted` state.
- **`typescript.ignoreBuildErrors: true`** en `next.config.mjs`: tech debt intencional. No es excusa para dejar tipos rotos. No "arreglar" sin avisar — fix en código.
- **Reload after mutations** es OK como default; usar update local cuando el reload genera flicker visible (DashboardClient).

## Changelog y release

Al final de **toda sesión donde se modificó código**, correr el script no-interactivo:

```bash
node scripts/add-changelog.mjs patch "Descripción del cambio 1" "Descripción del cambio 2"
```

- Bumpea `package.json` y agrega entrada al inicio de `lib/changelog.ts`.
- Niveles: `patch` (default), `minor` (feature), `major` (breaking / hito).
- Entradas siempre en español es-AR, una por bullet, concisas.
- **Acumular entradas**: si una feature se desarrolla en varios turnos, no correr el script en cada turno — acumular y disparar una sola corrida al cerrar la feature.
- `npm run release` (interactivo: commit + push) **solo si el user lo pide explícitamente**.
- **Nunca editar `lib/changelog.ts` a mano**.

## Zonas sensibles / no tocar

- **`scripts/0XX_*.sql` ya aplicadas en prod**: nunca editarlas. Crear migraciones nuevas.
- **`lib/crypto.ts` + `ENCRYPTION_KEY`**: cambiar la key rompe descifrado de datos existentes.
- **`components/ui/`**: primitivas shadcn generadas. Editar a mano solo con cuidado; preferir regenerar.
- **`next.config.mjs`** con `ignoreBuildErrors: true`: tech debt intencional, no "arreglar" sin avisar.
- **`lib/changelog.ts`**: no editar a mano.
- **CLAUDE.md / app/CLAUDE.md / AGENT.md / README.md**: si cambia el contrato (rutas, env vars, schema, server actions), actualizar los cuatro.

## Upcoming / Coming Soon

- Transferencias entre cuentas
- Reportes financieros descargables más completos (PDF/CSV con más cortes)
- Notificaciones server-side (triggers o cron en Supabase)
- Tour de bienvenida para `/comunidad` y `/chat`
- Soporte para múltiples portfolios con divisas mixtas
- App mobile nativa (PWA-first ya, native eventualmente)
