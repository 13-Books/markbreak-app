import { describe, expect, it } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'

/**
 * Packaging contract: dialect assets that electron-builder must ship
 * live under the repo dialect/ bridge (extraResources in electron-builder.yml).
 */
describe('markbreak dialect packaging contract', () => {
  const dialectRoot = path.resolve(__dirname, '../../../../../dialect')

  it('keeps export.sh and the pinned filter on disk for packaging', () => {
    expect(existsSync(path.join(dialectRoot, 'export.sh'))).toBe(true)
    expect(existsSync(path.join(dialectRoot, 'markbreak', 'tools', 'markbreak.lua'))).toBe(true)
    expect(existsSync(path.join(dialectRoot, 'markbreak', 'VERSION'))).toBe(true)
  })

  it('pins profile 0.5.2', async() => {
    const { readFile } = await import('fs/promises')
    const version = (await readFile(path.join(dialectRoot, 'markbreak', 'VERSION'), 'utf8')).trim()
    expect(version).toBe('0.5.2')
  })
})
