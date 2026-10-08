<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import { tuiList } from '$lib/attachments/tui-list'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { IconFlagBanner } from '$lib/icons'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import ChallengeDetailsHeader from './details-header.svelte'
  import ChallengeDetailsOverview from './overview.svelte'
  import ChallengeDetailsPodiumDynamic from './podium-dynamic.svelte'
  import ChallengeDetailsPodium from './podium.svelte'
  import ChallengeDetailsSubmit from './submit.svelte'

  type Props = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const isDynamic = $derived(
    challenge?.scoringKind === ChallengeScoringKind.DYNAMIC
  )
</script>

{#if challenge}
  <challenge-details {@attach tuiList()}>
    <ChallengeDetailsHeader {challenge} {isSolved} />

    <details-body>
      <details-viewport data-fade-scope>
        <details-scroll data-fade-source tabindex="-1">
          <ChallengeDetailsOverview {challenge} {onSolve} />
        </details-scroll>
        <EdgeFades />
      </details-viewport>
    </details-body>

    {#if challenge.hasFlag}
      <details-footer>
        <ChallengeDetailsPodium {challenge} />
        <ChallengeDetailsSubmit {challenge} {isSolved} {onSolve} />
      </details-footer>
    {:else if isDynamic}
      <details-footer>
        <ChallengeDetailsPodiumDynamic {challenge} />
      </details-footer>
    {/if}
  </challenge-details>
{:else}
  <challenge-details data-empty>
    <EmptyState
      icon={IconFlagBanner}
      title="Select a challenge"
      subtitle="Choose a challenge from the list to view details"
    />
  </challenge-details>
{/if}

<style>
  challenge-details {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;

    &[data-empty] {
      align-items: center;
      justify-content: center;
    }
  }

  details-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    margin-inline: 0.5rem;
    overflow: hidden;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    --fade-color: var(--tui-surface-light);
  }

  details-viewport {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  details-scroll {
    display: block;
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    outline: none;
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);
  }

  details-footer {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--tui-surface);
  }
</style>
