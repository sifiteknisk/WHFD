import { beforeEach, describe, expect, mock, test } from 'bun:test'

const toastSuccess = mock((_title: string, _options?: unknown) => {})
const toastError = mock((_title: string, _options?: unknown) => {})
const page = { url: new URL('http://localhost/') }

mock.module('$lib/toast', () => ({
  toast: { success: toastSuccess, error: toastError },
}))
mock.module('$app/state', () => ({ page }))
mock.module('$app/navigation', () => ({ goto: mock(async () => {}) }))

const { reportStartFailure, reportStartReady, startNotices } =
  await import('$lib/instancer/start-feedback.svelte')

beforeEach(() => {
  toastSuccess.mockClear()
  toastError.mockClear()
  startNotices.clear()
  Object.defineProperty(globalThis, 'document', {
    value: { visibilityState: 'visible' },
    configurable: true,
  })
})

function viewChallenge(id: string | null) {
  page.url = new URL(
    id ? `http://localhost/challenges?challenge=${id}` : 'http://localhost/'
  )
}

describe('start feedback', () => {
  test('stays in the panel while the challenge is on screen', () => {
    viewChallenge('web-1')

    reportStartReady('web-1', 'Bank')
    reportStartFailure('web-1', 'Bank', 'Busy, try again')

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(startNotices.get('web-1')).toBe('Busy, try again')
  })

  test('toasts once when the team is elsewhere', () => {
    viewChallenge('web-2')

    reportStartReady('web-1', 'Bank')
    reportStartFailure('web-1', 'Bank', 'Busy, try again')

    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(startNotices.get('web-1')).toBe('Busy, try again')
  })
})
