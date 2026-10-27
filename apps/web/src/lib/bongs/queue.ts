export const BONG_POINTS = 1000

export function earnedBongs(pointsEarned: number, maxBongs?: number | null): number {
  const earned = Math.floor(Math.max(0, pointsEarned) / BONG_POINTS)
  if (maxBongs == null) return earned
  return Math.min(maxBongs, earned)
}

export type BongQueue = {
  known: number | undefined
  remaining: number
  /** Ignore server snapshots at or below this score; they predate a local solve. */
  unconfirmedFrom: number | undefined
  /** Cumulative points counted toward bongs after local solves. */
  predictedPoints: number | undefined
}

export function emptyBongQueue(): BongQueue {
  return {
    known: undefined,
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
  total: number | undefined
): BongQueue {
  if (score === undefined || total === undefined) {
    return queue.known === undefined && queue.remaining === 0
      ? queue
      : emptyBongQueue()
  }
  if (queue.unconfirmedFrom !== undefined) {
    // Score snapshot still predates the local solve.
    if (score <= queue.unconfirmedFrom) return queue
    // Score moved, but bongsTotal has not caught the local prediction yet —
    // keep the queued overlay instead of clearing it mid-celebration.
    if (queue.known !== undefined && total < queue.known) return queue
  }
  const settled = applyBongTotal(queue.known, queue.remaining, total)
  if (
    settled.known === queue.known &&
    settled.remaining === queue.remaining &&
    queue.unconfirmedFrom === undefined &&
    queue.predictedPoints === undefined
  ) {
    return queue
  }
  return {
    known: settled.known,
    remaining: settled.remaining,
    unconfirmedFrom: undefined,
    predictedPoints: undefined,
  }
}

/** How many new bongs a solve awards given the current total (client prediction). */
export function bongsGainedFromSolve(
  bongsTotal: number,
  points: number,
  maxBongs?: number | null
): number {
  if (points <= 0) return 0
  const earned = earnedBongs(bongsTotal * BONG_POINTS + points, maxBongs)
  return Math.max(0, earned - bongsTotal)
}

export function noteLocalSolve(
  queue: BongQueue,
  score: number,
  points: number,
  maxBongs?: number | null
): BongQueue {
  if (queue.known === undefined || points <= 0) return queue
  const from = queue.predictedPoints ?? queue.known * BONG_POINTS
  const predicted = from + points
  const earned = earnedBongs(predicted, maxBongs)
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
    remaining: queue.remaining + (earned - queue.known),
    unconfirmedFrom,
    predictedPoints: predicted,
  }
}
