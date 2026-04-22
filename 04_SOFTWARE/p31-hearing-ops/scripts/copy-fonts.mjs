import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const destDir = path.join(root, 'public', 'fonts')

function copyIfExists(src, destName) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-fonts] skip missing: ${src}`)
    return false
  }
  fs.copyFileSync(src, path.join(destDir, destName))
  return true
}

fs.mkdirSync(destDir, { recursive: true })

const sgFiles = path.join(root, 'node_modules', '@fontsource', 'space-grotesk', 'files')
const jbFiles = path.join(root, 'node_modules', '@fontsource', 'jetbrains-mono', 'files')

// @fontsource/space-grotesk does not always ship latin-800; alias 700 → 800 when missing.
const sgWeights = [400, 500, 600, 700]
for (const w of sgWeights) {
  const base = `space-grotesk-latin-${w}-normal.woff2`
  copyIfExists(path.join(sgFiles, base), `space-grotesk-${w}.woff2`)
}
{
  const w800 = path.join(sgFiles, 'space-grotesk-latin-800-normal.woff2')
  const dest800 = path.join(destDir, 'space-grotesk-800.woff2')
  if (fs.existsSync(w800)) {
    fs.copyFileSync(w800, dest800)
  } else {
    const w700 = path.join(sgFiles, 'space-grotesk-latin-700-normal.woff2')
    if (fs.existsSync(w700)) {
      fs.copyFileSync(w700, dest800)
      console.log('[copy-fonts] space-grotesk 800 → using 700 (package has no latin-800 woff2)')
    }
  }
}

const jbWeights = [400, 500, 600, 700]
for (const w of jbWeights) {
  const base = `jetbrains-mono-latin-${w}-normal.woff2`
  copyIfExists(path.join(jbFiles, base), `jetbrains-mono-${w}.woff2`)
}

console.log('[copy-fonts] done → public/fonts')
