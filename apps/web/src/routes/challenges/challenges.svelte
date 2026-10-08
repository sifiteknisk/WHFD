<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { afterNavigate, pushState, replaceState } from '$app/navigation'
  import { page } from '$app/state'
  import {
    deriveBloodIds,
    deriveSolvedIds,
    invalidateAfterSolve,
    useChallenges,
  } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import { announceSolvePoints } from '$lib/bongs/session.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import Splitter from '$lib/ui/splitter.svelte'
  import {
    handlePaneArrowKey,
    handlePaneShortcutKey,
  } from '$lib/utils/pane-keynav'
  import { tick } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import ChallengeDetails from './details/details.svelte'
  import ChallengesList from './list/list.svelte'
  import {
    getDeepLinkId,
    resolveClose,
    type CloseSource,
  } from './model/drawer-history'

  type ChallengeListProps = {
    challenges: Challenge[]
    solvedIds: ReadonlySet<string>
    bloodIds: { gold: Set<string>; silver: Set<string>; bronze: Set<string> }
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
    deepLinkTarget: string | null
  }
  type ChallengeDetailProps = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  const DESKTOP_MIN_WIDTH = 768
  const WIDE_MIN_WIDTH = 1280

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived(challengesQuery.data ?? [])
  const challengeIds = $derived(new Set(challenges.map(c => c.id)))
  const selfSolves = $derived(userQuery.data?.solves)

  const localSolvedIds = new SvelteSet<string>()
  const solvedIds = $derived(deriveSolvedIds(selfSolves, localSolvedIds))
  const bloodIds = $derived(deriveBloodIds(selfSolves))

  let selectedId = $state<string | null>(null)
  let deepLinkTarget = $state<string | null>(null)
  let innerWidth = $state(0)
  let routerReady = $state(false)
  let pendingDrawerId = $state<string | null>(null)
  let pageElement = $state<HTMLElement | null>(null)

  const isMobile = $derived(innerWidth > 0 && innerWidth < DESKTOP_MIN_WIDTH)
  const listMinSize = $derived(innerWidth < WIDE_MIN_WIDTH ? 40 : 20)

  const selectedChallenge = $derived(
    selectedId ? (challenges.find(c => c.id === selectedId) ?? null) : null
  )
  const selectedIsSolved = $derived(
    selectedChallenge ? solvedIds.has(selectedChallenge.id) : false
  )

  const drawerOpen = $derived(
    isMobile && selectedId !== null && page.state.challengeDrawer === true
  )

  function challengeUrl(id: string): string {
    const url = new URL(page.url)
    url.searchParams.set('challenge', id)
    return `${url.pathname}${url.search}`
  }

  function openDrawer(id: string) {
    pushState(challengeUrl(id), { challengeDrawer: true })
  }

  function closeDrawer(source: CloseSource) {
    if (
      resolveClose(source, page.state.challengeDrawer === true) ===
      'history-back'
    ) {
      history.back()
    }
  }

  function handleSelect(challenge: Challenge) {
    selectedId = challenge.id
    if (!isMobile) {
      replaceState(challengeUrl(challenge.id), { ...page.state })
    } else if (page.state.challengeDrawer === true) {
      replaceState(challengeUrl(challenge.id), { challengeDrawer: true })
    } else {
      openDrawer(challenge.id)
    }
  }

  function handleDrawerOpenChange(open: boolean) {
    if (!open) closeDrawer('backdrop')
  }

  function handleSolve(challengeId: string) {
    const challenge = challenges.find(item => item.id === challengeId)
    const score = userQuery.data?.score
    if (challenge && score !== undefined) {
      announceSolvePoints(score, challenge.points)
    }
    invalidateAfterSolve(queryClient, challengeId, id => localSolvedIds.add(id))
  }

  function scrollToRow(id: string, attempts = 60) {
    const el = document.getElementById(`chall-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' })
    } else if (attempts > 0) {
      requestAnimationFrame(() => scrollToRow(id, attempts - 1))
    }
  }

  let latched = $state(false)
  $effect(() => {
    if (latched || challenges.length === 0 || innerWidth === 0) return

    const id = getDeepLinkId(page.url, challengeIds)
    if (id) {
      selectedId = id
      deepLinkTarget = id
      pendingDrawerId = isMobile ? id : null
      void tick().then(() => scrollToRow(id))
    }
    latched = true
  })

  afterNavigate(() => {
    routerReady = true
    if (pendingDrawerId && isMobile && page.state.challengeDrawer !== true) {
      const id = pendingDrawerId
      pendingDrawerId = null
      openDrawer(id)
    }
  })

  let wasMobile = $state(false)
  $effect(() => {
    const mobile = isMobile
    if (wasMobile === mobile) return
    wasMobile = mobile
    if (!mobile) {
      if (page.state.challengeDrawer === true) closeDrawer('resize-to-desktop')
    } else if (
      routerReady &&
      selectedId &&
      page.state.challengeDrawer !== true
    ) {
      openDrawer(selectedId)
    }
  })

  const listProps = $derived<ChallengeListProps>({
    challenges,
    solvedIds,
    bloodIds,
    selectedId: selectedChallenge?.id ?? null,
    onSelect: handleSelect,
    deepLinkTarget,
  })
  const detailProps = $derived<ChallengeDetailProps>({
    challenge: selectedChallenge,
    isSolved: selectedIsSolved,
    onSolve: handleSolve,
  })
</script>

<svelte:window
  bind:innerWidth
  onkeydown={event => handlePaneShortcutKey(event, pageElement)}
/>

{#snippet listPane(props: ChallengeListProps)}
  <challenges-list-slot>
    <ChallengesList {...props} />
  </challenges-list-slot>
{/snippet}

{#snippet detailPane(props: ChallengeDetailProps)}
  <challenges-detail-slot>
    {#key props.challenge?.id}
      <ChallengeDetails {...props} />
    {/key}
  </challenges-detail-slot>
{/snippet}

{#if isMobile}
  <challenges-page data-form="mobile" bind:this={pageElement}>
    <pane-frame>
      <pane-surface data-side="list">
        <span class="tui-dialog-title">Challenges</span>
        {@render listPane(listProps)}
      </pane-surface>
    </pane-frame>
    <Dialog
      open={drawerOpen}
      onOpenChange={handleDrawerOpenChange}
      title={selectedChallenge?.name ?? 'Challenge details'}
      titleHidden
      presentation="drawer"
      flush
    >
      <drawer-body tabindex="-1">{@render detailPane(detailProps)}</drawer-body>
    </Dialog>
  </challenges-page>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <challenges-page
    data-form="desktop"
    onkeydown={handlePaneArrowKey}
    bind:this={pageElement}
  >
    <splitter-slot>
      <Splitter
        panels={[
          { id: 'list', minSize: listMinSize, maxSize: 50 },
          { id: 'detail', minSize: 40 },
        ]}
        defaultSize={[40, 60]}
      >
        {#snippet a()}
          <pane-frame>
            <pane-surface data-side="list">
              <span class="tui-dialog-title">Challenges</span>
              {@render listPane(listProps)}
            </pane-surface>
          </pane-frame>
        {/snippet}
        {#snippet b()}
          <pane-frame>
            <pane-surface data-side="detail">
              <span class="tui-dialog-title">
                {selectedChallenge?.name ?? 'Details'}
              </span>
              {@render detailPane(detailProps)}
            </pane-surface>
          </pane-frame>
        {/snippet}
      </Splitter>
    </splitter-slot>
  </challenges-page>
{/if}

<style>
  challenges-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-block-size: 0;
    padding-block: var(--space-2xs)
      calc(var(--space-2xs) + var(--tui-shadow-offset));
    padding-inline: var(--space-2xs)
      calc(var(--space-2xs) + var(--tui-shadow-offset));
    --splitter-handle-size: calc(var(--space-m) + var(--tui-shadow-offset));

    &[data-form='mobile'] pane-frame {
      flex: 1;
      block-size: auto;
    }
  }

  pane-frame {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    padding-block-start: 0.85rem;
  }

  splitter-slot {
    display: flex;
    flex: 1;
    min-block-size: 0;

    :global([data-part='root']),
    :global([data-part='panel']) {
      overflow: visible !important;
    }

    :global([data-part='root']) {
      flex: 1;
      min-inline-size: 0;
      min-block-size: 0;
    }
  }

  pane-surface {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    block-size: auto;
    min-block-size: 0;
    min-inline-size: 0;
    padding-block-start: 0.35rem;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);

    :global(.tui-dialog-title) {
      z-index: 2;
    }
  }

  challenges-list-slot,
  challenges-detail-slot {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
  }

  challenges-detail-slot {
    align-items: center;
    justify-content: center;
  }

  drawer-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: none;
  }

  :global([data-presentation='drawer']) {
    --dialog-drawer-max-size: 85dvh;
  }
</style>
