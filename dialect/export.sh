#!/usr/bin/env bash
# Docx/PDF through the pinned MarkBreak Pandoc filter.
# Page size and imprint come from --rig, a sibling .rig.json, or the manuscript's layout and meta links.
if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "This script requires bash." >&2
  exit 1
fi
set -euo pipefail

usage() {
  echo "Usage: dialect/export.sh --input manuscript.md [--format docx|pdf|html] [--out file] [--rig book.rig.json]" >&2
}

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
app_root=$(cd "$here/.." && pwd)

to_native() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s\n' "$1"
  fi
}

input=""
format="docx"
out=""
rig=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --input)
      input="${2:-}"
      shift 2
      ;;
    --format)
      format="${2:-}"
      shift 2
      ;;
    --out)
      out="${2:-}"
      shift 2
      ;;
    --rig)
      rig="${2:-}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$input" || ! -f "$input" ]]; then
  echo "Input manuscript not found." >&2
  usage
  exit 1
fi
case "$format" in
  docx | pdf | html) ;;
  *)
    echo "Format must be docx, pdf, or html." >&2
    exit 1
    ;;
esac

filter=""
for candidate in \
  "$here/markbreak/tools/markbreak.lua" \
  "$app_root/../markbreak/tools/markbreak.lua"; do
  if [[ -f "$candidate" ]]; then
    filter="$(cd "$(dirname "$candidate")" && pwd -P)/$(basename "$candidate")"
    break
  fi
done
if [[ -z "$filter" ]]; then
  cat >&2 <<'EOF'
markbreak.lua not found.
Init the dialect submodule:
  git submodule update --init --recursive
Or keep a sibling checkout at ../markbreak (profile VERSION must match MARKBREAK.md).
EOF
  exit 1
fi

profile_root="$(cd "$(dirname "$filter")/.." && pwd -P)"
if [[ -f "$profile_root/VERSION" ]]; then
  profile_version="$(tr -d '[:space:]' < "$profile_root/VERSION")"
else
  profile_version="unknown"
fi

find_pandoc() {
  if [[ -n "${LOCALAPPDATA:-}" && -f "${LOCALAPPDATA}/Pandoc/pandoc.exe" ]]; then
    printf '%s\n' "${LOCALAPPDATA}/Pandoc/pandoc.exe"
    return
  fi
  if command -v pandoc >/dev/null 2>&1; then
    command -v pandoc
    return
  fi
  echo "pandoc not found" >&2
  return 1
}

if ! command -v node >/dev/null 2>&1; then
  echo "node not found" >&2
  exit 1
fi

pandoc="$(to_native "$(find_pandoc)")"
echo "MarkBreak profile $profile_version"
echo "filter: $(to_native "$filter")"

export MB_PANDOC="$pandoc"
export MB_INPUT="$(to_native "$input")"
export MB_FORMAT="$format"
export MB_FILTER="$(to_native "$filter")"
if [[ -n "$out" ]]; then
  export MB_OUT="$(to_native "$out")"
else
  export MB_OUT=""
fi
if [[ -n "$rig" ]]; then
  export MB_RIG="$(to_native "$rig")"
else
  export MB_RIG=""
fi

node --input-type=module - <<'END'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateRawSync, inflateRawSync } from 'node:zlib'

