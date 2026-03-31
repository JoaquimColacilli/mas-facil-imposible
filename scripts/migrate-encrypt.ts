/**
 * One-time migration: encrypt existing plaintext data in Supabase.
 *
 * Prerequisites:
 *   1. Run scripts/003_add_enc_columns.sql in the Supabase SQL editor.
 *   2. Set ENCRYPTION_KEY, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY
 *      in your .env.local (or export them in the shell).
 *
 * Run:
 *   npx dotenv -e .env.local -- npx tsx scripts/migrate-encrypt.ts
 *
 * The script is idempotent: rows that already have enc_data are skipped.
 * After verifying everything looks correct in the app, the original plaintext
 * columns (amount, note, person_name, name) will contain dummy values (0 / null)
 * and the real data lives in enc_data.
 */

import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes } from 'crypto'

// ── Inline encrypt (no Next.js imports needed in standalone script) ─────────

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY env var is missing or invalid. ' +
        'Must be a 64-character hex string. Generate with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

function encryptFields(fields: Record<string, unknown>): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = JSON.stringify(fields)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

// ── Supabase admin client ─────────────────────────────────────────────────────

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key)
}

// ── Migration helpers ─────────────────────────────────────────────────────────

async function migrateTable<T extends Record<string, any>>(
  supabase: ReturnType<typeof getAdminClient>,
  table: string,
  sensitiveFields: (keyof T)[],
  dummyValues: Partial<T>,
) {
  console.log(`\n── ${table} ──`)
  const { data, error } = await supabase.from(table).select('*')
  if (error) { console.error(`  fetch error: ${error.message}`); return }

  let skipped = 0
  let migrated = 0
  let failed = 0

  for (const row of data ?? []) {
    if (row.enc_data) { skipped++; continue }

    const fields: Record<string, unknown> = {}
    for (const f of sensitiveFields) {
      fields[f as string] = row[f as string]
    }

    let enc_data: string
    try {
      enc_data = encryptFields(fields)
    } catch (e) {
      console.error(`  [${row.id}] encrypt error:`, e)
      failed++
      continue
    }

    const update: Record<string, unknown> = { enc_data, ...dummyValues }
    const { error: updateError } = await supabase
      .from(table)
      .update(update)
      .eq('id', row.id)

    if (updateError) {
      console.error(`  [${row.id}] update error: ${updateError.message}`)
      failed++
    } else {
      migrated++
    }
  }

  console.log(`  migrated: ${migrated}  skipped (already enc): ${skipped}  failed: ${failed}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('MFI encrypt migration starting...')
  const supabase = getAdminClient()

  await migrateTable(supabase, 'transactions', ['amount', 'note'], {
    amount: 0,
    note: null,
  })

  await migrateTable(supabase, 'goals', ['name', 'target_amount', 'current_amount'], {
    name: '[encrypted]',
    target_amount: 0,
    current_amount: 0,
  })

  await migrateTable(supabase, 'loans', ['person_name', 'amount', 'note'], {
    person_name: '[encrypted]',
    amount: 0,
    note: null,
  })

  await migrateTable(supabase, 'debts', ['person_name', 'amount', 'note'], {
    person_name: '[encrypted]',
    amount: 0,
    note: null,
  })

  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
