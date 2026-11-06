import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

const toastSuccess = mock((_title: string, _options?: unknown) => {})
const toastError = mock((_title: string, _options?: unknown) => {})

mock.module('$lib/toast', () => ({
  toast: { success: toastSuccess, error: toastError },
}))
mock.module('$app/navigation', () => ({ goto: mock(async () => {}) }))

const { reportStartFailure, reportStartReady, showPanel, startNotices } =
  await import('$lib/instancer/start-feedback.svelte')

let hidePanel: (() => void) | undefined

function setVisibility(visibilityState: 'visible' | 'hidden') {
  Object.defineProperty(globalThis, 'document', {
    value: { visibilityState },
    configurable: true,
  })
}

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  startNotices.clear()
  setVisibility('visible')
})

afterEach(() => {
  hidePanel?.()
  hidePanel = undefined
})

describe('start feedback', () => {
  test('stays in the panel while the challenge is on screen', () => {
    hidePanel = showPanel('web-1')

    reportStartReady('web-1', 'Bank')
    reportStartFailure('web-1', 'Bank', 'Busy, try again')

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(startNotices.get('web-1')).toBe('Busy, try again')
  })

  test('toasts once when the team is elsewhere', () => {
    hidePanel = showPanel('web-2')

    reportStartReady('web-1', 'Bank')
    reportStartFailure('web-1', 'Bank', 'Busy, try again')

    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(startNotices.get('web-1')).toBe('Busy, try again')
  })

  test('toasts after the panel closes', () => {
    showPanel('web-1')()

    reportStartReady('web-1', 'Bank')

    expect(toastSuccess).toHaveBeenCalledTimes(1)
  })

  test('toasts while the tab is in the background', () => {
    hidePanel = showPanel('web-1')
    setVisibility('hidden')

    reportStartReady('web-1', 'Bank')

    expect(toastSuccess).toHaveBeenCalledTimes(1)
  })
})