const pandoc = process.env.MB_PANDOC
const inputFile = process.env.MB_INPUT
const format = process.env.MB_FORMAT
const filter = process.env.MB_FILTER
const rigArg = process.env.MB_RIG || ''
let outFile = process.env.MB_OUT || ''

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const unzip = (buf) => {
  let eocd = -1
  const min = Math.max(0, buf.length - 22 - 65535)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error('reference document is not a zip')
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const files = new Map()
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error('bad zip directory')
    const method = buf.readUInt16LE(ptr + 10)
    const compSize = buf.readUInt32LE(ptr + 20)
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const localOff = buf.readUInt32LE(ptr + 42)
    const name = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString('utf8').replace(/\\/g, '/')
    const localNameLen = buf.readUInt16LE(localOff + 26)
    const localExtraLen = buf.readUInt16LE(localOff + 28)
    const dataOff = localOff + 30 + localNameLen + localExtraLen
    const compressed = buf.subarray(dataOff, dataOff + compSize)
    let data
    if (method === 0) data = Buffer.from(compressed)
    else if (method === 8) data = inflateRawSync(compressed)
    else throw new Error(`unsupported zip method ${String(method)}`)
    if (!name.endsWith('/')) files.set(name, data)
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const zipFiles = (files) => {
  const parts = []
  const central = []
  let offset = 0
  let count = 0
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name)
    const compressed = deflateRawSync(data)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    parts.push(local, nameBuf, compressed)
    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4)
    cen.writeUInt16LE(20, 6)
    cen.writeUInt16LE(0, 8)
    cen.writeUInt16LE(8, 10)
    cen.writeUInt16LE(0, 12)
    cen.writeUInt16LE(0, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(compressed.length, 20)
    cen.writeUInt32LE(data.length, 24)
    cen.writeUInt16LE(nameBuf.length, 28)
    cen.writeUInt16LE(0, 30)
    cen.writeUInt16LE(0, 32)
    cen.writeUInt16LE(0, 34)
    cen.writeUInt16LE(0, 36)
    cen.writeUInt32LE(0, 38)
    cen.writeUInt32LE(offset, 42)
    central.push(cen, nameBuf)
    offset += local.length + nameBuf.length + compressed.length
    count += 1
  }
  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(count, 8)
  end.writeUInt16LE(count, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)
  return Buffer.concat([...parts, centralBuf, end])
}

const toMm = (value, unit) => {
  const n = Number(value)
  if (unit === 'in') return n * 25.4
  if (unit === 'px') return n * 25.4 / 96
  return n
}

const expandMargins = (raw) => {
  const parts = Array.isArray(raw) ? raw : [raw]
  const nums = parts.map((part) => Number(part))
  if (nums.length <= 1) return [nums[0], nums[0], nums[0], nums[0]]
  if (nums.length === 2) return [nums[0], nums[1], nums[0], nums[1]]
  if (nums.length === 3) return [nums[0], nums[1], nums[2], nums[1]]
  return [nums[0], nums[1], nums[2], nums[3]]
}

const unwrap = (node) => {
  if (node == null) return null
  switch (String(node.t)) {
    case 'MetaBool':
      return Boolean(node.c)
    case 'MetaString':
      return String(node.c)
    case 'MetaInlines':
      return (node.c || []).map((inline) => {
        if (inline.t === 'Str') return String(inline.c)
        if (inline.t === 'Space' || inline.t === 'SoftBreak') return ' '
        return ''
      }).join('')
    case 'MetaList':
      return (node.c || []).map((entry) => unwrap(entry))
    case 'MetaMap': {
      const map = {}
      if (Array.isArray(node.c)) {
        for (const pair of node.c) map[pair[0]] = unwrap(pair[1])
      } else if (node.c && typeof node.c === 'object') {
        for (const [key, value] of Object.entries(node.c)) map[key] = unwrap(value)
      }
      return map
    }
    default:
      return null
  }
}

const metaString = (meta, name) => {
  if (!meta || !Object.prototype.hasOwnProperty.call(meta, name)) return null
  const value = unwrap(meta[name])
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const flat = value.map((entry) => (entry == null ? '' : String(entry))).filter((entry) => entry !== '')
    return flat.length ? flat.join(' ') : null
  }
  if (typeof value === 'object') return null
  return String(value)
}

