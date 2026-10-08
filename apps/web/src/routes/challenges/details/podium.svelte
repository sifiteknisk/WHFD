<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeSolvesSelf } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { solveTimeLabels } from '../model/solve-times'
  import ChallengeDetailsPodiumGrid from './podium-grid.svelte'
  import { resolvePodiumSlots, type PodiumEntry } from './podium-slots'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const solvesQuery = useChallengeSolvesSelf(() => challenge.id)
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const revealAfterLoading = solvesQuery.isPending

  const currentUser = $derived(userQuery.data)
  const ctfStartTime = $derived(clientConfigQuery.data?.startTime ?? 0)
  const topSolves = $derived(solvesQuery.data?.solves.slice(0, 4) ?? [])
  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)
  const slots = $derived.by(() => {
    const top: PodiumEntry[] = topSolves.map((solve, index) => ({
      userId: solve.userId,
      name: solve.userName,
      avatarUrl: solve.userAvatarUrl,
      detail: solveTimeLabels({
        createdAt: solve.createdAt,
        rank: index + 1,
        ctfStartTime,
        firstBloodTime,
      }).primary,
      isSelf: currentUser?.id === solve.userId,
    }))

    return resolvePodiumSlots({
      top,
      isAuthenticated: !!currentUser,
    })
  })
</script>

<ChallengeDetailsPodiumGrid
  {slots}
  loading={solvesQuery.isPending}
  reveal={revealAfterLoading}
/>
