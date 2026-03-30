// ─── Database entity types ────────────────────────────────────────────────────

export type Currency = 'ARS' | 'USD'
export type TransactionType = 'expense' | 'income' | 'savings' | 'investment'
export type TransactionStatus = 'confirmed' | 'pending' | 'cancelled'
export type GoalStatus = 'active' | 'completed' | 'paused'
export type NotificationType = 'info' | 'warning' | 'success' | 'alert'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  default_currency: Currency
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  type: TransactionType
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  currency: Currency
  date: string
  note: string | null
  status: TransactionStatus
  created_at: string
  updated_at: string
  // joined
  category?: Category | null
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  currency: Currency
  deadline: string | null
  color: string
  icon: string
  status: GoalStatus
  created_at: string
  updated_at: string
}

export interface Loan {
  id: string
  user_id: string
  person_name: string
  amount: number
  currency: Currency
  note: string | null
  date: string
  paid: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  created_at: string
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  savings: 'Ahorro',
  investment: 'Inversión',
}

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  expense: 'text-red-500',
  income: 'text-emerald-500',
  savings: 'text-blue-500',
  investment: 'text-violet-500',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  ARS: '$',
  USD: 'U$S',
}

export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  return `${symbol} ${formatted}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
