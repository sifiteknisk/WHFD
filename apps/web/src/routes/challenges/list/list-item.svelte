<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import { pointsTier } from '../model/points-tier'

  type BloodTier = 'gold' | 'silver' | 'bronze'

  interface Props {
    challenge: Challenge
    color: string
    solved: boolean
    bloodTier: BloodTier | null
    selected: boolean
    onSelect: () => void
  }

  let { challenge, color, solved, bloodTier, selected, onSelect }: Props = $props()

  const bloodMarks: Record<BloodTier, string> = {
    gold: '1',
    silver: '2',
    bronze: '3',
  }

  const isDynamic = $derived(
    challenge.scoringKind === ChallengeScoringKind.DYNAMIC
  )
  const showsScore = $derived(challenge.hasFlag || isDynamic)
  const displayPoints = $derived(
    isDynamic ? (challenge.yourScore ?? 0) : challenge.points
  )
  const mark = $derived(bloodTier ? bloodMarks[bloodTier] : solved ? '*' : ' ')
  const delta = $derived(challenge.yourPointDelta ?? 0)
  const markLabel = $derived(
    bloodTier ? `${bloodTier} blood` : solved ? 'solved' : 'not solved'
  )
</script>

<li id="chall-{challenge.id}">
  <button
    type="button"
    onclick={onSelect}
    data-solved={solved ? '' : undefined}
    data-blood={bloodTier ?? undefined}
    data-selected={selected ? '' : undefined}
  >
    <span data-part="mark" aria-label={markLabel}>[{mark}]</span>
    <span data-part="title">
      <category-swatch data-category-color={color}></category-swatch>
      <span data-part="text">
        <span data-part="label">{challenge.name}</span>
        {#if challenge.author}
          <span data-part="author">by {challenge.author}</span>
        {/if}
      </span>
    </span>
    {#if showsScore}
      <span
        data-part="points"
        data-tier={isDynamic && displayPoints === 0
          ? undefined
          : pointsTier(displayPoints)}
      >
        {isDynamic && displayPoints === 0 ? 'dyn' : displayPoints}
      </span>
      {#if isDynamic}
        <span data-part="solves" data-trend={Math.sign(delta)}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      {:else}
        <span data-part="solves">{challenge.solves}</span>
      {/if}
    {/if}
  </button>
</li>

<style>
  li {
    display: block;
  }

  button {
    display: grid;
    grid-template-columns: 3ch minmax(0, 1fr) 5ch 6ch;
    gap: 1ch;
    align-items: center;
    inline-size: 100%;
    padding: 0.125rem 0.5rem;
    color: var(--tui-text);
    text-align: start;
    white-space: nowrap;
    cursor: pointer;
    font-variant-numeric: tabular-nums;

    &[data-solved]:not([data-selected], :focus-visible)
      > :not([data-part='mark']) {
      opacity: 0.55;
    }

    &:hover {
      background: var(--background-accent);
    }

    &[data-selected],
    &:focus-visible {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);

      [data-part] {
        color: inherit;
      }
    }

    &:focus-visible {
      outline: 1px dotted var(--tui-selection-text);
      outline-offset: -2px;
    }
  }

  [data-part='mark'] {
    color: var(--tui-muted);
    white-space: pre;

    [data-solved] > & {
      color: var(--tui-success);
    }

    [data-blood='gold'] > & {
      color: var(--foreground-gold-l0);
    }

    [data-blood='silver'] > & {
      color: var(--foreground-silver-l0);
    }

    [data-blood='bronze'] > & {
      color: var(--foreground-bronze-l0);
    }
  }

  [data-part='title'] {
    grid-column: 2;
    min-inline-size: 0;
    display: flex;
    gap: 1ch;
  }

  [data-part='text'] {
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
  }

  [data-part='label'] {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  [data-part='author'] {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--tui-muted);
    font-size: 0.875em;

    button:is([data-selected], :focus-visible) & {
      opacity: 0.7;
    }
  }

  category-swatch {
    flex-shrink: 0;
    inline-size: 0.5em;
    margin-block: 0.2em;
    background: var(--category-foreground-l1);
    border: 1px solid var(--tui-border-dark);

    button:is([data-selected], :focus-visible) & {
      border-color: var(--tui-selection-text);
    }
  }

  [data-part='points'],
  [data-part='solves'] {
    text-align: end;
  }

  [data-part='points'] {
    &[data-tier='low'] {
      color: var(--foreground-green-l1);
    }

    &[data-tier='mid'] {
      color: var(--foreground-yellow-l1);
    }

    &[data-tier='high'] {
      color: var(--foreground-red-l1);
    }
  }

  [data-part='solves'] {
    color: var(--tui-muted);

    &[data-trend='1'] {
      color: var(--tui-success);
    }

    &[data-trend='-1'] {
      color: var(--tui-danger);
    }
  }
</style>
