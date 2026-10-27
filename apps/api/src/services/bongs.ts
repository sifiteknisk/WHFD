import type { DatabaseClient, DatabaseTx } from '@rctf/db'
import { scoreEvents, users } from '@rctf/db'
import { bongsFromPoints, MAX_BONGS } from '@rctf/util'
import { and, desc, eq, gt, notInArray, sql } from 'drizzle-orm'

type Db = DatabaseClient | DatabaseTx

/** Sources that undo/redo score for account state — not real point gains. */
const BONG_POINTS_EXCLUDED_SOURCES = ['ban', 'delete'] as const

export function settleBongCounts(
  pointsEarned: number,
  bongsTotal: number,
  bongsAvailable: number,
  max = MAX_BONGS
): { bongsTotal: number; bongsAvailable: number } {
  const earned = bongsFromPoints(pointsEarned, max)
  const newlyEarned = Math.max(0, earned - bongsTotal)
  return {
    bongsTotal: bongsTotal + newlyEarned,
    bongsAvailable: bongsAvailable + newlyEarned,
  }
}

const bongPointsSumSql =
  sql<number>`coalesce(sum(${scoreEvents.pointsDelta}), 0)`.mapWith(Number)

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
      avatarUrl: users.avatarUrl,
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
      .for('update')
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
      .for('update')
    if (!current) return undefined

    const settled = settleBongCounts(
      await bongPointsEarned(tx, id),
      current.bongsTotal,
      current.bongsAvailable
    )

    const [row] = await tx
      .update(users)
      .set({
        bongsTotal: settled.bongsTotal,
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
