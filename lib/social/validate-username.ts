import { normalizeUsername } from './normalize-username'
import { isReservedUsername } from './reserved-usernames'

export type UsernameValidationError =
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'invalid_format'
  | 'reserved'

export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; code: UsernameValidationError; error: string }

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/
const ALLOWED_CHARS_REGEX = /^[a-z0-9_]+$/

/**
 * Validates and normalizes a username candidate.
 * - Lowercases input before checking (case-insensitive).
 * - Enforces 3-20 chars, [a-z0-9_], and no leading/trailing underscore.
 * - Rejects reserved words (e.g. "admin", "mfi").
 *
 * Pure: no DB calls. Availability is checked separately against profiles_public.
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const value = normalizeUsername(raw).toLowerCase()

  if (value.length < 3) {
    return { ok: false, code: 'too_short', error: 'Mínimo 3 caracteres.' }
  }
  if (value.length > 20) {
    return { ok: false, code: 'too_long', error: 'Máximo 20 caracteres.' }
  }
  if (!ALLOWED_CHARS_REGEX.test(value)) {
    return {
      ok: false,
      code: 'invalid_chars',
      error: 'Solo letras minúsculas, números y guión bajo.',
    }
  }
  if (!USERNAME_REGEX.test(value)) {
    return {
      ok: false,
      code: 'invalid_format',
      error: 'El username no puede empezar ni terminar con guión bajo.',
    }
  }
  if (isReservedUsername(value)) {
    return { ok: false, code: 'reserved', error: 'Este username está reservado.' }
  }

  return { ok: true, normalized: value }
}
