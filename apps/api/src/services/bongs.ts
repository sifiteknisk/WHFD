import type { DatabaseClient, DatabaseTx } from '@rctf/db'
import { scoreEvents, users } from '@rctf/db'
import { and, desc, eq, gt, notInArray, sql } from 'drizzle-orm'

type Db = DatabaseClient | DatabaseTx

export const BONG_POINTS = 1000

/** Sources that undo/redo score for account state — not real point gains. */
const BONG_POINTS_EXCLUDED_SOURCES = ['ban', 'delete'] as const

/** Total bongs a team can earn. Unset means no cap. */
export function maxBongs(): number | undefined {
  const raw = process.env.RCTF_MAX_BONGS
  if (raw === undefined || raw.trim() === '') return undefined
  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `RCTF_MAX_BONGS must be a non-negative integer, got: ${JSON.stringify(raw)}`
    )
  }
  return parsed
}

/** Cumulative points that count toward bongs (gains only; decay does not revoke). */
export function earnedBongsFromPoints(
  pointsEarned: number,
  max = maxBongs()
): number {
  const earned = Math.floor(Math.max(0, pointsEarned) / BONG_POINTS)
  if (max == null) return earned
  return Math.min(max, earned)
}

export function settleBongCounts(
  pointsEarned: number,
  bongsTotal: number,
  bongsAvailable: number,
  max = maxBongs()
): { bongsTotal: number; bongsAvailable: number } {
  const earned = earnedBongsFromPoints(pointsEarned, max)
  const given = Math.max(0, bongsTotal - bongsAvailable)
  // Keep manually added available bongs; only grant newly earned ones on top.
  const available = Math.max(bongsAvailable, Math.max(0, earned - given))
  return { bongsTotal: given + available, bongsAvailable: available }
}

const bongPointsSumSql = sql<number>`coalesce(sum(${scoreEvents.pointsDelta}), 0)`.mapWith(
  Number
)

export const bongPointsEarned = async (
  db: Db,
  userId: string
): Promise<number> => {
  const [row] = await db
    .select({ points: bongPointsSumSql })
    .from(scoreEvents)
    .where(
      and(
        eq(scoreEvents.userid, userId),
        gt(scoreEvents.pointsDelta, 0),
        notInArray(scoreEvents.source, [...BONG_POINTS_EXCLUDED_SOURCES])
      )
    )
  return row?.points ?? 0
}

export const listBongs = async (db: DatabaseClient) => {
  const earnedByUser = new Map(
    (
      await db
        .select({
          userId: scoreEvents.userid,
          points: bongPointsSumSql,
        })
        .from(scoreEvents)
        .where(
          and(
            gt(scoreEvents.pointsDelta, 0),
            notInArray(scoreEvents.source, [...BONG_POINTS_EXCLUDED_SOURCES])
          )
        )
        .groupBy(scoreEvents.userid)
    ).flatMap(row => (row.userId ? [[row.userId, row.points] as const] : []))
  )

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      score: users.score,
      bongsTotal: users.bongsTotal,
      bongsAvailable: users.bongsAvailable,
    })
    .from(users)
    .where(eq(users.banned, false))
    .orderBy(desc(users.bongsAvailable), desc(users.score), users.name)

  return rows.map(row => ({
    ...row,
    ...settleBongCounts(
      earnedByUser.get(row.id) ?? 0,
      row.bongsTotal,
      row.bongsAvailable
    ),
  }))
}

export const giveBong = async (
  db: DatabaseClient,
  id: string
): Promise<number | undefined> => {
  return db.transaction(async tx => {
    const [current] = await tx
      .select({
        bongsTotal: users.bongsTotal,
        bongsAvailable: users.bongsAvailable,
      })
      .from(users)
      .where(eq(users.id, id))
    if (!current) return undefined

    const settled = settleBongCounts(
      await bongPointsEarned(tx, id),
      current.bongsTotal,
      current.bongsAvailable
    )
    if (settled.bongsAvailable <= 0) return undefined

    const [row] = await tx
      .update(users)
      .set({
        bongsTotal: settled.bongsTotal,
        bongsAvailable: settled.bongsAvailable - 1,
      })
      .where(eq(users.id, id))
      .returning({ bongsAvailable: users.bongsAvailable })
    return row?.bongsAvailable
  })
}

/** Manually grant one available bong (correction / compensation). */
export const addBong = async (
  db: DatabaseClient,
  id: string
): Promise<{ bongsTotal: number; bongsAvailable: number } | undefined> => {
  return db.transaction(async tx => {
    const [current] = await tx
      .select({
        bongsTotal: users.bongsTotal,
        bongsAvailable: users.bongsAvailable,
      })
      .from(users)
      .where(eq(users.id, id))
    if (!current) return undefined

    const settled = settleBongCounts(
      await bongPointsEarned(tx, id),
      current.bongsTotal,
      current.bongsAvailable
    )

    const [row] = await tx
      .update(users)
      .set({
        bongsTotal: settled.bongsTotal + 1,
        bongsAvailable: settled.bongsAvailable + 1,
      })
      .where(eq(users.id, id))
      .returning({
        bongsTotal: users.bongsTotal,
        bongsAvailable: users.bongsAvailable,
      })
    return row
  })
}
