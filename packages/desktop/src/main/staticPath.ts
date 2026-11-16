import path from 'path'
import { app } from 'electron'
import { isWindows } from './config'

// A packaged app keeps `static/` beside the executable's resources; every other
// run — the dev server, `electron-vite preview`, the e2e suite — reads it from
// the app directory.
export const getStaticPath = (): string =>
  path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'static')

/** Window / taskbar icon — ICO on Windows for clearest results in preview and installs. */
export const getAppIconPath = (): string =>
  path.join(getStaticPath(), isWindows ? 'icon.ico' : 'icon.png')
