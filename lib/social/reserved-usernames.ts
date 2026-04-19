// Usernames blocked at signup/edit time. Stored as a Set for O(1) lookup.
// Extend this list as needed — adding entries does NOT invalidate existing
// usernames (the check runs only on new sets).

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'mfi',
  'api',
  'www',
  'root',
  'help',
  'support',
  'contact',
  'legal',
  'tos',
  'privacy',
  'about',
  'login',
  'signup',
  'auth',
  'dashboard',
  'settings',
  'onboarding',
  'add',
  'friends',
  'chat',
  'blog',
  'news',
  'docs',
  'staff',
  'team',
  'official',
])

export function isReservedUsername(value: string): boolean {
  return RESERVED_USERNAMES.has(value.toLowerCase())
}
