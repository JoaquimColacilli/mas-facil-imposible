import { canonicalPair } from './canonical-pair'

export { canonicalPair }

/**
 * Server-side friendship lookup. Pass an authenticated Supabase client.
 * Returns true if a friendship row exists between the two users.
 */
export async function isFriends(
  supabase: { from: (table: string) => any },
  a: string,
  b: string,
): Promise<boolean> {
  const [user_a_id, user_b_id] = canonicalPair(a, b)
  const { data } = await supabase
    .from('friendships')
    .select('user_a_id')
    .eq('user_a_id', user_a_id)
    .eq('user_b_id', user_b_id)
    .maybeSingle()
  return !!data
}
