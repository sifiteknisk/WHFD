import { afterAll, describe, expect, test } from 'bun:test'
import type { DatabaseClient } from '@rctf/db'
import { scoreEvents, solves } from '@rctf/db'
import { ChallengeScoringKind } from '@rctf/types'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { bongPointsEarned } from './bongs'
import { createPricedSolve } from './challenges'
import { applyDecayPointsForChallenge } from './solve-points'

// Explicit opt-in; fixtures only use temporary tables on a dedicated connection.
const databaseUrl = process.env.RCTF_TEST_DATABASE_URL
const client = databaseUrl ? postgres(databaseUrl, { max: 1 }) : undefined
afterAll(async () => {
  await client?.end()
})

const challengeData = {
  name: 'Priced',
  category: 'test',
  author: 'test',
  description: '',
  points: { min: 100, max: 500 },
  tiebreakEligible: true,
  hidden: false,
  scoring: { kind: ChallengeScoringKind.DECAY },
}

describe.skipIf(!client)('flag solve pricing', () => {
  test('prices the solve and its bong points before the debounced recompute', async () => {
    await drizzle(client!)
      .transaction(async tx => {
        // Shadow application tables so this test cannot touch real data.
        await tx.execute(sql`
          CREATE TEMP TABLE users (LIKE public.users INCLUDING DEFAULTS) ON COMMIT DROP;
          CREATE TEMP TABLE challenges (LIKE public.challenges INCLUDING DEFAULTS) ON COMMIT DROP;
          CREATE TEMP TABLE solves (LIKE public.solves INCLUDING DEFAULTS) ON COMMIT DROP;
          CREATE TEMP TABLE submission_logs (LIKE public.submission_logs INCLUDING DEFAULTS) ON COMMIT DROP;
          CREATE TEMP TABLE score_events (LIKE public.score_events INCLUDING DEFAULTS) ON COMMIT DROP;
          INSERT INTO users (id, name, email, division, perms)
            VALUES ('team-a', 'A', 'a@test', 'open', 0),
                   ('team-b', 'B', 'b@test', 'open', 0);
        `)
        await tx.execute(sql`
          INSERT INTO challenges (id, data)
          VALUES ('priced', ${JSON.stringify(challengeData)}::jsonb)
        `)
        const db = tx as unknown as DatabaseClient
        const pointsOf = async (userId: string) =>
          (
            await db
              .select({ points: solves.points })
              .from(solves)
              .where(eq(solves.userid, userId))
          )[0]?.points
        const eventCount = async (userId: string) =>
          (
            await db
              .select({ id: scoreEvents.id })
              .from(scoreEvents)
              .where(eq(scoreEvents.userid, userId))
          ).length

        const first = await createPricedSolve(db, {
          challengeId: 'priced',
          userId: 'team-a',
        })
        expect(first?.bloodNumber).toBe(1)
        expect(first!.points).toBeGreaterThan(0)
        // Counted toward bongs straight away, not only after the recompute.
        expect(await pointsOf('team-a')).toBe(first!.points)
        expect(await bongPointsEarned(db, 'team-a')).toBe(first!.points)

        // The later full recompute finds it already priced: no double count.
        await applyDecayPointsForChallenge(db, 'priced', 'flag')
        expect(await eventCount('team-a')).toBe(1)
        expect(await bongPointsEarned(db, 'team-a')).toBe(first!.points)

        const second = await createPricedSolve(db, {
          challengeId: 'priced',
          userId: 'team-b',
        })
        expect(second?.bloodNumber).toBe(2)
        expect(second!.points).toBeLessThanOrEqual(first!.points)
        expect(await bongPointsEarned(db, 'team-b')).toBe(second!.points)
        // Other solvers keep their price until the debounced recompute.
        expect(await pointsOf('team-a')).toBe(first!.points)

        await applyDecayPointsForChallenge(db, 'priced', 'flag')
        expect(await pointsOf('team-a')).toBe(second!.points)
        expect(await eventCount('team-b')).toBe(1)
        // Decay only lowers the score; bong points keep the gain.
        expect(await bongPointsEarned(db, 'team-a')).toBe(first!.points)

        tx.rollback()
      })
      .catch(err => {
        if (!(err instanceof Error && err.message === 'Rollback')) throw err
      })
  })
})
