export type PollAnchor = {
  anchor: number
  key: string
  updatedAt: number
  fetchingNextPage: boolean
}

export function nextPollAnchor(
  current: PollAnchor,
  next: { key: string; updatedAt: number; fetchingNextPage: boolean }
): PollAnchor {
  if (
    next.key === current.key &&
    next.updatedAt === current.updatedAt &&
    next.fetchingNextPage === current.fetchingNextPage
  ) {
    return current
  }

  const keyChanged = next.key !== current.key
  const finishedNextPage = current.fetchingNextPage && !next.fetchingNextPage
  let anchor = current.anchor
  if (keyChanged) {
    anchor = next.updatedAt > 0 && !next.fetchingNextPage ? next.updatedAt : 0
  } else if (
    !next.fetchingNextPage &&
    !finishedNextPage &&
    next.updatedAt > 0
  ) {
    anchor = next.updatedAt
  }

  return {
    anchor,
    key: next.key,
    updatedAt: next.updatedAt,
    fetchingNextPage: next.fetchingNextPage,
  }
}

export function secondsUntilNextPoll(
  updatedAt: number,
  now: number,
  intervalMs: number
): number | null {
  if (updatedAt <= 0 || intervalMs <= 0) return null
  const remainingMs = Math.min(
    intervalMs,
    Math.max(0, updatedAt + intervalMs - now)
  )
  return Math.ceil(remainingMs / 1000)
}
