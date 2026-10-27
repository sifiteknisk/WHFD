<script lang="ts">
  import { MAX_BONGS } from '@rctf/util'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useBongVersion, useCurrentUser } from '$lib/query/user'
  import BongOverlay from './bong-overlay.svelte'
  import {
    absorbServerBongs,
    emptyBongQueue,
    noteLocalSolve,
    noteServerBongs,
  } from './queue'
  import { pendingSolves } from './session.svelte'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()

  // Teammates' solves only reach this tab through the server, so poll a cheap
  // per-team counter and refetch the user as soon as it moves.
  const versionQuery = useBongVersion(
    () => userQuery.data?.id,
    () => {
      const config = configQuery.data
      if (!config || Date.now() > config.endTime) return false
      return config.bongPollInterval
    }
  )

  // Bongs that land while the tab is hidden are synced silently, not replayed
  // on return. After coming back, keep absorbing until a fresh version check
  // lands and, if it moved, until the user refetch carrying the missed bongs.
  let hidden = false
  let returnedAt: number | undefined
  let refetchedAt: number | undefined

  $effect(() => {
    hidden = document.visibilityState === 'hidden'
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hidden = true
      } else if (hidden) {
        hidden = false
        returnedAt = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  })

  let seen: { userId: string; version: number } | undefined
  $effect(() => {
    const userId = userQuery.data?.id
    const version = versionQuery.data
    const updatedAt = versionQuery.dataUpdatedAt
    if (userId === undefined || version === undefined) return
    const changed = seen?.userId === userId && seen.version !== version
    if (returnedAt !== undefined && updatedAt >= returnedAt) {
      returnedAt = undefined
      if (changed) refetchedAt = Date.now()
    }
    if (changed) {
      // The team's score rose (or an admin changed its bongs), so refresh
      // everything that shows it, not just the bong counters.
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
      queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
      queryClient.invalidateQueries({
        queryKey: queryKeys.challenges,
        exact: true,
      })
    }
    seen = { userId, version }
  })

  let queue = emptyBongQueue()
  let applied = 0
  let stamp = $state(0)
  /** Queue position (1 = showing now) of the bong that hit the cap, or 0. */
  let maxAt = 0

  /** Which overlay to play next, if any. */
  const show = $derived.by(() => {
    void stamp
    const before = queue
    // Tracked even when the data is identical so catch-up always ends.
    const userUpdatedAt = userQuery.dataUpdatedAt
    const solves = pendingSolves()
    // Local predicts first so an optimistic bongsTotal bump cannot queue a
    // second overlay on top of the same solve.
    for (const solve of solves.slice(applied)) {
      queue = noteLocalSolve(queue, solve.score, solve.points, solve.bongPoints)
    }
    applied = solves.length
    const absorbing =
      hidden || returnedAt !== undefined || refetchedAt !== undefined
    queue = (absorbing ? absorbServerBongs : noteServerBongs)(
      queue,
      userQuery.data?.score,
      userQuery.data?.bongsTotal,
      userQuery.data?.bongsAvailable
    )
    if (refetchedAt !== undefined && userUpdatedAt >= refetchedAt) {
      refetchedAt = undefined
    }
    // The last bong announced in the batch that reached the cap is the max win.
    if (
      queue.remaining > before.remaining &&
      (before.known ?? MAX_BONGS) < MAX_BONGS &&
      queue.known === MAX_BONGS
    ) {
      maxAt = queue.remaining
    } else if ((queue.known ?? 0) < MAX_BONGS || maxAt > queue.remaining) {
      maxAt = 0
    }
    if (queue.remaining === 0) return undefined
    return maxAt === 1 ? 'max' : 'bong'
  })

  function dismiss() {
    queue = { ...queue, remaining: Math.max(0, queue.remaining - 1) }
    maxAt = Math.max(0, maxAt - 1)
    stamp += 1
  }
</script>

{#if show}
  {#key stamp}
    <BongOverlay max={show === 'max'} onDone={dismiss} />
  {/key}
{/if}
