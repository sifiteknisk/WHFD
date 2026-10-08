<script lang="ts">
  import { ChallengeScoringKind, type AdminChallenge } from '@rctf/types'
  import {
    IconCloud,
    IconEyeClosed,
    IconGlobeHemisphereWest,
    IconRobot,
  } from '$lib/icons'
  import { pointsLabel } from './list-logic'

  interface Props {
    challenge: AdminChallenge
    selected: boolean
    onSelect: () => void
  }

  let { challenge, selected, onSelect }: Props = $props()

  const isDynamic = $derived(
    challenge.scoring?.kind === ChallengeScoringKind.DYNAMIC
  )
  const hasStatusIcon = $derived(
    challenge.hidden ||
      !!challenge.instancerConfig ||
      !!challenge.adminBotConfig ||
      isDynamic
  )
  const points = $derived(pointsLabel(challenge))
</script>

<li>
  <button
    type="button"
    onclick={onSelect}
    data-selected={selected ? '' : undefined}
    data-hidden={challenge.hidden || undefined}
  >
    <item-title>
      <category-swatch></category-swatch>
      <span data-part="name">{challenge.name}</span>
    </item-title>

    <item-meta>
      {#if hasStatusIcon}
        <item-status>
          {#if challenge.hidden}
            <IconEyeClosed data-status-icon />
          {/if}
          {#if isDynamic}
            <IconGlobeHemisphereWest data-status-icon />
          {/if}
          {#if challenge.instancerConfig}
            <IconCloud data-status-icon />
          {/if}
          {#if challenge.adminBotConfig}
            <IconRobot data-status-icon />
          {/if}
        </item-status>
      {/if}
      {#if isDynamic}
        <span data-part="points"><strong>Dynamic</strong></span>
      {:else}
        <span data-part="points"><strong>{points}</strong> pts</span>
      {/if}
    </item-meta>
  </button>
</li>

<style>
  li {
    display: block;
  }

  button {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    inline-size: 100%;
    padding: 0.125rem 0.5rem 0.125rem calc(0.5rem + 4ch);
    color: var(--tui-text);
    text-align: start;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: var(--background-accent);
    }

    &[data-selected],
    &:focus-visible {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);

      item-status,
      [data-part] {
        color: inherit;
      }
    }

    &:focus-visible {
      outline: 1px dotted var(--tui-selection-text);
      outline-offset: -2px;
    }

    &[data-hidden]:not([data-selected], :focus-visible) [data-part='name'] {
      color: var(--tui-muted);
    }
  }

  item-title {
    display: flex;
    gap: 1ch;
    align-items: center;
    min-inline-size: 0;
  }

  category-swatch {
    flex-shrink: 0;
    align-self: stretch;
    inline-size: 0.5em;
    margin-block: 0.2em;
    background: var(--category-foreground-l1);
    border: 1px solid var(--tui-border-dark);

    button:is([data-selected], :focus-visible) & {
      border-color: var(--tui-selection-text);
    }
  }

  [data-part='name'] {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  item-meta {
    display: flex;
    gap: var(--space-s);
    align-items: center;
    justify-content: flex-end;
    font-variant-numeric: tabular-nums;
  }

  item-status {
    display: flex;
    flex-shrink: 0;
    gap: 0.375rem;
    align-items: center;
    color: var(--tui-muted);

    :global(svg[data-status-icon]) {
      flex-shrink: 0;
      font-size: 1rem;
    }
  }

  [data-part='points'] {
    color: var(--tui-muted);

    strong {
      color: var(--tui-text);
      font-weight: var(--font-weight-normal);
    }

    button:is([data-selected], :focus-visible) & strong {
      color: inherit;
    }
  }

  @container admin-challenges-list (min-inline-size: 24rem) {
    button {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-m);
    }
  }
</style>
