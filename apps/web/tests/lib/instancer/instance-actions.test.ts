import { describe, expect, mock, test } from 'bun:test'

const toastError = mock((_message: string) => {})
mock.module('$lib/toast', () => ({ toast: { error: toastError } }))

const { runInstanceAction, runningInstanceAction } =
  await import('$lib/instancer/instance-actions.svelte')

describe('runInstanceAction', () => {
  test('keeps the action visible until the request settles', async () => {
    let finish = () => {}
    const task = mock(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    )

    const run = runInstanceAction('chall-1', 'stop', task, 'Failed')
    expect(runningInstanceAction('chall-1')).toEqual({
      key: 'stop',
      slow: false,
    })

    await runInstanceAction('chall-1', 'extend', task, 'Failed')
    expect(task).toHaveBeenCalledTimes(1)

    finish()
    await run
    expect(runningInstanceAction('chall-1')).toBeUndefined()
  })

  test('shows the error and clears the action when the request fails', async () => {
    await runInstanceAction(
      'chall-2',
      'start',
      () => Promise.reject(new Error('The server is busy')),
      'Failed to start instance'
    )

    expect(toastError).toHaveBeenLastCalledWith('The server is busy')
    expect(runningInstanceAction('chall-2')).toBeUndefined()
  })
})
