<script lang="ts">
  import { page } from '$app/state'
  import ErrorWindow from '$lib/components/error-window.svelte'
  import { IconQuestion } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import {
    PUBLIC_GRAPH_CACHING,
    useLeaderboardChallenges,
    useSelfUserGraph,
  } from '$lib/query/leaderboard'
  import { useCurrentUser, useUserById } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import StatusCard from '$lib/ui/status-card.svelte'
  import {
    ADMIN_PANEL_PERMISSIONS,
    hasAnyPermission,
  } from '$lib/utils/permissions'
  import { toChallengeInfos } from '../analytics/analytics-data'
  import ProfileAnalytics from '../analytics/analytics.svelte'
  import type { GraphSampleInput } from '../analytics/graph-data'
  import ProfileHeader from '../profile-header.svelte'
  import ProfileShell from '../shell.svelte'
  import ProfileSolves from '../solves/solves.svelte'
  import { canViewTeamProfile, isRelaxedDivision } from '../visibility'

  const HIDDEN_SCORE_MESSAGE =
    'Team is relaxed, score is therefore hidden to others'

  const userId = $derived(page.params.id ?? '')
  const userQuery = useUserById(() => userId)
  const currentUserQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

  const user = $derived(userQuery.data)
  const viewer = $derived(currentUserQuery.data)
  const clientConfig = $derived(configQuery.data)
  const ctfName = $derived(clientConfig?.ctfName)
  const isAdmin = $derived(hasAnyPermission(viewer, ADMIN_PANEL_PERMISSIONS))
  const viewerPending = $derived(
    !!user && isRelaxedDivision(user.division) && currentUserQuery.isPending
  )
  const scoreHidden = $derived(
    !!user &&
      !viewerPending &&
      !canViewTeamProfile({
        division: user.division,
        viewerId: viewer?.id ?? null,
        teamId: userId,
        isAdmin,
      })
  )

  const challenges = $derived(toChallengeInfos(challengesQuery.data))

  const graphQuery = useSelfUserGraph(
    () => (scoreHidden || viewerPending ? null : (user?.globalPlace ?? null)),
    () => userId,
    PUBLIC_GRAPH_CACHING
  )
  const graphData = $derived<GraphSampleInput | null>(graphQuery.data ?? null)

  const tabs = [
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
  ]

  const status = $derived(
    userQuery.isPending || viewerPending
      ? 'loading'
      : !user || !clientConfig || scoreHidden
        ? 'unavailable'
        : 'ready'
  )
</script>

<svelte:head>
  {#if scoreHidden && ctfName}
    <title>Profile | {ctfName}</title>
  {:else if user && ctfName}
    <title>{user.name} | {ctfName}</title>
  {:else if ctfName}
    <title>Profile not found | {ctfName}</title>
  {/if}
</svelte:head>

<ProfileShell {tabs} desktopColumn="analytics" hideTablistOnDesktop {status}>
  {#snippet unavailable()}
    {#if scoreHidden}
      <ErrorWindow message={HIDDEN_SCORE_MESSAGE} />
    {:else}
      <StatusCard
        icon={IconQuestion}
        title="Profile not found"
        subtitle={userQuery.error?.message ??
          'The requested profile could not be found.'}
      >
        <Button href="/scores">View leaderboard</Button>
      </StatusCard>
    {/if}
  {/snippet}

  {#snippet header()}
    {#if user && clientConfig}
      <ProfileHeader {user} divisions={clientConfig.divisions} />
    {/if}
  {/snippet}

  {#snippet panel(tab: string)}
    {#if user && clientConfig}
      {#if tab === 'challenges'}
        <ProfileSolves
          {challenges}
          solves={user.solves}
          dynamicScores={user.dynamicScores}
          showUnsolved={challenges.length > 0}
          ctfStartTime={clientConfig.startTime}
        />
      {:else if tab === 'analytics'}
        <ProfileAnalytics
          solves={user.solves}
          dynamicScores={user.dynamicScores}
          {graphData}
          {clientConfig}
          {challenges}
          splitDynamicScore={user.dynamicScores.length > 0}
        />
      {/if}
    {/if}
  {/snippet}
</ProfileShell>
