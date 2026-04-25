# `app/` — MFI Route & Component Guide

Detalle de rutas y componentes de la capa App Router. Para arquitectura general, env vars, schema y políticas, ver [CLAUDE.md](../CLAUDE.md) en la raíz.

## Route groups

### `(app)/` — Rutas protegidas

Wrap compartido por `(app)/layout.tsx` (renderiza AppShell): DesktopSidebar (≥ md), MobileBottomNav (< md), AppTopbar, Toaster Sonner, WhatsNewModal, TosReacceptanceModal y mounts de presence/realtime.

Todas redirigen a `/auth/login` si no hay user (enforced por `middleware.ts`).

| Ruta | Descripción |
|---|---|
| `/dashboard` | Inicio: KPIs, área chart mensual, recent tx, FAB scanner mobile |
| `/transactions` | Lista paginada con filtros + bulk + scanner FAB |
| `/goals` y `/goals/[id]` | Metas con detalle individual |
| `/analytics` | Análisis financiero con period selector |
| `/investments` | Portfolios + chart de evolución (TWR) + heatmap |
| `/notifications` | Centro de notificaciones |
| `/settings` | Perfil + privacy + account |
| `/friends` y `/friends/[username]` | Grafo social |
| `/chat` y `/chat/[userId]` | Chat 1-a-1 |
| `/comunidad` y `/comunidad/[postId]` | Feed social tipo Reddit |
| `/admin/sugerencias` | Panel feedback (admin) |

### `mfi/` — Rutas protegidas (modo MFI)

UI alternativa estilo planilla. Mismo dominio de datos, mismo middleware. El usuario elige modo en `profiles.preferred_mode`. Carpetas: `mfi/`, `mfi/analytics/`, `mfi/goals/`, `mfi/settings/`, `mfi/transactions/`.

### `auth/` — Rutas públicas

Sin layout wrapper. Páginas: `login/`, `register/`, `forgot-password/`, `verify-email/`. Server actions en `auth/actions.ts`: `login`, `signUp`, `signOut`, `resetPassword`, `updatePassword`.

### Otras rutas públicas

| Ruta | Descripción |
|---|---|
| `/legal/privacy`, `/legal/tos` | Documentos legales |
| `/add/[username]` | Landing pública de invitación, deep link a /friends |
| `/api/market-proxy` | Única API route (whitelist Yahoo Finance) |

### Rutas que requieren auth pero no son `(app)/`

- `/onboarding` — flow de usuarios nuevos. Se sale cuando `profile.onboarding_completed = true`.

### Routing inicial (`app/page.tsx`)

```
sin user                                  → /auth/login
user && !onboarding_completed             → /onboarding
user && profile.preferred_mode === 'mfi'  → /mfi
user (default)                            → /dashboard
```

---

## Páginas en `(app)/`

Patrón estándar:

```
[ruta]/
├── page.tsx               # server component — fetch + render
├── [ruta]-client.tsx      # client component — interactividad
├── actions.ts             # server actions (opcional)
├── loading.tsx            # skeleton (opcional)
├── error.tsx              # error boundary (opcional)
└── _components/           # privadas de la sección (opcional)
```

### `/dashboard`

`page.tsx` fetcha en paralelo: profile, transactions del mes, goals activas (limit 3), loans, debts, portfolios, savings cumulativos, allPending. También llama `generateRecurringTransactions(month)` (idempotente) cuando es el mes actual.

`DashboardClient` renderiza:
- Greeting + month navigator (`?month=YYYY-MM`)
- 5 KPI cards: Balance Total, Ingresos, Gastos, Ahorros, Inversiones
- Monthly Overview area chart (3 ejes Y: ingresos ARS, gastos ARS visible, gastos USD hidden)
- Recent transactions list (last 8) con inline edit
- Right panel: Quick Actions, Pending Debts, Pending Loans, Market card
- Mobile FAB scanner (`ScanLine`) con `data-tour="quick-add-trigger"` — ancla del onboarding tour
- `<FeatureTour seenTours={toursSeen} />` montado solo en dashboard

