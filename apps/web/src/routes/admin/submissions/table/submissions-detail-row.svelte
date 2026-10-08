<script lang="ts">
  import { IconX } from '$lib/icons'
  import { detailEntries, type Submission } from '../submissions-model'

  type Props = {
    submission: Submission
    onClose: () => void
  }

  let { submission, onClose }: Props = $props()

  const entries = $derived(detailEntries(submission))
</script>

<detail-row>
  <detail-label>Submitted</detail-label>
  <detail-pills>
    {#if entries.length === 0}
      <detail-empty>No details recorded</detail-empty>
    {:else}
      {#each entries as entry (`${entry.label}:${entry.value}`)}
        <detail-pill
          data-wide={entry.wide || undefined}
          title={`${entry.label}: ${entry.value}`}
        >
          <pill-label>{entry.label}</pill-label>
          {#if entry.href}
            <a href={entry.href}><code>{entry.value}</code></a>
          {:else}
            <code>{entry.value}</code>
          {/if}
        </detail-pill>
      {/each}
    {/if}
  </detail-pills>
  <button type="button" aria-label="Close submitted details" onclick={onClose}>
    <IconX aria-hidden="true" />
  </button>
</detail-row>

<style>
  detail-row {
    display: flex;
    inline-size: 100%;
    block-size: 3rem;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-2xs);
    padding-inline: var(--space-2xs) var(--space-2xs);
    padding-inline-start: 3.25rem;
    background: var(--tui-surface);
    border-block-end: 1px solid var(--tui-border-mid);
  }

  detail-label {
    flex-shrink: 0;
    color: var(--tui-muted);
    font-size: var(--step--1);
    font-weight: 700;
    white-space: nowrap;
  }

  detail-pills {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    gap: var(--space-3xs);
    overflow-x: auto;
    overscroll-behavior: none;
    padding-block-end: 2px;
    white-space: nowrap;
  }

  detail-pill {
    display: inline-flex;
    min-inline-size: 0;
    max-inline-size: 28rem;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding: 0 var(--space-2xs);
    background: var(--tui-surface-light);
    border: 1px solid var(--tui-border-mid);
    white-space: nowrap;

    &[data-wide] {
      max-inline-size: 40rem;
    }
  }

  pill-label {
    flex-shrink: 0;
    color: var(--tui-muted);
    font-size: var(--step--2);
  }

  code {
    min-inline-size: 0;
    overflow: hidden;
    color: var(--tui-text);
    font-size: var(--step--2);
    text-overflow: ellipsis;
  }

  a {
    display: contents;
    text-decoration: none;

    code {
      color: var(--tui-link);
    }

    &:hover code,
    &:focus-visible code {
      text-decoration: underline;
    }
  }

  detail-empty {
    color: var(--tui-muted);
    font-size: var(--step--1);
  }

  button {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    block-size: 1.75rem;
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
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    :global(svg) {
      inline-size: 1rem;
      block-size: 1rem;
    }
  }
</style>
