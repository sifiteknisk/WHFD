import { describe, expect, test } from 'bun:test'
import { settleBongCounts } from './bongs'

describe('settleBongCounts', () => {
  test('keeps earned bongs when current score would no longer cover them', () => {
    expect(settleBongCounts(3000, 3, 3)).toEqual({
      bongsTotal: 3,
      bongsAvailable: 3,
    })
  })

  test('keeps a handed-out bong without offering it again', () => {
    expect(settleBongCounts(1000, 1, 0)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 0,
    })
  })

  test('keeps an unredeemed bong still covered by points earned', () => {
    expect(settleBongCounts(1000, 1, 1)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 1,
    })
  })

  test('grants another bong after more points are earned past a prior hand-out', () => {
    expect(settleBongCounts(2500, 1, 0)).toEqual({
      bongsTotal: 2,
      bongsAvailable: 1,
    })
  })

  test('grants newly earned bongs above the ones already handed out', () => {
    expect(settleBongCounts(5000, 3, 2)).toEqual({
      bongsTotal: 5,
      bongsAvailable: 4,
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
    expect(settleBongCounts(1000, 3, 2)).toEqual({
      bongsTotal: 3,
      bongsAvailable: 2,
    })
  })
})
