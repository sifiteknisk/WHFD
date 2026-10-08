<script lang="ts">
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import type { ScoresData } from '../model/data.svelte'
  import {
    getChallengeCellWidth,
    getTeamSolveLookups,
    isDynamicChallenge,
    type CategoryGroup,
    type ChallengeInfo,
  } from '../model/transforms'
  import { CELL_KIND, pointDeltaTrend } from './cell-tooltip'
  import type { SortMode, ViewMode } from './url-params'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    viewMode: ViewMode
    sortMode: SortMode
    focusedChallengeId: string | null
    hoveredColumnId: string | null
  }

  let {
    data,
    entry,
    viewMode,
    sortMode,
    focusedChallengeId,
    hoveredColumnId,
  }: Props = $props()

  const lookups = $derived(getTeamSolveLookups(entry))

  interface ChallengeCell {
    id: string
    name: string
    points: number
    width: number
    dynamic: boolean
    solved: boolean
    blood: number
    solveTime: number | undefined
    teamPoints: number
    pointDelta: number
  }

  const challengeCells = $derived.by((): ChallengeCell[] =>
    data.challenges.map((challenge: ChallengeInfo) => {
      const dynamic = isDynamicChallenge(challenge)
      return {
        id: challenge.id,
        name: challenge.name,
        points: challenge.points,
        width: getChallengeCellWidth(challenge),
        dynamic,
        solved: lookups.solvedIds.has(challenge.id),
        blood: dynamic ? -1 : data.getBloodIndex(challenge.id, entry.id),
        solveTime: lookups.solveTimes.get(challenge.id),
        teamPoints: lookups.dynamicPoints.get(challenge.id) ?? 0,
        pointDelta: lookups.dynamicPointDeltas.get(challenge.id) ?? 0,
      }
    })
  )

  interface CategoryCell {
    key: string
    name: string
    color: CategoryGroup['config']['color']
    solved: number
    total: number
    state: 'full' | 'partial' | 'none' | 'all-dynamic'
  }

  const categoryCells = $derived.by((): CategoryCell[] =>
    data.categoryGroups.map((group: CategoryGroup) => {
      const stats = data.getCategoryStatsForSolves(lookups.solvedIds, group)
      return {
        key: group.category,
        name: group.config.name,
        color: group.config.color,
        solved: stats.solved,
        total: stats.total,
        state: stats.state,
      }
    })
  )

  const challengeCellGroups = $derived.by(
    (): { key: string; cells: ChallengeCell[] }[] | null => {
      if (viewMode === 'categories' || sortMode !== 'categories') return null
      const groups: { key: string; cells: ChallengeCell[] }[] = []
      let offset = 0
      for (const group of data.categoryGroups) {
        groups.push({
          key: group.category,
          cells: challengeCells.slice(offset, offset + group.challenges.length),
        })
        offset += group.challenges.length
      }
      return groups
    }
  )
</script>

