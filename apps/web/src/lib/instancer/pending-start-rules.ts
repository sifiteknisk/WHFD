import { InstanceStatus } from '@rctf/types'

/**
 * How long a start is watched before the team is told to try again. Cloudflare
 * drops the Start request after about 100 s, but the instancer keeps going, and
 * pulling a challenge image for the first time can take minutes. Time spent
 * waiting in the instancer's start queue does not count.
 */
export const PENDING_START_TIMEOUT_MS = 300_000

export type PendingStartOutcome =
  | 'ready'
  | 'errored'
  | 'failed'
  | 'timed-out'
  | 'queued'
  | 'starting'
  | 'waiting'

type PendingStartTiming = {
  startedAt: number
  seenStarting: boolean
  /** Last time the instancer reported the start as waiting in its queue. */
  queuedAt?: number
}

/** When the timeout clock for a tracked start began. */
export function pendingSince(entry: PendingStartTiming): number {
  return entry.queuedAt ?? entry.startedAt
}

/** Decides what a status check means for a tracked start. */
export function resolvePendingStart(
  entry: PendingStartTiming,
  status: InstanceStatus | undefined,
  now: number,
  queued = false
): PendingStartOutcome {
  if (status === InstanceStatus.RUNNING) return 'ready'
  if (status === InstanceStatus.ERRORED) return 'errored'
  // NOTE: The instancer removes everything when a build fails, so an instance
  // that was starting and is now stopped did not make it.
  if (status === InstanceStatus.STOPPED && entry.seenStarting) return 'failed'
  if (queued) return 'queued'
  if (now - pendingSince(entry) >= PENDING_START_TIMEOUT_MS) return 'timed-out'
  return status === InstanceStatus.STARTING ? 'starting' : 'waiting'
}

/**
 * Instancer errors meaning a start for this team is already in progress, so
 * the page should keep waiting rather than offer Start again.
 */
export function isAlreadyStartingError(message: string): boolean {
  return /already exists|already running|operation is in progress/i.test(
    message
  )
}
