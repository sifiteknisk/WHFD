import { cacheLeaderboardAndGraph } from '@rctf/api/src/cache/leaderboard'
import type { TypedRedis } from '@rctf/api/src/cache/scripts'
import { settleBongCounts } from '@rctf/api/src/services/bongs'
import { upsertChallenge } from '@rctf/api/src/services/challenges'
import { calculateLeaderboard } from '@rctf/api/src/services/leaderboard-calculation'
import { applyDecayPointsForChallenge } from '@rctf/api/src/services/solve-points'
import { getUser, getUserByNameOrEmail } from '@rctf/api/src/services/users'
import { solves, type DatabaseClient, type User } from '@rctf/db'
import { ChallengeScoringKind, normalizeEmail } from '@rctf/types'

export const findTeam = async (
  db: DatabaseClient,
  query: string
): Promise<User | undefined> => {
  const trimmed = query.trim()
  return await getUserByNameOrEmail(db, {
    name: trimmed,
    email: normalizeEmail(trimmed),
  })
}

export type AwardedSolve = {
  challengeId: string
  challengeName: string
  points: number
  score: number
  bongsTotal: number
  bongsAvailable: number
}

export const awardTestSolve = async (
  db: DatabaseClient,
  redis: TypedRedis,
  user: User,
  points: number,
  kind: 'blood' | 'bong'
): Promise<AwardedSolve> => {
  const challengeId = `test-${kind}-${crypto.randomUUID()}`
  const challengeName = kind === 'blood' ? 'Test first blood' : 'Test bong'

  await upsertChallenge(db, challengeId, {
    name: challengeName,
    category: 'test',
    author: 'cli',
    description: 'Created by rctf test.',
    points: { min: points, max: points },
    tiebreakEligible: true,
    hidden: false,
    scoring: { kind: ChallengeScoringKind.DECAY },
  })

  await db.insert(solves).values({
    id: crypto.randomUUID(),
    challengeid: challengeId,
    userid: user.id,
    createdat: new Date().toISOString(),
    source: 'flag',
  })

  const priced = await applyDecayPointsForChallenge(db, challengeId, 'flag')
  if (priced.newPoints !== points) {
    throw new Error(
      `Scoring awarded ${priced.newPoints} pts, expected ${points}`
    )
  }

  await cacheLeaderboardAndGraph(
    db,
    redis,
    await calculateLeaderboard(db, redis)
  )

  const row = await getUser(db, user.id)
  const bongs = settleBongCounts(
    row?.score ?? 0,
    row?.bongsTotal ?? 0,
    row?.bongsAvailable ?? 0
  )

  return {
    challengeId,
    challengeName,
    points,
    score: row?.score ?? 0,
    bongsTotal: bongs.bongsTotal,
    bongsAvailable: bongs.bongsAvailable,
  }
}
