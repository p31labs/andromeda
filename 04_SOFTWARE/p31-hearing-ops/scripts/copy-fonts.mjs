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

const sgWeights = [400, 500, 600, 700, 800]
for (const w of sgWeights) {
  const base = `space-grotesk-latin-${w}-normal.woff2`
  const src = path.join(sgFiles, base)
  if (!copyIfExists(src, `space-grotesk-${w}.woff2`) && w === 800) {
    const fallback = path.join(sgFiles, 'space-grotesk-latin-700-normal.woff2')
    copyIfExists(fallback, 'space-grotesk-800.woff2')
  }
}

const jbWeights = [400, 500, 600, 700]
for (const w of jbWeights) {
  const base = `jetbrains-mono-latin-${w}-normal.woff2`
  copyIfExists(path.join(jbFiles, base), `jetbrains-mono-${w}.woff2`)
}

console.log('[copy-fonts] done → public/fonts')
