<script lang="ts">
  import { IconCaretRight, IconClock, IconX } from '$lib/icons'
  import Dialog from '$lib/ui/dialog.svelte'
  import { includeOperatorLabel, setFilterMode, type MultiFilter } from './core'
  import FilterOptionList from './filter-option-list.svelte'
  import FilterSearchInput from './filter-search-input.svelte'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    type TimeRangeFilter,
  } from './time'
  import TimeRangeEditor from './time-range-editor.svelte'
  import { formatTimeRangeSummary } from './time-summary'
  import { valueFilterSummary, type ValueFilterFamily } from './ui'

  type Props = {
    open: boolean
    families: readonly ValueFilterFamily[]
    filterFor: (family: ValueFilterFamily) => MultiFilter<unknown>
    timeFilter?: TimeRangeFilter
    ctfStartTime?: number | null
  }

  let {
    open = $bindable(),
    families,
    filterFor,
    timeFilter,
    ctfStartTime = null,
  }: Props = $props()

  let activeId = $state<string | 'time' | null>(null)

  const activeFamily = $derived(
    activeId === null || activeId === 'time'
      ? null
      : (families.find(family => family.id === activeId) ?? null)
  )
  const title = $derived(
    activeId === 'time' ? 'Time' : (activeFamily?.label ?? 'Filters')
  )
  const hasActive = $derived(
    families.some(family => filterFor(family).selected.length > 0) ||
      (!!timeFilter && hasTimeRangeFilter(timeFilter))
  )

  function setOpen(next: boolean) {
    open = next
    if (!next) activeId = null
  }

  function clearFamily(family: ValueFilterFamily) {
    family.clear()
  }

  function selectMode(
    filter: MultiFilter<unknown>,
    mode: 'include' | 'exclude'
  ) {
    setFilterMode(filter, mode)
  }

  function clearAll() {
    for (const family of families) family.clear()
    if (timeFilter) clearTimeRangeFilter(timeFilter)
  }
</script>

