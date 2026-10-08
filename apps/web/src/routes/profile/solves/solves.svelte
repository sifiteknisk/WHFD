<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import {
    IconArrowsInLineVertical,
    IconCaretDown,
    IconClock,
    IconEye,
    IconEyeClosed,
    IconFlagBanner,
    IconFunnel,
    IconPiggyBank,
    IconQuestion,
    IconSearch,
    IconTrash,
  } from '$lib/icons'
  import Accordion from '$lib/ui/accordion.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import {
    getCategoryConfig,
    getCategoryKeyOrAlias,
  } from '$lib/utils/categories'
  import { formatCtfOffset, formatLocalTime } from '$lib/utils/time'
  import type {
    ChallengeInfo,
    ProfileDynamicScore,
    ProfileSolve,
  } from '../analytics/analytics-data'
  import {
    buildDisplayRows,
    computeSolvesStats,
    filterRows,
    groupRowsByCategory,
    selectEmptyState,
    sortModeLabels,
    sortRowsByMode,
    type DisplayRow,
    type SortMode,
  } from './solves-logic'

  type BloodTier = 'gold' | 'silver' | 'bronze'

  type Props = {
    challenges: ChallengeInfo[] | null | undefined
    solves: ProfileSolve[]
    dynamicScores?: ProfileDynamicScore[]
    ctfStartTime?: number | null
    showUnsolved?: boolean
    onRevoke?: (id: string, name: string) => void
    onViewSubmissions?: (id: string) => void
    revokingId?: string | null
  }

  let {
    challenges,
    solves,
    dynamicScores = [],
    ctfStartTime = null,
    showUnsolved = true,
    onRevoke,
    onViewSubmissions,
    revokingId = null,
  }: Props = $props()

  const bloodMarks: Record<BloodTier, string> = {
    gold: '1',
    silver: '2',
    bronze: '3',
  }

  let searchQuery = $state('')
  let hideSolved = $state(false)
  let sortMode = $state<SortMode>('category')

  const sortItems = $derived<MenuItem[]>(
    (['category', 'time', 'points'] as const).map(mode => ({
      value: mode,
      label: sortModeLabels[mode],
      checked: sortMode === mode,
      onSelect: () => (sortMode = mode),
    }))
  )

  const displayResult = $derived(
    buildDisplayRows({ challenges, solves, dynamicScores, showUnsolved })
  )
  const filteredRows = $derived(
    filterRows(displayResult.rows, { search: searchQuery, hideSolved })
  )
  const sortedRows = $derived(sortRowsByMode(filteredRows, sortMode))
  const groups = $derived(groupRowsByCategory(filteredRows))
  const rowsByCategory = $derived(
    new Map(groups.map(group => [group.category, group.rows]))
  )
  const categoryNames = $derived(groups.map(group => group.category))
  const stats = $derived(
    computeSolvesStats({
      rows: displayResult.rows,
      boardMerged: displayResult.boardMerged,
    })
  )
  const emptyState = $derived(
    selectEmptyState({
      totalRowCount: displayResult.rows.length,
      filteredRowCount: filteredRows.length,
    })
  )

  let openCategories = $state<string[]>([])
  let hasInitialized = $state(false)

  $effect.pre(() => {
    if (!hasInitialized && categoryNames.length > 0) {
      openCategories = [...categoryNames]
      hasInitialized = true
    }
  })

  const anyOpen = $derived(openCategories.length > 0)

  function toggleCollapse() {
    openCategories = anyOpen ? [] : [...categoryNames]
  }

  function bloodTierOf(bloodIndex: number | null): BloodTier | null {
    if (bloodIndex === 0) return 'gold'
    if (bloodIndex === 1) return 'silver'
    if (bloodIndex === 2) return 'bronze'
    return null
  }

  function solveTime(timestamp: number): string {
    return (
      formatCtfOffset(timestamp, ctfStartTime) || formatLocalTime(timestamp)
    )
  }
</script>

