import type { DatabaseClient } from '@rctf/db'
import type { CalculatedLeaderboard } from '../cache/leaderboard'
import type { TypedRedis } from '../cache/scripts'
import type { CachedLeaderboardComputation } from '../services/leaderboard-calculation'

type Calculator = (db: DatabaseClient) => Promise<CachedLeaderboardComputation>

type Logger = {
  error: (obj: unknown, msg?: string) => void
  warn: (msg: string) => void
}

type LeaderboardTickRunnerOptions = {
  db: DatabaseClient
  redis: TypedRedis
  createCalculator: () => Calculator
  cacheLeaderboardAndGraph: (
    db: DatabaseClient,
    redis: TypedRedis,
    data: CalculatedLeaderboard
  ) => Promise<void>
  logger: Logger
  /** Called with teams whose stored score rose in the last cache write. */
  onScoresRaised?: (userIds: string[]) => Promise<void>
  now?: () => number
  periodicCacheIntervalMs?: number
}

type TickOptions = {
  forceCache?: boolean
}

export const createLeaderboardTickRunner = ({
  db,
  redis,
  createCalculator,
  cacheLeaderboardAndGraph,
  logger,
  onScoresRaised,
  now = Date.now,
  periodicCacheIntervalMs = 60_000,
}: LeaderboardTickRunnerOptions) => {
  let calculateCachedLeaderboard = createCalculator()
  let running = false
  let rerunRequested = false
  let forceCacheRequested = false
  let lastUpdatedAt = 0
  let consecutiveFailures = 0
  let pendingCacheWrite = false
  // Scores as of the last cache write; unset until the first one so a fresh
  // leader does not notify every team at once.
  let writtenScores: Map<string, number> | undefined

  const runTick = async (forceCache: boolean): Promise<void> => {
    const currentTime = now()
    const result = await calculateCachedLeaderboard(db)
    const shouldCache =
      forceCache ||
      result.changed ||
      pendingCacheWrite ||
      currentTime - lastUpdatedAt > periodicCacheIntervalMs

    if (shouldCache) {
      pendingCacheWrite = true
      await cacheLeaderboardAndGraph(db, redis, result.calculated)
      pendingCacheWrite = false
      lastUpdatedAt = currentTime
      await notifyRaisedScores(result.calculated.users)
    }
  }

  const notifyRaisedScores = async (
    users: ReadonlyArray<{ id: string; score: number }>
  ): Promise<void> => {
    const previous = writtenScores
    writtenScores = new Map(users.map(user => [user.id, user.score]))
    if (!previous || !onScoresRaised) return
    const raised = users
      .filter(user => user.score > (previous.get(user.id) ?? 0))
      .map(user => user.id)
    if (raised.length === 0) return
    await onScoresRaised(raised).catch(err =>
      logger.error({ err }, 'failed to notify raised scores')
    )
  }

  const tick = async (opts: TickOptions = {}): Promise<void> => {
    if (running) {
      rerunRequested = true
      forceCacheRequested = forceCacheRequested || opts.forceCache === true
      return
    }

    running = true
    let forceCache = opts.forceCache === true
    try {
      do {
        rerunRequested = false
        const shouldForceCache = forceCache || forceCacheRequested
        forceCache = false
        forceCacheRequested = false
        await runTick(shouldForceCache)
      } while (rerunRequested)

      consecutiveFailures = 0
    } catch (err) {
      consecutiveFailures++
      logger.error({ err }, 'leaderboard update failed')

      if (consecutiveFailures >= 3) {
        logger.warn('resetting leaderboard cache')
        calculateCachedLeaderboard = createCalculator()
        consecutiveFailures = 0
      }
    } finally {
      running = false
    }
  }

  return { tick }
}
