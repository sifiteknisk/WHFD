<script lang="ts">
  import { IconCaretRight, IconClock, IconFunnel } from '$lib/icons'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { Snippet } from 'svelte'
  import FilterOptionList from './filter-option-list.svelte'
  import FilterOption from './filter-option.svelte'
  import FilterPopover from './filter-popover.svelte'
  import FilterSearchInput from './filter-search-input.svelte'
  import {
    normalizeSearchText,
    rootFilterFamilyMatchesSearch,
    rootFilterOptionKey,
    rootSearchMatchesForFamily,
    type TimeFilterFamily,
    type ValueFilterFamily,
  } from './ui'

  type Props = {
    families: ValueFilterFamily[]
    hasFilters: boolean
    timeFamily?: TimeFilterFamily
    timeMenu?: Snippet<[{ close: () => void }]>
  }

  let { families, hasFilters, timeFamily, timeMenu }: Props = $props()

  type Drill = ValueFilterFamily | 'time' | null

  let query = $state('')
  let active = $state<Drill>(null)

  const normalized = $derived(normalizeSearchText(query))
  const searching = $derived(normalized.length > 0)

  const familyMatches = $derived(
    searching
      ? families.filter(family =>
          rootFilterFamilyMatchesSearch(family, normalized)
        )
      : []
  )
  const timeMatches = $derived(
    searching &&
      !!timeFamily &&
      rootFilterFamilyMatchesSearch(timeFamily, normalized)
  )
  const optionMatches = $derived(
    searching
      ? families.flatMap(family =>
          rootSearchMatchesForFamily(family, normalized)
        )
      : []
  )
  const hasMatches = $derived(
    familyMatches.length > 0 || timeMatches || optionMatches.length > 0
  )

  const activeLabel = $derived(
    active === 'time' ? (timeFamily?.label ?? 'Time') : (active?.label ?? '')
  )

  function reset() {
    query = ''
    active = null
  }
</script>

{#snippet familyRow(family: ValueFilterFamily)}
  {@const Icon = family.icon}
  <family-row>
    <button type="button" onclick={() => (active = family)}>
      <Icon aria-hidden="true" />
      <span>{family.label}</span>
      <IconCaretRight aria-hidden="true" data-chevron />
    </button>
  </family-row>
{/snippet}

{#snippet drillHeader()}
  <drill-header>
    <button type="button" onclick={() => (active = null)}>
      <IconCaretRight aria-hidden="true" data-back />
      {activeLabel}
    </button>
  </drill-header>
{/snippet}

{#snippet timeRow()}
  {#if timeFamily}
    <family-row>
      <button type="button" onclick={() => (active = 'time')}>
        <IconClock aria-hidden="true" />
        <span>{timeFamily.label}</span>
        <IconCaretRight aria-hidden="true" data-chevron />
      </button>
    </family-row>
  {/if}
{/snippet}

<FilterPopover label="Add filter" width="20rem">
  {#snippet trigger({ props, open })}
    <Tooltip label="Add filter" disabled={open}>
      {#snippet children({ props: tip })}
        <button
          {...tip}
          {...props}
          type="button"
          aria-label="Add filter"
          data-active={hasFilters || undefined}
        >
          <IconFunnel aria-hidden="true" />
        </button>
      {/snippet}
    </Tooltip>
  {/snippet}

  {#snippet panel({ close })}
    <funnel-panel {@attach () => reset()}>
      {#if active === 'time'}
        {@render drillHeader()}
        {@render timeMenu?.({ close })}
      {:else if active}
        {@render drillHeader()}
        <FilterOptionList family={active} searchable={!!active.search} />
      {:else}
        <FilterSearchInput
          value={query}
          placeholder="Search filters..."
          onInput={value => (query = value)}
        />
        <funnel-body>
          {#if searching}
            {#each familyMatches as family (family.id)}
              {@render familyRow(family)}
            {/each}
            {#if timeMatches}
              {@render timeRow()}
            {/if}
            {#each optionMatches as match (rootFilterOptionKey(match))}
              <FilterOption
                family={match.family}
                option={match.option}
                showPath
              />
            {/each}
            {#if !hasMatches}
              <funnel-status data-empty>No filters found</funnel-status>
            {/if}
          {:else}
            {#each families as family (family.id)}
              {@render familyRow(family)}
            {/each}
            {@render timeRow()}
          {/if}
        </funnel-body>
      {/if}
    </funnel-panel>
  {/snippet}
</FilterPopover>

<style>
  button[aria-label='Add filter'] {
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

    &:active,
    &[data-state='open'] {
      border-color: var(--bevel-recessed);
    }

    &:active {
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

  funnel-panel {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    max-block-size: min(29rem, 70vh);
  }

  funnel-body {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    padding: var(--space-3xs);
  }

  drill-header {
    display: flex;
    flex-shrink: 0;
    border-block-end: 1px solid var(--tui-border-mid);

    button {
      display: flex;
      inline-size: 100%;
      align-items: center;
      gap: var(--space-2xs);
      block-size: 2.5rem;
      padding-inline: 0.5rem;
      color: var(--tui-text);
      background: transparent;
      border: none;
      font-size: var(--step--1);
      font-weight: 700;
      cursor: pointer;

      :global(svg[data-back]) {
        inline-size: 1em;
        block-size: 1em;
        rotate: 180deg;
        color: var(--tui-muted);
      }

      &:hover,
      &:focus-visible {
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);
        outline: none;

        :global(svg[data-back]) {
          color: inherit;
        }
      }
    }
  }

  family-row button {
    display: flex;
    inline-size: 100%;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.25rem 0.5rem;
    color: var(--tui-text);
    background: transparent;
    border: none;
    font-size: var(--step--1);
    cursor: pointer;

    span {
      flex: 1;
      text-align: start;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
    }

    :global(svg[data-chevron]) {
      color: var(--tui-muted);
    }

    &:hover,
    &:focus-visible {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
      outline: none;

      :global(svg[data-chevron]) {
        color: inherit;
      }
    }
  }

  funnel-status {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.375rem 0.5rem;
    color: var(--tui-muted);
    font-size: var(--step--1);

    &[data-empty] {
      justify-content: center;
    }
  }
</style>
