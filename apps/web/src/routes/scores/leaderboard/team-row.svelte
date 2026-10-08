<script lang="ts">
  import ScoresSparkline from '$lib/chart/sparkline.svelte'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import LazyAvatar from '$lib/ui/lazy-avatar.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import type { ScoresData } from '../model/data.svelte'
  import { getVisibleSolveCount } from '../model/transforms'
  import ScoresDelta from './team-row-delta.svelte'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    index: number
    divisions: Record<string, string>
    showDivision: boolean
  }

  let { data, entry, index, divisions, showDivision }: Props = $props()

  const rank = $derived(entry.divisionPlace || index + 1)
  const delta = $derived(data.rankDeltaByTeam.get(entry.id))
  const color = $derived(
    data.teamColorMap.get(entry.id) ?? 'var(--foreground-l3)'
  )
  const sparkline = $derived(data.sparklineDataByTeam.get(entry.id) ?? [])
  const solveCount = $derived(
    getVisibleSolveCount(entry.solves, data.challengesData)
  )
  const flagFilename = $derived(
    entry.countryCode ? countryCodeToFlagFilename(entry.countryCode) : null
  )
  const divisionName = $derived(
    showDivision && entry.division ? divisions[entry.division] : undefined
  )
</script>

<rank-cluster>
  <delta-slot>
    <ScoresDelta {delta} />
  </delta-slot>
  <team-rank>
    <strong>#{rank}</strong>
    {#if showDivision && entry.divisionPlace}
      <small
        data-tooltip-cell
        data-kind="division-rank"
        data-name={divisionName}
        data-place={entry.divisionPlace}>#{entry.divisionPlace}</small
      >
    {/if}
  </team-rank>
</rank-cluster>

<team-avatar>
  <LazyAvatar src={entry.avatarUrl} name={entry.name} />
</team-avatar>

<team-text>
  <team-name>
    <a href="/profile/{entry.id}">{entry.name}</a>
  </team-name>
  <team-meta>
    {#if flagFilename && entry.countryCode}
      <img
        src="/flags/{flagFilename}"
        alt="{entry.countryCode} flag"
        title={entry.countryCode}
        data-flag
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        width="20"
        height="20"
        draggable="false"
      />
    {/if}
    {#if flagFilename && entry.countryCode && entry.statusText}
      <span data-sep>&middot;</span>
    {/if}
    {#if entry.statusText}
      <status-text>{entry.statusText}</status-text>
    {/if}
  </team-meta>
</team-text>

<score-total>
  <score-points>
    <strong>{entry.score.toLocaleString()} <span>pts</span></strong>
    <small>{solveCount} solve{solveCount === 1 ? '' : 's'}</small>
  </score-points>
  <spark-slot>
    <ScoresSparkline data={sparkline} id={entry.id} {color} />
  </spark-slot>
</score-total>

<style>
  rank-cluster,
  team-meta,
  score-total {
    display: flex;
    align-items: center;
  }

  rank-cluster,
  score-total {
    flex-shrink: 0;
  }

  rank-cluster {
    gap: 1ch;
  }

  delta-slot {
    display: none;
    justify-content: flex-end;
    inline-size: 3ch;
  }

  team-rank {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    inline-size: 4ch;

    strong {
      color: var(--rank-fg-l0, var(--row-fg));
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    small {
      color: var(--row-muted);
      font-size: var(--step--1);
      font-variant-numeric: tabular-nums;
    }
  }

  team-avatar {
    --avatar-size: 2rem;
    flex-shrink: 0;
    border: 1px solid var(--tui-border-dark);
  }

  team-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-inline-size: 0;
    overflow: hidden;
  }

  team-name {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);

    a {
      overflow: hidden;
      color: var(--rank-fg-l0, var(--row-fg));
      font-weight: 700;
      white-space: nowrap;
      text-overflow: ellipsis;

      &:hover {
        text-decoration: underline;
      }

      &:focus-visible {
        outline: none;
      }
    }
  }

  team-meta {
    min-inline-size: 0;
    gap: 1ch;
    font-size: var(--step--1);

    img[data-flag] {
      inline-size: 1rem;
      min-inline-size: 1rem;
      block-size: 1rem;
      flex-shrink: 0;
    }

    span[data-sep] {
      flex-shrink: 0;
      color: var(--rank-fg-l1, var(--row-muted));
    }

    status-text {
      display: block;
      overflow: hidden;
      color: var(--rank-fg-l1, var(--row-muted));
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  score-total {
    gap: 1ch;
  }

  score-points {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    strong {
      color: var(--row-fg);
      font-weight: 700;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;

      span {
        color: var(--row-muted);
        font-weight: var(--font-weight-normal);
      }
    }

    small {
      color: var(--row-muted);
      font-size: var(--step--1);
      white-space: nowrap;
    }
  }

  spark-slot {
    display: none;
    inline-size: 6rem;
    block-size: 2rem;
    padding-inline-start: 1ch;
    border-inline-start: 1px dashed var(--score-rule);

    :global(score-sparkline) {
      inline-size: 100%;
      block-size: 100%;
    }
  }

  @media (width >= 64rem) {
    team-rank {
      inline-size: 5ch;
    }
  }

  @media (width >= 80rem) {
    delta-slot {
      display: flex;
    }

    spark-slot {
      display: block;
    }
  }
</style>
