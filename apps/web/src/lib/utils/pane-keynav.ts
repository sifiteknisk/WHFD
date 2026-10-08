const ARROW_CONSUMERS = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="separator"]',
  '[role="tab"]',
  '[role="tablist"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tree"]',
  '[role="combobox"]',
  '[role="slider"]',
].join(', ')

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

const TEXT_ENTRY =
  'input:not([type="checkbox"], [type="radio"]), textarea, select, [contenteditable="true"]'

export function focusListSelection(shell: HTMLElement): void {
  const list = shell.querySelector("pane-surface[data-side='list'] list-scroll")
  const focusTarget =
    list?.querySelector<HTMLElement>('button[data-selected]') ??
    list?.querySelector<HTMLElement>('button:not([disabled])')
  focusTarget?.focus()
  focusTarget?.scrollIntoView({ block: 'nearest' })
}

export function handlePaneShortcutKey(
  event: KeyboardEvent,
  shell: HTMLElement | null
): void {
  if (!shell || event.defaultPrevented) return
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target instanceof Element ? event.target : null

  if (event.key === '/' && !target?.closest(TEXT_ENTRY)) {
    const search = shell.querySelector<HTMLInputElement>('input[type="search"]')
    if (!search) return
    event.preventDefault()
    search.focus()
    search.select()
    return
  }

  if (event.key !== 'Escape' || !target || !shell.contains(target)) return
  const inList = target.closest("pane-surface[data-side='list'] list-scroll")
  if (inList) return
  event.preventDefault()
  focusListSelection(shell)
}

export function handlePaneArrowKey(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest(ARROW_CONSUMERS)) return
  const shell = event.currentTarget as HTMLElement
  const side = event.key === 'ArrowLeft' ? 'list' : 'detail'
  const pane = shell.querySelector(`pane-surface[data-side='${side}']`)
  if (!pane || (target && pane.contains(target))) return
  const focusTarget =
    pane.querySelector<HTMLElement>('button[data-selected]') ??
    pane.querySelector<HTMLElement>(FOCUSABLE)
  if (!focusTarget) return
  event.preventDefault()
  focusTarget.focus()
}
