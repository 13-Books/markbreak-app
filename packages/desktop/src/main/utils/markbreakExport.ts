import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
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

export type ProfileExportFormat = 'docx' | 'pdf' | 'html' | 'icml'

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

/** Dialect root: packaged resources, then walk from cwd / app path (dev). */
export const findDialectRoot = (): string | null => {
  const candidates: string[] = []
  try {
    candidates.push(path.join(process.resourcesPath, 'dialect'))
  } catch {
    // Before ready / non-packaged.
  }
  try {
    candidates.push(path.join(app.getAppPath(), 'dialect'))
    candidates.push(path.join(app.getAppPath(), '..', '..', 'dialect'))
  } catch {
    // The helper is also called before the app is ready.
  }
  let dir = process.cwd()
  for (let i = 0; i < 8; i++) {
    candidates.push(path.join(dir, 'dialect'))
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'export.sh'))) return candidate
  }
  return null
}

export const findExportScript = (): string | null => {
  const root = findDialectRoot()
  return root ? path.join(root, 'export.sh') : null
}

export const findMarkbreakFilter = (): string | null => {
  const root = findDialectRoot()
  if (!root) return null
  const filter = path.join(root, 'markbreak', 'tools', 'markbreak.lua')
  return existsSync(filter) ? filter : null
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

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

const isSafeRelative = (rel: string): boolean =>
  !!rel && !rel.includes('..') && !path.isAbsolute(rel)

const stageRelativeFile = async(
  sourceDir: string,
  stagingDir: string,
  rel: string
): Promise<boolean> => {
  if (!isSafeRelative(rel)) return false
  const from = path.join(sourceDir, rel)
  if (!existsSync(from)) return false
  const dest = path.join(stagingDir, rel)
  await mkdir(path.dirname(dest), { recursive: true })
  await copyFile(from, dest)
  return true
}

/** Copy manuscript-relative meta/layout/spine files into the temp export folder. */
const stageLinkedAssets = async(
  markdown: string,
  sourcePath: string | undefined,
  stagingDir: string
): Promise<string> => {
  if (!sourcePath) return markdown
  const sourceDir = path.dirname(sourcePath)
  const match = FRONT_MATTER_RE.exec(markdown)
  if (!match) return markdown
  const yaml = match[1]
  for (const key of ['meta', 'layout'] as const) {
    const keyRe = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm')
    const hit = keyRe.exec(yaml)
    if (!hit) continue
    await stageRelativeFile(sourceDir, stagingDir, hit[1].trim())
  }
  // Spine entries (Markdown or CSV) must sit beside the staged root for the Lua filter.
  const spineBlock = /^spine:\s*\n((?:[ \t]+-[\s\S]*?)(?=\n[^\s]|\n*$))/m.exec(`\n${yaml}\n`)
  if (spineBlock) {
    for (const line of spineBlock[1].split('\n')) {
      const file = /file:\s*["']?([^"',}\n]+)["']?/.exec(line)
      if (!file) continue
      await stageRelativeFile(sourceDir, stagingDir, file[1].trim())
    }
  }
  return markdown
}

/** Docx, HTML, or PDF through dialect/export.sh, which owns the filter and the page. */
export const writeWithProfile = async(
  markdown: string,
  format: ProfileExportFormat,
  outFile: string,
  rigFile?: string,
  sourcePath?: string
): Promise<void> => {
  const script = findExportScript()
  if (!script) throw new Error('dialect/export.sh not found (is the dialect bundled?)')
  if (!findMarkbreakFilter()) {
    throw new Error('dialect/markbreak/tools/markbreak.lua not found (init the submodule or package dialect).')
  }
  const bash = process.platform === 'win32' ? windowsBash() : 'bash'
  if (!bash) throw new Error('Git Bash was not found. Profile export runs dialect/export.sh.')
  const dir = await mkdtemp(path.join(tmpdir(), 'mb-export-'))
  const manuscript = path.join(dir, 'manuscript.md')
  const normalized = markdown.replace(/\r\n?/g, '\n')
  const staged = await stageLinkedAssets(normalized, sourcePath, dir)
  await writeFile(manuscript, staged, 'utf8')
  const args = [script, '--input', manuscript, '--format', format, '--out', outFile]
  if (rigFile) args.push('--rig', rigFile)
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bash, args, { windowsHide: true, cwd: dir })
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
