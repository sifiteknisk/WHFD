<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title?: string
    description?: string
    children: Snippet
  }

  let { title, description, children }: Props = $props()
</script>

<ui-card>
  {#if title || description}
    <card-header>
      {#if title}
        <card-title>{title}</card-title>
      {/if}
      {#if description}
        <card-description>{description}</card-description>
      {/if}
    </card-header>
  {/if}
  {@render children()}
</ui-card>

<style>
  ui-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s-m);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);

    &:has(card-title) {
      padding-block-start: var(--space-m);
    }
  }

  card-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    text-align: center;
  }

  card-title {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 50%;
    max-inline-size: calc(100% - 2rem);
    padding-inline: 0.8ch;
    overflow: hidden;
    font-weight: 700;
    color: var(--tui-title);
    text-overflow: ellipsis;
    white-space: nowrap;
    background: var(--tui-surface);
    translate: -50% -55%;
  }

  card-description {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }
</style>
