import { InstanceStatus } from '@rctf/types'

/**
 * How long a start is watched before the team is told to try again. Cloudflare
 * drops the Start request after about 100 s, but the instancer keeps going, and
 * pulling a challenge image for the first time can take minutes.
 */
export const PENDING_START_TIMEOUT_MS = 300_000

export type PendingStartOutcome =
  | 'ready'
  | 'errored'
  | 'failed'
  | 'timed-out'
  | 'starting'
  | 'waiting'

/** Decides what a status check means for a tracked start. */
export function resolvePendingStart(
  entry: { startedAt: number; seenStarting: boolean },
  status: InstanceStatus | undefined,
  now: number
): PendingStartOutcome {
  if (status === InstanceStatus.RUNNING) return 'ready'
  if (status === InstanceStatus.ERRORED) return 'errored'
  // NOTE: The instancer removes everything when a build fails, so an instance
  // that was starting and is now stopped did not make it.
  if (status === InstanceStatus.STOPPED && entry.seenStarting) return 'failed'
  if (now - entry.startedAt >= PENDING_START_TIMEOUT_MS) return 'timed-out'
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
