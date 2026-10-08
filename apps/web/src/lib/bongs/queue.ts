export const BONG_POINTS = 1000

export function earnedBongs(score: number, maxBongs?: number | null): number {
  const earned = Math.floor(Math.max(0, score) / BONG_POINTS)
  if (maxBongs == null) return earned
  return Math.min(maxBongs, earned)
}

export type BongQueue = {
  known: number | undefined
  remaining: number
  /** Ignore server snapshots at or below this score; they predate a local solve. */
  unconfirmedFrom: number | undefined
  predictedScore: number | undefined
}

export function emptyBongQueue(): BongQueue {
  return {
    known: undefined,
    remaining: 0,
    unconfirmedFrom: undefined,
    predictedScore: undefined,
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
  if (queue.unconfirmedFrom !== undefined && score <= queue.unconfirmedFrom) {
    return queue
  }
  const settled = applyBongTotal(queue.known, queue.remaining, total)
  if (
    settled.known === queue.known &&
    settled.remaining === queue.remaining &&
    queue.unconfirmedFrom === undefined &&
    queue.predictedScore === undefined
  ) {
    return queue
  }
  return {
    known: settled.known,
    remaining: settled.remaining,
    unconfirmedFrom: undefined,
    predictedScore: undefined,
  }
}

export function noteLocalSolve(
  queue: BongQueue,
  score: number,
  points: number,
  maxBongs?: number | null
): BongQueue {
  if (queue.known === undefined || points <= 0) return queue
  const from = Math.max(score, queue.predictedScore ?? score)
  const predicted = from + points
  const earned = earnedBongs(predicted, maxBongs)
  const unconfirmedFrom = queue.unconfirmedFrom ?? score
  if (earned <= queue.known) {
    if (
      unconfirmedFrom === queue.unconfirmedFrom &&
      predicted === queue.predictedScore
    ) {
      return queue
    }
    return { ...queue, unconfirmedFrom, predictedScore: predicted }
  }
  return {
    known: earned,
    remaining: queue.remaining + (earned - queue.known),
    unconfirmedFrom,
    predictedScore: predicted,
  }
}
