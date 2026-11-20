/**
 * Production build for markbreak.app.
 *
 * Prefer official Node (nodejs.org) over MSYS Node — Vite 8 / rolldown's
 * win32-msvc N-API binding panics under MSYS (`shlib_suffix=dll.a`).
 * This script shells out to `npx vite@6` so Rollup does the bundle.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--yes', 'vite@6.3.5', 'build'],
  { cwd: root, stdio: 'inherit', shell: true, env: process.env }
)
process.exit(result.status ?? 1)
