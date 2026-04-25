import catalog from './equivalents.json'

export interface WrappedEquivalentSource {
  label: string
  emoji: string
  avgARS: number
}

export interface WrappedEquivalentPicked {
  emoji: string
  n: number
  label: string
  ref: number
}

export const EQUIVALENTS_CATALOG: Record<string, WrappedEquivalentSource> =
  catalog as Record<string, WrappedEquivalentSource>

/**
 * Pick 3 equivalents for a given ARS amount.
 *
 * Rules:
 *  - Keep only items whose `ratio = amount / ref` lands in [minRatio, maxRatio].
 *    Defaults 5–400 avoid "0,3 asados" (ridiculous) and "8000 subtes" (illegible).
 *  - Prefer variety: distinct emojis are picked first.
 *  - Deterministic tie-break: higher `ref` first (bigger-ticket items first).
 *  - Returns up to 3 items. Falls back to widening the ratio window if nothing fits,
 *    so extreme months still get an answer (empty arrays would break the slide).
 */
export function pickEquivalents(
  amount: number,
  opts: {
    minRatio?: number
    maxRatio?: number
    max?: number
    catalog?: Record<string, WrappedEquivalentSource>
  } = {},
): WrappedEquivalentPicked[] {
  const {
    minRatio = 5,
    maxRatio = 400,
    max = 3,
    catalog: src = EQUIVALENTS_CATALOG,
  } = opts

  if (amount <= 0) return []

  const tryWindow = (lo: number, hi: number): WrappedEquivalentPicked[] => {
    const candidates = Object.values(src)
      .map((it) => ({ ...it, n: Math.round(amount / it.avgARS) }))
      .filter((it) => it.n >= lo && it.n <= hi)
      .sort((a, b) => b.avgARS - a.avgARS)

    const picked: WrappedEquivalentPicked[] = []
    const usedEmojis = new Set<string>()
    for (const c of candidates) {
      if (picked.length >= max) break
      if (usedEmojis.has(c.emoji)) continue
      picked.push({ emoji: c.emoji, n: c.n, label: c.label, ref: c.avgARS })
      usedEmojis.add(c.emoji)
    }
    return picked
  }

  let picks = tryWindow(minRatio, maxRatio)
  if (picks.length === max) return picks

  // Widen progressively if we didn't fill the slot.
  if (picks.length < max) picks = tryWindow(2, 2000)
  if (picks.length < max) picks = tryWindow(1, 20000)
  return picks.slice(0, max)
}
