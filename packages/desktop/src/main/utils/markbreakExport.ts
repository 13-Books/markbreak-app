import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { app } from 'electron'

export interface BookPageMm {
  widthMm: number
  heightMm: number
  top: number
  right: number
  bottom: number
  left: number
}

const toMm = (value: number, unit: string): number => {
  if (unit === 'in') return value * 25.4
  if (unit === 'px') return value * 25.4 / 96
  return value
}

const expandMargins = (raw: unknown): [number, number, number, number] => {
  const parts = Array.isArray(raw) ? raw.map(Number) : [Number(raw)]
  if (parts.length <= 1 || Number.isNaN(parts[0])) {
    const v = Number.isNaN(parts[0]) ? 0 : parts[0]
    return [v, v, v, v]
  }
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]]
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]]
  return [parts[0], parts[1], parts[2], parts[3]]
}

/** Page trim from a RigWorks document, in millimetres. */
export const readBookPage = (rigPath: string | undefined): BookPageMm | null => {
  if (!rigPath || !existsSync(rigPath)) return null
  const rig = JSON.parse(readFileSync(rigPath, 'utf8')) as {
    document?: { defaultUnit?: string }
    entities?: Array<{ components?: Record<string, { width?: number, height?: number, unit?: string, margins?: unknown }> }>
  }
  const unit = rig.document?.defaultUnit || 'mm'
  for (const entity of rig.entities ?? []) {
    const page = entity.components?.['rig.layout.page']
    if (!page || page.width == null || page.height == null) continue
    const pageUnit = page.unit || unit
    const [top, right, bottom, left] = expandMargins(page.margins).map((n) => toMm(n, pageUnit))
    return {
      widthMm: toMm(page.width, pageUnit),
      heightMm: toMm(page.height, pageUnit),
      top, right, bottom, left
    }
  }
  return null
}

export const siblingRig = (pathname?: string): string | undefined => {
  if (!pathname) return undefined
  const rig = path.join(path.dirname(pathname), `${path.basename(pathname, path.extname(pathname))}.rig.json`)
  return existsSync(rig) ? rig : undefined
}

export const findExportScript = (): string | null => {
  const seeds = [process.cwd()]
  try {
    seeds.push(app.getAppPath())
  } catch {
    // The helper is also called before the app is ready.
  }
  const seen = new Set<string>()
  for (const seed of seeds) {
    let dir = seed
    for (let i = 0; i < 8; i++) {
      if (!dir || seen.has(dir)) break
      seen.add(dir)
      const candidate = path.join(dir, 'dialect', 'export.sh')
      if (existsSync(candidate)) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return null
}

/**
 * Git for Windows bash. The `bash` on PATH is often the WSL stub, which cannot
 * open the Win32 paths this export receives.
 */
const windowsBash = (): string | null => {
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const candidates = [
    path.join(programFiles, 'Git', 'bin', 'bash.exe'),
    path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
    'C:\\msys64\\usr\\bin\\bash.exe'
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Docx or PDF through dialect/export.sh, which owns the filter and the page. */
export const writeWithProfile = async(
  markdown: string,
  format: 'docx' | 'pdf',
  outFile: string,
  rigFile?: string
): Promise<void> => {
  const script = findExportScript()
  if (!script) throw new Error('dialect/export.sh not found')
  const bash = process.platform === 'win32' ? windowsBash() : 'bash'
  if (!bash) throw new Error('Git Bash was not found. Docx and PDF export runs dialect/export.sh.')
  const dir = await mkdtemp(path.join(tmpdir(), 'mb-export-'))
  const manuscript = path.join(dir, 'manuscript.md')
  await writeFile(manuscript, markdown.replace(/\r\n?/g, '\n'), 'utf8')
  const args = [script, '--input', manuscript, '--format', format, '--out', outFile]
  if (rigFile) args.push('--rig', rigFile)
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bash, args, { windowsHide: true })
      let output = ''
      proc.stdout.on('data', (chunk: Buffer | string) => { output += chunk.toString() })
      proc.stderr.on('data', (chunk: Buffer | string) => { output += chunk.toString() })
      proc.on('error', reject)
      proc.on('close', (code: number | null) => {
        if (code === 0) resolve()
        else reject(new Error(output.trim() || `export.sh exited with code ${String(code)}`))
      })
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
