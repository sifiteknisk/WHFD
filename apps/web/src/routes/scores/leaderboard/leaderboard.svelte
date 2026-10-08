<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import {
    resolvePinnedEdge,
    type ViewportClip,
  } from '$lib/components/pinned-self-row'
  import { createScrollGeometry } from '$lib/components/scroll-geometry.svelte'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { evaluateLoadMore } from '$lib/virtual/load-more'
  import { createSlotRows } from '$lib/virtual/slot-rows.svelte'
  import { createVirtualizer } from '$lib/virtual/virtualizer.svelte'
  import ScoresGraph from '../graph/graph.svelte'
  import type { ScoresData } from '../model/data.svelte'
  import {
    computeVisibleRankWindow,
    getCategoryCellsInnerWidth,
    getChallengeCellsInnerWidth,
    getGraphVisibility,
    getRankVariant,
  } from '../model/transforms'
  import type { ScoresUrlState } from '../model/url-state.svelte'
  import {
    SCORE_DIAGONAL_OVERFLOW_PX,
    SCORE_HEADER_HEIGHT_PX,
    SCORE_PREFETCH_ROWS,
    SCORE_ROW_GAP_PX,
    SCORE_ROW_HEIGHT_FULL_PX,
    SCORE_TELEPORT_REFRESH_MS,
    SCORE_VIRTUAL_OVERSCAN,
  } from './constants'
  import { createHoverController } from './hover-controller.svelte'
  import ScoresHeader from './leaderboard-header.svelte'
  import ScoresScrollbars from './scrollbars.svelte'
  import ScoresSelfRow from './self-row.svelte'
  import ScoresSolveCells from './solve-cells.svelte'
  import ScoresTeamRow from './team-row.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
    divisions: Record<string, string>
    startTime: number
  }

  let { data, urlState, divisions, startTime }: Props = $props()

  const showDivision = $derived(Object.keys(divisions).length > 1)

  function focusChallenge(id: string) {
    const wasFocused = urlState.focusedChallengeId === id
    urlState.setFocusedChallenge(wasFocused ? null : id)
    if (!wasFocused && scrollRoot) scrollRoot.scrollTop = 0
  }

  let isDesktop = $state(false)
  $effect(() => {
    const query = window.matchMedia('(width >= 48rem)')
    const update = () => (isDesktop = query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  })
  const headerOffset = $derived(isDesktop ? SCORE_HEADER_HEIGHT_PX : 0)

  const virtual = createVirtualizer(() => ({
    count: Math.max(data.entries.length, data.total),
    rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
    overscan: SCORE_VIRTUAL_OVERSCAN,
    scrollMargin: headerOffset,
  }))

  const slotRows = createSlotRows({
    items: () => virtual.virtualItems,
    isScrolling: () => virtual.isScrolling,
    count: () => Math.max(data.entries.length, data.total),
    refreshMs: SCORE_TELEPORT_REFRESH_MS,
  })

  const contentWidth = $derived(
    (urlState.viewMode === 'categories'
      ? getCategoryCellsInnerWidth(data.categoryGroups.length)
      : getChallengeCellsInnerWidth(data.challenges)) +
      SCORE_ROW_GAP_PX +
      SCORE_DIAGONAL_OVERFLOW_PX
  )

  const GRAPH_SCROLL_REFRESH_MS = 100
  let lastWindow = { minRank: 0, maxRank: 0 }
  const windowGate = { at: 0 }
  const liveWindow = $derived.by(() => {
    const scrolling = virtual.isScrolling
    const next = computeVisibleRankWindow({
      scrollTop: geometry.scrollTop,
      clientHeight: geometry.clientHeight,
      headerOffset,
      rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
      loadedCount: data.entries.length,
    })
    if (
      lastWindow.minRank === next.minRank &&
      lastWindow.maxRank === next.maxRank
    ) {
      return lastWindow
    }
    const now = performance.now()
    if (scrolling && now - windowGate.at < GRAPH_SCROLL_REFRESH_MS) {
      return lastWindow
    }
    windowGate.at = now
    lastWindow = next
    return lastWindow
  })

  const graphVisibility = $derived(
    getGraphVisibility({
      entries: data.entries,
      isLoading: data.isLoading,
      minRank: liveWindow.minRank,
      maxRank: liveWindow.maxRank,
      showTop3Context: data.showTop3Context,
      showSelfContext: data.showSelfContext,
      currentUserId: data.currentUserId,
      teamRanks: data.teamRanks,
    })
  )

  let latched = false
  $effect(() => {
    const last = virtual.virtualItems.at(-1)
    const loadedCount = data.entries.length
    const hasNextPage = data.hasNextPage
    const isFetching = data.isFetchingNextPage
    if (!last || data.loadError) return
    const result = evaluateLoadMore({
      lastVisibleIndex: last.index,
      loadedCount,
      prefetchRows: SCORE_PREFETCH_ROWS,
      hasNextPage,
      isFetching,
      latched,
    })
    latched = result.latched
    if (result.shouldFetch) void data.fetchNextPage()
  })

  let scrollRoot = $state<HTMLElement | null>(null)
  const geometry = createScrollGeometry(() => scrollRoot)

  $effect(() => {
    void urlState.search
    if (scrollRoot) {
      scrollRoot.scrollTop = 0
    }
  })

  const hover = createHoverController({
    scrollRoot: () => scrollRoot,
    entries: () => data.entries,
    startTime: () => startTime,
  })

  const selfIndex = $derived(
    data.currentUserId ? (data.teamRanks.get(data.currentUserId) ?? 0) - 1 : -1
  )

  const selfClip = $derived.by((): ViewportClip => {
    if (selfIndex === -1 || geometry.clientHeight === 0) return null
    const rowTop = headerOffset + selfIndex * SCORE_ROW_HEIGHT_FULL_PX
    const rowBottom = rowTop + SCORE_ROW_HEIGHT_FULL_PX
    if (rowTop < geometry.scrollTop + headerOffset) return 'above'
    if (rowBottom > geometry.scrollTop + geometry.clientHeight) return 'below'
    return 'visible'
  })
  const searchActive = $derived(!!urlState.search)

  const hasSelf = $derived(
    !!data.currentUser &&
      data.currentUser.division.toLowerCase() !== 'relaxed' &&
      (data.isLoading || data.currentUser.globalPlace !== null)
  )

  const stickySelf = $derived(hasSelf && !searchActive)

  const selfEdge = $derived(
    resolvePinnedEdge({
      hasSelf,
      selfIndex: selfIndex === -1 ? null : selfIndex,
      viewportClip: selfClip,
      searchActive,
    })
  )

  const selfRow = $derived.by(
    (): { entry: LeaderboardEntry; index: number } | null => {
      const user = data.currentUser
      if (!user) return null
      const loaded = data.entries[selfIndex]
      if (selfIndex !== -1 && loaded) return { entry: loaded, index: selfIndex }
      return {
        entry: {
          id: user.id,
          name: user.name,
          score: user.score,
          avatarUrl: user.avatarUrl,
          countryCode: user.countryCode,
          statusText: user.statusText,
          solves: user.solves.map(solve => ({
            id: solve.id,
            solveTime: solve.createdAt,
          })),
          dynamicScores: user.dynamicScores,
          division: user.division,
          divisionPlace: user.divisionPlace ?? 0,
          globalPlace: user.globalPlace,
        },
        index: (user.globalPlace ?? 1) - 1,
      }
    }
  )

  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))
