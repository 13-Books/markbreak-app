import { ipcMain } from 'electron'
import { updateRelayHandoff, writeRelayHandoff } from '../utils/relayHandoff'

interface HandoffPayload {
  markdown: string
  pathname: string
  open?: boolean
}

interface HandoffUpdatePayload {
  markdown: string
  pathname: string
  folder: string
}

export const registerRelayHandlers = (): void => {
  ipcMain.handle('mt::relay-handoff', async(_e, payload: HandoffPayload) => {
    return writeRelayHandoff(payload.markdown, payload.pathname, { open: !!payload.open })
  })

  ipcMain.handle('mt::relay-handoff-update', async(_e, payload: HandoffUpdatePayload) => {
    return updateRelayHandoff(payload.markdown, payload.pathname, payload.folder)
  })
}
