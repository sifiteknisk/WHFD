import { describe, expect, test } from 'bun:test'
import type { DatabaseClient } from '@rctf/db'
import type { CalculatedLeaderboard } from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import { createLeaderboardTickRunner } from './leaderboard-runner'

const board = (scores: Record<string, number>): CalculatedLeaderboard => ({
  users: Object.entries(scores).map(([id, score]) => ({
    id,
    name: id,
    division: null,
    score,
    hadAnySolve: score > 0,
    lastSolve: undefined,
    lastTiebreakEligibleSolve: undefined,
  })),
  challengeInfos: new Map(),
  samples: [],
})

const setup = (boards: CalculatedLeaderboard[]) => {
  const raised: string[][] = []
  let index = 0
  const runner = createLeaderboardTickRunner({
    db: {} as DatabaseClient,
    redis: {} as TypedRedis,
    createCalculator: () => async () => ({
      calculated: boards[Math.min(index++, boards.length - 1)]!,
      changed: true,
      recomputedFromScratch: false,
    }),
    cacheLeaderboardAndGraph: async () => {},
    logger: { error: () => {}, warn: () => {} },
    onScoresRaised: async ids => {
      raised.push(ids)
    },
  })
  return { runner, raised }
}

describe('leaderboard tick runner score notifications', () => {
  test('does not notify every team on the first write', async () => {
    const { runner, raised } = setup([board({ a: 100, b: 200 })])
    await runner.tick()
    expect(raised).toEqual([])
  })

  test('notifies only teams whose score rose after the write', async () => {
    const { runner, raised } = setup([
      board({ a: 100, b: 200, c: 300 }),
      // a solved, b decayed, c unchanged, d is new with points
      board({ a: 400, b: 180, c: 300, d: 50 }),
    ])
    await runner.tick()
    await runner.tick()
    expect(raised).toEqual([['a', 'd']])
  })

  test('skips the callback when nothing rose', async () => {
    const { runner, raised } = setup([board({ a: 100 }), board({ a: 90 })])
    await runner.tick()
    await runner.tick()
    expect(raised).toEqual([])
  })
})
