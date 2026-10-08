<script lang="ts">
  import { Permissions, type AdminChallenge } from '@rctf/types'
  import { mergeProps } from '@zag-js/svelte'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import {
    IconArrowsInLineVertical,
    IconPlus,
    IconQuestion,
    IconSearch,
  } from '$lib/icons'
  import { useCurrentUser } from '$lib/query/user'
  import Accordion from '$lib/ui/accordion.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import {
    getCategoryConfig,
    getCategoryKeyOrAlias,
  } from '$lib/utils/categories'
  import { hasPermissions } from '$lib/utils/permissions'
  import AdminChallengesListItem from './list-item.svelte'
  import {
    accordionValue,
    filterChallenges,
    groupChallenges,
  } from './list-logic'

  interface Props {
    challenges: AdminChallenge[]
    selectedId: string | null
    isCreatingNew: boolean
    onSelect: (challenge: AdminChallenge) => void
    onCreateNew: () => void
  }

  let { challenges, selectedId, isCreatingNew, onSelect, onCreateNew }: Props =
    $props()

  const userQuery = useCurrentUser()
  const canWrite = $derived(
    hasPermissions(userQuery.data, Permissions.challsWrite)
  )

  let searchQuery = $state('')
  let collapsed = $state<string[]>([])

  const searching = $derived(searchQuery.trim().length > 0)

  const filtered = $derived(filterChallenges(challenges, searchQuery))
  const groups = $derived(groupChallenges(filtered))
  const groupByCategory = $derived(
    new Map(groups.map(group => [group.category, group]))
  )
  const categories = $derived(groups.map(group => group.category))

  const value = $derived(accordionValue(groups, collapsed, searching))
  const anyOpen = $derived(value.length > 0)

  const stats = $derived({
    challenges: challenges.length,
    categories: new Set(challenges.map(c => getCategoryKeyOrAlias(c.category)))
      .size,
  })

  const emptySubtitle = $derived(
    searching
      ? 'Try a different search term'
      : 'Create your first challenge to get started'
  )

  function handleValueChange(open: string[]) {
    if (searching) return
    collapsed = categories.filter(category => !open.includes(category))
  }

  function toggleCollapseAll() {
    collapsed = anyOpen ? [...categories] : []
  }
</script>

<admin-challenges-list>
  <list-header>
    <list-stats>
      <span data-part="stat">
        <strong>{stats.challenges.toLocaleString()}</strong>
        challenge{stats.challenges === 1 ? '' : 's'}
      </span>
      <span data-part="stat">
        <strong>{stats.categories.toLocaleString()}</strong>
        categor{stats.categories === 1 ? 'y' : 'ies'}
      </span>
    </list-stats>

    <list-controls>
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

      <toggle-group data-can-write={canWrite || undefined}>
        <Tooltip label={anyOpen ? 'Collapse all' : 'Expand all'}>
          {#snippet children({ props })}
            <button
              {...mergeProps(props, { onclick: toggleCollapseAll })}
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

        {#if canWrite}
          <Tooltip label="New challenge">
            {#snippet children({ props })}
              <button
                {...mergeProps(props, { onclick: onCreateNew })}
                type="button"
                data-slot="new"
                data-active={isCreatingNew || undefined}
                aria-label="New challenge"
              >
                <IconPlus />
              </button>
            {/snippet}
          </Tooltip>
        {/if}
      </toggle-group>
    </list-controls>
  </list-header>

  <list-viewport data-fade-scope>
    <list-scroll data-fade-source tabindex="-1">
      {#if groups.length === 0}
        <EmptyState
          icon={IconQuestion}
          title={searching ? 'No challenges found' : 'No challenges yet'}
          subtitle={emptySubtitle}
        />
      {:else}
        <Accordion items={categories} {value} onValueChange={handleValueChange}>
          {#snippet header({ value: category, props, expanded })}
            {@const config = getCategoryConfig(category)}
            {@const entries = groupByCategory.get(category)?.challenges ?? []}
            <group-header data-category-color={config.color}>
              <button {...props}>
                <span data-slot="toggle">[{expanded ? '-' : '+'}]</span>
                <span data-slot="name">{config.name}</span>
                <span data-slot="rule"></span>
                <span data-slot="count">{entries.length}</span>
              </button>
            </group-header>
          {/snippet}

          {#snippet content({ value: category, props })}
            {@const config = getCategoryConfig(category)}
            {@const entries = groupByCategory.get(category)?.challenges ?? []}
            <group-body data-category-color={config.color} {...props}>
              <ul>
                {#each entries as challenge (challenge.id)}
                  <AdminChallengesListItem
                    {challenge}
                    selected={selectedId === challenge.id}
                    onSelect={() => onSelect(challenge)}
                  />
                {/each}
              </ul>
            </group-body>
          {/snippet}
        </Accordion>
      {/if}
    </list-scroll>
    <EdgeFades />
  </list-viewport>
</admin-challenges-list>

<style>
  admin-challenges-list {
    container-type: inline-size;
    container-name: admin-challenges-list;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  list-header {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.5rem;
    padding-block: 0.5rem;
  }

  list-stats {
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

  list-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-inline: var(--space-2xs);
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

  toggle-group {
    display: flex;
    gap: 0.25rem;
    inline-size: 100%;

    @container admin-challenges-list (width >= 24rem) {
      inline-size: auto;
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

    @container admin-challenges-list (width >= 24rem) {
      flex: initial;
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

    :global(svg) {
      font-size: 1.25rem;
    }
  }

  list-viewport {
    --fade-color: var(--tui-surface-light);

    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    margin: 0 var(--space-2xs) var(--space-2xs);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
  }

  list-scroll {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    padding-block-end: var(--space-s);
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);
  }

  group-header {
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

  group-body {
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
