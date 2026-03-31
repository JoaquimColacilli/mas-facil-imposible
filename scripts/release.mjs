import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

const changelogPath = path.join(process.cwd(), 'lib', 'changelog.ts')

async function run() {
  console.log('\n🚀 Bienvenido al CLI de Realease de MFI\n')

  const versionType = await question('¿Qué tipo de cambio es? (patch [enter], minor, major): ')
  const type = versionType.trim() || 'patch'

  console.log('Ingresa las novedades (features/arreglos). Escribe "fin" en una nueva línea para terminar.')
  const lines = []
  while (true) {
    const line = await question('- ')
    if (line.trim().toLowerCase() === 'fin') break
    if (line.trim()) lines.push(line.trim())
  }

  if (lines.length === 0) {
    console.log('No ingresaste cambios. Abortando.')
    process.exit(0)
  }

  console.log(`\nBumping version (${type})...`)
  const newVersionStr = execSync(`npm version ${type} --no-git-tag-version`).toString().trim()
  const newVersion = newVersionStr.startsWith('v') ? newVersionStr.slice(1) : newVersionStr

  console.log(`Nueva versión: ${newVersion}`)

  // Update changelog
  const date = new Date().toISOString().split('T')[0]
  const newEntry = `  {
    version: '${newVersion}',
    date: '${date}',
    changes: [
${lines.map(l => `      '${l.replace(/'/g, "\\'")}'`).join(',\n')}
    ]
  },`

  let changelogContent = fs.readFileSync(changelogPath, 'utf8')
  changelogContent = changelogContent.replace('export const changelog = [', `export const changelog = [\n${newEntry}`)
  fs.writeFileSync(changelogPath, changelogContent)

  console.log('Changelog actualizado.')

  // Commit and Push
  console.log('Haciendo commit y push...')
  execSync('git add .')
  execSync(`git commit -m "chore: release v${newVersion}"`)
  execSync('git push')

  console.log(`\n✅ Release v${newVersion} lanzado con éxito!\n`)
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
