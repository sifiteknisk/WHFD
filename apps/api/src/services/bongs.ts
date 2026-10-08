import type { DatabaseClient } from '@rctf/db'
import { users } from '@rctf/db'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export const BONG_POINTS = 1000

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

export function settleBongCounts(
  score: number,
  bongsTotal: number,
  bongsAvailable: number,
  max = maxBongs()
): { bongsTotal: number; bongsAvailable: number } {
  const earned = Math.min(
    max ?? Number.POSITIVE_INFINITY,
    Math.floor(Math.max(0, score) / BONG_POINTS)
  )
  const given = Math.max(0, bongsTotal - bongsAvailable)
  const available = Math.max(0, earned - given)
  return { bongsTotal: given + available, bongsAvailable: available }
}

export const listBongs = async (db: DatabaseClient) => {
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
    ...settleBongCounts(row.score, row.bongsTotal, row.bongsAvailable),
  }))
}

export const giveBong = async (
  db: DatabaseClient,
  id: string
): Promise<number | undefined> => {
  return db.transaction(async tx => {
    const [current] = await tx
      .select({
        score: users.score,
        bongsTotal: users.bongsTotal,
        bongsAvailable: users.bongsAvailable,
      })
      .from(users)
      .where(eq(users.id, id))
    if (!current) return undefined
    if (
      settleBongCounts(
        current.score,
        current.bongsTotal,
        current.bongsAvailable
      ).bongsAvailable <= 0
    ) {
      return undefined
    }

    const [row] = await tx
      .update(users)
      .set({ bongsAvailable: sql`${users.bongsAvailable} - 1` })
      .where(and(eq(users.id, id), gt(users.bongsAvailable, 0)))
      .returning({
        score: users.score,
        bongsTotal: users.bongsTotal,
        bongsAvailable: users.bongsAvailable,
      })
    if (!row) return undefined
    return settleBongCounts(row.score, row.bongsTotal, row.bongsAvailable)
      .bongsAvailable
  })
}
