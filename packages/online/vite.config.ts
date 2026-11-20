import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: './',
  server: {
    open: '/edit.html',
    fs: { allow: [resolve(root, '../..')] }
  },
  resolve: {
    // The workspace link is a directory symlink. Use the source entry the package exports.
    alias: {
      '@muyajs/core': resolve(root, '../muya/src/index.ts')
    }
  },
  plugins: [
    {
      name: 'dev-root-to-editor',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            res.statusCode = 302
            res.setHeader('Location', '/edit.html')
            res.end()
            return
          }
          next()
        })
      }
    },
    {
      name: 'replace-site-assets',
      apply: 'build',
      buildStart() {
        // site/ also holds the hand-written pages, so emptyOutDir stays off.
        // Wiping only assets/ keeps the next hashed build from stacking on the last one.
        rmSync(resolve(root, '../../site/assets'), { recursive: true, force: true })
      }
    }
  ],
  build: {
    outDir: resolve(root, '../../site'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(root, 'edit.html')
    }
  }
})
