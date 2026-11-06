import {
  bongCost,
  bongsFromPoints,
  bongThreshold,
  pointsToNextBong,
} from '@rctf/util'
import { describe, expect, test } from 'bun:test'
import { settleBongCounts } from './bongs'

describe('bong curve', () => {
  test('starts at 250 and doubles each bong', () => {
    expect([1, 2, 3, 4].map(bongCost)).toEqual([250, 500, 1000, 2000])
    expect([0, 1, 2, 3, 4].map(bongThreshold)).toEqual([
      0, 250, 750, 1750, 3750,
    ])
  })

  test('counts bongs from cumulative points up to the cap', () => {
    expect(bongsFromPoints(0)).toBe(0)
    expect(bongsFromPoints(249)).toBe(0)
    expect(bongsFromPoints(250)).toBe(1)
    expect(bongsFromPoints(749)).toBe(1)
    expect(bongsFromPoints(750)).toBe(2)
    expect(bongsFromPoints(3750)).toBe(4)
    expect(bongsFromPoints(100_000)).toBe(4)
    expect(bongsFromPoints(100_000, 2)).toBe(2)
  })

  test('reports points left until the next bong', () => {
    expect(pointsToNextBong(0)).toBe(250)
    expect(pointsToNextBong(250)).toBe(500)
    expect(pointsToNextBong(1000)).toBe(750)
    expect(pointsToNextBong(3749)).toBe(1)
    expect(pointsToNextBong(3750)).toBeNull()
  })
})

const counts = (earned: number, total: number, available: number) => ({
  bongsEarned: earned,
  bongsTotal: total,
  bongsAvailable: available,
})

describe('settleBongCounts', () => {
  test('keeps manual grants on top of points earned', () => {
    expect(settleBongCounts(0, counts(0, 5, 5))).toEqual(counts(0, 5, 5))
    expect(settleBongCounts(250, counts(0, 5, 5))).toEqual(counts(1, 6, 6))
    expect(settleBongCounts(250, counts(1, 6, 6))).toEqual(counts(1, 6, 6))
  })

  test('does not let a manual grant absorb a later earned bong', () => {
    expect(settleBongCounts(250, counts(0, 1, 0))).toEqual(counts(1, 2, 1))
  })

  test('keeps earned bongs when current score would no longer cover them', () => {
    expect(settleBongCounts(1750, counts(3, 3, 3))).toEqual(counts(3, 3, 3))
    expect(settleBongCounts(0, counts(3, 3, 3))).toEqual(counts(3, 3, 3))
  })

  test('keeps a handed-out bong without offering it again', () => {
    expect(settleBongCounts(250, counts(1, 1, 0))).toEqual(counts(1, 1, 0))
  })

  test('keeps an unredeemed bong still covered by points earned', () => {
    expect(settleBongCounts(250, counts(1, 1, 1))).toEqual(counts(1, 1, 1))
  })

  test('grants another bong after more points are earned past a prior hand-out', () => {
    expect(settleBongCounts(1000, counts(1, 1, 0))).toEqual(counts(2, 2, 1))
  })

  test('grants newly earned bongs above the ones already handed out', () => {
    expect(settleBongCounts(3750, counts(1, 1, 0))).toEqual(counts(4, 4, 3))
  })

  test('stops at the bong cap without taking back ones already handed out', () => {
    expect(settleBongCounts(5000, counts(0, 0, 0), 2)).toEqual(counts(2, 2, 2))
    expect(settleBongCounts(5000, counts(4, 4, 1), 2)).toEqual(counts(4, 4, 1))
  })

  test('never leaves more available than total', () => {
    for (const [points, current] of [
      [0, counts(0, 3, 3)],
      [250, counts(0, 2, 1)],
      [3750, counts(1, 5, 4)],
      [100_000, counts(4, 9, 0)],
    ] as const) {
      const settled = settleBongCounts(points, current)
      expect(settled.bongsAvailable).toBeLessThanOrEqual(settled.bongsTotal)
      expect(settled.bongsEarned).toBeLessThanOrEqual(settled.bongsTotal)
    }
  })
})
