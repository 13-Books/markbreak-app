/**
 * Vitest is blocked on this machine by a broken rolldown native binding.
 * Run the pure unit specs with tsx + node:test instead.
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src')
const specs = readdirSync(src).filter((name) => name.endsWith('.spec.ts')).map((name) => join(src, name))

const tsx = join(root, '../../node_modules/tsx/dist/cli.mjs')
const result = spawnSync(process.execPath, [tsx, '--test', ...specs], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
})
process.exit(result.status ?? 1)
