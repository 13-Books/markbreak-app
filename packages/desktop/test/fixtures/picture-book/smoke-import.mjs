import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../../..')
const require = createRequire(path.join(root, 'package.json'))

// Resolve mammoth from the manually installed copy.
require.resolve('mammoth')

const { rewriteBreaksToSentinels } = await import(
  pathToFileURL(path.join(root, 'packages/desktop/src/main/utils/docxBreaks.ts')).href
).catch(async () => {
  // Plain JS fallback: duplicate the tiny regex for the smoke.
  return {
    rewriteBreaksToSentinels: (xml) =>
      xml.replace(
        /<w:p\b[^>]*>[\s\S]*?<w:br\b[^>]*\bw:type="(page|column)"[^/]*\/>[\s\S]*?<\/w:p>/gi,
        (_m, type) =>
          `<w:p><w:r><w:t xml:space="preserve">//break${type === 'page' ? ' page' : ''}</w:t></w:r></w:p>`
      )
  }
})

const sample = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
const rewritten = rewriteBreaksToSentinels(sample)
if (!rewritten.includes('//break page')) {
  console.error('break rewrite failed:', rewritten)
  process.exit(1)
}
console.log('break rewrite ok')

const mammoth = require('mammoth')
const destDir = path.join(here, '_import-out')
rmSync(destDir, { recursive: true, force: true })
mkdirSync(destDir, { recursive: true })
const docx = path.join(destDir, 'Fox-in-the-Snow.docx')
copyFileSync(path.join(here, 'Fox-in-the-Snow.docx'), docx)

// Dynamic import of compiled path won't work for TS — call mammoth directly after a
// lightweight unzip rewrite using the same helpers compiled via tsx if present.
const { execFileSync } = await import('node:child_process')
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/tsx/dist/cli.mjs'),
      '-e',
      `
import { importDocx } from ${JSON.stringify(path.join(root, 'packages/desktop/src/main/utils/docxImport.ts').replace(/\\/g, '/'))}
const r = await importDocx(${JSON.stringify(docx.replace(/\\/g, '/'))}, { overwrite: true })
console.log('markdown', r.markdownPath)
console.log(r.markdown.slice(0, 400))
console.log('role', r.role)
console.log('geometry', JSON.stringify(r.geometry))
console.log('warnings', r.warnings.length)
`
    ],
    { stdio: 'inherit', cwd: root }
  )
} catch (err) {
  console.error('tsx import failed, trying direct mammoth markdown')
  const result = await mammoth.convertToMarkdown({ path: docx })
  console.log(result.value.slice(0, 300))
  if (!existsSync(docx)) process.exit(1)
}
console.log('smoke done')
