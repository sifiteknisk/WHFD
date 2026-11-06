import { toast } from '$lib/toast'
import { SvelteMap } from 'svelte/reactivity'

export type RunningInstanceAction = {
  /** `start`, `stop`, `extend`, or a challenge action id. */
  key: string
  /** Set once the request has taken longer than a normal one would. */
  slow: boolean
}

// NOTE: Normal requests answer within a few seconds; past this, the instancer
// is most likely queueing work from many teams.
const SLOW_AFTER_MS = 8000

/**
 * Instancer requests still waiting for an answer, by instance. Kept outside the
 * challenge panel so leaving and reopening a challenge still shows the request
 * as busy instead of offering the button again.
 */
const running = new SvelteMap<string, RunningInstanceAction>()

export function runningInstanceAction(
  scope: string
): RunningInstanceAction | undefined {
  return running.get(scope)
}

export async function runInstanceAction(
  scope: string,
  key: string,
  task: () => Promise<void>,
  onError: string | ((error: unknown) => void)
): Promise<void> {
  if (running.has(scope)) return

  const entry = { key, slow: false }
  running.set(scope, entry)
  const slowTimer = setTimeout(() => {
    if (running.get(scope) === entry) running.set(scope, { key, slow: true })
  }, SLOW_AFTER_MS)
  try {
    await task()
  } catch (error) {
    if (typeof onError === 'function') {
      onError(error)
    } else {
      toast.error(error instanceof Error ? error.message : onError)
    }
  } finally {
    clearTimeout(slowTimer)
    running.delete(scope)
  }
}
