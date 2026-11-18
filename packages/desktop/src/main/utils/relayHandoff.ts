import { existsSync } from 'fs'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { writeWithProfile, siblingRig } from './markbreakExport'
import { parseBookFrontMatter } from 'common/bookFrontMatter'

export interface RelayHandoffResult {
  folder: string
  docxPath: string
  files: string[]
}

const RELAY_CANDIDATES = (): string[] => {
  const env = process.env.MARKBREAK_RELAY || process.env.RELAY_PATH
  const list: string[] = []
  if (env) list.push(env)
  // Sibling checkout next to markbreak-app / RigKit monorepo layouts.
  list.push(
    path.resolve(process.cwd(), '..', 'Relay', 'build', 'Relay.exe'),
    path.resolve(process.cwd(), '..', 'Relay', 'out', 'Relay.exe'),
    path.resolve(process.cwd(), '..', 'Relay', 'Relay.exe')
  )
  return list
}

export const findRelayBinary = (): string | null => {
  for (const candidate of RELAY_CANDIDATES()) {
    if (candidate && existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Write a Relay handoff folder beside the manuscript: MarkBreak docx, layout,
 * meta, book.css, and linked art. Optionally launch Relay with --open.
 */
export const writeRelayHandoff = async(
  markdown: string,
  sourcePath: string,
  options: { open?: boolean; folderName?: string } = {}
): Promise<RelayHandoffResult> => {
  const sourceDir = path.dirname(sourcePath)
  const stem = path.basename(sourcePath, path.extname(sourcePath))
  const folder = path.join(sourceDir, options.folderName || `${stem}-relay`)
  await mkdir(folder, { recursive: true })

  const fm = parseBookFrontMatter(markdown)
  const files: string[] = []

  const docxPath = path.join(folder, `${stem}.docx`)
  const rig = siblingRig(sourcePath) ||
    (fm.layout ? path.join(sourceDir, fm.layout) : undefined)
  await writeWithProfile(markdown, 'docx', docxPath, rig, sourcePath)
  files.push(docxPath)

  const copyBeside = async(rel: string | undefined, destName: string) => {
    if (!rel) return
    const from = path.join(sourceDir, rel)
    if (!existsSync(from)) return
    const dest = path.join(folder, destName)
    await mkdir(path.dirname(dest), { recursive: true })
    await copyFile(from, dest)
    files.push(dest)
  }

  await copyBeside(fm.layout || (existsSync(path.join(sourceDir, 'layout.rig.json')) ? 'layout.rig.json' : undefined), 'layout.rig.json')
  await copyBeside(fm.meta || (existsSync(path.join(sourceDir, 'meta.md')) ? 'meta.md' : undefined), 'meta.md')

  const cssName = fm.stylesheet || 'book.css'
  const cssPath = path.join(sourceDir, cssName)
  if (existsSync(cssPath)) {
    await copyFile(cssPath, path.join(folder, 'book.css'))
    files.push(path.join(folder, 'book.css'))
  }

  // Copy art/ and any image folders referenced relatively.
  for (const name of ['art', `${stem}-images`]) {
    const from = path.join(sourceDir, name)
    if (!existsSync(from)) continue
    // Shallow copy of files in the folder.
    const { readdir } = await import('fs/promises')
    const destDir = path.join(folder, name)
    await mkdir(destDir, { recursive: true })
    for (const entry of await readdir(from)) {
      const src = path.join(from, entry)
      const dest = path.join(destDir, entry)
      await copyFile(src, dest)
      files.push(dest)
    }
  }

  // Keep a copy of the manuscript too for update-from-source.
  const mdOut = path.join(folder, `${stem}.md`)
  await writeFile(mdOut, markdown, 'utf8')
  files.push(mdOut)

  if (options.open) {
    const relay = findRelayBinary()
    if (relay) {
      spawn(relay, ['--open', docxPath], { detached: true, stdio: 'ignore' }).unref()
    }
  }

  return { folder, docxPath, files }
}

/** Re-export into an existing handoff folder (Phase 6). */
export const updateRelayHandoff = async(
  markdown: string,
  sourcePath: string,
  handoffFolder: string
): Promise<RelayHandoffResult> => {
  const sourceDir = path.dirname(sourcePath)
  const relative = path.relative(sourceDir, handoffFolder)
  return writeRelayHandoff(markdown, sourcePath, {
    open: false,
    folderName: relative || path.basename(handoffFolder)
  })
}

export const readSiblingBookCss = async(sourcePath: string | undefined): Promise<string | null> => {
  if (!sourcePath) return null
  const fm = parseBookFrontMatter(await readFile(sourcePath, 'utf8').catch(() => ''))
  const name = fm.stylesheet || 'book.css'
  const cssPath = path.join(path.dirname(sourcePath), name)
  if (!existsSync(cssPath)) return null
  return readFile(cssPath, 'utf8')
}
