import {
  applyBongTotal,
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

  test('drops queued announcements when unredeemed bongs are revoked', () => {
    expect(applyBongTotal(5, 0, 4)).toEqual({ known: 4, remaining: 0 })
    expect(applyBongTotal(5, 2, 4)).toEqual({ known: 4, remaining: 1 })
  })
})

describe('noteLocalSolve', () => {
  test('plays as soon as the predicted score crosses a bong', () => {
    expect(noteLocalSolve(ready(2), 2500, 600)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: 2500,
      predictedScore: 3100,
    })
  })

  test('stacks a second solve onto the prediction', () => {
    const once = noteLocalSolve(ready(2), 2500, 600)
    expect(noteLocalSolve(once, 2500, 1000)).toEqual({
      known: 4,
      remaining: 2,
      unconfirmedFrom: 2500,
      predictedScore: 4100,
    })
  })

  test('stops the overlay at the bong cap', () => {
    expect(noteLocalSolve(ready(2), 2500, 1600, 3)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: 2500,
      predictedScore: 4100,
    })
  })

  test('does not play when the points stay inside the current bong', () => {
    const queue = ready(2)
    expect(noteLocalSolve(queue, 2500, 100)).toMatchObject({
      known: 2,
      remaining: 0,
      predictedScore: 2600,
    })
  })

  test('waits for a server baseline before announcing', () => {
    expect(noteLocalSolve(emptyBongQueue(), 2500, 600)).toEqual(
      emptyBongQueue()
    )
  })
})

describe('noteServerBongs', () => {
  test('does not replay a bong the client already announced', () => {
    const announced = noteLocalSolve(ready(2), 2500, 600)
    expect(noteServerBongs(announced, 3100, 3)).toEqual({
      known: 3,
      remaining: 1,
      unconfirmedFrom: undefined,
      predictedScore: undefined,
    })
  })

  test('ignores a poll that has not picked up the solve yet', () => {
    const announced = noteLocalSolve(ready(2), 2500, 600)
    expect(noteServerBongs(announced, 2500, 2)).toBe(announced)
  })

  test('drops an unplayed bong when the awarded points fall short', () => {
    const announced = noteLocalSolve(ready(2), 2500, 600)
    expect(noteServerBongs(announced, 2900, 2)).toEqual({
      known: 2,
      remaining: 0,
      unconfirmedFrom: undefined,
      predictedScore: undefined,
    })
  })
})
