import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const desktop = join(root, 'packages', 'desktop')
const svg = readFileSync(join(desktop, 'build', 'icons', 'markbreak-logo.svg'))
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

/** Pack PNG buffers into a multi-size ICO. */
function pngsToIco (pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const entries = []
  for (const png of pngBuffers) {
    entries.push({ png, offset, size: png.length })
    offset += png.length
  }
  // Read dimensions from IHDR
  const dims = pngBuffers.map((png) => {
    const w = png.readUInt32BE(16)
    const h = png.readUInt32BE(20)
    return { w, h }
  })
  const out = Buffer.alloc(offset)
  out.writeUInt16LE(0, 0)
  out.writeUInt16LE(1, 2)
  out.writeUInt16LE(count, 4)
  let o = 6
  let dataAt = headerSize
  for (let i = 0; i < count; i++) {
    const { w, h } = dims[i]
    out.writeUInt8(w >= 256 ? 0 : w, o)
    out.writeUInt8(h >= 256 ? 0 : h, o + 1)
    out.writeUInt8(0, o + 2)
    out.writeUInt8(0, o + 3)
    out.writeUInt16LE(1, o + 4)
    out.writeUInt16LE(32, o + 6)
    out.writeUInt32LE(pngBuffers[i].length, o + 8)
    out.writeUInt32LE(dataAt, o + 12)
    pngBuffers[i].copy(out, dataAt)
    dataAt += pngBuffers[i].length
    o += 16
  }
  return out
}

const pngs = {}
for (const size of sizes) {
  pngs[size] = await sharp(svg).resize(size, size, { fit: 'fill' }).png().toBuffer()
  const dir = join(desktop, 'build', 'icons', `${size}x${size}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'md.png'), pngs[size])
  writeFileSync(join(dir, 'marktext.png'), pngs[size])
  console.log(`wrote ${size}x${size}`)
}

writeFileSync(join(desktop, 'build', 'icons', 'icon.png'), pngs[512])
writeFileSync(join(desktop, 'static', 'icon.png'), pngs[512])
// Legacy MarkText asset names still referenced by e2e fixtures / about chrome.
writeFileSync(join(desktop, 'static', 'logo-96px.png'), pngs[96] ?? await sharp(svg).resize(96, 96).png().toBuffer())
writeFileSync(join(desktop, 'static', 'logo-small.png'), pngs[32])

const ico = pngsToIco([pngs[16], pngs[24], pngs[32], pngs[48], pngs[64], pngs[128], pngs[256]])
writeFileSync(join(desktop, 'build', 'icons', 'icon.ico'), ico)
writeFileSync(join(desktop, 'build', 'icons', 'md.ico'), ico)
writeFileSync(join(desktop, 'static', 'icon.ico'), ico)
console.log('wrote ico + logos')

try {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const png2icons = require('png2icons')
  const icns = png2icons.createICNS(pngs[512], png2icons.BILINEAR, 0)
  if (icns) {
    writeFileSync(join(desktop, 'build', 'icons', 'icon.icns'), icns)
    writeFileSync(join(desktop, 'build', 'icons', 'md.icns'), icns)
    writeFileSync(join(desktop, 'static', 'icon.icns'), icns)
    console.log('wrote icns')
  }
} catch (err) {
  console.log('png2icons unavailable; png/ico updated', err?.message ?? '')
}