<profile-solves>
  <solves-header>
    <solves-stats>
      <span data-part="points">
        <strong>{stats.pointsEarned.toLocaleString()}</strong>
        {#if stats.pointsTotal !== null}
          / {stats.pointsTotal.toLocaleString()} pts
        {:else}
          pts
        {/if}
      </span>
      <span data-part="solved">
        <strong>{stats.solved.toLocaleString()}</strong>
        {#if stats.total !== null}
          / {stats.total.toLocaleString()}
        {/if}
      </span>
    </solves-stats>

    <solves-controls>
      <search-box>
        <IconSearch />
        <input
          type="search"
          value={searchQuery}
          oninput={event => (searchQuery = event.currentTarget.value)}
          placeholder="Search challenges..."
          aria-label="Search challenges"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
      </search-box>

      <toggle-group>
        {#if sortMode === 'category'}
          <Tooltip label={anyOpen ? 'Collapse all' : 'Expand all'}>
            {#snippet children({ props })}
              <button
                {...mergeProps(props, { onclick: toggleCollapse })}
                type="button"
                data-slot="collapse"
                data-active={!anyOpen || undefined}
                aria-label={anyOpen
                  ? 'Collapse all categories'
                  : 'Expand all categories'}
              >
                <IconArrowsInLineVertical />
              </button>
            {/snippet}
          </Tooltip>
        {/if}

        <Tooltip label={hideSolved ? 'Show solved' : 'Hide solved'}>
          {#snippet children({ props })}
            <button
              {...mergeProps(props, {
                onclick: () => (hideSolved = !hideSolved),
              })}
              type="button"
              data-slot="hide-solved"
              data-active={hideSolved || undefined}
              aria-pressed={hideSolved}
              aria-label={hideSolved
                ? 'Show solved challenges'
                : 'Hide solved challenges'}
            >
              {#if hideSolved}
                <IconEyeClosed />
              {:else}
                <IconEye />
              {/if}
            </button>
          {/snippet}
        </Tooltip>

        <Menu label="Sort challenges" items={sortItems} placement="bottom-end">
          {#snippet trigger({ props })}
            <button
              {...props}
              type="button"
              data-slot="sort"
              aria-label={sortModeLabels[sortMode]}
            >
              {#if sortMode === 'category'}
                <IconFlagBanner />
              {:else if sortMode === 'time'}
                <IconClock />
              {:else}
                <IconPiggyBank />
              {/if}
              <IconCaretDown data-slot="sort-chevron" />
            </button>
          {/snippet}
        </Menu>
      </toggle-group>
    </solves-controls>
  </solves-header>

  <solves-body tabindex="-1">
    {#if emptyState !== null}
      <EmptyState
        icon={IconQuestion}
        title="No challenges"
        subtitle={emptyState === 'no-matches'
          ? 'No matches found'
          : 'No challenge data available'}
      />
    {:else if sortMode === 'category'}
      <Accordion items={categoryNames} bind:value={openCategories}>
        {#snippet header({ value, props, expanded })}
          {@const config = getCategoryConfig(value)}
          {@const entries = rowsByCategory.get(value) ?? []}
          {@const staticEntries = entries.filter(entry => !entry.isDynamic)}
          {@const solvedCount = staticEntries.filter(
            entry => entry.isSolved
          ).length}
          <solves-group-header data-category-color={config.color}>
            <button {...props}>
              <span data-slot="toggle">[{expanded ? '-' : '+'}]</span>
              <span data-slot="name">{config.name}</span>
              <span data-slot="rule"></span>
              <span data-slot="count">
                {#if staticEntries.length > 0}
                  {solvedCount}/{staticEntries.length}
                {:else}
                  {entries.length}
                {/if}
              </span>
            </button>
          </solves-group-header>
        {/snippet}

        {#snippet content({ value, props })}
          {@const entries = rowsByCategory.get(value) ?? []}
          <solves-group-body {...props}>
            <ul>
              {#each entries as entry (entry.id)}
                {@render row(entry)}
              {/each}
            </ul>
          </solves-group-body>
        {/snippet}
      </Accordion>
    {:else}
      <ul data-flat>
        {#each sortedRows as entry (entry.id)}
          {@render row(entry)}
        {/each}
      </ul>
    {/if}
  </solves-body>
</profile-solves>

{#snippet row(entry: DisplayRow)}
  {@const tier = bloodTierOf(entry.bloodIndex)}
  {@const config = getCategoryConfig(entry.category)}
  {@const mark = tier ? bloodMarks[tier] : entry.isSolved ? '*' : ' '}
  <li
    data-category-color={config.color}
    data-solved={entry.isSolved ? '' : undefined}
    data-blood={tier ?? undefined}
  >
    <row-main>
      <span
        data-part="mark"
        aria-label={tier
          ? `${tier} blood`
          : entry.isSolved
            ? 'solved'
            : 'not solved'}>[{mark}]</span
      >
      <category-swatch></category-swatch>
      <span data-part="category">{getCategoryKeyOrAlias(entry.category)} /</span
      >
      <span data-part="name">{entry.name}</span>
    </row-main>

    <row-meta>
      {#if entry.isSolved && (onRevoke || onViewSubmissions)}
        <row-actions>
          {#if onRevoke}
            <Tooltip label="Revoke solve">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, {
                    onclick: () => onRevoke?.(entry.id, entry.name),
                  })}
                  type="button"
                  data-action="revoke"
                  disabled={revokingId === entry.id}
                  aria-label="Revoke solve for {entry.name}"
                >
                  {#if revokingId === entry.id}
                    <Spinner />
                  {:else}
                    <IconTrash />
                  {/if}
                </button>
              {/snippet}
            </Tooltip>
          {/if}
          {#if onViewSubmissions}
            <Tooltip label="View submissions">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, {
                    onclick: () => onViewSubmissions?.(entry.id),
                  })}
                  type="button"
                  data-action="submissions"
                  aria-label="View submissions for {entry.name}"
                >
                  <IconFunnel />
                </button>
              {/snippet}
            </Tooltip>
          {/if}
        </row-actions>
      {/if}

      {#if entry.solvedAt !== null}
        <span data-part="time">{solveTime(entry.solvedAt)}</span>
      {/if}

      {#if entry.points !== null}
        <span data-part="points"
          ><strong>{entry.points.toLocaleString()}</strong> pts</span
        >
      {/if}
    </row-meta>
  </li>
{/snippet}

<style>
  profile-solves {
    container-type: inline-size;
    container-name: solves;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  solves-header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
  }

  solves-stats {
    display: flex;
    justify-content: space-between;
    padding-inline: 1.25rem;
    color: var(--tui-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    strong {
      color: var(--tui-text);
      font-weight: var(--font-weight-normal);
    }
  }

  solves-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-inline: var(--space-2xs);
  }

  toggle-group {
    display: flex;
    gap: 0.25rem;
    inline-size: 100%;

    @container solves (width >= 24rem) {
      inline-size: auto;
    }
  }

  search-box {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-2xs);
    min-inline-size: 0;
    block-size: 2.5rem;
    padding-inline: 0.75rem;
    color: var(--tui-muted);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &:focus-within {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    :global(svg) {
      flex-shrink: 0;
    }
  }

  input {
    inline-size: 100%;
    min-inline-size: 0;
    background: transparent;
    border: none;
    color: var(--tui-text);
    outline: none;

    &::placeholder {
      color: var(--tui-muted);
    }
  }

  toggle-group button {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 2.5rem;
    padding-inline: 1rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    cursor: pointer;

    @container solves (width >= 24rem) {
      flex: initial;
    }

    &[data-slot='sort'] {
      gap: 0.25rem;

      :global(svg[data-slot='sort-chevron']) {
        font-size: 1rem;
        color: var(--tui-muted);
      }
    }

    :global(svg) {
      font-size: 1.25rem;
    }

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    &[data-active],
    &[data-state='open'] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
      border-color: var(--bevel-recessed);

      :global(svg[data-slot='sort-chevron']) {
        color: inherit;
      }
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }

  solves-body {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    margin: 0 var(--space-2xs) var(--space-2xs);
    padding-block-end: var(--space-s);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);
  }

  solves-group-header {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    display: block;
    background: var(--tui-surface-light);

    button {
      display: flex;
      align-items: center;
      gap: 1ch;
      inline-size: 100%;
      padding: 0.25rem 0.5rem 0.125rem;
      color: var(--tui-text);
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);

        [data-slot] {
          color: inherit;
          border-color: currentColor;
        }
      }

      &:focus-visible {
        outline: 1px dotted var(--tui-selection-text);
        outline-offset: -2px;
      }
    }

    [data-slot='toggle'] {
      flex: 0 0 3ch;
      color: var(--tui-muted);
    }

    [data-slot='name'] {
      color: var(--category-foreground-l1);
    }

    [data-slot='rule'] {
      flex: 1;
      border-block-end: 1px dashed var(--tui-border-mid);
    }

    [data-slot='count'] {
      color: var(--tui-muted);
      font-weight: var(--font-weight-normal);
      font-variant-numeric: tabular-nums;
    }
  }

  solves-group-body {
    display: block;
  }

  ul {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    inline-size: 100%;
    min-block-size: 1.75rem;
    padding: 0.125rem 0.5rem;
    color: var(--tui-text);

    &:hover {
      background: var(--background-accent);
    }
  }

  row-main {
    display: flex;
    gap: 1ch;
    align-items: center;
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  [data-part='mark'] {
    flex: 0 0 3ch;
    color: var(--tui-muted);
    white-space: pre;

    li[data-solved] & {
      color: var(--tui-success);
    }

    li[data-blood='gold'] & {
      color: var(--foreground-gold-l0);
    }

    li[data-blood='silver'] & {
      color: var(--foreground-silver-l0);
    }

    li[data-blood='bronze'] & {
      color: var(--foreground-bronze-l0);
    }
  }

  category-swatch {
    flex-shrink: 0;
    align-self: stretch;
    inline-size: 0.5em;
    margin-block: 0.2em;
    background: var(--category-foreground-l1);
    border: 1px solid var(--tui-border-dark);
  }

  [data-part='category'] {
    flex-shrink: 0;
    color: var(--tui-muted);
  }

  [data-part='name'] {
    overflow: hidden;
    text-overflow: ellipsis;

    li:not([data-solved]) & {
      color: var(--tui-muted);
    }
  }

  row-meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-xs);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;

    [data-part='points'] {
      min-inline-size: 9ch;
      color: var(--tui-muted);
      text-align: end;

      strong {
        color: var(--tui-text);
        font-weight: var(--font-weight-normal);
      }
    }
  }

  row-actions {
    display: flex;
    align-items: center;
    gap: 0.125rem;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 1.5rem;
      block-size: 1.5rem;
      color: var(--tui-muted);
      background: transparent;
      border: var(--tui-border-width) solid transparent;
      cursor: pointer;

      &[data-action='revoke'] {
        color: var(--tui-danger);
      }

      &:hover {
        background: var(--tui-surface);
        border-color: var(--bevel-raised);
      }

      &:active {
        border-color: var(--bevel-recessed);
        transform: translate(1px, 1px);
      }

      &:focus-visible {
        color: var(--tui-selection-text);
        outline: 1px dotted var(--tui-selection-text);
        outline-offset: -2px;
      }

      &:disabled {
        pointer-events: none;
        opacity: 0.6;
      }

      :global(svg) {
        inline-size: 1em;
        block-size: 1em;
      }
    }
  }

  [data-part='time'] {
    min-inline-size: 11ch;
    color: var(--tui-muted);
    text-align: end;
  }

  @container solves (width >= 30rem) {
    li {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-m);
    }

    row-main {
      flex: 1;
    }
  }

  @container solves (width < 30rem) {
    row-meta {
      padding-inline-start: 4ch;
    }
  }

  li:has(:focus-visible) {
    color: var(--tui-selection-text);
    background: var(--tui-selection-bg);

    [data-part],
    [data-part] strong,
    row-actions button {
      color: inherit;
    }

    category-swatch {
      border-color: var(--tui-selection-text);
    }
  }
</style>
