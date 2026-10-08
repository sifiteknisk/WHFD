<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useChallengeScores } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import ChallengeDetailsPodiumGrid from './podium-grid.svelte'
  import { resolvePodiumSlots, type PodiumEntry } from './podium-slots'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const scoresQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 4, offset: 0 })
  )
  const userQuery = useCurrentUser()

  const revealAfterLoading = scoresQuery.isPending

  const currentUser = $derived(userQuery.data)
  const topScores = $derived(scoresQuery.data?.scores.slice(0, 4) ?? [])

  const formatPoints = (points: number): string =>
    `${points.toLocaleString()} pts`

  const slots = $derived.by(() => {
    const top: PodiumEntry[] = topScores.map(score => ({
      userId: score.userId,
      name: score.userName,
      avatarUrl: score.userAvatarUrl,
      detail: formatPoints(score.points),
      isSelf: currentUser?.id === score.userId,
    }))

    return resolvePodiumSlots({
      top,
      isAuthenticated: !!currentUser,
    })
  })
</script>

<ChallengeDetailsPodiumGrid
  {slots}
  loading={scoresQuery.isPending}
  reveal={revealAfterLoading}
/>
