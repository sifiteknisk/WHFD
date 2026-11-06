import { beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$app/environment', () => ({ browser: true }))

const { PENDING_START_TIMEOUT_MS } =
  await import('$lib/instancer/pending-start-rules')

const {
  clearPendingStarts,
  markStarting,
  pendingStarts,
  restorePendingStarts,
  trackStart,
  untrackStart,
} = await import('$lib/instancer/pending-starts.svelte')

let saved: string | null
const getItem = mock(() => saved)
const setItem = mock((_key: string, value: string) => {
  saved = value
})

beforeEach(() => {
  saved = null
  getItem.mockReset().mockImplementation(() => saved)
  setItem.mockReset().mockImplementation((_key, value) => {
    saved = value
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: { getItem, setItem },
    configurable: true,
  })
  pendingStarts.clear()
})

const start = {
  challengeId: 'web-cat',
  challengeName: 'Cat challenge',
  userId: 'team-1',
}

describe('pending instance starts', () => {
  test('survives reload, remembers starting, and stops tracking on completion', () => {
    const entry = trackStart(start)
    markStarting(start.challengeId)
    pendingStarts.clear()
    restorePendingStarts()
    expect(pendingStarts.get(start.challengeId)).toEqual({
      ...entry,
      seenStarting: true,
    })
    untrackStart(start.challengeId)
    expect(JSON.parse(saved!)).toEqual([])
  })

  test('blocked storage never prevents tracking or clearing a start', () => {
    getItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    setItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => restorePendingStarts()).not.toThrow()
    trackStart(start)
    expect(pendingStarts.has(start.challengeId)).toBe(true)
    expect(() => clearPendingStarts()).not.toThrow()
    expect(pendingStarts.size).toBe(0)
  })

  test.each(['invalid json', '{}', 'null', '[null,42,{}]'])(
    'ignores invalid stored data: %s',
    value => {
      saved = value
      expect(() => restorePendingStarts()).not.toThrow()
      expect(pendingStarts.size).toBe(0)
    }
  )

  test('only restores recent entries with all required fields', () => {
    const entry = {
      ...start,
      startedAt: Date.now() - 1000,
      seenStarting: false,
    }
    saved = JSON.stringify([
      entry,
      {
        ...entry,
        challengeId: 'expired',
        startedAt: Date.now() - PENDING_START_TIMEOUT_MS,
      },
      { ...entry, challengeId: 'future', startedAt: Date.now() + 200_000 },
      { ...entry, challengeId: 'wrong-type', userId: 12 },
    ])
    restorePendingStarts()
    expect([...pendingStarts.values()]).toEqual([entry])
  })
})
