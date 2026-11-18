import { existsSync } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import { rewriteBreaksToSentinels } from './docxBreaks'
import { unzipDocx, zipDocx } from './docxZip'

// mammoth ships convertToMarkdown; the published .d.ts omits it and Image.altText.
const mammothApi = mammoth as typeof mammoth & {
  convertToMarkdown: typeof mammoth.convertToHtml
}
type MammothImage = {
  contentType: string
  altText?: string
  readAsBuffer: () => Promise<Buffer>
}

const ROLE_STYLE_RE = /^Role[\s-]?(.+)$/i
const ORIGINAL_PATH_RE = /(?:^|\b)original:([^\s|]+)/i

export interface DocxPageGeometry {
  widthMm: number
  heightMm: number
  top: number
  right: number
  bottom: number
  left: number
  facing: boolean
  binding: 'left' | 'right'
}

export interface DocxMeta {
  title?: string
  author?: string
  language?: string
}

export interface DocxImportResult {
  markdown: string
  markdownPath: string
  layoutPath?: string
  metaPath?: string
  imagesDir?: string
  role?: string
  warnings: string[]
  geometry?: DocxPageGeometry
  meta?: DocxMeta
}

const twipsToMm = (twips: number): number => twips * 25.4 / 1440

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`${name}="([^"]+)"`, 'i').exec(tag)
  return m ? m[1] : null
}

/** Page size / margins / facing from the final sectPr (inverse of export.sh updateSectionXml). */
export const readGeometryFromDocumentXml = (xml: string): DocxPageGeometry | undefined => {
  const sectMatches = [...xml.matchAll(/<w:sectPr\b[^>]*>([\s\S]*?)<\/w:sectPr>/gi)]
  if (sectMatches.length === 0) return undefined
  const last = sectMatches[sectMatches.length - 1][1]
  const pgSz = /<w:pgSz\b([^>]*)\/?>/i.exec(last)
  const pgMar = /<w:pgMar\b([^>]*)\/?>/i.exec(last)
  if (!pgSz || !pgMar) return undefined
  const w = Number(attr(pgSz[1], 'w:w'))
  const h = Number(attr(pgSz[1], 'w:h'))
  const top = Number(attr(pgMar[1], 'w:top'))
  const right = Number(attr(pgMar[1], 'w:right'))
  const bottom = Number(attr(pgMar[1], 'w:bottom'))
  const left = Number(attr(pgMar[1], 'w:left'))
  if (![w, h, top, right, bottom, left].every((n) => Number.isFinite(n))) return undefined
  const facing = /<w:mirrorMargins\s*\/>/i.test(last)
  return {
    widthMm: Math.round(twipsToMm(w) * 100) / 100,
    heightMm: Math.round(twipsToMm(h) * 100) / 100,
    top: Math.round(twipsToMm(top) * 100) / 100,
    right: Math.round(twipsToMm(right) * 100) / 100,
    bottom: Math.round(twipsToMm(bottom) * 100) / 100,
    left: Math.round(twipsToMm(left) * 100) / 100,
    facing,
    binding: 'left'
  }
}

export const readMetaFromCoreXml = (xml: string | undefined): DocxMeta => {
  if (!xml) return {}
  const grab = (tag: string): string | undefined => {
    const m = new RegExp(`<(?:dc:|cp:)?${tag}[^>]*>([^<]*)</(?:dc:|cp:)?${tag}>`, 'i').exec(xml)
    return m?.[1]?.trim() || undefined
  }
  return {
    title: grab('title'),
    author: grab('creator'),
    language: grab('language')
  }
}

export const buildLayoutRig = (geometry: DocxPageGeometry, title?: string): string => {
  const entities: unknown[] = []
  if (geometry.facing) {
    entities.push({
      id: 'facing',
      components: {
        'rig.layout.facing': { enabled: true, binding: geometry.binding }
      }
    })
  }
  entities.push({
    id: 'page',
    components: {
      'rig.meta.named': { name: 'Trim', stableId: 'page' },
      'rig.layout.page': {
        index: 0,
        width: geometry.widthMm,
        height: geometry.heightMm,
        unit: 'mm',
        margins: [geometry.top, geometry.right, geometry.bottom, geometry.left],
        bleed: 3
      }
    }
  })
  return `${JSON.stringify({
    rig: '1.6.0',
    document: { title: title || 'Imported book', defaultUnit: 'mm' },
    entities
  }, null, 2)}\n`
}

export const buildMetaMd = (meta: DocxMeta): string => {
  const lines = ['---']
  if (meta.title) lines.push(`title: ${JSON.stringify(meta.title)}`)
  if (meta.author) lines.push(`author: ${JSON.stringify(meta.author)}`)
  if (meta.language) lines.push(`language: ${meta.language}`)
  lines.push('---', '')
  return `${lines.join('\n')}\n`
}

const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Role chapter'] => p.role-chapter:fresh",
  "p[style-name='RoleChapter'] => p.role-chapter:fresh",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em"
].join('\n')

const readRoleFromDocumentXml = (xml: string): string | undefined => {
  const m = /w:val="Role[\s-]?([A-Za-z]+)"/i.exec(xml)
  return m?.[1]?.toLowerCase()
}

