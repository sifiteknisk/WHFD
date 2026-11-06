import { browser } from '$app/environment'
import { SvelteMap } from 'svelte/reactivity'
import { PENDING_START_TIMEOUT_MS } from './pending-start-rules'

/**
 * Instance starts the page is still waiting on. When lots of teams press Start
 * at once, the Start request can time out (504) while the instancer keeps
 * building in the background. A tracked start is watched from the root layout
 * so the team gets a toast when it is ready, even after leaving the challenge.
 */
export type PendingStart = {
  challengeId: string
  challengeName: string
  userId: string
  startedAt: number
  /** Set once the instancer reported the instance as starting. */
  seenStarting: boolean
}

const STORAGE_KEY = 'pendingInstanceStarts'

export const pendingStarts = new SvelteMap<string, PendingStart>()

function persist(): void {
  if (!browser) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...pendingStarts.values()])
    )
  } catch {
    // NOTE: Storage can be full or blocked. Watching still works in this tab.
  }
}

export function restorePendingStarts(): void {
  if (!browser) return
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const entries: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(entries)) return
    const now = Date.now()
    for (const entry of entries) {
      if (
        entry &&
        typeof entry.challengeId === 'string' &&
        typeof entry.challengeName === 'string' &&
        typeof entry.userId === 'string' &&
        typeof entry.startedAt === 'number' &&
        Number.isFinite(entry.startedAt) &&
        typeof entry.seenStarting === 'boolean' &&
        entry.startedAt <= now &&
        now - entry.startedAt < PENDING_START_TIMEOUT_MS
      ) {
        pendingStarts.set(entry.challengeId, entry)
      }
    }
  } catch {
    // Storage can be blocked, or contain invalid JSON; keep watching in memory.
  }
}

export function trackStart(
  entry: Omit<PendingStart, 'startedAt' | 'seenStarting'>
): PendingStart {
  const pending = {
    ...entry,
    startedAt: Date.now(),
    seenStarting: false,
  }
  pendingStarts.set(entry.challengeId, pending)
  persist()
  return pending
}

export function markStarting(challengeId: string): void {
  const entry = pendingStarts.get(challengeId)
  if (!entry || entry.seenStarting) return
  pendingStarts.set(challengeId, { ...entry, seenStarting: true })
  persist()
}

export function untrackStart(challengeId: string): void {
  if (pendingStarts.delete(challengeId)) persist()
}

export function clearPendingStarts(): void {
  if (pendingStarts.size === 0) return
  pendingStarts.clear()
  persist()
}

export function isStartPending(challengeId: string): boolean {
  return pendingStarts.has(challengeId)
}