const readPandocMeta = (markdownPath) => {
  const proc = spawnSync(pandoc, [markdownPath, '-f', 'markdown', '-t', 'json'], {
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (proc.error || proc.status !== 0 || !proc.stdout) return null
  return JSON.parse(proc.stdout).meta ?? null
}

const resolveBeside = (manuscript, relative) => {
  const rel = String(relative).trim()
  const parts = rel.split(/[\\/]/).filter((part) => part.length > 0)
  const absolute = /^[A-Za-z]:[\\/]/.test(rel) || rel.startsWith('/') || rel.startsWith('\\')
  if (absolute || parts.includes('..')) throw new Error('meta and layout paths stay beside the manuscript')
  const full = path.resolve(path.dirname(manuscript), rel)
  if (!existsSync(full)) throw new Error(`linked file not found: ${rel}`)
  return full
}

const readRigBook = (rigPath) => {
  if (!rigPath || !existsSync(rigPath)) return null
  const rig = JSON.parse(readFileSync(rigPath, 'utf8'))
  const unit = rig.document?.defaultUnit ? String(rig.document.defaultUnit) : 'mm'
  let page = null
  let facing = null
  let lang = rig.document?.language ? String(rig.document.language) : null
  let isbn = null
  let publisherId = null
  for (const entity of rig.entities ?? []) {
    const components = entity.components ?? {}
    if (components['rig.layout.page']) page = components['rig.layout.page']
    if (components['rig.layout.facing']) facing = components['rig.layout.facing']
    const publication = components['rig.book.publication']
    if (publication) {
      if (publication.language) lang = String(publication.language)
      if (publication.publisher) publisherId = String(publication.publisher)
    }
    const identifier = components['rig.book.identifier']
    if (identifier?.isbn13) isbn = String(identifier.isbn13)
  }
  let publisher = null
  if (publisherId) {
    for (const entity of rig.entities ?? []) {
      if (String(entity.id) === publisherId) {
        const name = entity.components?.['rig.meta.named']?.name
        if (name != null) publisher = String(name)
      }
    }
  }
  const result = {
    title: rig.document?.title ? String(rig.document.title) : null,
    lang,
    publisher,
    isbn,
    page: null
  }
  if (!page) return result
  const pageUnit = page.unit ? String(page.unit) : unit
  const margins = expandMargins(page.margins)
  let facingOn = false
  let binding = 'left'
  if (facing) {
    facingOn = true
    if (facing.enabled != null && !facing.enabled) facingOn = false
    if (facing.binding) binding = String(facing.binding)
  }
  result.page = {
    widthMm: toMm(page.width, pageUnit),
    heightMm: toMm(page.height, pageUnit),
    top: toMm(margins[0], pageUnit),
    right: toMm(margins[1], pageUnit),
    bottom: toMm(margins[2], pageUnit),
    left: toMm(margins[3], pageUnit),
    facing: facingOn,
    binding
  }
  return result
}

const twips = (mm) => Math.round(mm * 1440 / 25.4)

const updateSectionXml = (xml, page) => {
  let left = twips(page.left)
  let right = twips(page.right)
  const top = twips(page.top)
  const bottom = twips(page.bottom)
  const width = twips(page.widthMm)
  const height = twips(page.heightMm)
  if (page.facing && page.binding === 'right') {
    const swap = left
    left = right
    right = swap
  }
  const pgSz = `<w:pgSz w:w="${String(width)}" w:h="${String(height)}"/>`
  const mirror = page.facing ? '<w:mirrorMargins/>' : ''
  const pgMar = `<w:pgMar w:top="${String(top)}" w:right="${String(right)}" w:bottom="${String(bottom)}" w:left="${String(left)}"/>`
  if (/<w:pgSz\b/.test(xml)) {
    let next = xml.replace(/<w:pgSz\b[^>]*\/>/g, pgSz)
    next = next.replace(/<w:pgMar\b([^>]*)\/>/g, (_match, attrs) => {
      let keep = ''
      for (const name of ['w:header', 'w:footer', 'w:gutter']) {
        const found = new RegExp(`${name}="(\\d+)"`).exec(attrs)
        if (found) keep += ` ${name}="${found[1]}"`
      }
      return `<w:pgMar w:top="${String(top)}" w:right="${String(right)}" w:bottom="${String(bottom)}" w:left="${String(left)}"${keep}/>`
    })
    next = next.replace(/<w:mirrorMargins\s*\/>/g, '')
    if (page.facing) next = next.replace(/(<w:pgMar\b[^>]*\/>)/g, `$1${mirror}`)
    return next
  }
  const sect = /<w:sectPr\b[^>]*>/.exec(xml)
  if (sect) {
    const at = sect.index + sect[0].length
    return xml.slice(0, at) + pgSz + pgMar + mirror + xml.slice(at)
  }
  return xml.replaceAll('</w:body>', `<w:sectPr>${pgSz}${pgMar}${mirror}</w:sectPr></w:body>`)
}

const changeExtension = (file, ext) => {
  const base = path.basename(file)
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  return path.join(path.dirname(file), stem + ext)
}

const referenceDoc = (page) => {
  const proc = spawnSync(pandoc, ['--print-default-data-file', 'reference.docx'], {
    windowsHide: true,
    encoding: 'buffer',
    maxBuffer: 32 * 1024 * 1024
  })
  if (proc.error) throw proc.error
  if (proc.status !== 0 || !proc.stdout?.length) {
    throw new Error(proc.stderr?.toString().trim() || 'pandoc could not write the reference document')
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'mb-ref-'))
  try {
    const files = unzip(proc.stdout)
    const current = files.get('word/document.xml')
    if (!current) throw new Error('reference document has no word/document.xml')
    files.set('word/document.xml', Buffer.from(updateSectionXml(current.toString('utf8'), page), 'utf8'))
    const patched = path.join(dir, 'reference.docx')
    writeFileSync(patched, zipFiles(files))
    return { dir, patched }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

const main = () => {
  const chapter = readPandocMeta(inputFile)
  let rigFile = rigArg
  const layoutLink = metaString(chapter, 'layout')
  if (!rigFile && layoutLink) rigFile = resolveBeside(inputFile, layoutLink)
  if (!rigFile) {
    const beside = changeExtension(inputFile, '.rig.json')
    if (existsSync(beside)) rigFile = beside
  }
  let book = readRigBook(rigFile)
  const metaLink = metaString(chapter, 'meta')
  if (metaLink) {
    const pub = readPandocMeta(resolveBeside(inputFile, metaLink))
    if (!book) book = { title: null, lang: null, publisher: null, isbn: null, page: null }
    const title = metaString(pub, 'title')
    const lang = metaString(pub, 'language')
    const publisher = metaString(pub, 'publisher')
    const isbn = metaString(pub, 'isbn13')
    if (title) book.title = title
    book.subtitle = metaString(pub, 'subtitle')
    book.author = metaString(pub, 'author')
    if (lang) book.lang = lang
    if (publisher) book.publisher = publisher
    if (isbn) book.isbn = isbn
  }

  const raw = readFileSync(inputFile, 'utf8').replace(/\r\n?/g, '\n')
  const tmpMd = path.join(tmpdir(), `mb-${randomUUID()}.md`)
  let refDir = null
  try {
    writeFileSync(tmpMd, raw, 'utf8')
    if (!outFile) outFile = changeExtension(inputFile, `.${format}`)
    const args = [tmpMd, '-f', 'markdown', '-t', format, '-L', filter, '-o', outFile]
    if (book) {
      for (const [key, value] of [
        ['title', book.title],
        ['subtitle', book.subtitle],
        ['author', book.author],
        ['lang', book.lang],
        ['publisher', book.publisher]
      ]) {
        if (value) args.push('--metadata', `${key}=${value}`)
      }
      const subject = []
      if (book.publisher) subject.push(book.publisher)
      if (book.isbn) subject.push(`ISBN ${book.isbn}`)
      if (subject.length) args.push('--metadata', `subject=${subject.join('. ')}`)
    }
    if (book?.page && format === 'pdf') {
      const page = book.page
      let geo = `paperwidth=${page.widthMm}mm,paperheight=${page.heightMm}mm,top=${page.top}mm,bottom=${page.bottom}mm`
      if (page.facing) {
        let inner = page.left
        let outer = page.right
        if (page.binding === 'right') {
          inner = page.right
          outer = page.left
        }
        geo += `,twoside,inner=${inner}mm,outer=${outer}mm`
      } else {
        geo += `,right=${page.right}mm,left=${page.left}mm`
      }
      args.push('-V', `geometry=${geo}`)
    } else if (book?.page && format === 'docx') {
      const ref = referenceDoc(book.page)
      refDir = ref.dir
      args.push(`--reference-doc=${ref.patched}`)
    } else if (format === 'html') {
      args.push('--standalone', '--embed-resources')
    }
    const proc = spawnSync(pandoc, args, { windowsHide: true, stdio: 'inherit' })
    if (proc.error) throw proc.error
    if (proc.status !== 0) {
      process.exitCode = proc.status ?? 1
      return
    }
    console.log(`Wrote ${outFile}`)
  } finally {
    rmSync(tmpMd, { force: true })
    if (refDir) rmSync(refDir, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
END
