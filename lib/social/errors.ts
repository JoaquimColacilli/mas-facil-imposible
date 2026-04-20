// Mapping from RPC-thrown error codes (PG `RAISE EXCEPTION '<code>'`) to
// Spanish (es-AR) user-facing messages. Reused by server actions and any
// component that needs to display the same message.

export const SOCIAL_ERROR_MESSAGES_ES_AR: Record<string, string> = {
  not_found: 'No encontramos a ese usuario.',
  self: 'No podés agregarte a vos mismo.',
  already_friends: 'Ya son amigos.',
  pending_exists: 'Ya hay una solicitud pendiente con ese usuario.',
  not_receiver: 'No podés aceptar esta solicitud.',
  not_pending: 'Esta solicitud ya no está pendiente.',
  unauthenticated: 'Tenés que iniciar sesión.',
  invalid: 'Operación inválida.',
  // Chat (Fase 4)
  not_friends: 'Ya no son amigos. No podés enviar mensajes en esta conversación.',
  rate_limited: 'Estás enviando mensajes muy seguido. Esperá un momento.',
  empty: 'El mensaje no puede estar vacío.',
  too_long: 'El mensaje supera el límite de 4000 caracteres.',
  // Chat reply (Fase 8)
  invalid_reply_target: 'El mensaje al que querés responder ya no existe.',
}

export function getSocialErrorMessage(code: string | null | undefined): string {
  if (!code) return 'Algo salió mal. Probá de nuevo.'
  return SOCIAL_ERROR_MESSAGES_ES_AR[code] ?? 'Algo salió mal. Probá de nuevo.'
}

/**
 * Extracts the symbolic error code from a Supabase RPC error.
 * Our RPCs raise with `USING ERRCODE = 'P0001'` and the code goes into the
 * error message verbatim. Supabase surfaces it as `error.message`.
 */
export function extractRpcCode(error: { message?: string } | null | undefined): string | null {
  if (!error?.message) return null
  // Postgres prefixes raise messages with no surrounding noise — but Supabase
  // sometimes wraps as "Error: <message>". Strip leading "Error:".
  const cleaned = error.message.replace(/^Error:\s*/i, '').trim()
  // Our codes are simple identifiers, not full sentences — guard against weird
  // wrapping by matching the pattern.
  if (/^[a-z_]+$/.test(cleaned)) return cleaned
  return null
}