const extractRole = (html: string, markdown: string): string | undefined => {
  const fromClass = /class="[^"]*role-([a-z]+)/i.exec(html)
  if (fromClass) return fromClass[1].toLowerCase()
  const fromStyle = /Role[\s-]?([A-Za-z]+)/.exec(markdown)
  if (fromStyle) return fromStyle[1].toLowerCase()
  return undefined
}

const normalizeSentinelLines = (markdown: string): string => {
  return markdown
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (t === '//break' || t === '//break page' || t === '//break odd' || t === '//break even') {
        return t
      }
      return line
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

const injectFrontMatter = (
  body: string,
  opts: { role?: string; meta?: string; layout?: string }
): string => {
  const stripped = body.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '')
  const lines = ['---']
  if (opts.role) lines.push(`role: ${opts.role}`)
  if (opts.meta) lines.push(`meta: ${opts.meta}`)
  if (opts.layout) lines.push(`layout: ${opts.layout}`)
  lines.push('---', '', stripped.replace(/^\n+/, ''))
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

const rewriteImageAlts = (markdown: string): string => {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, url: string) => {
    const orig = ORIGINAL_PATH_RE.exec(alt)
    if (!orig) return full
    const cleanAlt = alt.replace(ORIGINAL_PATH_RE, '').replace(/\|\s*$/, '').trim()
    return `![${cleanAlt}](${orig[1]})`
  })
}

/**
 * Import a Word .docx as a MarkBreak manuscript beside it.
 * Writes `<stem>.md`, optional `layout.rig.json` / `meta.md`, and `<stem>-images/`.
 */
export const importDocx = async(
  docxPath: string,
  options: { overwrite?: boolean } = {}
): Promise<DocxImportResult> => {
  const warnings: string[] = []
  const abs = path.resolve(docxPath)
  const dir = path.dirname(abs)
  const stem = path.basename(abs, path.extname(abs))
  const markdownPath = path.join(dir, `${stem}.md`)
  const imagesDir = path.join(dir, `${stem}-images`)
  const layoutPath = path.join(dir, 'layout.rig.json')
  const metaPath = path.join(dir, 'meta.md')

  if (existsSync(markdownPath) && !options.overwrite) {
    throw new Error(`Refusing to overwrite ${markdownPath} (pass overwrite: true)`)
  }

  const raw = await readFile(abs)
  const files = unzipDocx(raw)
  const documentXml = files.get('word/document.xml')
  if (!documentXml) throw new Error('docx has no word/document.xml')

  const rewritten = rewriteBreaksToSentinels(documentXml.toString('utf8'))
  files.set('word/document.xml', Buffer.from(rewritten, 'utf8'))
  const patched = zipDocx(files)

  const geometry = readGeometryFromDocumentXml(rewritten)
  const meta = readMetaFromCoreXml(files.get('docProps/core.xml')?.toString('utf8'))

  await mkdir(imagesDir, { recursive: true })
  let imageIndex = 0

  const result = await mammothApi.convertToMarkdown(
    { buffer: patched },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement(async(rawImage) => {
        const image = rawImage as MammothImage
        imageIndex += 1
        const ext = (image.contentType.split('/')[1] || 'png').replace('jpeg', 'jpg')
        const preferred = image.altText ? ORIGINAL_PATH_RE.exec(image.altText)?.[1] : undefined
        const baseName = preferred
          ? path.basename(preferred)
          : `image-${String(imageIndex).padStart(2, '0')}.${ext}`
        const outName = baseName.includes('.') ? baseName : `${baseName}.${ext}`
        const outPath = path.join(imagesDir, outName)
        const buf = Buffer.from(await image.readAsBuffer())
        await writeFile(outPath, buf)
        const rel = path.relative(dir, outPath).replace(/\\/g, '/')
        const src = preferred || rel
        return { src }
      })
    }
  )

  for (const m of result.messages) {
    warnings.push(m.message)
  }

  let markdown = normalizeSentinelLines(result.value)
  markdown = rewriteImageAlts(markdown)

  const role = readRoleFromDocumentXml(rewritten) || extractRole('', markdown)
  if (role) {
    markdown = markdown.replace(/^\s*Role[\s-]?[A-Za-z]+\s*\n+/i, '')
  }

  let wroteLayout = false
  let wroteMeta = false
  if (geometry) {
    await writeFile(layoutPath, buildLayoutRig(geometry, meta.title), 'utf8')
    wroteLayout = true
  }
  if (meta.title || meta.author || meta.language) {
    await writeFile(metaPath, buildMetaMd(meta), 'utf8')
    wroteMeta = true
  }

  markdown = injectFrontMatter(markdown, {
    role,
    meta: wroteMeta ? 'meta.md' : undefined,
    layout: wroteLayout ? 'layout.rig.json' : undefined
  })

  await writeFile(markdownPath, markdown, 'utf8')

  void ROLE_STYLE_RE
  return {
    markdown,
    markdownPath,
    layoutPath: wroteLayout ? layoutPath : undefined,
    metaPath: wroteMeta ? metaPath : undefined,
    imagesDir: imageIndex > 0 ? imagesDir : undefined,
    role,
    warnings,
    geometry,
    meta
  }
}
