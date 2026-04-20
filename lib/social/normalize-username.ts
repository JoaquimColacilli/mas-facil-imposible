/**
 * Normalizes a username input by stripping leading `@` characters and trimming
 * whitespace. Idempotent: `joaco` → `joaco`, `@joaco` → `joaco`,
 * `@@joaco` → `joaco`, ` @joaco ` → `joaco`.
 *
 * Does NOT validate format — use validateUsername() for that. This helper only
 * tolerates users typing `@` even when the UI already shows a visual prefix.
 */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '')
}
