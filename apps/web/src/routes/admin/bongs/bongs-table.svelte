<script lang="ts">
  import { IconCaretDown, IconSearch, IconTicket } from '$lib/icons'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { nextSort, type SortState } from '../admin-table-logic'
  import AdminTable from '../admin-table.svelte'
  import {
    ROW_HEIGHT,
    SORT_DEFAULTS,
    type BongSortBy,
    type BongTeam,
  } from './bongs-model'

  type Props = {
    rows: BongTeam[]
    sort: SortState<BongSortBy>
    search: string
    fetching: boolean
    fingerprint: string
    givingId: string | null
    onGive: (team: BongTeam) => void
  }

  let {
    rows,
    sort = $bindable(),
    search = $bindable(),
    fetching,
    fingerprint,
    givingId,
    onGive,
  }: Props = $props()

  const columns: { col: BongSortBy; label: string; short: string }[] = [
    { col: 'name', label: 'Team', short: 'Team' },
    { col: 'score', label: 'Score', short: 'Score' },
    { col: 'bongsTotal', label: 'Total', short: 'Total' },
    { col: 'bongsAvailable', label: 'Available', short: 'Avail' },
  ]

  function toggleSort(col: BongSortBy) {
    sort = nextSort(sort, col, SORT_DEFAULTS)
  }
</script>

