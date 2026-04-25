import type { WrappedPersonalityId } from '@/lib/types'

export interface PersonalityInput {
  /** Total ARS income for the month (confirmed only). */
  income: number
  /** Total ARS expense for the month (confirmed only). */
  expense: number
  /** Total ARS savings transactions for the month. */
  savings: number
  /** Total ARS investment transactions for the month. */
  investment: number
  /** Delta % of total expense vs previous month (-100..+inf). 0 if no prev data. */
  expenseDeltaVsPrev: number
  /** ARS amount spent on "social-ish" categories this month. */
  socialSpend: number
  /** Total transaction count in the month. */
  movementCount: number
}

/**
 * Derive the user's wrapped personality for the month.
 *
 * Rules (in priority order):
 *  1. Austero:    expense dropped 18%+ vs previous month AND movementCount < 25.
 *  2. Inversor:   investment > savings AND (investment + savings) > 0.
 *  3. Ahorrista:  (savings + investment) / income >= 0.20.
 *  4. Social:     socialSpend >= 25% of total expense.
 *  5. Equilibrado: default — ni te privaste ni te pasaste.
 *
 * Edge cases: income = 0 → skip rule 3. No previous month data → rule 1 is
 * suppressed (we cannot claim "menos que nunca" without a baseline).
 */
export function derivePersonality(input: PersonalityInput): WrappedPersonalityId {
  const {
    income,
    expense,
    savings,
    investment,
    expenseDeltaVsPrev,
    socialSpend,
    movementCount,
  } = input

  const apartado = savings + investment

  if (expenseDeltaVsPrev <= -18 && movementCount < 25) return 'austero'
  if (investment > savings && apartado > 0) return 'inversor'
  if (income > 0 && apartado / income >= 0.2) return 'ahorrista'
  if (expense > 0 && socialSpend / expense >= 0.25) return 'social'
  return 'equilibrado'
}

/**
 * Build the short stat shown under the personality description (the "micro" line).
 * Chosen to support the derived personality rather than contradict it.
 */
export function buildPersonalityMicro(
  id: WrappedPersonalityId,
  input: PersonalityInput,
): string {
  const { income, expense, savings, investment, expenseDeltaVsPrev, socialSpend } =
    input
  const apartado = savings + investment
  const fmtRound = (n: number) => new Intl.NumberFormat('es-AR').format(Math.round(n))

  switch (id) {
    case 'ahorrista': {
      const pct = income > 0 ? Math.round((apartado / income) * 100) : 0
      return `${pct}% ahorrado`
    }
    case 'inversor': {
      const pct = apartado > 0 ? Math.round((investment / apartado) * 100) : 0
      return `${pct}% a inversiones`
    }
    case 'social': {
      const pct = expense > 0 ? Math.round((socialSpend / expense) * 100) : 0
      return `${pct}% a social`
    }
    case 'equilibrado':
      return 'balance 50/30/20'
    case 'austero':
      return `${fmtRound(expenseDeltaVsPrev)}% en gastos`
  }
}

/** Category names whose spend counts toward "social" spending. Lowercase. */
export const SOCIAL_CATEGORY_KEYWORDS = [
  'delivery',
  'salida',
  'salidas',
  'restaurante',
  'restaurant',
  'bar',
  'boliche',
  'cine',
  'entretenimiento',
  'ocio',
  'viaje',
  'turismo',
  'regalos',
]

export function isSocialCategory(name: string | null | undefined): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return SOCIAL_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw))
}
