import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { rewriteBreaksToSentinels } from '../../../src/main/utils/docxBreaks'
import {
  buildLayoutRig,
  buildMetaMd,
  importDocx,
  readGeometryFromDocumentXml,
  readMetaFromCoreXml
} from '../../../src/main/utils/docxImport'
import { unzipDocx } from '../../../src/main/utils/docxZip'
import { lintBookCss } from '../../../src/common/cssLint'
import { effectivePpi, isLowPrintPpi } from '../../../src/common/imagePpi'
import {
  applyBookFrontMatter,
  parseBookFrontMatter
} from '../../../src/common/bookFrontMatter'

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../fixtures/picture-book'
)

describe('docx breaks pre-pass', () => {
  it('turns page and column breaks into sentinel paragraphs', () => {
    const xml = `
      <w:body>
        <w:p><w:r><w:t>A</w:t></w:r></w:p>
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>
        <w:p><w:r><w:t>B</w:t></w:r></w:p>
        <w:p><w:r><w:br w:type="column"/></w:r></w:p>
        <w:p><w:pPr><w:sectPr><w:type w:val="oddPage"/></w:sectPr></w:pPr></w:p>
        <w:p><w:r><w:t>C</w:t></w:r></w:p>
      </w:body>`
    const out = rewriteBreaksToSentinels(xml)
    expect(out).toContain('//break page')
    expect(out).toContain('>//break<')
    expect(out).toContain('//break odd')
  })
})

describe('docx geometry and meta', () => {
  it('reads 250mm square page with facing from the Word fixture', () => {
    const buf = readFileSync(path.join(fixtureDir, 'Fox-in-the-Snow.docx'))
    const files = unzipDocx(buf)
    const xml = files.get('word/document.xml')!.toString('utf8')
    const geometry = readGeometryFromDocumentXml(xml)!
    expect(geometry.widthMm).toBeCloseTo(250, 0)
    expect(geometry.heightMm).toBeCloseTo(250, 0)
    expect(geometry.facing).toBe(true)
    const meta = readMetaFromCoreXml(files.get('docProps/core.xml')!.toString('utf8'))
    expect(meta.title).toBe('Fox in the Snow')
    expect(meta.author).toBe('MarkBreak Fixture')
    const rig = JSON.parse(buildLayoutRig(geometry, meta.title))
    expect(rig.entities.some((e: { components?: Record<string, unknown> }) =>
      e.components?.['rig.layout.page'])).toBe(true)
    expect(buildMetaMd(meta)).toContain('title: "Fox in the Snow"')
  })
})

describe('docx import', () => {
  it('imports the Word-saved fixture with breaks and images', async() => {
    const destDir = path.join(fixtureDir, '_import-out')
    const { mkdirSync, copyFileSync, rmSync, existsSync, readFileSync: read } = await import('fs')
    rmSync(destDir, { recursive: true, force: true })
    mkdirSync(destDir, { recursive: true })
    const docx = path.join(destDir, 'Fox-in-the-Snow.docx')
    copyFileSync(path.join(fixtureDir, 'Fox-in-the-Snow.docx'), docx)
    const result = await importDocx(docx, { overwrite: true })
    expect(existsSync(result.markdownPath)).toBe(true)
    const md = read(result.markdownPath, 'utf8')
    expect(md).toMatch(/role:\s*chapter/)
    expect(md).toContain('//break page')
    expect(md).toContain('//break odd')
    expect(md).toMatch(/Fox in the Snow/)
    expect(result.geometry?.widthMm).toBeCloseTo(250, 0)
    expect(result.layoutPath && existsSync(result.layoutPath)).toBe(true)
    expect(result.metaPath && existsSync(result.metaPath)).toBe(true)
  }, 30000)
})

describe('css lint', () => {
  it('reports the deliberately unmapped box-shadow in the fixture sheet', () => {
    const css = readFileSync(path.join(fixtureDir, 'book.css'), 'utf8')
    const issues = lintBookCss(css)
    expect(issues.some((i) => i.message.includes('box-shadow'))).toBe(true)
  })
})

describe('image ppi', () => {
  it('flags art under 300 effective ppi', () => {
    expect(effectivePpi(64, 100)).toBeLessThan(300)
    expect(isLowPrintPpi(64, 100)).toBe(true)
    expect(isLowPrintPpi(3600, 100)).toBe(false)
  })
})

describe('front matter helpers', () => {
  it('round-trips role and layout keys', () => {
    const md = `---\nrole: chapter\nlayout: layout.rig.json\n---\n\nHello\n`
    const parsed = parseBookFrontMatter(md)
    expect(parsed.role).toBe('chapter')
    expect(parsed.layout).toBe('layout.rig.json')
    const next = applyBookFrontMatter(md, { role: 'preface' })
    expect(parseBookFrontMatter(next).role).toBe('preface')
    expect(next).toContain('Hello')
  })
})