{#snippet challengeCell(cell: ChallengeCell)}
  {@const dimmed =
    focusedChallengeId !== null && focusedChallengeId !== cell.id}
  {#if cell.dynamic}
    <solve-cell
      data-tooltip-cell
      data-kind={CELL_KIND.challenge}
      data-col={cell.id}
      data-col-hover={hoveredColumnId === cell.id || undefined}
      data-dimmed={dimmed || undefined}
      data-dynamic
      data-name={cell.name}
      data-points={cell.points}
      data-team-points={cell.teamPoints}
      data-point-delta={cell.pointDelta}
      data-stripe={challengeCellGroups ? undefined : ''}
      style:--cell-width={`${cell.width}px`}
    >
      <dyn-points>
        <dyn-value
          >{cell.teamPoints.toLocaleString()} <span>pts</span></dyn-value
        >
        <dyn-delta data-trend={pointDeltaTrend(cell.pointDelta)}>
          {cell.pointDelta > 0 ? '+' : cell.pointDelta < 0 ? '-' : ''}{Math.abs(
            cell.pointDelta
          ).toLocaleString()}
        </dyn-delta>
      </dyn-points>
    </solve-cell>
  {:else}
    <solve-cell
      data-tooltip-cell
      data-kind={CELL_KIND.challenge}
      data-col={cell.id}
      data-col-hover={hoveredColumnId === cell.id || undefined}
      data-dimmed={dimmed || undefined}
      data-name={cell.name}
      data-points={cell.points}
      data-state={cell.solved ? 'solved' : 'unsolved'}
      data-blood={cell.blood >= 0 ? cell.blood + 1 : undefined}
      data-solve-time={cell.solveTime}
      data-stripe={challengeCellGroups ? undefined : ''}
      style:--cell-width={`${cell.width}px`}
    >
      {#if cell.blood >= 0 && cell.blood < 3}
        <cell-mark data-medal={cell.blood + 1}>[{cell.blood + 1}]</cell-mark>
      {:else if cell.solved}
        <cell-mark data-solved>[*]</cell-mark>
      {:else}
        <cell-mark data-unsolved>[ ]</cell-mark>
      {/if}
    </solve-cell>
  {/if}
{/snippet}

<solve-cells>
  {#if viewMode === 'categories'}
    {#each categoryCells as cell (cell.key)}
      <solve-cell
        data-tooltip-cell
        data-kind={CELL_KIND.category}
        data-col={cell.key}
        data-col-hover={hoveredColumnId === cell.key || undefined}
        data-name={cell.name}
        data-category-color={cell.color}
        data-solved={cell.solved}
        data-total={cell.total}
        data-cat-state={cell.state}
        data-stripe
      >
        {#if cell.state === 'full'}
          <cell-mark data-category-mark>[*]</cell-mark>
        {:else if cell.state === 'partial'}
          <cell-mark data-category-mark>{cell.solved}/{cell.total}</cell-mark>
        {:else if cell.state === 'all-dynamic'}
          <cell-mark data-unsolved>-</cell-mark>
        {:else}
          <cell-mark data-unsolved>[ ]</cell-mark>
        {/if}
      </solve-cell>
    {/each}
  {:else if challengeCellGroups}
    {#each challengeCellGroups as group (group.key)}
      <cell-group>
        {#each group.cells as cell (cell.id)}
          {@render challengeCell(cell)}
        {/each}
      </cell-group>
    {/each}
  {:else}
    {#each challengeCells as cell (cell.id)}
      {@render challengeCell(cell)}
    {/each}
  {/if}
</solve-cells>

<style>
  solve-cells {
    display: flex;
    gap: 4px;
    align-items: stretch;
    padding-inline-start: 0.25rem;
    padding-inline-end: var(--score-diagonal-overflow);
    block-size: 100%;
    contain: layout style;
  }

  cell-group {
    display: flex;
    gap: 4px;
    flex-shrink: 0;

    &:nth-of-type(odd) {
      background: color-mix(in oklab, var(--tui-border-mid) 14%, transparent);
    }
  }

  solve-cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--cell-width, 48px);
    flex-shrink: 0;
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    white-space: pre;

    &::after {
      content: '';
      position: absolute;
      inset: 0 -4px -1px 0;
    }

    &[data-stripe]:nth-of-type(odd) {
      background: color-mix(in oklab, var(--tui-border-mid) 14%, transparent);
    }

    &[data-tooltip-cell][data-col-hover] {
      background: color-mix(in oklab, var(--tui-selection-bg) 16%, transparent);
    }

    :global(row-content[data-hovered]) &[data-tooltip-cell][data-col-hover] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);

      cell-mark,
      dyn-value,
      dyn-value span,
      dyn-delta {
        color: inherit;
      }
    }

    &[data-dimmed] {
      opacity: 0.25;
    }
  }

  cell-mark {
    font-weight: 700;

    &[data-solved] {
      color: var(--tui-success);
    }

    &[data-unsolved] {
      color: var(--tui-border-mid);
      font-weight: var(--font-weight-normal);
    }

    &[data-medal='1'] {
      color: var(--foreground-gold-l0);
    }

    &[data-medal='2'] {
      color: var(--foreground-silver-l0);
    }

    &[data-medal='3'] {
      color: var(--foreground-bronze-l0);
    }

    &[data-category-mark] {
      color: var(--category-foreground-l1);
    }
  }

  dyn-points {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.2;
  }

  dyn-value {
    color: var(--tui-text);

    span {
      color: var(--tui-muted);
    }
  }

  dyn-delta {
    font-size: var(--step--2);

    &[data-trend='positive'] {
      color: var(--tui-success);
    }

    &[data-trend='negative'] {
      color: var(--tui-danger);
    }

    &[data-trend='neutral'] {
      color: var(--tui-muted);
    }
  }
</style>
