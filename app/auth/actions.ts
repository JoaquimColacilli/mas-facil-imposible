'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Whitelist of paths that may receive a ?next=... post-login redirect.
// Anything else is rejected to prevent open redirect attacks.
const ALLOWED_NEXT_PREFIXES = ['/add/', '/friends/', '/chat/'] as const

function safeNext(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  // Block protocol-relative and absolute URLs.
  if (raw.startsWith('//') || raw.includes('://')) return null
  if (!raw.startsWith('/')) return null
  if (!ALLOWED_NEXT_PREFIXES.some((prefix) => raw.startsWith(prefix))) return null
  return raw
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = safeNext(formData.get('next'))

  const { error, data: authData } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')

  // Route based on profile preferences
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_mode, onboarding_completed')
      .eq('id', authData.user.id)
      .single()

    if (!profile?.onboarding_completed) {
      // Onboarding takes precedence over `next` — the user can revisit the
      // invitation link after finishing setup.
      redirect('/onboarding')
    }
    if (next) {
      redirect(next)
    }
    if (profile?.preferred_mode === 'mfi') {
      redirect('/mfi')
    }
  }

  redirect('/dashboard')
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/confirm`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/verify-email')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  // Route based on profile preferences
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_mode, onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed) {
      redirect('/onboarding')
    }
    if (profile?.preferred_mode === 'mfi') {
      redirect('/mfi')
    }
  }

  redirect('/dashboard')
}
