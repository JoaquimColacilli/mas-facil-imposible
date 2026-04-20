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
  show_streak: boolean
  show_badges: boolean
  show_bio: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Shape of public.profiles_public (DB view).
 * Only safe-to-expose columns. Returned when looking up other users.
 * - `bio` is already filtered server-side: returns null when show_bio=false.
 * - `show_streak` / `show_badges` are returned as-is so the consumer
 *   decides whether to fetch streak/badges.
 * Never use Profile for cross-user reads.
 */
export interface PublicProfile {
  id: string
  username: string | null
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  show_streak: boolean
  show_badges: boolean
  is_discoverable: boolean
  last_seen_at: string | null
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

/** Payload when type='friend_loan_request' — sender pidió confirmación del debt contrapartida. */
export interface FriendLoanRequestNotificationData {
  type: 'friend_loan_request'
  loan_id: string
  sender_id: string
  sender_username: string | null
  currency: Currency
}

/** Payload when type='friend_debt_request' — sender pidió confirmación del loan contrapartida. */
export interface FriendDebtRequestNotificationData {
  type: 'friend_debt_request'
  debt_id: string
  sender_id: string
  sender_username: string | null
  currency: Currency
}

// ─── Chat (Fase 4) ───────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  user_a_id: string
  user_b_id: string
  last_message_at: string | null
  user_a_last_read_at: string | null
  user_b_last_read_at: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  deleted_at: string | null
  edited_at: string | null
  read_at: string | null
  reply_to_message_id: string | null
  /** Snapshot del mensaje quoted. Null si no hay reply, o si el quoted fue
   *  hard-deleted (FK ON DELETE SET NULL → reply_to_message_id = null). */
  reply_to: ReplyToSnapshot | null
}

export interface ReplyToSnapshot {
  id: string
  sender_id: string
  /** Null si el mensaje quoted está soft-deleted (deleted_at != null). */
  body: string | null
  deleted_at: string | null
}

/**
 * Shape of the `last_message` JSONB column in `conversation_summaries`.
 * `body` is null when the message is soft-deleted (the view collapses it
 * server-side so the client never sees deleted content).
 */
export interface LastMessagePreview {
  id: string
  sender_id: string
  body: string | null
  created_at: string
  deleted_at: string | null
}

/** Shape of `public.conversation_summaries` (DB view). Per-viewer. */
export interface ConversationSummary {
  id: string
  user_a_id: string
  user_b_id: string
  last_message_at: string | null
  created_at: string
  peer_id: string
  my_last_read_at: string | null
  unread_count: number
  last_message: LastMessagePreview | null
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
  friend_id: string | null
  linked_debt_id: string | null
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
  friend_id: string | null
  linked_loan_id: string | null
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
