import {
  absorbServerBongs,
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
  test('uses actual accumulated points when a small solve crosses a threshold', () => {
    expect(noteLocalSolve(ready(0), 200, 50, 200)).toMatchObject({
      known: 1,
      remaining: 1,
      predictedPoints: 250,
    })
  })

  test('plays once cumulative awarded points cross another bong', () => {
    // Two bongs = 750 pts; the third needs 1750 cumulative.
    expect(noteLocalSolve(ready(2), 500, 1000, 750)).toEqual({
      ...emptyBongQueue(),
      known: 3,
      remaining: 1,
      unconfirmedFrom: 500,
      predictedPoints: 1750,
    })
  })

  test('stacks a second solve onto the prediction', () => {
    const once = noteLocalSolve(ready(2), 500, 1000, 750)
    expect(noteLocalSolve(once, 500, 2000, 750)).toEqual({
      ...emptyBongQueue(),
      known: 4,
      remaining: 2,
      unconfirmedFrom: 500,
      predictedPoints: 3750,
    })
  })

  test('stops the overlay at the bong cap', () => {
    expect(noteLocalSolve(ready(2), 500, 3000, 750, 3)).toEqual({
      ...emptyBongQueue(),
      known: 3,
      remaining: 1,
      unconfirmedFrom: 500,
      predictedPoints: 3750,
    })
  })

  test('does not play when the points stay inside the current bong', () => {
    const queue = ready(2)
    expect(noteLocalSolve(queue, 500, 100, 750)).toMatchObject({
      known: 2,
      remaining: 0,
      predictedPoints: 850,
    })
  })

  test('waits for a server baseline before announcing', () => {
    expect(noteLocalSolve(emptyBongQueue(), 500, 1000, 750)).toEqual(
      emptyBongQueue()
    )
  })
})

describe('noteServerBongs', () => {
  test('announces an admin grant when only availability increases', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 4000, 4, 0)
    expect(baseline.remaining).toBe(0)
    const granted = noteServerBongs(baseline, 4000, 4, 1)
    expect(granted.remaining).toBe(1)
    expect(noteServerBongs(granted, 4000, 4, 1).remaining).toBe(1)
  })

  test('does not announce a removal and can announce a later replacement', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 4000, 4, 2)
    const removed = noteServerBongs(baseline, 4000, 4, 1)
    expect(removed.remaining).toBe(0)
    expect(noteServerBongs(removed, 4000, 4, 2).remaining).toBe(1)
  })

  test('announces earned total and availability increases only once', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 0, 0, 0)
    const earned = noteServerBongs(baseline, 250, 1, 1)
    expect(earned.remaining).toBe(1)
    expect(noteServerBongs(earned, 250, 1, 1).remaining).toBe(1)
  })

  test('does not announce local prediction again when availability catches up', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 200, 0, 0)
    const predicted = noteLocalSolve(baseline, 200, 50, 200)
    expect(predicted.remaining).toBe(1)
    expect(noteServerBongs(predicted, 200, 1, 1).remaining).toBe(1)
    expect(noteServerBongs(predicted, 250, 1, 1).remaining).toBe(1)
  })

  test('announces an admin grant while a solve is waiting for a score refresh', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 250, 1, 0)
    const pending = noteLocalSolve(baseline, 250, 50, 250)
    expect(pending.remaining).toBe(0)
    const granted = noteServerBongs(pending, 250, 1, 1)
    expect(granted.remaining).toBe(1)
    expect(noteServerBongs(granted, 250, 1, 1).remaining).toBe(1)
  })

  test('tracks removals while a score refresh is pending so replacements still announce', () => {
    const baseline = noteServerBongs(emptyBongQueue(), 250, 1, 1)
    const pending = noteLocalSolve(baseline, 250, 50, 250)
    const removed = noteServerBongs(pending, 250, 1, 0)
    expect(removed.remaining).toBe(0)
    expect(noteServerBongs(removed, 250, 1, 1).remaining).toBe(1)
  })

  test('optimistic total after a local predict does not queue a second play', () => {
    // Same order as bong-receiver: local first, then optimistic bongsTotal.
    const announced = noteLocalSolve(ready(2), 500, 1000, 750)
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
    expect(noteLocalSolve(fromServer, 500, 2000, 1750).remaining).toBe(2)
  })

  test('does not replay a bong the client already announced', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000, 750)
    expect(noteServerBongs(announced, 1500, 3)).toEqual({
      ...emptyBongQueue(),
      known: 3,
      remaining: 1,
      unconfirmedFrom: undefined,
      predictedPoints: undefined,
    })
  })

  test('ignores a poll that has not picked up the solve yet', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000, 750)
    expect(noteServerBongs(announced, 500, 2)).toBe(announced)
  })

  test('keeps an unconfirmed overlay while the server total lags', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000, 750)
    expect(noteServerBongs(announced, 1500, 2)).toBe(announced)
  })

  test('clears unconfirmed once the server total catches the prediction', () => {
    const announced = noteLocalSolve(ready(2), 500, 1000, 750)
    expect(noteServerBongs(announced, 1500, 3)).toEqual({
      ...emptyBongQueue(),
      known: 3,
      remaining: 1,
      unconfirmedFrom: undefined,
      predictedPoints: undefined,
    })
  })
})

describe('absorbServerBongs', () => {
  test('syncs earned bongs without announcing them', () => {
    const queue = absorbServerBongs(
      { ...ready(1), knownAvailable: 1 },
      500,
      3,
      3
    )
    expect(queue).toMatchObject({ known: 3, knownAvailable: 3, remaining: 0 })
    // Nothing missed is replayed by the next normal poll either.
    expect(noteServerBongs(queue, 500, 3, 3).remaining).toBe(0)
  })

  test('keeps an overlay that was already queued', () => {
    expect(absorbServerBongs(ready(2, 1), 500, 4, 4).remaining).toBe(1)
  })

  test('still drops queued overlays when the server total shrinks', () => {
    expect(absorbServerBongs(ready(5, 2), 500, 4).remaining).toBe(1)
  })
})

describe('bongsGainedFromSolve', () => {
  test('returns how many bongs a solve newly unlocks', () => {
    expect(bongsGainedFromSolve(0, 250)).toBe(1)
    expect(bongsGainedFromSolve(750, 1000)).toBe(1)
    expect(bongsGainedFromSolve(750, 100)).toBe(0)
    expect(bongsGainedFromSolve(750, 3000)).toBe(2)
  })

  test('respects the bong cap', () => {
    expect(bongsGainedFromSolve(750, 100_000)).toBe(2)
    expect(bongsGainedFromSolve(750, 5000, 3)).toBe(1)
  })
})