{#snippet familyRow(family: ValueFilterFamily)}
  {@const Icon = family.icon}
  {@const summary = valueFilterSummary(family, filterFor(family))}
  <button type="button" data-row onclick={() => (activeId = family.id)}>
    <Icon aria-hidden="true" />
    <span data-label>{family.label}</span>
    {#if summary}<span data-summary>{summary}</span>{/if}
    <IconCaretRight aria-hidden="true" data-chevron />
  </button>
{/snippet}

<Dialog
  {open}
  onOpenChange={setOpen}
  {title}
  titleHidden
  presentation="drawer"
  flush
>
  {#snippet children({ closeProps })}
    <filter-drawer-shell>
      <drawer-header>
        {#if activeId !== null}
          <button
            type="button"
            data-nav
            aria-label="Back to filters"
            onclick={() => (activeId = null)}
          >
            <IconCaretRight aria-hidden="true" data-back />
          </button>
        {/if}
        <drawer-title>{title}</drawer-title>
        <button
          {...closeProps}
          type="button"
          data-nav
          aria-label="Close filters"
        >
          <IconX aria-hidden="true" />
        </button>
      </drawer-header>

      {#if activeFamily}
        {@const filter = filterFor(activeFamily)}
        {#if activeFamily.search}
          {@const search = activeFamily.search}
          <drawer-search>
            <FilterSearchInput
              value={search.value()}
              placeholder={search.placeholder}
              onInput={search.onInput}
              variant="mobile"
            />
          </drawer-search>
        {/if}
        <mode-controls>
          <button
            type="button"
            data-active={filter.mode === 'include' || undefined}
            onclick={() => selectMode(filter, 'include')}
          >
            {includeOperatorLabel(filter.selected.length)}
          </button>
          <button
            type="button"
            data-active={filter.mode === 'exclude' || undefined}
            onclick={() => selectMode(filter, 'exclude')}
          >
            is not
          </button>
          {#if filter.selected.length > 0}
            <button
              type="button"
              data-clear
              onclick={() => clearFamily(activeFamily)}
            >
              Clear
            </button>
          {/if}
        </mode-controls>
        <drawer-body tabindex="-1">
          <FilterOptionList family={activeFamily} mobile />
        </drawer-body>
      {:else if activeId === 'time' && timeFilter}
        <drawer-body tabindex="-1">
          <TimeRangeEditor filter={timeFilter} {ctfStartTime} />
        </drawer-body>
      {:else}
        <drawer-body tabindex="-1">
          <root-list>
            {#each families as family (family.id)}
              {@render familyRow(family)}
            {/each}
            {#if timeFilter}
              <button
                type="button"
                data-row
                onclick={() => (activeId = 'time')}
              >
                <IconClock aria-hidden="true" />
                <span data-label>Time</span>
                {#if hasTimeRangeFilter(timeFilter)}
                  <span data-summary
                    >{formatTimeRangeSummary(timeFilter, ctfStartTime)}</span
                  >
                {/if}
                <IconCaretRight aria-hidden="true" data-chevron />
              </button>
            {/if}
          </root-list>
          {#if hasActive}
            <button type="button" data-clear-all onclick={clearAll}
              >Clear all filters</button
            >
          {/if}
        </drawer-body>
      {/if}
    </filter-drawer-shell>
  {/snippet}
</Dialog>

<style>
  :global([data-presentation='drawer']:has(filter-drawer-shell)) {
    --dialog-drawer-max-size: min(38rem, 85dvh);
  }

  filter-drawer-shell {
    display: flex;
    min-block-size: 0;
    flex: 1;
    flex-direction: column;
  }

  drawer-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs);
    color: var(--tui-selection-text);
    background: var(--tui-selection-bg);
  }

  drawer-title {
    min-inline-size: 0;
    flex: 1;
    overflow: hidden;
    font-size: var(--step-0);
    font-weight: 700;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  button[data-nav] {
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

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    &:focus-visible {
      outline: 1px dotted var(--tui-selection-text);
      outline-offset: 2px;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }

    :global(svg[data-back]) {
      rotate: 180deg;
    }
  }

  drawer-search {
    flex-shrink: 0;
    padding: var(--space-2xs) var(--space-xs);
    border-block-end: 1px solid var(--tui-border-mid);
  }

  mode-controls {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-xs);
    border-block-end: 1px solid var(--tui-border-mid);

    button {
      display: flex;
      block-size: 2rem;
      align-items: center;
      padding-inline: 0.5rem;
      color: var(--tui-text);
      background: transparent;
      border: var(--tui-border-width) solid transparent;
      font-size: var(--step--1);
      cursor: pointer;

      &:hover {
        background: var(--tui-surface-light);
      }

      &[data-active] {
        font-weight: 700;
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);
        border-color: var(--bevel-recessed);
      }

      &:focus-visible {
        outline: 2px dotted var(--tui-focus);
        outline-offset: 2px;
      }
    }

    button[data-clear] {
      margin-inline-start: auto;
      background: var(--tui-surface);
      border-color: var(--bevel-raised);

      &:hover {
        background: var(--tui-surface-light);
      }
    }
  }

  drawer-body {
    display: flex;
    min-block-size: 0;
    flex: 1;
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: none;
  }

  root-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-2xs);
  }

  button[data-row] {
    display: flex;
    inline-size: 100%;
    block-size: 2.75rem;
    align-items: center;
    gap: var(--space-2xs);
    padding-inline: 0.5rem;
    color: var(--tui-text);
    background: transparent;
    border: none;
    text-align: start;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
      outline: none;

      span[data-summary],
      :global(svg[data-chevron]) {
        color: inherit;
      }
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1em;
      block-size: 1em;
    }

    span[data-label] {
      min-inline-size: 0;
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    span[data-summary] {
      max-inline-size: 10rem;
      flex-shrink: 0;
      overflow: hidden;
      color: var(--foreground-l4);
      font-size: var(--step--1);
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg[data-chevron]) {
      color: var(--foreground-l4);
    }
  }

  button[data-clear-all] {
    margin: var(--space-2xs) var(--space-xs);
    block-size: 2.5rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    font-size: var(--step--1);
    cursor: pointer;

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
</style>
