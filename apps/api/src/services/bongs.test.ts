import { describe, expect, test } from 'bun:test'
import { settleBongCounts } from './bongs'

describe('settleBongCounts', () => {
  test('drops unredeemed bongs when the score no longer earns them', () => {
    expect(settleBongCounts(0, 3, 3)).toEqual({
      bongsTotal: 0,
      bongsAvailable: 0,
    })
  })

  test('keeps a handed-out bong without offering it again', () => {
    expect(settleBongCounts(1000, 1, 0)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 0,
    })
  })

  test('keeps an unredeemed bong the current score still earns', () => {
    expect(settleBongCounts(1000, 1, 1)).toEqual({
      bongsTotal: 1,
      bongsAvailable: 1,
    })
  })

  test('shrinks a decayed score down to the bongs still earned', () => {
    expect(settleBongCounts(2500, 4, 4)).toEqual({
      bongsTotal: 2,
      bongsAvailable: 2,
    })
    expect(settleBongCounts(2500, 4, 2)).toEqual({
      bongsTotal: 2,
      bongsAvailable: 0,
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
      bongsTotal: 3,
      bongsAvailable: 0,
    })
  })
})
