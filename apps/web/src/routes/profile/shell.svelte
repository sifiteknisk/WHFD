<script lang="ts">
  import Spinner from '$lib/ui/spinner.svelte'
  import { createRovingFocus } from '$lib/utils/roving'
  import { untrack, type Snippet } from 'svelte'

  type Tab = { value: string; label: string }

  type Props = {
    tabs: Tab[]
    desktopColumn: string
    hideTablistOnDesktop?: boolean
    status: 'loading' | 'unavailable' | 'ready'
    header: Snippet
    panel: Snippet<[string]>
    unavailable: Snippet
  }

  let {
    tabs,
    desktopColumn,
    hideTablistOnDesktop = false,
    status,
    header,
    panel,
    unavailable,
  }: Props = $props()

  let activeTab = $state(untrack(() => tabs[0]?.value ?? ''))

  const revealAfterLoading = untrack(() => status) === 'loading'

  const rovingFocus = createRovingFocus()
</script>

{#if status === 'loading'}
  <profile-status>
    <Spinner />
  </profile-status>
{:else if status === 'unavailable'}
  <profile-status>
    {@render unavailable()}
  </profile-status>
{:else}
  <profile-page
    data-active-tab={activeTab}
    data-desktop-column={desktopColumn}
    data-hide-tablist={hideTablistOnDesktop || undefined}
    data-reveal={revealAfterLoading || undefined}
  >
    <profile-box data-part="header">
      <span class="tui-dialog-title">Team</span>
      <profile-header-slot>
        {@render header()}
      </profile-header-slot>
    </profile-box>

    <profile-box data-part="board"></profile-box>

    <profile-board>
      <profile-tabbar
        role="tablist"
        aria-label="Profile sections"
        {@attach rovingFocus}
      >
        {#each tabs as tab (tab.value)}
          <button
            type="button"
            role="tab"
            data-roving
            id="profile-tab-{tab.value}"
            aria-controls="profile-panel-{tab.value}"
            aria-selected={activeTab === tab.value}
            data-tab={tab.value}
            data-selected={activeTab === tab.value || undefined}
            onclick={() => (activeTab = tab.value)}
          >
            {tab.label}
          </button>
        {/each}
      </profile-tabbar>

      {#each tabs as tab (tab.value)}
        <profile-panel
          role="tabpanel"
          tabindex="-1"
          id="profile-panel-{tab.value}"
          aria-labelledby="profile-tab-{tab.value}"
          data-tab={tab.value}
        >
          {@render panel(tab.value)}
        </profile-panel>
      {/each}
    </profile-board>
  </profile-page>
{/if}

<style>
  profile-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);

    :global(ui-card) {
      box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
        var(--tui-shadow);
    }
  }

  profile-page {
    display: grid;
    grid-template:
      'header' auto
      'tabbar' auto
      'content' minmax(0, 1fr)
      / minmax(0, 1fr);
    row-gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: 48rem;
    margin-inline: auto;
    padding-block: 0.7rem
      calc(var(--space-2xs) + var(--tui-shadow-offset));
    padding-inline: var(--space-2xs)
      calc(var(--space-2xs) + var(--tui-shadow-offset));
    flex: 1;
    min-block-size: 0;
    overflow: hidden;
  }

  profile-board {
    display: contents;
  }

  profile-box {
    min-inline-size: 0;
    min-block-size: 0;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);

    &[data-part='header'] {
      position: relative;
      grid-area: header;
      padding-block-start: 0.85rem;
    }

    &[data-part='board'] {
      grid-area: tabbar / 1 / content / 2;
      pointer-events: none;
    }
  }

  profile-header-slot {
    display: block;
    padding: var(--space-xs) var(--space-m) var(--space-s);
  }

  profile-tabbar {
    grid-area: tabbar;
    display: flex;
    gap: var(--space-3xs);
    margin-block-start: var(--tui-border-width);
    margin-inline: var(--tui-border-width);
    padding-block-start: var(--space-2xs);
    padding-inline: var(--space-s);

    button {
      flex: 1;
      padding-block: var(--space-3xs);
      color: var(--tui-text);
      background: transparent;
      border: var(--tui-border-width) solid transparent;
      cursor: pointer;

      &:hover {
        background: var(--tui-surface-light);
      }

      &[data-selected] {
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
  }

  profile-panel {
    grid-area: content;
    display: none;
    min-inline-size: 0;
    min-block-size: 0;
    margin-block-end: var(--tui-border-width);
    margin-inline: var(--tui-border-width);
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);

    &[data-tab='challenges'] {
      overflow: hidden;
    }

    &[data-tab='analytics'],
    &[data-tab='settings'] {
      gap: var(--space-s);
      padding-block-end: var(--tui-shadow-offset);
      padding-inline-end: var(--tui-shadow-offset);
      overflow-y: auto;
      overscroll-behavior: none;
    }
  }

  profile-panel[data-tab='settings'] :global(ui-section),
  profile-panel[data-tab='analytics'] :global(section) {
    flex-shrink: 0;
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
  }

  profile-page:not([data-active-tab='challenges'])
    profile-box[data-part='board'] {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  profile-page:not([data-active-tab='challenges']) profile-tabbar {
    margin: 0;
    padding: var(--space-3xs);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
  }

  profile-page:not([data-active-tab='challenges']) profile-panel {
    margin: 0;
  }

  profile-page[data-active-tab='challenges']
    profile-panel[data-tab='challenges'],
  profile-page[data-active-tab='analytics'] profile-panel[data-tab='analytics'],
  profile-page[data-active-tab='settings'] profile-panel[data-tab='settings'] {
    display: flex;
    flex-direction: column;
  }

  @media (width >= 64rem) {
    profile-page {
      max-inline-size: 100rem;
      grid-template:
        'header  aside' auto
        'tabbar  aside' auto
        'content aside' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
      column-gap: var(--space-s);
    }

    profile-box[data-part='board'] {
      grid-area: tabbar / 1 / content / 2;
    }

    profile-page[data-hide-tablist] {
      grid-template:
        'header aside' auto
        'content aside' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
    }

    profile-page[data-hide-tablist] profile-box[data-part='board'] {
      grid-area: content;
    }

    profile-page[data-hide-tablist] profile-tabbar {
      display: none;
    }

    profile-tabbar button[data-tab='settings'] {
      display: none;
    }

    profile-page[data-desktop-column='settings']
      profile-panel[data-tab='settings'],
    profile-page[data-desktop-column='analytics']
      profile-panel[data-tab='analytics'] {
      grid-area: aside;
      display: flex;
      flex-direction: column;
      margin: 0;
    }

    profile-page profile-panel[data-tab='challenges'] {
      display: flex;
      flex-direction: column;
    }

    profile-page[data-desktop-column='settings']
      profile-panel[data-tab='analytics'] {
      display: none;
    }

    profile-page[data-desktop-column='settings'][data-active-tab='analytics']
      profile-panel[data-tab='challenges'] {
      display: none;
    }

    profile-page[data-desktop-column='settings'][data-active-tab='analytics']
      profile-panel[data-tab='analytics'] {
      display: flex;
      flex-direction: column;
    }
  }
</style>
