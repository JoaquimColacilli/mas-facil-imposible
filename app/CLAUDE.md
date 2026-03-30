# app/ — MFI Route & Component Guide

This directory contains all Next.js App Router routes. See the root `CLAUDE.md` for full project context.

## Route Groups

### `(app)/` — Protected routes
Wrapped in a shared layout (`(app)/layout.tsx`) that renders:
- **DesktopSidebar** — left nav on `xl+` screens (logo, nav items, quick-add button, user section)
- **MobileBottomNav** — bottom tab bar on `< xl` screens
- **AppTopbar** — top bar with theme toggle, notifications popover, user dropdown

All routes here redirect to `/auth/login` if the user is unauthenticated (enforced by `middleware.ts`).

### `auth/` — Public routes
No layout wrapper. Plain pages for login, register, forgot password, verify email.

---

## Pages in `(app)/`

Each route follows the same pattern:

```
[route]/
├── page.tsx           # Server component — fetches data, renders *Client
└── [route]-client.tsx # Client component — all interactivity
```

### `/dashboard`
**page.tsx** fetches in parallel:
- `profiles` — user profile (full_name, default_currency)
- `transactions` — for the selected month (`?month=YYYY-MM`, defaults to current)
- `goals` — active goals (limit 3)
- `loans` — all loans for the user

**DashboardClient** renders:
- Greeting + month navigator (`?month=YYYY-MM` query param)
- 5 KPI cards: Balance Total, Ingresos, Gastos, Ahorros, Inversiones
- Monthly Overview area chart — daily income vs ARS expenses vs USD expenses
  - Left Y-axis: income (ARS)
  - Right Y-axis: expenses ARS (visible)
  - Hidden Y-axis: expenses USD (auto-scaled, shows as dashed orange line)
- Recent transactions list (last 8) with inline edit
- Right panel: Quick Actions, Spending Distribution donut, Pending Loans

### `/transactions`
Full transaction list with:
- Search by note/category
- Filter by type (all / income / expense / savings / investment)
- Grouped by date
- Add / Edit / Delete via modals

### `/goals`
Goals management:
- Create goal (name, target_amount, currency, deadline, color, icon)
- Progress bar (current_amount / target_amount)
- Deposit modal to add funds to a goal
- Mark as completed / paused

### `/analytics`
6-month financial overview. Uses Recharts for trend charts.

### `/notifications`
Notification center — list, mark as read, mark all as read.

### `/settings`
User profile settings — full_name, default_currency, avatar. Account management.

---

## Shared Components

Located in `components/` (project root, not in `app/`).

### `quick-add-transaction.tsx`
Modal triggered from dashboard and sidebar. Fields:
- type (expense / income / savings / investment)
- amount, currency (ARS / USD)
- date
- category (combobox with inline create)
- note
- status (confirmed / pending / cancelled)

Uses Supabase browser client to insert. On success: `window.location.reload()`.

### `edit-transaction-modal.tsx`
Same fields as QuickAdd but pre-filled. Supports delete. On save/delete: calls `onSaved(updated)` or `onDeleted(id)` callback — the parent (DashboardClient) updates local state to avoid a full reload.

### `category-manager.tsx`
Sheet/dialog to create, edit, delete categories. Each category has:
- name, type, icon (Lucide icon name), color (hex)

Triggered from the transactions list header. Uses browser client directly.

### `pending-loans.tsx`
Right panel widget on dashboard. Shows unpaid loans. "Marcar como cobrado" button updates `paid = true` via browser client.

### `nav.tsx`
Exports two components:
- `DesktopSidebar` — visible on `xl+`, sticky
- `MobileBottomNav` — visible on `< xl`, fixed bottom

Quick-add button in sidebar dispatches a `'open-quick-add'` custom event listened by DashboardClient.

### `app-topbar.tsx`
- Notifications popover using SWR with 30s polling
- User dropdown (email display + sign out)
- Theme toggle

---

## `auth/actions.ts` — Server Actions

All are `'use server'` functions:

| Function | Description |
|----------|-------------|
| `login(formData)` | `signInWithPassword`, redirects to `/dashboard` |
| `signUp(formData)` | Creates user, sends verification email |
| `signOut()` | Clears session, redirects to `/auth/login` |
| `resetPassword(formData)` | Sends password reset email |
| `updatePassword(formData)` | Sets new password (after reset flow) |

---

## Chart Patterns

### Area Chart (Dashboard Monthly Overview)
- Library: Recharts `AreaChart` + `Area`
- 3 series: `income`, `expenses` (ARS), `expensesUSD`
- 3 Y-axes: `yAxisId="income"` (left), `yAxisId="expenses"` (right, visible), `yAxisId="expensesUSD"` (right, `hide`)
- The hidden USD axis auto-scales so USD amounts are always visible regardless of ARS scale
- Custom tooltip (`ChartTooltip`) shows values with correct currency symbol
- Data built by `buildChartData(transactions, 'YYYY-MM')`

### Spending Donut (Dashboard)
- Library: Recharts `PieChart` + `Pie`
- **Must render client-side only** — wrap with `{mounted && <PieChart>}` to avoid hydration mismatch (Recharts generates sequential clip IDs that differ between SSR and CSR)
- Data built by `buildSpendingData(transactions)` — groups by `category + currency`
- USD entries labeled as `"CategoryName (USD)"` to distinguish from ARS entries
- Percentage calculated per-currency (ARS % of ARS total, USD % of USD total)

---

## State Management Patterns

### After mutations
Most client components use one of these strategies after a successful Supabase write:

1. **Full reload**: `window.location.reload()` — simple, used in QuickAddTransaction
2. **Local state update**: `setTransactions(prev => ...)` — used in DashboardClient for edits/deletes (avoids reload flicker)
3. **SWR revalidation**: Used in AppTopbar for notifications

### Hydration-sensitive components
Any Recharts component that generates internal IDs (PieChart, etc.) must be guarded:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
// ...
{mounted && <PieChart ...>}
```

---

## Supabase Usage in App

### Server (page.tsx)
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
await supabase.from('transactions').insert({ ... })
```

### Key queries
- Transactions always scoped to month: `.gte('date', startOfMonth).lte('date', endOfMonth)`
- All queries scoped to user: `.eq('user_id', user.id)` (RLS also enforces this)
- Categories joined in transactions: `.select('*, category:categories(*)')`
