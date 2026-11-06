import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { DatabaseClient } from '@rctf/db'
import { isRetryableTxError, retryTransaction } from '@rctf/db/util'
import { ChallengeScoringKind } from '@rctf/types'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  cacheLeaderboard,
  type CalculatedLeaderboard,
} from '../cache/leaderboard'
import { createPricedSolve } from './challenges'
import { applyDecayPointsForChallenge } from './solve-points'

// Explicit opt-in. Concurrency needs several connections, so temp tables
// won't do: the fixtures live in a throwaway schema that shadows the written
// tables (search_path puts it first) and is dropped afterwards.
const databaseUrl = process.env.RCTF_TEST_DATABASE_URL
const schema = `deadlock_test_${crypto.randomUUID().replaceAll('-', '')}`
const admin = databaseUrl
  ? postgres(databaseUrl, { max: 1, onnotice: () => {} })
  : undefined
const client = databaseUrl
  ? postgres(databaseUrl, {
      max: 30,
      connection: { search_path: `${schema}, public` },
      onnotice: () => {},
    })
  : undefined
const db = client ? (drizzle(client) as unknown as DatabaseClient) : undefined

const shadowed = [
  'users',
  'challenges',
  'solves',
  'submission_logs',
  'score_events',
]

const TEAMS = 60
const PRE_SOLVED = 40
const team = (i: number) => `team-${String(i).padStart(3, '0')}`

beforeAll(async () => {
  if (!admin) return
  await admin.unsafe(`CREATE SCHEMA ${schema}`)
  for (const table of shadowed) {
    await admin.unsafe(
      `CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`
    )
  }
  await admin.unsafe(`
    ALTER TABLE ${schema}.solves ADD FOREIGN KEY (userid) REFERENCES ${schema}.users (id);
    ALTER TABLE ${schema}.score_events ADD FOREIGN KEY (userid) REFERENCES ${schema}.users (id);
  `)
})

afterAll(async () => {
  await client?.end()
  await admin?.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
  await admin?.end()
})

const challengeData = {
  name: 'Hot',
  category: 'test',
  author: 'test',
  description: '',
  points: { min: 100, max: 500 },
  tiebreakEligible: true,
  hidden: false,
  scoring: { kind: ChallengeScoringKind.DECAY },
}

const deadlockCount = async (): Promise<number> => {
  await admin!`SELECT pg_stat_force_next_flush()`
  await admin!`SELECT pg_stat_clear_snapshot()`
  const [row] = await admin!<{ deadlocks: string }[]>`
    SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()
  `
  return Number(row?.deadlocks ?? 0)
}

describe.skipIf(!client)('flag submit vs scoreboard write', () => {
  test('correct flags are not rejected while the scoreboard rewrites every team', async () => {
    // Insert teams in reverse id order so the UPDATE's heap scan visits them
    // in the opposite order to the solve-time order the pricing read uses.
    for (let i = TEAMS - 1; i >= 0; i--) {
      await db!.execute(sql`
        INSERT INTO users (id, name, email, division, perms)
        VALUES (${team(i)}, ${team(i)}, ${`${team(i)}@test`}, 'open', 0)
      `)
    }
    await db!.execute(sql`
      INSERT INTO challenges (id, data)
      VALUES ('hot', ${JSON.stringify(challengeData)}::jsonb)
    `)
    for (let i = 0; i < PRE_SOLVED; i++) {
      await createPricedSolve(db!, { challengeId: 'hot', userId: team(i) })
    }

    const board = (): CalculatedLeaderboard => ({
      users: Array.from({ length: TEAMS }, (_, i) => ({
        id: team(i),
        name: team(i),
        division: 'open',
        score: TEAMS - i,
        hadAnySolve: true,
        lastSolve: Date.now(),
        lastTiebreakEligibleSolve: Date.now(),
      })),
      challengeInfos: new Map(),
      samples: [],
    })

    const deadlocksBefore = await deadlockCount()

    let submitting = true
    const scoreboard = (async () => {
      let writes = 0
      while (submitting) {
        await cacheLeaderboard(db!, board())
        writes++
      }
      return writes
    })()
    const recompute = (async () => {
      while (submitting) {
        await applyDecayPointsForChallenge(db!, 'hot', 'flag')
      }
    })()

    const results = await Promise.allSettled(
      Array.from({ length: TEAMS - PRE_SOLVED }, (_, k) =>
        createPricedSolve(db!, {
          challengeId: 'hot',
          userId: team(PRE_SOLVED + k),
        })
      )
    )
    submitting = false
    const [writes] = await Promise.all([scoreboard, recompute])

    const rejected = results.filter(r => r.status === 'rejected')
    expect(
      rejected.map(r => String((r as PromiseRejectedResult).reason))
    ).toEqual([])
    expect(writes).toBeGreaterThan(0)

    const [saved] = await db!.execute<{ n: number }>(
      sql`SELECT COUNT(*)::int AS n FROM solves WHERE challengeid = 'hot'`
    )
    expect(saved?.n).toBe(TEAMS)

    // Not only masked by the retry: consistent lock order means none at all.
    expect(await deadlockCount()).toBe(deadlocksBefore)
  }, 60_000)

  test('retryTransaction recognises a real deadlock and reruns the transaction', async () => {
    await db!.execute(sql`
      INSERT INTO users (id, name, email, division, perms) VALUES
        ('dl-a', 'dl-a', 'dl-a@test', 'open', 0),
        ('dl-b', 'dl-b', 'dl-b@test', 'open', 0)
    `)

    // Two transactions lock a then b / b then a: Postgres kills one with
    // 40P01. Each waits for the other's first lock before taking its second.
    let attempts = 0
    let firstLocks = 0
    let release!: () => void
    const bothLocked = new Promise<void>(resolve => (release = resolve))
    const crossLock = (first: string, second: string) =>
      retryTransaction(() => {
        attempts++
        return db!.transaction(async tx => {
          await tx.execute(
            sql`UPDATE users SET score = score + 1 WHERE id = ${first}`
          )
          if (++firstLocks === 2) release()
          await bothLocked
          await tx.execute(
            sql`UPDATE users SET score = score + 1 WHERE id = ${second}`
          )
        })
      })

    await Promise.all([crossLock('dl-a', 'dl-b'), crossLock('dl-b', 'dl-a')])
    expect(attempts).toBe(3)

    const rows = await db!.execute<{ score: number }>(
      sql`SELECT score FROM users WHERE id IN ('dl-a', 'dl-b')`
    )
    expect(rows.map(r => r.score)).toEqual([2, 2])
  })

  test('isRetryableTxError ignores ordinary errors', () => {
    expect(isRetryableTxError(new Error('boom'))).toBe(false)
    expect(isRetryableTxError(undefined)).toBe(false)
  })
})
