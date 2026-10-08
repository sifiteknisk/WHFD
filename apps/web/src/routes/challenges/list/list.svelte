<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { tuiList } from '$lib/attachments/tui-list'
  import { IconQuestion } from '$lib/icons'
  import Accordion from '$lib/ui/accordion.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import ChallengesListHeader from './list-header.svelte'
  import ChallengesListItem from './list-item.svelte'
  import {
    computeStats,
    deriveAccordionValue,
    filterChallenges,
    groupChallenges,
    resolveCategory,
  } from './list-logic'
  import { loadPreferences, savePreferences } from './preferences'

  interface Props {
    challenges: Challenge[]
    solvedIds: ReadonlySet<string>
    bloodIds: { gold: Set<string>; silver: Set<string>; bronze: Set<string> }
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
    deepLinkTarget: string | null
  }

  let {
    challenges,
    solvedIds,
    bloodIds,
    selectedId,
    onSelect,
    deepLinkTarget,
  }: Props = $props()

  const initialPrefs = loadPreferences()
  let searchQuery = $state('')
  let hideSolved = $state(initialPrefs.hideSolved)
  let collapsedCategories = $state<string[]>(initialPrefs.collapsedCategories)

  const searching = $derived(searchQuery.trim().length > 0)

  const visibleChallenges = $derived.by(() => {
    const searched = filterChallenges(challenges, {
      query: searchQuery,
      hideSolved: false,
      solvedIds,
    })
    if (!hideSolved) return searched
    return searched.filter(
      challenge =>
        challenge.id === deepLinkTarget || !solvedIds.has(challenge.id)
    )
  })

  const groups = $derived(groupChallenges(visibleChallenges))
  const groupByCategory = $derived(
    new Map(groups.map(group => [group.category, group]))
  )
  const allCategories = $derived(groups.map(group => group.category))

  const deepLinkCategory = $derived.by(() => {
    if (!deepLinkTarget) return null
    const target = challenges.find(challenge => challenge.id === deepLinkTarget)
    return target ? resolveCategory(target.category) : null
  })

  const accordionValue = $derived(
    deriveAccordionValue({
      allCategories,
      collapsedCategories,
      searching,
      deepLinkCategory,
    })
  )
  const anyOpen = $derived(accordionValue.length > 0)

  const stats = $derived(computeStats(challenges, solvedIds))

  const emptySubtitle = $derived.by(() => {
    if (searching && hideSolved)
      return 'Try a different search or show solved challenges'
    if (searching) return 'Try a different search term'
    if (hideSolved) return 'All challenges have been solved!'
    return 'No challenges available'
  })

  function bloodTierOf(id: string): 'gold' | 'silver' | 'bronze' | null {
    if (bloodIds.gold.has(id)) return 'gold'
    if (bloodIds.silver.has(id)) return 'silver'
    if (bloodIds.bronze.has(id)) return 'bronze'
    return null
  }

  function selectFocused(target: HTMLElement) {
    const id = target.closest('li')?.id.replace(/^chall-/, '')
    const challenge = visibleChallenges.find(c => c.id === id)
    if (challenge) onSelect(challenge)
  }

  function toggleHideSolved() {
    hideSolved = !hideSolved
    savePreferences({ hideSolved, collapsedCategories })
  }

  function handleValueChange(open: string[]) {
    if (searching) return
    const openSet = new Set(open)
    const before = new Set(accordionValue)
    const next = [...collapsedCategories]
    let changed = false
    for (const category of allCategories) {
      const nowOpen = openSet.has(category)
      if (nowOpen === before.has(category)) continue
      const index = next.indexOf(category)
      if (nowOpen && index !== -1) {
        next.splice(index, 1)
        changed = true
      } else if (!nowOpen && index === -1) {
        next.push(category)
        changed = true
      }
    }
    if (changed) {
      collapsedCategories = next
      savePreferences({ hideSolved, collapsedCategories: next })
    }
  }

  function toggleCollapseAll() {
    const rendered = new Set(allCategories)
    const preserved = collapsedCategories.filter(
      category => !rendered.has(category)
    )
    const next = anyOpen ? [...preserved, ...allCategories] : preserved
    const deduped = [...new Set(next)]
    collapsedCategories = deduped
    savePreferences({ hideSolved, collapsedCategories: deduped })
  }
</script>

<challenges-list>
  <ChallengesListHeader
    pointsEarned={stats.pointsEarned}
    pointsTotal={stats.pointsTotal}
    solvedCount={stats.solvedCount}
    totalCount={stats.totalCount}
    {searchQuery}
    {hideSolved}
    {anyOpen}
    onSearchChange={value => (searchQuery = value)}
    onToggleHideSolved={toggleHideSolved}
    onToggleCollapse={toggleCollapseAll}
  />

  <list-scroll tabindex="-1" {@attach tuiList(selectFocused)}>
    <list-columns aria-hidden="true">
      <span></span>
      <span>Challenge</span>
      <span>Pts</span>
      <span>Solves</span>
    </list-columns>
    {#if groups.length === 0}
      <EmptyState
        icon={IconQuestion}
        title="No challenges found"
        subtitle={emptySubtitle}
      />
    {:else}
      <Accordion
        items={allCategories}
        value={accordionValue}
        onValueChange={handleValueChange}
      >
        {#snippet header({ value, props, expanded })}
          {@const config = getCategoryConfig(value)}
          {@const entries = groupByCategory.get(value)?.challenges ?? []}
          {@const solvedInCategory = entries.filter(c =>
            solvedIds.has(c.id)
          ).length}
          <challenges-list-group-header data-category-color={config.color}>
            <button {...props}>
              <span data-slot="toggle">[{expanded ? '-' : '+'}]</span>
              <span data-slot="name">{config.name}</span>
              <span data-slot="rule"></span>
              <span data-slot="count">{solvedInCategory}/{entries.length}</span>
            </button>
          </challenges-list-group-header>
        {/snippet}

        {#snippet content({ value, props })}
          {@const config = getCategoryConfig(value)}
          {@const entries = groupByCategory.get(value)?.challenges ?? []}
          <challenges-list-group-body {...props}>
            <ul>
              {#each entries as challenge (challenge.id)}
                <ChallengesListItem
                  {challenge}
                  color={config.color}
                  solved={solvedIds.has(challenge.id)}
                  bloodTier={bloodTierOf(challenge.id)}
                  selected={selectedId === challenge.id}
                  onSelect={() => onSelect(challenge)}
                />
              {/each}
            </ul>
          </challenges-list-group-body>
        {/snippet}
      </Accordion>
    {/if}
  </list-scroll>
</challenges-list>

<style>
  challenges-list {
    container-type: inline-size;
    container-name: challenges-list;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  list-scroll {
    --columns-height: 1.5rem;
    scroll-padding-block-start: calc(var(--columns-height) + 1.75rem);

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

  list-columns {
    display: grid;
    grid-template-columns: 3ch minmax(0, 1fr) 5ch 6ch;
    gap: 1ch;
    position: sticky;
    inset-block-start: 0;
    z-index: 3;
    align-items: center;
    block-size: var(--columns-height);
    padding-inline: 0.5rem;
    background: var(--tui-surface-light);
    border-block-end: 1px solid var(--tui-border-mid);
    color: var(--tui-muted);
    font-size: var(--step--1);
    white-space: nowrap;

    > :nth-child(n + 3) {
      text-align: end;
    }
  }

  challenges-list-group-header {
    position: sticky;
    inset-block-start: var(--columns-height);
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

  challenges-list-group-body {
    display: block;

    ul {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
    }
  }
</style>
