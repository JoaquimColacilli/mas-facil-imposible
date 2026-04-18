/**
 * Returns two UUIDs in lexicographic ascending order.
 * Used for friendship/conversation/block pair lookups so that (A,B) and (B,A)
 * resolve to the same canonical row in the DB.
 *
 * UUIDs are compared as strings — JS's default string ordering matches the
 * Postgres `<` operator on UUID type, so the result is consistent end-to-end.
 */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}
