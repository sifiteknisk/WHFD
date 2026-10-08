<script lang="ts">
  import { IconCaretDown, IconClock, IconFunnel, IconX } from '$lib/icons'
  import Spinner from '$lib/ui/spinner.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { MultiFilter } from './core'
  import DesktopFilterChips from './desktop-filter-chips.svelte'
  import DesktopFilterMenu from './desktop-filter-menu.svelte'
  import FilterPopover from './filter-popover.svelte'
  import MobileFilterDrawer from './mobile-filter-drawer.svelte'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    resolveTimeRangeFilter,
    type TimeRangeFilter,
  } from './time'
  import TimeRangeEditor from './time-range-editor.svelte'
  import { formatTimeRangeSummary } from './time-summary'
  import { type TimeFilterFamily, type ValueFilterFamily } from './ui'

  type Props = {
    families: readonly ValueFilterFamily[]
    filterFor: (family: ValueFilterFamily) => MultiFilter<unknown>
    timeFilter?: TimeRangeFilter
    ctfStartTime?: number | null
    hasActiveFilters: boolean
    onClearAll: () => void
    fetching?: boolean
  }

  let {
    families,
    filterFor,
    timeFilter,
    ctfStartTime = null,
    hasActiveFilters,
    onClearAll,
    fetching = false,
  }: Props = $props()

  const ctfStart = $derived(ctfStartTime ?? null)
  const timeError = $derived(
    timeFilter ? resolveTimeRangeFilter(timeFilter, ctfStart).error : undefined
  )
  const timeSummary = $derived(
    timeFilter ? formatTimeRangeSummary(timeFilter, ctfStart) : ''
  )
  const timeActive = $derived(!!timeFilter && hasTimeRangeFilter(timeFilter))
  const timeFamily = $derived<TimeFilterFamily | undefined>(
    timeFilter
      ? {
          id: 'time',
          label: 'Time',
          icon: IconClock,
          searchTerms: ['date', 'range', 'ctf', 'relative'],
        }
      : undefined
  )

  let drawerOpen = $state(false)

  const desktopFamilies = $derived(families as ValueFilterFamily[])
</script>

{#snippet timeMenu({ close: _close }: { close: () => void })}
  {#if timeFilter}
    <TimeRangeEditor filter={timeFilter} ctfStartTime={ctfStart} />
  {/if}
{/snippet}

{#snippet timeChip()}
  {#if timeFilter}
    <filter-chip data-invalid={timeError ? '' : undefined}>
      <chip-label>
        <IconClock aria-hidden="true" />
        Time
      </chip-label>
      <FilterPopover label="Time range" width="18rem">
        {#snippet trigger({ props })}
          <button {...props} type="button" data-chip-value>
            <chip-summary>{timeSummary}</chip-summary>
            <IconCaretDown aria-hidden="true" data-chevron />
          </button>
        {/snippet}
        {#snippet panel()}
          <TimeRangeEditor filter={timeFilter} ctfStartTime={ctfStart} />
        {/snippet}
      </FilterPopover>
      <Tooltip label="Remove time filter">
        {#snippet children({ props })}
          <button
            {...props}
            type="button"
            data-chip-clear
            aria-label="Remove time filter"
            onclick={() => clearTimeRangeFilter(timeFilter)}
          >
            <IconX aria-hidden="true" />
          </button>
        {/snippet}
      </Tooltip>
    </filter-chip>
  {/if}
{/snippet}

<filter-bar>
  <bar-narrow>
    <Tooltip label="Add filter">
      {#snippet children({ props })}
        <button
          {...props}
          type="button"
          data-filters-trigger
          aria-label="Add filter"
          data-active={hasActiveFilters || undefined}
          onclick={() => (drawerOpen = true)}
        >
          <IconFunnel aria-hidden="true" />
        </button>
      {/snippet}
    </Tooltip>
    <MobileFilterDrawer
      bind:open={drawerOpen}
      {families}
      {filterFor}
      {timeFilter}
      ctfStartTime={ctfStart}
    />
  </bar-narrow>

  <bar-wide>
    <DesktopFilterMenu
      families={desktopFamilies}
      hasFilters={hasActiveFilters}
      {timeFamily}
      timeMenu={timeFamily ? timeMenu : undefined}
    />
    <DesktopFilterChips
      families={desktopFamilies}
      {filterFor}
      timeChip={timeActive ? timeChip : undefined}
    />
  </bar-wide>

  {#if hasActiveFilters}
    <button type="button" data-clear-all onclick={onClearAll}>
      <IconX aria-hidden="true" />
      Clear
    </button>
  {/if}

  {#if timeError}
    <bar-error>{timeError}</bar-error>
  {/if}

  {#if fetching}
    <bar-spinner><Spinner /></bar-spinner>
  {/if}
</filter-bar>

<style>
  filter-bar {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-2xs);
  }

  bar-narrow {
    display: contents;

    @media (width >= 48rem) {
      display: none;
    }
  }

  bar-wide {
    display: none;

    @media (width >= 48rem) {
      display: flex;
      min-inline-size: 0;
      flex: 1;
      align-items: center;
      gap: var(--space-2xs);
    }
  }

  button[data-filters-trigger] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    cursor: pointer;

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    &[data-active] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
      border-color: var(--bevel-recessed);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }

  button[data-clear-all] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    block-size: 2rem;
    padding-inline: 0.5rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    font-size: var(--step--1);
    cursor: pointer;

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }

  bar-error {
    flex-shrink: 0;
    padding-inline: var(--space-3xs);
    color: var(--tui-danger);
    font-size: var(--step--1);
  }

  bar-spinner {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    margin-inline-start: auto;
    color: var(--tui-muted);
  }

  filter-chip {
    display: inline-flex;
    flex-shrink: 0;
    block-size: 2rem;
    max-inline-size: 32rem;
    align-items: stretch;
    overflow: hidden;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    font-size: var(--step--1);

    &[data-invalid] {
      border-color: var(--tui-danger);
    }
  }

  chip-label {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--tui-muted);
    border-inline-end: 1px solid var(--tui-border-mid);
    white-space: nowrap;

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }

  button[data-chip-value] {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--tui-text);
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover,
    &[data-state='open'] {
      background: var(--background-accent);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: -2px;
    }

    :global(svg[data-chevron]) {
      flex-shrink: 0;
      inline-size: 0.75rem;
      block-size: 0.75rem;
      color: var(--tui-muted);
    }
  }

  chip-summary {
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  button[data-chip-clear] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    color: var(--tui-muted);
    background: transparent;
    border: none;
    border-inline-start: 1px solid var(--tui-border-mid);
    cursor: pointer;

    &:hover {
      color: var(--tui-danger);
      background: var(--background-accent);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: -2px;
    }

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }
</style>
