<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { challengeInstanceQueryOptions } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import { onMount, untrack } from 'svelte'
  import {
    clearPendingStarts,
    markStarting,
    pendingStarts,
    restorePendingStarts,
    untrackStart,
    type PendingStart,
  } from './pending-starts.svelte'
  import {
    PENDING_START_TIMEOUT_MS,
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
      return
    }
    for (const entry of pendingStarts.values()) {
      if (entry.userId !== userId) untrackStart(entry.challengeId)
    }
  })

  function isViewing(challengeId: string): boolean {
    return (
      document.visibilityState === 'visible' &&
      page.url.pathname.startsWith('/challenges') &&
      page.url.searchParams.get('challenge') === challengeId
    )
  }

  async function check(entry: PendingStart): Promise<void> {
    let status
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
    } catch {
      status = undefined
    }

    finishCheck(entry, status)
  }

  function finishCheck(entry: PendingStart, status?: InstanceStatus): void {
    // The team may have stopped or restarted it while this check was running.
    if (pendingStarts.get(entry.challengeId) !== entry) return
    if (entry.userId !== userQuery.data?.id) return

    const name = entry.challengeName
    switch (resolvePendingStart(entry, status, Date.now())) {
      case 'ready':
        untrackStart(entry.challengeId)
        if (!isViewing(entry.challengeId)) {
          toast.success('Instance ready', {
            description: name,
            duration: 10_000,
            action: {
              label: 'Open',
              onClick: () => {
                void goto(
                  `/challenges?challenge=${encodeURIComponent(entry.challengeId)}`
                )
              },
            },
          })
        }
        break
      case 'errored':
        untrackStart(entry.challengeId)
        toast.error('Instance failed to start', { description: name })
        break
      case 'failed':
        untrackStart(entry.challengeId)
        toast.error('Instance failed to start', {
          description: `${name}: press Start to try again.`,
        })
        break
      case 'timed-out':
        untrackStart(entry.challengeId)
        toast.error('Instance still not ready', {
          description: `${name}: check its status before pressing Start again.`,
        })
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
        if (Date.now() - entry.startedAt >= PENDING_START_TIMEOUT_MS) {
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
