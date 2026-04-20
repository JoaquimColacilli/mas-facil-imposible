import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'community-media'
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB — enforced client-side; infra cap is ~50 MB default.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export type UploadOutcome =
  | { ok: true; url: string }
  | { ok: false; reason: string }

function extFrom(file: File): string {
  const byName = file.name.split('.').pop()?.toLowerCase()
  if (byName && /^[a-z0-9]{2,5}$/.test(byName)) return byName
  const byMime = file.type.split('/')[1]
  return byMime && /^[a-z0-9]{2,5}$/.test(byMime) ? byMime : 'bin'
}

/**
 * Uploads a single image to the community-media bucket and returns its
 * public URL. Path: `{user_id}/{uuid}.{ext}` — matches the bucket RLS.
 */
export async function uploadCommunityImage(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadOutcome> {
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, reason: 'Formato no soportado (JPG, PNG, WEBP o GIF).' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: 'La imagen no puede superar 8 MB.' }
  }
  const ext = extFrom(file)
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    return { ok: false, reason: uploadError.message }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

/** Best-effort delete by public URL — used when the user removes an image
 * they just uploaded but before/after saving. Failures are swallowed. */
export async function deleteCommunityImageByUrl(
  supabase: SupabaseClient,
  url: string,
): Promise<void> {
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const path = url.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([path])
}
