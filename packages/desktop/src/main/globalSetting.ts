import path from 'path'
import { setLocalesDirectory } from 'common/i18n'
import { getStaticPath } from './staticPath'

const staticPath = getStaticPath()

;(global as unknown as { __static: string }).__static = staticPath.replace(/\\/g, '\\\\')

setLocalesDirectory(path.join(staticPath, 'locales'))
