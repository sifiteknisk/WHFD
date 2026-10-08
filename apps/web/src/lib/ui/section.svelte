<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    flush?: boolean
    children: Snippet
  }

  let { title, flush = false, children }: Props = $props()
</script>

<ui-section>
  <section-header>{title}</section-header>
  <section-content data-flush={flush || undefined}
    >{@render children()}</section-content
  >
</ui-section>

<style>
  ui-section {
    display: block;
    overflow: clip;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
  }

  section-header {
    display: flex;
    gap: var(--space-2xs);
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 1rem;
    font-weight: 700;
    color: var(--tui-selection-text);
    background: var(--tui-selection-bg);
  }

  section-content {
    display: block;
    padding: 0.5rem 1rem;

    &[data-flush] {
      padding: 0;
    }
  }
</style>
