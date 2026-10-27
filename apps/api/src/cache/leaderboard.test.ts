import { afterAll, describe, expect, test } from 'bun:test'
import type { DatabaseClient } from '@rctf/db'
import { users } from '@rctf/db'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { addBong, giveBong, listBongs } from '../services/bongs'
import { cacheLeaderboard, type CalculatedLeaderboard } from './leaderboard'

// Explicit opt-in; fixtures only use temporary tables on a dedicated connection.
const databaseUrl = process.env.RCTF_TEST_DATABASE_URL
const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : undefined
afterAll(async () => {
  await client?.end()
})

const emptyLeaderboard: CalculatedLeaderboard = {
  users: [],
  challengeInfos: new Map(),
  samples: [],
}

describe.skipIf(!client)('leaderboard bong persistence', () => {
  test('keeps five manual grants through repeated leaderboard refreshes and redemption', async () => {
    await drizzle(client!).transaction(async tx => {
      // Shadow application tables so this test cannot update real teams.
      await tx.execute(sql`
        CREATE TEMP TABLE users (
          id text PRIMARY KEY, name text, banned boolean DEFAULT false,
          score int DEFAULT 0, bongs_total int DEFAULT 0,
          bongs_available int DEFAULT 0, global_rank int, division_rank int,
          last_solve_at timestamptz, last_tiebreak_solve_at timestamptz,
          CONSTRAINT bongs_available_in_range
            CHECK (bongs_available >= 0 AND bongs_available <= bongs_total)
        ) ON COMMIT DROP;
        CREATE TEMP TABLE score_events (
          userid text, points_delta int, source text
        ) ON COMMIT DROP;
        CREATE TEMP TABLE challenges (
          id text PRIMARY KEY, score int DEFAULT 0, solve_count int DEFAULT 0
        ) ON COMMIT DROP;
        INSERT INTO users (id, name) VALUES ('manual-team', 'Manual team');
      `)
      const migration = await Bun.file(
        new URL(
          '../../../../packages/db/migrations/0030_allow_manual_bong_balance.sql',
          import.meta.url
        )
      ).text()
      await tx.execute(sql.raw(migration))
      const db = tx as unknown as DatabaseClient
      for (let i = 0; i < 5; i++) await addBong(db, 'manual-team')
      const counts = async () => {
        const [row] = await db
          .select({
            bongsTotal: users.bongsTotal,
            bongsAvailable: users.bongsAvailable,
          })
          .from(users)
        return row
      }
      expect(await counts()).toEqual({ bongsTotal: 0, bongsAvailable: 5 })
      for (let i = 0; i < 3; i++) {
        await cacheLeaderboard(db, emptyLeaderboard)
        expect(await counts()).toEqual({ bongsTotal: 0, bongsAvailable: 5 })
      }
      expect(await giveBong(db, 'manual-team')).toBe(4)
      await cacheLeaderboard(db, emptyLeaderboard)
      expect(await counts()).toEqual({ bongsTotal: 0, bongsAvailable: 4 })
      expect(await listBongs(db)).toMatchObject([
        { id: 'manual-team', bongsTotal: 0, bongsAvailable: 4 },
      ])
      await tx.execute(sql`
        INSERT INTO score_events (userid, points_delta, source)
        VALUES ('manual-team', 250, 'flag')
      `)
      const earnedLeaderboard: CalculatedLeaderboard = {
        ...emptyLeaderboard,
        users: [
          {
            id: 'manual-team',
            name: 'Manual team',
            division: 'open',
            score: 250,
            hadAnySolve: true,
            lastSolve: undefined,
            lastTiebreakEligibleSolve: undefined,
          },
        ],
      }
      await cacheLeaderboard(db, earnedLeaderboard)
      expect(await counts()).toEqual({ bongsTotal: 1, bongsAvailable: 5 })
      await cacheLeaderboard(db, earnedLeaderboard)
      expect(await counts()).toEqual({ bongsTotal: 1, bongsAvailable: 5 })
      for (let i = 4; i >= 0; i--) {
        expect(await giveBong(db, 'manual-team')).toBe(i)
      }
      expect(await giveBong(db, 'manual-team')).toBeUndefined()
      await cacheLeaderboard(db, earnedLeaderboard)
      expect(await counts()).toEqual({ bongsTotal: 1, bongsAvailable: 0 })
      expect(await addBong(db, 'manual-team')).toEqual({
        bongsTotal: 1,
        bongsAvailable: 1,
      })
    })
  })
})
