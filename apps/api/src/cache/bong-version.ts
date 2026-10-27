import type { TypedRedis } from './scripts'

// Bumped whenever a team's bong state may have changed so every teammate's
// tab can refetch right away instead of waiting for the slow userSelf poll.
const bongVersionKey = (userId: string) => `bong-version:${userId}`

export const bumpBongVersion = async (
  redis: TypedRedis,
  userIds: readonly string[]
): Promise<void> => {
  if (userIds.length === 0) return
  const pipeline = redis.pipeline()
  for (const userId of new Set(userIds)) {
    pipeline.incr(bongVersionKey(userId))
  }
  await pipeline.exec()
}

export const getBongVersion = async (
  redis: TypedRedis,
  userId: string
): Promise<number> => {
  return Number((await redis.get(bongVersionKey(userId))) ?? 0)
}
