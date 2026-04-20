/**
 * Returns 1-2 uppercase initials for an avatar fallback.
 *
 * - "Joaquim Colacilli" → "JC"
 * - "joaquim"           → "JO"
 * - "A"                 → "A"
 * - null/undefined/""   → "?"
 *
 * Preference order at callsites: pass nickname first, then username, then "?".
 * Single-word inputs fall back to slicing 2 chars so usernames still look sane.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
