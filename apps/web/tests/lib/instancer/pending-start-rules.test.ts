import { InstanceStatus } from '@rctf/types'
import {
  isAlreadyStartingError,
  PENDING_START_TIMEOUT_MS,
  pendingSince,
  resolvePendingStart,
} from '$lib/instancer/pending-start-rules'
import { describe, expect, test } from 'bun:test'

const startedAt = 1_000_000
const fresh = { startedAt, seenStarting: false }
const building = { startedAt, seenStarting: true }
const soon = startedAt + 5_000
const late = startedAt + PENDING_START_TIMEOUT_MS

describe('resolvePendingStart', () => {
  test('running is ready, errored is errored, even after the timeout', () => {
    expect(resolvePendingStart(fresh, InstanceStatus.RUNNING, late)).toBe(
      'ready'
    )
    expect(resolvePendingStart(fresh, InstanceStatus.ERRORED, late)).toBe(
      'errored'
    )
  })

  test('stopped before the build began keeps waiting (still queued)', () => {
    expect(resolvePendingStart(fresh, InstanceStatus.STOPPED, soon)).toBe(
      'waiting'
    )
    expect(resolvePendingStart(fresh, undefined, soon)).toBe('waiting')
  })

  test('stopped after it was seen starting means the build failed', () => {
    expect(resolvePendingStart(building, InstanceStatus.STOPPED, soon)).toBe(
      'failed'
    )
  })

  test('starting keeps watching until the timeout', () => {
    expect(resolvePendingStart(fresh, InstanceStatus.STARTING, soon)).toBe(
      'starting'
    )
    expect(resolvePendingStart(building, InstanceStatus.STARTING, late)).toBe(
      'timed-out'
    )
    expect(resolvePendingStart(fresh, InstanceStatus.STOPPED, late)).toBe(
      'timed-out'
    )
  })
})

describe('queued starts', () => {
  test('waiting in the queue never times out', () => {
    expect(
      resolvePendingStart(building, InstanceStatus.STARTING, late, true)
    ).toBe('queued')
  })

  test('the timeout counts from the last time it was seen queued', () => {
    const leftQueue = { ...building, queuedAt: late }
    expect(pendingSince(leftQueue)).toBe(late)
    expect(
      resolvePendingStart(leftQueue, InstanceStatus.STARTING, late + 5_000)
    ).toBe('starting')
    expect(
      resolvePendingStart(
        leftQueue,
        InstanceStatus.STARTING,
        late + PENDING_START_TIMEOUT_MS
      )
    ).toBe('timed-out')
  })

  test('stopped while queued means it was stopped or failed', () => {
    expect(
      resolvePendingStart(
        { ...building, queuedAt: soon },
        InstanceStatus.STOPPED,
        soon
      )
    ).toBe('failed')
  })
})

describe('isAlreadyStartingError', () => {
  test.each([
    'Instance already exists, stop it first',
    'Another instance operation is in progress.',
    'Instance already running.',
  ])('%s', message => {
    expect(isAlreadyStartingError(message)).toBe(true)
  })

  test('busy and other errors are not treated as starting', () => {
    expect(
      isAlreadyStartingError(
        'Lots of teams are starting instances right now. Please try again in a few seconds.'
      )
    ).toBe(false)
    expect(isAlreadyStartingError('Failed to start instance')).toBe(false)
  })
})
