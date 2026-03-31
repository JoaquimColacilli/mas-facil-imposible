/**
 * Server-only encryption utilities using AES-256-GCM.
 *
 * Requires ENCRYPTION_KEY env var: 64-char hex string (32 bytes).
 * Generate with:  openssl rand -hex 32
 *
 * Wire format: base64( iv[12] || authTag[16] || ciphertext )
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY env var is missing or invalid. ' +
        'Must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // iv(12) || authTag(16) || ciphertext → base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const key = getKey()
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

export function encryptFields(fields: Record<string, unknown>): string {
  return encrypt(JSON.stringify(fields))
}

export function decryptFields(ciphertext: string): Record<string, unknown> {
  return JSON.parse(decrypt(ciphertext))
}

/**
 * Merge decrypted enc_data fields into a DB row.
 * If enc_data is absent (legacy/unencrypted row) the row is returned as-is.
 * If decryption fails the row is returned as-is with a console warning.
 */
export function decryptRow<T extends { enc_data?: string | null }>(
  row: T,
): Omit<T, 'enc_data'> {
  const { enc_data, ...rest } = row as any
  if (!enc_data) return rest as Omit<T, 'enc_data'>
  try {
    const fields = decryptFields(enc_data)
    return { ...rest, ...fields } as Omit<T, 'enc_data'>
  } catch {
    console.warn('[crypto] decryptRow failed — returning plaintext fields')
    return rest as Omit<T, 'enc_data'>
  }
}
