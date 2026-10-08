<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import BongOverlay from './bong-overlay.svelte'
  import { emptyBongQueue, noteLocalSolve, noteServerBongs } from './queue'
  import { pendingSolves } from './session.svelte'

  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()

  let queue = emptyBongQueue()
  let applied = 0
  let stamp = $state(0)

  const show = $derived.by(() => {
    void stamp
    const solves = pendingSolves()
    queue = noteServerBongs(
      queue,
      userQuery.data?.score,
      userQuery.data?.bongsTotal
    )
    for (const solve of solves.slice(applied)) {
      queue = noteLocalSolve(
        queue,
        solve.score,
        solve.points,
        configQuery.data?.maxBongs
      )
    }
    applied = solves.length
    return queue.remaining > 0
  })

  function dismiss() {
    queue = { ...queue, remaining: Math.max(0, queue.remaining - 1) }
    stamp += 1
  }
</script>

{#if show}
  {#key stamp}
    <BongOverlay onDone={dismiss} />
  {/key}
{/if}
