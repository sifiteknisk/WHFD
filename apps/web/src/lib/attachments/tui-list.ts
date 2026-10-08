import type { Attachment } from 'svelte/attachments'

const ITEM_SELECTOR = [
  'button:not(:disabled):not([aria-disabled="true"])',
  'a[href]:not([aria-disabled="true"])',
  '[data-tui-list-item][tabindex]',
].join(', ')

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End'])

function enabledItems(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter(
    element =>
      element.tabIndex !== -1 &&
      !element.closest('[inert], [hidden], [aria-hidden="true"]') &&
      element.getClientRects().length > 0
  )
}

// web-tui-kit `data-tui-list` behaviour: ArrowUp/ArrowDown wrap, Home/End jump.
// Runs in the capture phase so nested widgets (e.g. accordion triggers) share
// one list instead of each handling arrows on their own.
export function tuiList(
  onNavigate?: (target: HTMLElement) => void
): Attachment<HTMLElement> {
  return node => {
    const onKeydown = (event: KeyboardEvent) => {
      if (!NAV_KEYS.has(event.key)) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      if (active.closest('[data-tui-list]') !== node) return
      if (active.role === 'tab' && !event.key.startsWith('Arrow')) return

      const items = enabledItems(node)
      const current = items.indexOf(active)
      if (current < 0 || items.length < 2) return

      let next = current
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = items.length - 1
      if (event.key === 'ArrowUp')
        next = (current - 1 + items.length) % items.length
      if (event.key === 'ArrowDown') next = (current + 1) % items.length

      const target = items[next]!
      event.preventDefault()
      event.stopPropagation()
      target.focus()
      target.scrollIntoView({ block: 'nearest' })
      onNavigate?.(target)
    }

    node.dataset.tuiList = ''
    node.addEventListener('keydown', onKeydown, true)
    return () => {
      node.removeEventListener('keydown', onKeydown, true)
      delete node.dataset.tuiList
    }
  }
}
