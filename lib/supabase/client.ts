import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Singleton del cliente browser de Supabase.
 *
 * Sin esto, cada componente que llama createClient() instancia su propio
 * client con su propia instancia de auth, y todas compiten por el mismo
 * distributed lock para refrescar el token. Eso ensucia la consola con
 * "Lock stolen / Lock broken / orphaned lock" y, en redes lentas, puede
 * disparar refresh del token duplicados. React 19 Strict Mode lo amplifica
 * al montar componentes dos veces.
 */
let cached: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (cached) return cached
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return cached
}