{#snippet toolbar()}
  <bongs-toolbar>
    <search-field>
      <IconSearch aria-hidden="true" />
      <input
        type="search"
        placeholder="Search teams..."
        aria-label="Search teams"
        bind:value={search}
      />
    </search-field>
    {#if fetching}
      <bongs-fetching>
        <Spinner />
      </bongs-fetching>
    {/if}
  </bongs-toolbar>
{/snippet}

{#snippet sortHeader(col: BongSortBy, label: string, short: string)}
  {@const active = sort.by === col}
  <th-cell
    data-col={col}
    data-active={active || undefined}
    data-order={active ? sort.order : undefined}
  >
    <button type="button" onclick={() => toggleSort(col)}>
      <span data-label="long">{label}</span>
      <span data-label="short">{short}</span>
      <IconCaretDown aria-hidden="true" data-arrow />
    </button>
  </th-cell>
{/snippet}

{#snippet header()}
  <bongs-head>
    {#each columns as column (column.col)}
      {@render sortHeader(column.col, column.label, column.short)}
    {/each}
    <th-cell
      data-col="bongs"
      data-active={sort.by === 'bongsAvailable' || undefined}
      data-order={sort.by === 'bongsAvailable' ? sort.order : undefined}
    >
      <button type="button" onclick={() => toggleSort('bongsAvailable')}>
        <span>Bongs</span>
        <IconCaretDown aria-hidden="true" data-arrow />
      </button>
    </th-cell>
    <th-cell data-static>Give</th-cell>
  </bongs-head>
{/snippet}

{#snippet row(team: BongTeam, index: number)}
  <bongs-row
    data-even={index % 2 === 0 || undefined}
    data-ready={team.bongsAvailable > 0 || undefined}
  >
    <cell>
      <truncate>{team.name}</truncate>
    </cell>
    <cell data-col="score">
      <nums>{team.score.toLocaleString()}</nums>
    </cell>
    <cell data-col="bongsTotal">
      <nums>{team.bongsTotal.toLocaleString()}</nums>
    </cell>
    <cell data-col="bongsAvailable">
      <nums data-ready={team.bongsAvailable > 0 || undefined}>
        {team.bongsAvailable.toLocaleString()}
      </nums>
    </cell>
    <cell data-col="bongs">
      <nums data-ready={team.bongsAvailable > 0 || undefined}
        >{team.bongsAvailable.toLocaleString()}</nums
      >/{team.bongsTotal.toLocaleString()}
    </cell>
    <cell>
      <button
        type="button"
        disabled={team.bongsAvailable <= 0 || givingId === team.id}
        aria-label="Give bong to {team.name}"
        onclick={() => onGive(team)}
      >
        {#if givingId === team.id}
          <Spinner />
        {:else}
          Give
        {/if}
      </button>
    </cell>
  </bongs-row>
{/snippet}

{#snippet emptyState(filtered: boolean)}
  <EmptyState
    icon={IconTicket}
    title={filtered ? 'No matching teams' : 'No teams yet'}
    subtitle={filtered
      ? 'Try a different search term.'
      : 'Teams will appear here once they register.'}
  />
{/snippet}

<AdminTable
  {rows}
  rowHeight={ROW_HEIGHT}
  headerHeight={42}
  overscan={12}
  minTableWidth={0}
  {fingerprint}
  hasNextPage={false}
  isFetchingNextPage={false}
  onLoadMore={() => {}}
  filtered={search.trim().length > 0}
  {toolbar}
  {header}
  {row}
  {emptyState}
/>

<style>
  bongs-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs);
  }

  search-field {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    flex-shrink: 0;
    inline-size: min(18rem, 42vw);
    block-size: 2rem;
    padding-inline: 0.5rem;
    color: var(--tui-muted);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    &:focus-within {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    input {
      min-inline-size: 0;
      flex: 1;
      color: var(--tui-text);
      background: transparent;
      border: none;
      outline: none;
      font-size: var(--step--1);

      &::placeholder {
        color: var(--tui-muted);
      }
    }
  }

  bongs-fetching {
    display: flex;
    color: var(--tui-muted);
    font-size: 1rem;
  }

  bongs-head,
  bongs-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 3.5rem 4.75rem;
    inline-size: 100%;
    user-select: none;

    @media (width >= 48rem) {
      grid-template-columns: minmax(0, 1fr) 4.25rem 2.75rem 2.75rem 4.75rem;
    }

    @media (width >= 64rem) {
      grid-template-columns: minmax(12rem, 1.4fr) 7rem 7rem 8rem 8rem;
      min-inline-size: 45rem;
    }
  }

  [data-col='bongs'] {
    display: none;
  }

  @media (width < 48rem) {
    [data-col='score'],
    [data-col='bongsTotal'],
    [data-col='bongsAvailable'] {
      display: none;
    }

    [data-col='bongs'] {
      display: flex;
    }
  }

  [data-label='short'] {
    display: none;
  }

  @media (width < 64rem) {
    [data-label='long'] {
      display: none;
    }

    [data-label='short'] {
      display: inline;
    }
  }

  bongs-head {
    block-size: 100%;
    background: var(--tui-surface);
    border-block-end: 1px solid var(--tui-border-mid);
  }

  th-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    padding-inline: var(--space-2xs);
    block-size: 100%;
    color: var(--tui-muted);
    font-size: var(--step--1);
    border-inline-end: 1px solid var(--tui-border-mid);

    &:last-child {
      border-inline-end: none;
    }

    &[data-static] {
      padding-inline: 0.75rem;
    }

    button {
      display: flex;
      align-items: center;
      gap: var(--space-3xs);
      min-inline-size: 0;
      padding: 0;
      color: inherit;
      background: transparent;
      border: none;
      cursor: pointer;

      span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      :global(svg[data-arrow]) {
        flex-shrink: 0;
        inline-size: 0.75rem;
        block-size: 0.75rem;
        opacity: 0;
      }

      &:hover {
        color: var(--tui-text);
      }

      &:focus-visible {
        outline: 2px dotted var(--tui-focus);
        outline-offset: 2px;
      }
    }

    &[data-active] {
      color: var(--tui-text);
      font-weight: 700;

      :global(svg[data-arrow]) {
        opacity: 1;
      }
    }

    &[data-order='asc'] :global(svg[data-arrow]) {
      rotate: 180deg;
    }
  }

  bongs-row {
    align-items: stretch;
    min-block-size: 3rem;
    border-block-end: 1px solid var(--tui-border-mid);

    &:hover {
      background: var(--background-accent);
    }

    &[data-ready] nums[data-ready] {
      color: var(--tui-success);
      font-weight: 700;
    }
  }

  cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    padding-inline: var(--space-2xs);
    overflow: hidden;
    border-inline-end: 1px solid var(--tui-border-mid);

    &:last-child {
      border-inline-end: none;
      padding-inline: 0.75rem;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      block-size: 2rem;
      padding-inline: var(--space-xs);
      color: var(--tui-text);
      background: var(--tui-surface);
      border: var(--tui-border-width) solid;
      border-color: var(--bevel-raised);
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--tui-surface-light);
      }

      &:active:not(:disabled) {
        border-color: var(--bevel-recessed);
        translate: 1px 1px;
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px dotted var(--tui-focus);
        outline-offset: 2px;
      }
    }
  }

  truncate {
    overflow: hidden;
    color: var(--foreground-l1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  nums {
    color: var(--foreground-l1);
    font-variant-numeric: tabular-nums;
  }

  @media (width < 64rem) {
    th-cell,
    cell {
      padding-inline: 0.25rem;
    }

    th-cell[data-static] {
      padding-inline: 0.25rem;
    }

    cell:last-child {
      padding-inline: 0.4rem 0.5rem;
    }

    cell button {
      max-inline-size: 100%;
      padding-inline: 0.5rem;
    }

    th-cell:not([data-active]) :global(svg[data-arrow]),
    [data-col='bongs'] :global(svg[data-arrow]) {
      display: none;
    }
  }
</style>
