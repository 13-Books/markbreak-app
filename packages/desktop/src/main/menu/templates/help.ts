import path from 'path'
import { shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { isFile } from 'common/filesystem'
import { PRODUCT } from 'common/product'
import * as actions from '../actions/help'
import { checkUpdates } from '../actions/marktext'
import { t } from '../../i18n'

const isUpdatable = (): boolean => {
  // TODO: If not updatable, allow to check whether there is a new version available.

  const resFile = isFile(path.join(process.resourcesPath, 'app-update.yml'))
  if (!resFile) {
    return false
  } else if (process.env.APPIMAGE) {
    return true
  } else if (process.platform === 'win32' && isFile(path.join(process.resourcesPath, 'md.ico'))) {
    // Windows is a little but tricky. The update resource file is always available and
    // there is no way to check the target type at runtime (electron-builder#4119).
    // As workaround we check whether "md.ico" exists that is only included in the setup.
    return true
  }

  return false
}

export default function(): MenuItemConstructorOptions {
  const submenu: MenuItemConstructorOptions[] = [
    {
      label: t('menu.help.markdownReference'),
      click() {
        shell.openExternal(PRODUCT.specificationUrl)
      }
    },
    {
      label: t('menu.help.changelog'),
      click() {
        shell.openExternal(PRODUCT.downloadUrl)
      }
    },
    {
      type: 'separator'
    },
    {
      label: t('menu.help.askQuestion'),
      click() {
        shell.openExternal(PRODUCT.guidesUrl)
      }
    },
    {
      label: t('menu.help.reportBug'),
      click() {
        shell.openExternal(PRODUCT.siteUrl)
      }
    },
    {
      label: t('menu.help.viewSource'),
      click() {
        shell.openExternal(PRODUCT.dialectUrl)
      }
    },
    {
      type: 'separator'
    },
    {
      label: t('menu.help.license'),
      click() {
        // The editor base is MIT. This item opens that license.
        shell.openExternal('https://github.com/marktext/marktext/blob/develop/LICENSE')
      }
    }
  ]

  const helpMenu: MenuItemConstructorOptions = {
    label: t('menu.help.help'),
    role: 'help',
    submenu
  }

  if (isUpdatable()) {
    submenu.push(
      {
        type: 'separator'
      },
      {
        label: t('menu.help.checkUpdates'),
        click(_menuItem, browserWindow) {
          checkUpdates((browserWindow as BrowserWindow | undefined) ?? null)
        }
      }
    )
  }

  if (process.platform !== 'darwin') {
    submenu.push(
      {
        type: 'separator'
      },
      {
        label: t('menu.help.about'),
        click(_menuItem, browserWindow) {
          actions.showAboutDialog(browserWindow as BrowserWindow | undefined)
        }
      }
    )
  }
  return helpMenu
}
