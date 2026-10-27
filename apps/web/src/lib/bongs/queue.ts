import { bongsFromPoints, MAX_BONGS } from '@rctf/util'

export type BongQueue = {
  known: number | undefined
  knownAvailable: number | undefined
  remaining: number
  /** Preserve local predictions until the server score catches up. */
  unconfirmedFrom: number | undefined
  /** Cumulative points counted toward bongs after local solves. */
  predictedPoints: number | undefined
}

export function emptyBongQueue(): BongQueue {
  return {
    known: undefined,
    knownAvailable: undefined,
    remaining: 0,
    unconfirmedFrom: undefined,
    predictedPoints: undefined,
  }
}

export function applyBongTotal(
  known: number | undefined,
  remaining: number,
  total: number | undefined
): { known: number | undefined; remaining: number } {
  if (total === undefined) {
    return { known: undefined, remaining: 0 }
  }
  if (known === undefined) {
    return { known: total, remaining }
  }
  if (total > known) {
    return { known: total, remaining: remaining + (total - known) }
  }
  if (total < known) {
    return {
      known: total,
      remaining: Math.max(0, remaining - (known - total)),
    }
  }
  return { known, remaining }
}

export function noteServerBongs(
  queue: BongQueue,
  score: number | undefined,
  total: number | undefined,
  available?: number
): BongQueue {
  if (score === undefined || total === undefined) {
    return queue.known === undefined && queue.remaining === 0
      ? queue
      : emptyBongQueue()
  }
  const totalGained = Math.max(0, total - (queue.known ?? total))
  const availableGained = Math.max(
    0,
    (available ?? 0) - (queue.knownAvailable ?? available ?? 0)
  )
  const waitingForSolve =
    queue.unconfirmedFrom !== undefined &&
    (score <= queue.unconfirmedFrom ||
      (queue.known !== undefined && total < queue.known))
  const knownAvailable =
    waitingForSolve &&
    total < (queue.known ?? total) &&
    queue.knownAvailable !== undefined
      ? Math.max(queue.knownAvailable, available ?? queue.knownAvailable)
      : (available ?? queue.knownAvailable)
  // A stale solve snapshot must not cancel its prediction, but admin grants
  // can still arrive while the leaderboard score is waiting to refresh.
  if (waitingForSolve && totalGained === 0 && availableGained === 0) {
    return knownAvailable === queue.knownAvailable
      ? queue
      : { ...queue, knownAvailable }
  }
  const settled = applyBongTotal(
    queue.known,
    queue.remaining,
    waitingForSolve ? Math.max(queue.known ?? total, total) : total
  )
  // An earned bong raises both counters; announce it once. Admin + only
  // raises availability and must still announce even at the earning cap.
  const remaining =
    settled.remaining + Math.max(0, availableGained - totalGained)
  if (
    settled.known === queue.known &&
    remaining === queue.remaining &&
    knownAvailable === queue.knownAvailable &&
    queue.unconfirmedFrom === undefined &&
    queue.predictedPoints === undefined
  ) {
    return queue
  }
  return {
    known: settled.known,
    knownAvailable,
    remaining,
    unconfirmedFrom: waitingForSolve ? queue.unconfirmedFrom : undefined,
    predictedPoints: waitingForSolve ? queue.predictedPoints : undefined,
  }
}

/**
 * Sync to a server snapshot without announcing anything it adds, for bongs
 * that arrived while the tab was hidden.
 */
export function absorbServerBongs(
  queue: BongQueue,
  score: number | undefined,
  total: number | undefined,
  available?: number
): BongQueue {
  const next = noteServerBongs(queue, score, total, available)
  return next.remaining > queue.remaining
    ? { ...next, remaining: queue.remaining }
    : next
}

/** How many new bongs a solve awards given points already counted (client prediction). */
export function bongsGainedFromSolve(
  bongPoints: number,
  points: number,
  maxBongs = MAX_BONGS
): number {
  if (points <= 0) return 0
  return (
    bongsFromPoints(bongPoints + points, maxBongs) -
    bongsFromPoints(bongPoints, maxBongs)
  )
}

export function noteLocalSolve(
  queue: BongQueue,
  score: number,
  points: number,
  bongPoints: number,
  maxBongs = MAX_BONGS
): BongQueue {
  if (queue.known === undefined || points <= 0) return queue
  const from = queue.predictedPoints ?? bongPoints
  const predicted = from + points
  const earned = bongsFromPoints(predicted, maxBongs)
  const unconfirmedFrom = queue.unconfirmedFrom ?? score
  if (earned <= queue.known) {
    if (
      unconfirmedFrom === queue.unconfirmedFrom &&
      predicted === queue.predictedPoints
    ) {
      return queue
    }
    return { ...queue, unconfirmedFrom, predictedPoints: predicted }
  }
  return {
    known: earned,
    knownAvailable:
      queue.knownAvailable === undefined
        ? undefined
        : queue.knownAvailable + (earned - queue.known),
    remaining: queue.remaining + (earned - queue.known),
    unconfirmedFrom,
    predictedPoints: predicted,
  }
}
