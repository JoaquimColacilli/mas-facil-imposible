// ─── Database entity types ────────────────────────────────────────────────────

export type Currency = 'ARS' | 'USD'
export type TransactionType = 'expense' | 'income' | 'savings' | 'investment'
export type TransactionStatus = 'confirmed' | 'pending' | 'cancelled'
export type PaymentMethod = 'cash' | 'debit' | 'credit'
export type GoalStatus = 'active' | 'completed' | 'paused'
export type NotificationType = 'info' | 'warning' | 'success' | 'alert'

export type AppMode = 'classic' | 'mfi'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  nickname: string | null
  mood_emoji: string | null
  mood_text: string | null
  default_currency: Currency
  preferred_mode: AppMode
  onboarding_completed: boolean
  last_seen_version: string | null
  location_lat: number | null
  location_lng: number | null
  location_name: string | null
  location_timezone: string | null
  tos_accepted_at: string | null
  tos_version: string | null
  privacy_accepted_at: string | null
  privacy_version: string | null
  username: string | null
  username_changed_at: string | null
  is_discoverable: boolean
  bio: string | null
  created_at: string
  updated_at: string
}

/**
 * Shape of public.profiles_public (DB view).
 * Only safe-to-expose columns. Returned when looking up other users.
 * Never use Profile for cross-user reads.
 */
export interface PublicProfile {
  id: string
  username: string | null
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  is_discoverable: boolean
  created_at: string
}

// ─── Social graph (Fase 2) ───────────────────────────────────────────────────

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: FriendRequestStatus
  created_at: string
  updated_at: string
}

export interface Friendship {
  user_a_id: string
  user_b_id: string
  created_at: string
}

export interface Block {
  blocker_id: string
  blocked_id: string
  created_at: string
}

/** Payload stored in `notifications.data` when type='friend_request_received'. */
export interface FriendRequestNotificationData {
  type: 'friend_request_received'
  request_id: string
  sender_id: string
  sender_username: string | null
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
  payment_method: PaymentMethod | null
  sheet_id: string | null
  is_recurring: boolean
  recurring_source_id: string | null
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
  resolved_transaction_id: string | null
  created_at: string
  updated_at: string
}

export interface Debt {
  id: string
  user_id: string
  person_name: string // who you owe money to
  amount: number
  currency: Currency
  note: string | null
  date: string
  paid: boolean
  paid_at: string | null
  resolved_transaction_id: string | null
  created_at: string
  updated_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  currency: Currency
  balance: number
  created_at: string
}

export type PortfolioLogType = 'yield' | 'deposit' | 'rescue'

export interface PortfolioLog {
  id: string
  portfolio_id: string
  date: string
  percentage_change: number
  absolute_change: number
  new_balance: number
  // Optional until migration 009 is applied; the reader falls back to a heuristic.
  type: PortfolioLogType | null
  created_at: string
}

export interface MfiSheet {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  data: Record<string, any> | null
  created_at: string
}

export interface Feedback {
  id: string
  user_id: string
  message: string
  image_urls: string[]
  status: 'pending' | 'reviewed' | 'done'
  created_at: string
  profile?: {
    email: string
    full_name: string | null
  }
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

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
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
