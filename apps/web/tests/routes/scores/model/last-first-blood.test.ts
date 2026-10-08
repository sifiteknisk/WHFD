import { latestFirstBlood } from '$routes/scores/model/last-first-blood'
import { describe, expect, test } from 'bun:test'

const challenge = (
  overrides: Partial<{
    name: string
    category: string
    points: number
    firstBloodAt: number | null
    firstSolvers: { id: string }[]
  }> = {}
) => ({
  name: 'demo',
  category: 'web',
  points: 100,
  firstBloodAt: 1_000,
  firstSolvers: [{ id: 'team-a' }],
  ...overrides,
})

describe('latestFirstBlood', () => {
  test('returns null when nothing has been blooded', () => {
    expect(
      latestFirstBlood({
        open: challenge({ firstBloodAt: null, firstSolvers: [] }),
      })
    ).toBeNull()
  })

  test('picks the most recent first blood', () => {
    expect(
      latestFirstBlood({
        early: challenge({
          name: 'early',
          firstBloodAt: 1_000,
          firstSolvers: [{ id: 'team-a' }],
        }),
        late: challenge({
          name: 'late',
          category: 'pwn',
          points: 500,
          firstBloodAt: 5_000,
          firstSolvers: [{ id: 'team-b' }],
        }),
      })
    ).toEqual({
      challengeId: 'late',
      challengeName: 'late',
      category: 'pwn',
      points: 500,
      teamId: 'team-b',
      at: 5_000,
    })
  })

  test('breaks timestamp ties by challenge id', () => {
    const blood = latestFirstBlood({
      aaa: challenge({ firstBloodAt: 2_000, firstSolvers: [{ id: 'team-a' }] }),
      zzz: challenge({ firstBloodAt: 2_000, firstSolvers: [{ id: 'team-z' }] }),
    })
    expect(blood?.challengeId).toBe('zzz')
  })
})
