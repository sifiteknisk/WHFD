import {
  applyBongTotal,
  bongsGainedFromSolve,
  emptyBongQueue,
  noteLocalSolve,
  noteServerBongs,
  type BongQueue,
} from '$lib/bongs/queue'
import { describe, expect, test } from 'bun:test'

const ready = (known: number, remaining = 0): BongQueue => ({
  ...emptyBongQueue(),
  known,
  remaining,
})

describe('applyBongTotal', () => {
  test('snapshots the first known total without announcing', () => {
    expect(applyBongTotal(undefined, 0, 3)).toEqual({ known: 3, remaining: 0 })
  })

  test('queues one overlay per newly earned bong', () => {
    expect(applyBongTotal(1, 0, 3)).toEqual({ known: 3, remaining: 2 })
  })

  test('leaves the queue alone when the total is unchanged', () => {
    expect(applyBongTotal(2, 1, 2)).toEqual({ known: 2, remaining: 1 })
  })

  test('resets when the current user disappears', () => {
    expect(applyBongTotal(4, 2, undefined)).toEqual({
      known: undefined,
      remaining: 0,
    })
  })

  test('drops queued announcements when the server total shrinks', () => {
    expect(applyBongTotal(5, 0, 4)).toEqual({ known: 4, remaining: 0 })
    expect(applyBongTotal(5, 2, 4)).toEqual({ known: 4, remaining: 1 })
  })
})

describe('noteLocalSolve', () => {
  test('plays once cumulative awarded points cross another bong', () => {
    expect(noteLocalSolve(ready(2), 500, 1000)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: 500,
      predictedPoints: 3000,
    })
  })

  test('stacks a second solve onto the prediction', () => {
    const once = noteLocalSolve(ready(2), 500, 1000)
    expect(noteLocalSolve(once, 500, 1000)).toEqual({
      known: 4,
      remaining: 2,
      unconfirmedFrom: 500,
      predictedPoints: 4000,
    })
  })

  test('stops the overlay at the bong cap', () => {
    expect(noteLocalSolve(ready(2), 500, 2000, 3)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: 500,
      predictedPoints: 4000,
    })
  })

  test('does not play when the points stay inside the current bong', () => {
    const queue = ready(2)
    expect(noteLocalSolve(queue, 500, 100)).toMatchObject({
      known: 2,
      remaining: 0,
      predictedPoints: 2100,
    })
  })

  test('waits for a server baseline before announcing', () => {
    expect(noteLocalSolve(emptyBongQueue(), 500, 1000)).toEqual(
      emptyBongQueue()
    )
  })
})

describe('noteServerBongs', () => {
  test('optimistic total after a local predict does not queue a second play', () => {
    // Same order as bong-receiver: local first, then optimistic bongsTotal.
    const announced = noteLocalSolve(ready(2), 500, 1000)
    expect(announced.remaining).toBe(1)
    // Score still stale; total already bumped in the query cache.
    expect(noteServerBongs(announced, 500, 3)).toBe(announced)
    expect(noteServerBongs(announced, 1500, 3)).toMatchObject({
      known: 3,
      remaining: 1,
    })
  })

  test('server-first optimistic total would double — do not use that order', () => {
    // Documents the bug: applying the optimistic total before noteLocalSolve
    // queues one overlay, then the local solve queues another.
    const fromServer = noteServerBongs(ready(2), 500, 3)
    expect(fromServer).toMatchObject({ known: 3, remaining: 1 })
    expect(noteLocalSolve(fromServer, 500, 1000).remaining).toBe(2)
  })

  test('does not replay a bong the client already announced', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000)
    expect(noteServerBongs(announced, 1500, 3)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: undefined,
      predictedPoints: undefined,
    })
  })

  test('ignores a poll that has not picked up the solve yet', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000)
    expect(noteServerBongs(announced, 500, 2)).toBe(announced)
  })

  test('keeps an unconfirmed overlay while the server total lags', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000)
    expect(noteServerBongs(announced, 1500, 2)).toBe(announced)
  })

  test('clears unconfirmed once the server total catches the prediction', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000)
    expect(noteServerBongs(announced, 1500, 3)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: undefined,
      predictedPoints: undefined,
    })
  })
})

describe('bongsGainedFromSolve', () => {
  test('returns how many bongs a solve newly unlocks', () => {
    expect(bongsGainedFromSolve(2, 1000)).toBe(1)
    expect(bongsGainedFromSolve(2, 100)).toBe(0)
    expect(bongsGainedFromSolve(2, 2500)).toBe(2)
  })

  test('respects the bong cap', () => {
    expect(bongsGainedFromSolve(2, 5000, 3)).toBe(1)
  })
})