### `/transactions`

Lista paginada con búsqueda, filtros múltiples (tipo / moneda / status / payment method / fecha), grouping por fecha, modals de creación / edición. Mismo FAB scanner mobile que dashboard pero sin el ancla de tour.

### `/goals` y `/goals/[id]`

`/goals/_components/` privadas: GoalsHero, GoalCard, GoalsFilters, EmptyState, CreateGoalModal, DepositModal, LiquidateGoalModal, primitivas (Ring, Sparkline, CatBadge, ProgressBar, Confetti). Detalle por meta en `/goals/[id]/goal-detail-client.tsx` con timeline, depositos, liquidación.

### `/analytics`

Period selector con chips, toggle de moneda, KPI cards con sparklines y deltas vs período anterior, breakdown de categorías, top movimientos, savings rate. Descarga PDF.

### `/investments`

Pantalla dedicada de inversiones. Selector de período (1S, 1M, 3M, 6M, YTD, 1A, Max), KPIs con TWR (Time-Weighted Return), holdings por portfolio, donut de composición, heatmap de rendimientos mensuales, creación/variación/rescate de portfolios. Descarga PDF.

### `/comunidad`

Feed estilo Reddit. Categorías hardcoded: `inversiones`, `ahorros`, `dolar`, `plazosfijos`, `cripto`, `gastos`, `metas`, `preguntas`. Posts con embeds (txn, goal, wrapped), votos, comentarios threaded con replies, mentions con `@`, rich text editor (TipTap), upload de imágenes a Supabase Storage. Realtime via SWR polling + signals server-side. Tablas en `003_community.sql` y migraciones siguientes.

### `/chat` y `/chat/[userId]`

Chat 1-a-1 entre amigos. Inbox con conversation summaries (vista materializada `conversation_summaries`), conversación con typing indicator, presence dot, replies con quote, soft delete, idempotencia (client_message_id), realtime via Supabase Realtime con `REPLICA IDENTITY FULL`.

### `/friends` y `/friends/[username]`

Tabs: Friends, Suggested, Requests, Search, Blocked. Profile detail por username. RLS expone solo `profiles_public` view (filtra por privacy flags).

### `/notifications`

Centro de notificaciones con tipos: `info | warning | success | alert`. Soporta payloads JSON con discriminadores: friend_request_received, friend_loan_request, friend_debt_request, community_vote, community_comment, community_reply, community_mention. Mark as read individual o masivo.

### `/settings`

`SettingsClient` + `SocialProfileCard` + `DataPrivacyCard` + `UsernamePicker`. Maneja perfil base, privacy flags (`show_streak`, `show_badges`, `show_bio`, `is_discoverable`), location, mood, default_currency. Cambio de contraseña.

### `/admin/sugerencias`

Solo admin. Panel para revisar feedback enviado vía `FeedbackModal`.

### `/onboarding`

Flow multi-paso para usuarios nuevos. Marca `profile.onboarding_completed = true` al terminar. Acepta TOS y privacy.

---

## Layout y shells

- **`app/layout.tsx`** (root): fuentes Sora / DM Sans / DM Mono, ThemeProvider (next-themes), Vercel Analytics, metadata, viewport. Importa `./globals.css` y `./tour.css` (theming driver.js).
- **`app/(app)/layout.tsx`** (`AppShell`): sidebar + topbar + Toaster + WhatsNewModal + TosReacceptanceModal + mounts (`HeartbeatMount`, `SocialRealtimeMount`) para presence/realtime.

---

## Componentes compartidos en `components/`

### Movimientos

