import { copyFileSync, mkdirSync, rmSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { importDocx } from '../../../src/main/utils/docxImport'

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dest = path.join(here, '_import-out2')
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  const docx = path.join(dest, 'Fox.docx')
  copyFileSync(path.join(here, 'Fox-in-the-Snow.docx'), docx)

  const result = await importDocx(docx, { overwrite: true })
  console.log(result.markdown)
  console.log('role', result.role)
  console.log('geometry', result.geometry)
  console.log('warnings', result.warnings)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
