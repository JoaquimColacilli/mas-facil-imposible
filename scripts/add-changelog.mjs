/**
 * Non-interactive changelog updater for Claude to call automatically.
 *
 * Usage:
 *   node scripts/add-changelog.mjs [patch|minor|major] "Change description 1" "Change description 2" ...
 *
 * Example:
 *   node scripts/add-changelog.mjs patch "Agregado formateo de moneda en inputs" "Corregido changelog en dashboard clásico"
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const [, , type = 'patch', ...changes] = process.argv

if (changes.length === 0) {
  console.error('❌ No ingresaste cambios. Uso: node scripts/add-changelog.mjs [patch|minor|major] "Cambio 1" "Cambio 2"')
  process.exit(1)
}

if (!['patch', 'minor', 'major'].includes(type)) {
  console.error(`❌ Tipo inválido: "${type}". Debe ser patch, minor o major.`)
  process.exit(1)
}

// Bump version in package.json
const newVersionStr = execSync(`npm version ${type} --no-git-tag-version`, { cwd: root }).toString().trim()
const newVersion = newVersionStr.startsWith('v') ? newVersionStr.slice(1) : newVersionStr
console.log(`📦 Nueva versión: ${newVersion}`)

// Build new changelog entry
const date = new Date().toISOString().split('T')[0]
const changesStr = changes.map(c => `      '${c.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(',\n')
const newEntry = `  {
    version: '${newVersion}',
    date: '${date}',
    changes: [
${changesStr}
    ]
  },`

// Prepend entry to changelog array
const changelogPath = path.join(root, 'lib', 'changelog.ts')
let content = fs.readFileSync(changelogPath, 'utf8')
content = content.replace(
  'export const changelog: ChangelogEntry[] = [',
  `export const changelog: ChangelogEntry[] = [\n${newEntry}`
)
fs.writeFileSync(changelogPath, content)
console.log(`📋 lib/changelog.ts actualizado con ${changes.length} cambio(s).`)
console.log(`✅ v${newVersion} lista. Recordá hacer commit y push.`)