- `quick-add-transaction.tsx` — modal de carga manual. Acepta prop `initial?: Partial<ExtractedTransaction>` para prefill (post-scan). Prop `onBulkExtracted` para handear el caso de scan que devuelve >1. Botón interno "Cargar desde imagen o PDF" abre `ScanTransactionDialog` desde dentro del modal (entrada secundaria).
- `edit-transaction-modal.tsx` — edita o elimina. Callbacks `onSaved` / `onDeleted`.
- `scan-transaction-dialog.tsx` — escaneo Gemini. Mobile: dual-button (cámara con `capture="environment"` + file picker que acepta PDF). Desktop: drop-zone + paste de clipboard. Soporta PNG/JPG/WebP (≤4 MB) y PDF (≤10 MB). Prop `onManualEntry` muestra link "Prefiero cargarlo a mano" para no perder la entrada manual en mobile.
- `bulk-review-transactions.tsx` — revisión multi-tx para resúmenes de tarjeta. Lista con checkbox, edición inline, sticky footer "Guardar N movimientos". Llama Server Action `createManyTransactions` para insertar todo en una sola operación cifrada.
- `category-manager.tsx` — sheet de CRUD de categorías.
- `pending-transactions-bar.tsx`, `pending-loans.tsx`, `pending-debts.tsx` — widgets de pendientes en dashboard.

### Tours / onboarding

- `feature-tour.tsx` — wrapper de driver.js. TOUR_KEY hardcoded `image_upload_v1`. Lee `seenTours` (de profile), persiste en `profiles.tours_seen` via `markTourSeen` y en localStorage. Anchors:
  - desktop: `[data-tour="image-upload-button"]` (botón "Desde imagen" del header)
  - mobile: `[data-tour="quick-add-trigger"]` (FAB scanner)

### Mercado y widgets

- `market-card.tsx` — MERVAL + 9 acciones AR + crypto con sparklines. Auto-refresh 5 min con pausa en background.
- `usd-cotizacion-widget.tsx` — Dólar MEP/Blue.
- `ar-datos-widget.tsx`, `weather-clock-widget.tsx` — widgets contextuales del topbar/dashboard.
- `mfi-portfolio-widget.tsx`, `investment-streak-widget.tsx` — widgets de inversiones.
- `monthly-summary-banner.tsx`, `month-alerts-banner.tsx` — banners contextuales en dashboard.

### Social / community / chat

- `friends-topbar-button.tsx`, `friend-request-button.tsx`, `friend-picker.tsx`
- `messages-topbar-button.tsx`, `chat-composer.tsx`, `message-bubble.tsx`
- `typing-indicator.tsx`, `presence-dot.tsx`, `read-receipt.tsx`, `day-separator.tsx`
- `linked-badge.tsx`, `settle-propagate-dialog.tsx` — para loans/debts entre amigos
- `user-hover-card.tsx`
- `social-realtime-mount.tsx`, `heartbeat-mount.tsx` — montados en `(app)/layout.tsx`

### UX modals globales

- `whats-new-modal.tsx` — popup de changelog cuando `profile.last_seen_version < currentVersion`.
- `tos-reacceptance-modal.tsx` — fuerza re-aceptación cuando cambia versión de TOS/privacy.
- `username-setup-modal.tsx` — fuerza setear username si está null.
- `feedback-modal.tsx` — formulario de sugerencias.
- `command-palette.tsx` — Cmd+K.

### Theming y nav

- `nav.tsx` — `DesktopSidebar` (≥ md, sticky) + `MobileBottomNav` (< md, fixed bottom). Quick-add via custom event `'open-quick-add'` (escuchado por DashboardClient).
- `app-topbar.tsx` — notifications popover (SWR 30s polling) + user dropdown + theme toggle + topbar buttons (friends, messages).
- `app-shell.tsx`, `mfi-shell.tsx` — wrappers de layout.
- `theme-provider.tsx`, `theme-toggle.tsx`.

---

## Server Actions — resumen por archivo

