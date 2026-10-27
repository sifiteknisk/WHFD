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

describe('settleBongCounts', () => {
  test('keeps manual availability separate from the earned total', () => {
    expect(settleBongCounts(0, 0, 5)).toEqual({
      bongsTotal: 0,
      bongsAvailable: 5,
    })
    expect(settleBongCounts(250, 0, 5)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 6,
    })
    expect(settleBongCounts(250, 1, 6)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 6,
    })
  })

  test('keeps earned bongs when current score would no longer cover them', () => {
    expect(settleBongCounts(1750, 3, 3)).toEqual({
      bongsTotal: 3,
      bongsAvailable: 3,
    })
  })

  test('keeps a handed-out bong without offering it again', () => {
    expect(settleBongCounts(250, 1, 0)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 0,
    })
  })

  test('keeps an unredeemed bong still covered by points earned', () => {
    expect(settleBongCounts(250, 1, 1)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 1,
    })
  })

  test('grants another bong after more points are earned past a prior hand-out', () => {
    expect(settleBongCounts(1000, 1, 0)).toEqual({
      bongsTotal: 2,
      bongsAvailable: 1,
    })
  })

  test('grants newly earned bongs above the ones already handed out', () => {
    expect(settleBongCounts(3750, 1, 0)).toEqual({
      bongsTotal: 4,
      bongsAvailable: 3,
    })
  })

  test('stops at the bong cap without taking back ones already handed out', () => {
    expect(settleBongCounts(5000, 0, 0, 2)).toEqual({
      bongsTotal: 2,
      bongsAvailable: 2,
    })
    expect(settleBongCounts(5000, 4, 1, 2)).toEqual({
      bongsTotal: 4,
      bongsAvailable: 1,
    })
  })

  test('keeps manually added available bongs above point earnings', () => {
    expect(settleBongCounts(250, 3, 2)).toEqual({
      bongsTotal: 3,
      bongsAvailable: 2,
    })
  })
})
