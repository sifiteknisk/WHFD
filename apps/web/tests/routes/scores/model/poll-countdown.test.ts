import {
  nextPollAnchor,
  secondsUntilNextPoll,
  type PollAnchor,
} from '$routes/scores/model/poll-countdown'
import { describe, expect, test } from 'bun:test'

const INTERVAL = 30_000

describe('secondsUntilNextPoll', () => {
  test('hides the countdown before the first update', () => {
    expect(secondsUntilNextPoll(0, 1_000, INTERVAL)).toBeNull()
  })

  test('starts at the full interval on the update instant', () => {
    expect(secondsUntilNextPoll(1_000, 1_000, INTERVAL)).toBe(30)
  })

  test('stays on the current second until that second elapses', () => {
    expect(secondsUntilNextPoll(1_000, 1_001, INTERVAL)).toBe(30)
    expect(secondsUntilNextPoll(1_000, 2_000, INTERVAL)).toBe(29)
  })

  test('reaches zero when the interval has elapsed', () => {
    expect(secondsUntilNextPoll(1_000, 31_000, INTERVAL)).toBe(0)
    expect(secondsUntilNextPoll(1_000, 40_000, INTERVAL)).toBe(0)
  })
})

const emptyAnchor = (): PollAnchor => ({
  anchor: 0,
  key: '',
  updatedAt: 0,
  fetchingNextPage: false,
})

describe('nextPollAnchor', () => {
  test('adopts the first successful update', () => {
    const next = nextPollAnchor(emptyAnchor(), {
      key: 'all',
      updatedAt: 5_000,
      fetchingNextPage: false,
    })
    expect(next.anchor).toBe(5_000)
  })

  test('ignores a page that was appended by scrolling', () => {
    const loaded = nextPollAnchor(emptyAnchor(), {
      key: 'all',
      updatedAt: 5_000,
      fetchingNextPage: false,
    })
    const paging = nextPollAnchor(loaded, {
      key: 'all',
      updatedAt: 5_000,
      fetchingNextPage: true,
    })
    const appended = nextPollAnchor(paging, {
      key: 'all',
      updatedAt: 8_000,
      fetchingNextPage: false,
    })
    expect(appended.anchor).toBe(5_000)
  })

  test('moves forward on a real poll', () => {
    const loaded = nextPollAnchor(emptyAnchor(), {
      key: 'all',
      updatedAt: 5_000,
      fetchingNextPage: false,
    })
    const polled = nextPollAnchor(loaded, {
      key: 'all',
      updatedAt: 35_000,
      fetchingNextPage: false,
    })
    expect(polled.anchor).toBe(35_000)
  })

  test('resets when the board filters change', () => {
    const loaded = nextPollAnchor(emptyAnchor(), {
      key: 'all',
      updatedAt: 5_000,
      fetchingNextPage: false,
    })
    const pending = nextPollAnchor(loaded, {
      key: 'search',
      updatedAt: 0,
      fetchingNextPage: false,
    })
    expect(pending.anchor).toBe(0)
  })
})
