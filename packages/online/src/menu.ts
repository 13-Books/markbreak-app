export interface MenuEntry {
  label: string
  action?: string
  accel?: string
  checked?: boolean
  disabled?: boolean
  children?: MenuEntry[]
}

export function renderMenu (
  root: HTMLElement,
  entries: MenuEntry[],
  onAction: (action: string) => void
): void {
  root.replaceChildren(...renderEntries(entries))
  root.onclick = (event) => {
    const button = (event.target as Element).closest('button[data-action]')
    if (!(button instanceof HTMLButtonElement) || button.disabled) return
    const action = button.dataset.action
    if (!action) return
    onAction(action)
  }
}

function renderEntries (entries: MenuEntry[]): HTMLElement[] {
  const reserveCheck = entries.some((entry) => entry.checked !== undefined)
  return entries.map((entry) => renderEntry(entry, reserveCheck))
}

function renderEntry (entry: MenuEntry, reserveCheck: boolean): HTMLElement {
  if (entry.label === '—' || entry.action === 'sep') {
    const rule = document.createElement('div')
    rule.className = 'menu-sep'
    rule.setAttribute('role', 'separator')
    return rule
  }
  if (entry.children) {
    const branch = document.createElement('div')
    branch.className = 'menu-branch'
    const row = document.createElement('button')
    row.type = 'button'
    row.className = 'menu-row'
    row.setAttribute('aria-haspopup', 'menu')
    row.append(labelSpan(entry.label), caret())
    const submenu = document.createElement('div')
    submenu.className = 'submenu'
    submenu.setAttribute('role', 'menu')
    submenu.append(...renderEntries(entry.children))
    branch.append(row, submenu)
    return branch
  }
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'menu-row'
  button.setAttribute('role', 'menuitem')
  if (entry.action) button.dataset.action = entry.action
  if (entry.disabled) button.disabled = true
  if (entry.checked) button.setAttribute('aria-checked', 'true')
  if (reserveCheck) {
    const mark = document.createElement('span')
    mark.className = 'mark'
    mark.textContent = entry.checked ? '✓' : ''
    button.append(mark)
  }
  button.append(labelSpan(entry.label))
  if (entry.accel) {
    const accel = document.createElement('span')
    accel.className = 'accel'
    accel.textContent = entry.accel
    button.append(accel)
  }
  return button
}

function labelSpan (text: string): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'label'
  span.textContent = text
  return span
}

function caret (): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'caret'
  span.textContent = '›'
  return span
}
