import {
  easy,
  fire,
  medium,
  pointsTier,
} from '$routes/challenges/model/points-tier'
import { describe, expect, test } from 'bun:test'

describe('pointsTier', () => {
  test.each([
    [0, 'easy'],
    [easy, 'easy'],
    [easy + 1, 'medium'],
    [medium, 'medium'],
    [medium + 1, 'hard'],
    [fire - 1, 'hard'],
    [fire, 'fire'],
    [5000, 'fire'],
  ] as const)('%p -> %p', (points, tier) => {
    expect(pointsTier(points)).toBe(tier)
  })
})
