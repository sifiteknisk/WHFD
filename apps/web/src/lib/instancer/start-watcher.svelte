<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { challengeInstanceQueryOptions } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import { onMount, untrack } from 'svelte'
  import {
    reportStartFailure,
    reportStartReady,
    startNotices,
  } from './start-feedback.svelte'
  import {
    clearPendingStarts,
    markQueued,
    markStarting,
    pendingStarts,
    restorePendingStarts,
    untrackStart,
    type PendingStart,
  } from './pending-starts.svelte'
  import {
    PENDING_START_TIMEOUT_MS,
    pendingSince,
    resolvePendingStart,
  } from './pending-start-rules'
  import type { InstanceStatus } from '@rctf/types'

  const POLL_INTERVAL_MS = 4000

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const inFlight = new Set<PendingStart>()

  onMount(restorePendingStarts)

  // Starts belong to the team that pressed Start; drop them on logout or switch.
  $effect(() => {
    if (!userQuery.isSuccess) return
    const userId = userQuery.data?.id
    if (!userId) {
      clearPendingStarts()
      startNotices.clear()
      return
    }
    for (const entry of pendingStarts.values()) {
      if (entry.userId !== userId) untrackStart(entry.challengeId)
    }
  })

  async function check(entry: PendingStart): Promise<void> {
    let status
    let queued = false
    try {
      // NOTE: Shares the challenge panel's cache, so the panel updates too and
      // a fresh result from the panel's own polling is reused.
      const data = await queryClient.fetchQuery({
        ...challengeInstanceQueryOptions(entry.challengeId, true),
        staleTime: POLL_INTERVAL_MS - 500,
        retry: false,
        networkMode: 'always',
      })
      status = data.status
      queued = data.queuePosition != null
    } catch {
      status = undefined
    }

    finishCheck(entry, status, queued)
  }

  function finishCheck(
    entry: PendingStart,
    status?: InstanceStatus,
    queued = false
  ): void {
    // The team may have stopped or restarted it while this check was running.
    if (pendingStarts.get(entry.challengeId) !== entry) return
    if (entry.userId !== userQuery.data?.id) return

    const { challengeId, challengeName } = entry
    switch (resolvePendingStart(entry, status, Date.now(), queued)) {
      case 'ready':
        untrackStart(challengeId)
        reportStartReady(challengeId, challengeName)
        break
      case 'errored':
        untrackStart(challengeId)
        reportStartFailure(
          challengeId,
          challengeName,
          'It crashed while starting.'
        )
        break
      case 'failed':
        untrackStart(challengeId)
        reportStartFailure(
          challengeId,
          challengeName,
          'It stopped before it was ready. Press Start to try again.'
        )
        break
      case 'timed-out':
        // NOTE: Pressing Start again is safe: if the first start is still
        // running, the instancer says so and the page keeps waiting.
        untrackStart(challengeId)
        reportStartFailure(
          challengeId,
          challengeName,
          "It's taking much longer than usual. Press Start to check on it.",
          'Instance still not ready'
        )
        break
      case 'queued':
        markQueued(entry.challengeId)
        break
      case 'starting':
        markStarting(entry.challengeId)
        break
      case 'waiting':
        break
    }
  }

  const hasPending = $derived(pendingStarts.size > 0)

  $effect(() => {
    const owner = userQuery.data?.id
    if (!hasPending || !owner) return
    const tick = () => {
      for (const entry of pendingStarts.values()) {
        if (entry.userId !== owner) continue
        if (Date.now() - pendingSince(entry) >= PENDING_START_TIMEOUT_MS) {
          finishCheck(entry)
        } else if (!inFlight.has(entry)) {
          inFlight.add(entry)
          void check(entry).finally(() => inFlight.delete(entry))
        }
      }
    }
    untrack(tick)
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  })
</script>