</script>

{#snippet teamRow(entry: LeaderboardEntry, index: number)}
  {@const isSelf = data.currentUserId === entry.id}
  {@const variant = getRankVariant(entry.globalPlace ?? index + 1, isSelf)}
  <row-team
    data-rank={variant}
    data-ranked={variant !== 'nth' || undefined}
    data-current={isSelf || undefined}
    data-hovered={hover.hoveredRowId === entry.id || undefined}
  >
    <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
  </row-team>
  <row-content
    data-current={isSelf || undefined}
    data-hovered={hover.hoveredRowId === entry.id || undefined}
  >
    <ScoresSolveCells
      {data}
      {entry}
      viewMode={urlState.viewMode}
      sortMode={urlState.sortMode}
      focusedChallengeId={urlState.focusedChallengeId}
      hoveredColumnId={hover.hoveredColumnId}
    />
  </row-content>
{/snippet}

{#snippet skeletonRow()}
  <row-skeleton aria-hidden="true"></row-skeleton>
{/snippet}

{#snippet graphPanel()}
  <ScoresGraph
    graphData={data.graphData}
    visibleTeamIds={graphVisibility.visibleTeamIds}
    contextTeamIds={graphVisibility.contextTeamIds}
    teamRanks={data.teamRanks}
    selfId={data.currentUserId}
    {startTime}
    hoveredTeamId={hover.hoveredTeamId}
    solveHighlight={hover.solveHighlight}
    showTop3Context={data.showTop3Context}
    showSelfContext={data.showSelfContext}
    onToggleTop3={() => urlState.setShowTop3Context(!data.showTop3Context)}
    onToggleSelf={() => urlState.setShowSelfContext(!data.showSelfContext)}
  />
{/snippet}

<scores-shell
  style:--score-content-width={`${contentWidth}px`}
  data-fade-scope
  data-self-edge={selfEdge ?? undefined}
>
  <mobile-graph>
    {@render graphPanel()}
  </mobile-graph>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <scores-scroll
    {@attach virtual.scrollContainer}
    {@attach captureScroll}
    data-fade-source
    tabindex="-1"
    onpointermove={hover.handlePointerMove}
    onpointerleave={hover.handlePointerLeave}
  >
    <scores-table>
      <header-row>
        <header-corner>
          <graph-panel>
            {@render graphPanel()}
          </graph-panel>
        </header-corner>
        <header-content>
          {#if data.challenges.length > 0}
            <ScoresHeader
              viewMode={urlState.viewMode}
              sortMode={urlState.sortMode}
              categoryGroups={data.categoryGroups}
              challenges={data.challenges}
              focusedChallengeId={urlState.focusedChallengeId}
              onFocus={focusChallenge}
              hoveredColumnId={hover.hoveredColumnId}
            />
          {/if}
        </header-content>
      </header-row>

      {#if stickySelf && selfRow}
        <ScoresSelfRow
          {data}
          entry={selfRow.entry}
          index={selfRow.index}
          viewMode={urlState.viewMode}
          sortMode={urlState.sortMode}
          focusedChallengeId={urlState.focusedChallengeId}
          {divisions}
          {showDivision}
          hoveredColumnId={hover.hoveredColumnId}
          hovered={hover.hoveredRowId === selfRow.entry.id}
        />
      {/if}

      <virtual-list style:block-size={`${virtual.totalSize}px`}>
        {#each slotRows.rows as { slot, item } (slot)}
          {@const entry = data.entries[item.index]}
          {@const coveredBySticky = stickySelf && item.index === selfRow?.index}
          <virtual-row
            data-loading={entry || coveredBySticky ? undefined : true}
            data-team-id={entry?.id}
            style:translate={`0 ${item.start - headerOffset}px`}
          >
            {#if coveredBySticky}
              <!-- sticky self row -->
            {:else if entry}
              {@render teamRow(entry, item.index)}
            {:else}
              {@render skeletonRow()}
            {/if}
          </virtual-row>
        {/each}
      </virtual-list>
    </scores-table>
  </scores-scroll>

  <ScoresScrollbars root={scrollRoot} {geometry} />

  <edge-fade data-edge="top" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="bottom" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="left" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="right" aria-hidden="true"></edge-fade>

  {#if hover.tooltip}
    <cell-tooltip
      aria-hidden="true"
      data-place={hover.tooltipPlace}
      style:left={`${hover.tooltipX}px`}
      style:top={`${hover.tooltipY}px`}
    >
      <strong data-capitalize={hover.tooltip.capitalize || undefined}>
        {hover.tooltip.title}
      </strong>
      {#each hover.tooltip.lines as line, index (index)}
        {#if line.icon?.kind === 'category'}
          {@const category = getCategoryConfig(line.icon.category)}
          <span data-trend={line.trend} data-category-color={category.color}>
            <category-swatch></category-swatch>
            <span data-category-name>{line.iconLabel}</span>
            &middot;
            {line.text}
          </span>
        {:else}
          <span data-trend={line.trend}>
            {line.text}
            {#if line.icon}
              {#if line.icon.kind === 'blood'}
                <span data-mark="blood" data-medal={line.icon.medal}
                  >[{line.icon.medal}]</span
                >
              {:else}
                <span data-mark="solved">[*]</span>
              {/if}
              {line.iconLabel}
            {/if}
          </span>
        {/if}
      {/each}
    </cell-tooltip>
  {/if}
</scores-shell>

<style>
  scores-shell {
    --score-bg: var(--tui-surface-light);
    --score-rule: var(--tui-border-mid);
    --score-hover: color-mix(
      in oklab,
      var(--tui-selection-bg) 14%,
      var(--score-bg)
    );
    --score-row-gap: 1px;
    --score-row-height-full: 49px;
    --score-row-height: calc(
      var(--score-row-height-full) - var(--score-row-gap)
    );
    --score-header-height: 188px;
    --score-name-row-height: 128px;
    --score-diagonal-overflow: 96px;
    --score-team-column-width: 100%;
    --score-mobile-graph-height: 12rem;
    --score-fade-size: 1.5rem;
    --score-fade-inset-top: 0px;
    --score-fade-inset-bottom: 0px;
    --score-fade-region-top: calc(var(--score-mobile-graph-height) + 1px);
    --score-fade-rail: 0px;
    position: relative;
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    inline-size: 100%;
    max-inline-size: 100%;
    background: var(--score-bg);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &[data-fade-scope] {
      timeline-scope: --edge-fade, --lb-block, --lb-inline;
    }

    &[data-self-edge='top'] {
      --score-fade-inset-top: var(--score-row-height-full);
    }

    &[data-self-edge='bottom'] {
      --score-fade-inset-bottom: var(--score-row-height-full);
    }
  }

  edge-fade {
    position: absolute;
    /* top/bottom sit below the pinned self row (z 15). their opacity tracks
       scroll on the compositor while their inset updates from JS a frame
       later, so they must never be able to paint over the row occupying the
       edge in the meantime */
    z-index: 14;
    display: block;
    pointer-events: none;
    opacity: 0;

    @supports (animation-timeline: scroll()) {
      animation: linear both;

      &[data-edge='top'] {
        animation-name: lb-fade-in;
        animation-timeline: --lb-block;
        animation-range: 0 1.5rem;
      }

      &[data-edge='bottom'] {
        animation-name: lb-fade-out;
        animation-timeline: --lb-block;
        animation-range: calc(100% - 1.5rem) 100%;
      }

      &[data-edge='left'] {
        animation-name: lb-fade-in;
        animation-timeline: --lb-inline;
        animation-range: 0 1.5rem;
      }

      &[data-edge='right'] {
        animation-name: lb-fade-out;
        animation-timeline: --lb-inline;
        animation-range: calc(100% - 1.5rem) 100%;
      }
    }

    &[data-edge='top'] {
      inset-block-start: calc(
        var(--score-fade-region-top) + var(--score-fade-inset-top)
      );
      inset-inline: 0;
      block-size: var(--score-fade-size);
      background: linear-gradient(to bottom, var(--score-bg), transparent);
    }

    &[data-edge='bottom'] {
      inset-block-end: calc(
        var(--score-fade-rail) + var(--score-fade-inset-bottom)
      );
      inset-inline: 0;
      block-size: var(--score-fade-size);
      background: linear-gradient(to top, var(--score-bg), transparent);
    }

    &[data-edge='left'],
    &[data-edge='right'] {
      display: none;
    }
  }

  @keyframes lb-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes lb-fade-out {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  mobile-graph {
    display: block;
    flex-shrink: 0;
    block-size: var(--score-mobile-graph-height);
    background: var(--score-bg);
    border-block-end: 1px solid var(--score-rule);
    overflow: hidden;
  }

  graph-panel {
    display: none;
  }

  scores-scroll {
    flex: 1;
    min-block-size: 0;
    inline-size: 100%;
    overflow: auto;
    outline: none;
    overscroll-behavior: none;
    scrollbar-width: none;

    &[data-fade-source] {
      scroll-timeline:
        --edge-fade block,
        --lb-block block,
        --lb-inline inline;
    }
  }

  scores-table {
    display: flex;
    flex-direction: column;
    position: relative;
    min-block-size: 100%;
    inline-size: 100%;
  }

  header-row {
    display: none;
  }

  virtual-list {
    display: block;
    position: relative;
    inline-size: 100%;
    contain: layout style;
    /* not one huge repeating-linear-gradient because firefox misrenders giant gradient primitives??? */
    background-image: linear-gradient(
      to bottom,
      transparent 0 var(--score-row-height),
      var(--score-rule) var(--score-row-height)
    );
    background-size: 100% var(--score-row-height-full);
  }

  virtual-row {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: flex;
    inline-size: 100%;
    block-size: var(--score-row-height-full);
    contain: layout style paint;
    background: var(--score-rule);

    &:has(:global(a:focus-visible))::after {
      content: '';
      position: absolute;
      inset: 0 0 var(--score-row-gap) 0;
      z-index: 11;
      border: 1px dotted var(--tui-focus);
      pointer-events: none;
    }
  }

  @keyframes row-fade-in {
    from {
      opacity: 0;
    }
  }

  row-team,
  row-content {
    animation: row-fade-in 150ms ease-out;
  }

  row-skeleton {
    display: block;
    inline-size: 100%;
    block-size: var(--score-row-height);
    background: repeating-linear-gradient(
        -45deg,
        transparent 0 6px,
        color-mix(in oklab, var(--score-rule) 30%, transparent) 6px 7px
      )
      var(--score-bg);
  }

  row-team {
    --rank-fg-l0: var(--tui-text);
    --rank-fg-l1: var(--tui-muted);
    --row-fg: var(--tui-text);
    --row-muted: var(--tui-muted);
    display: flex;
    align-items: center;
    gap: 1ch;
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: 0.75rem;
    color: var(--row-fg);
    background: var(--score-bg);

    &[data-rank='first'] {
      --rank-fg-l0: var(--foreground-gold-l0);
      --rank-fg-l1: var(--foreground-gold-l1);
    }

    &[data-rank='second'] {
      --rank-fg-l0: var(--foreground-silver-l0);
      --rank-fg-l1: var(--foreground-silver-l1);
    }

    &[data-rank='third'] {
      --rank-fg-l0: var(--foreground-bronze-l0);
      --rank-fg-l1: var(--foreground-bronze-l1);
    }

    &[data-rank='self'] {
      --rank-fg-l0: var(--foreground-self-l0);
      --rank-fg-l1: var(--foreground-self-l1);
    }

    &[data-current] {
      background: var(--background-self-l0);
    }

    &[data-hovered] {
      --rank-fg-l0: var(--tui-selection-text);
      --rank-fg-l1: var(--tui-selection-text);
      --row-fg: var(--tui-selection-text);
      --row-muted: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }
  }

  row-content {
    display: none;
  }

  @media (width >= 48rem) {
    scores-shell {
      --score-team-column-width: min(60vw - 4.5rem, 26rem);
      --score-fade-region-top: var(--score-header-height);
      --score-fade-rail: 0.75rem;
      inline-size: fit-content;
      margin-inline: auto;
      padding-block-end: var(--score-fade-rail);
    }

    edge-fade[data-edge='left'],
    edge-fade[data-edge='right'] {
      display: block;
      inset-block-start: 0;
      inset-block-end: var(--score-fade-rail);
      inline-size: var(--score-fade-size);
      /* unlike top/bottom these don't move with the pinned self row, so they
         sit above the sticky header (z 20) and self row (z 15) to fade their
         horizontally scrolling cells at the column boundary */
      z-index: 21;
    }

    edge-fade[data-edge='left'] {
      inset-inline-start: var(--score-team-column-width);
      background: linear-gradient(to right, var(--score-bg), transparent);
    }

    edge-fade[data-edge='right'] {
      inset-inline-end: 0;
      background: linear-gradient(to left, var(--score-bg), transparent);
    }

    mobile-graph {
      display: none;
    }

    scores-table {
      inline-size: max-content;
      min-inline-size: 100%;
    }

    header-row {
      display: flex;
      position: sticky;
      inset-block-start: 0;
      z-index: 20;
      block-size: var(--score-header-height);
      background: var(--score-bg);
      box-shadow: 0 1px 0 var(--score-rule);
    }

    header-corner {
      position: sticky;
      inset-inline-start: 0;
      z-index: 1;
      flex-shrink: 0;
      inline-size: var(--score-team-column-width);
      block-size: 100%;
      background: var(--score-bg);
      border-inline-end: 1px solid var(--score-rule);
    }

    graph-panel {
      display: block;
      block-size: 100%;
      overflow: hidden;
    }

    header-content {
      display: block;
      flex: 1;
      block-size: 100%;
      inline-size: max-content;
    }

    virtual-list {
      inline-size: 100%;
    }

    virtual-row {
      inline-size: auto;

      &[data-loading] {
        inline-size: 100%;
      }
    }

    row-team {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;
      border-inline-end: 1px solid var(--score-rule);
    }

    row-content {
      display: block;
      flex-shrink: 0;
      inline-size: var(--score-content-width);
      block-size: var(--score-row-height);
      background: var(--score-bg);

      &[data-hovered] {
        background: var(--score-hover);
      }

      &[data-current] {
        background: var(--background-self-l0);
      }
    }
  }

  cell-tooltip {
    position: fixed;
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    max-inline-size: 18rem;
    padding: 0.25rem 1ch;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: 0.25rem 0.25rem 0 var(--tui-shadow);
    pointer-events: none;
    line-height: 1.35;
    translate: -50% calc(-100% - 0.625rem);

    &[data-place='bottom'] {
      translate: -50% 0.625rem;
    }

    strong {
      color: var(--tui-title);
      font-size: var(--step--1);
      font-weight: 700;

      &[data-capitalize] {
        text-transform: capitalize;
      }
    }

    span {
      display: flex;
      align-items: center;
      gap: 1ch;
      color: var(--tui-muted);
      font-size: var(--step--1);
      white-space: nowrap;

      &[data-trend='positive'] {
        color: var(--tui-success);
      }

      &[data-trend='negative'] {
        color: var(--tui-danger);
      }
    }

    span[data-mark] {
      font-weight: 700;
    }

    span[data-mark='solved'] {
      color: var(--tui-success);
    }

    span[data-mark='blood'][data-medal='1'] {
      color: var(--foreground-gold-l0);
    }

    span[data-mark='blood'][data-medal='2'] {
      color: var(--foreground-silver-l0);
    }

    span[data-mark='blood'][data-medal='3'] {
      color: var(--foreground-bronze-l0);
    }

    span[data-category-name] {
      color: var(--category-foreground-l1);
    }

    category-swatch {
      flex-shrink: 0;
      inline-size: 0.75em;
      block-size: 0.75em;
      background: var(--category-foreground-l1);
      border: 1px solid var(--tui-border-dark);
    }
  }

  @media (width >= 80rem) {
    scores-shell {
      --score-team-column-width: clamp(36rem, 45vw - 4.5rem, 44rem);
    }
  }
</style>