| Archivo | Funciones |
|---|---|
| `auth/actions.ts` | login, signUp, signOut, resetPassword, updatePassword |
| `(app)/dashboard/actions.ts` | createLoan, updateLoan, markLoanPaid, deleteLoan, createDebt, updateDebt, markDebtPaid, deleteDebt, fetchMonthlyReportData, fetchMonthlyWrappedData |
| `(app)/transactions/actions.ts` | createTransaction, updateTransaction, deleteTransaction, updateTransactionAmount, deleteManyTransactions, fetchInvestmentTransactions, fetchTransactions, fetchTransactionsForMonth, markCreditCardPaid, confirmAllPending, generateRecurringTransactions, **extractTransactionFromImage**, **createManyTransactions** |
| `(app)/goals/actions.ts` | createGoal, updateGoal, setGoalStatus, depositToGoal, liquidateGoal, deleteGoal |
| `(app)/chat/actions.ts` | ensureConversation, sendMessage, deleteMessage, markConversationRead |
| `(app)/friends/actions.ts` | sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeFriend, blockUser, unblockUser, markFriendRequestNotificationsRead |
| `(app)/admin/sugerencias/actions.ts` | updateFeedbackStatus |
| `(app)/settings/actions.ts` | markTourSeen |
| `app/actions/user.ts` | acciones app-wide de scope user |

---

## Patrones de chart

### Area chart (Dashboard Monthly Overview)

- Recharts `AreaChart` + `Area`.
- 3 series: `income`, `expenses` (ARS), `expensesUSD`.
- 3 ejes Y: `yAxisId="income"` (left), `yAxisId="expenses"` (right visible), `yAxisId="expensesUSD"` (right hidden, auto-scale).
- Custom tooltip con símbolo de moneda correcto.
- Data en `buildChartData(transactions, 'YYYY-MM')`.

### Spending donut

- Recharts `PieChart` + `Pie`.
- Render solo client-side con `mounted` state (Recharts genera IDs sequenciales que mismatchean SSR/CSR).
- Agrupado por `categoria + currency`. USD entries etiquetadas como `"Categoría (USD)"`.
- Porcentaje calculado por moneda independiente.

### Investments evolution chart

- TWR (Time-Weighted Return) excluyendo cashflows.
- Línea punteada para base invertida.
- Markers azules/naranjas por aporte/rescate.
- Tooltip muestra valor, base, cambio del día y P&L acumulado.

---

## State management — patrones después de mutaciones

1. **Reload completo**: `window.location.reload()` — usado en QuickAdd, BulkReview, ScanDialog post-success.
2. **Update local**: `setTransactions(prev => …)` — usado en DashboardClient para edits/deletes inline.
3. **SWR revalidación**: notificaciones, market data.
4. **Router refresh**: `router.refresh()` en post-mutation cuando hay data server-side que recompone la página.

No hay un patrón único — seguir el del componente vecino.

---

## Hidratación con Recharts

Cualquier component que genere IDs internos (PieChart, LineChart con gradients, etc.) debe ir guardado:

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
return mounted ? <PieChart …/> : null
```

---

## Realtime y polling

- **Realtime** (Supabase Realtime, websockets): chat (`messages` con REPLICA IDENTITY FULL), presence, social signals. Hooks: `use-presence`, `use-social-realtime`, `use-typing`, `use-messages`, `use-heartbeat`.
- **Polling** (SWR): notifications cada 30s, market cada 5 min con pausa en background. Hook genérico: `use-polling`.

---

## Supabase usage en `app/`

### Server (page.tsx, actions.ts)

```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/auth/login')
```

### Client (*-client.tsx)

```ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
await supabase.from('categories').insert({ … })
```

### Queries clave

- Transactions siempre con scope de mes: `.gte('date', startOfMonth).lte('date', endOfMonth)`.
- Todas con scope de user: `.eq('user_id', user.id)` — RLS además lo enforcea.
- Categories joinadas: `.select('*, category:categories(*)')`.
- Tablas con `enc_data` requieren `decryptRow(row)` después del select. Insert: `encryptFields({ amount, note })` antes.
