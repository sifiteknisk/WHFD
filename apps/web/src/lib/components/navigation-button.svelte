<script lang="ts">
  import { page } from '$app/state'
  import type { Component } from 'svelte'

  type Props = {
    href?: string
    activePath?: string
    label: string
    icon: Component
    [key: string]: unknown
  }

  let { href, activePath, label, icon: Icon, ...rest }: Props = $props()

  const active = $derived.by(() => {
    if (!activePath) return false
    if (activePath === '/') return page.url.pathname === '/'
    return page.url.pathname.startsWith(activePath)
  })
</script>

{#if href}
  <a
    {href}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    data-active={active ? '' : undefined}
    {...rest}
  >
    <Icon />
  </a>
{:else}
  <button
    type="button"
    aria-label={label}
    data-active={active ? '' : undefined}
    {...rest}
  >
    <Icon />
  </button>
{/if}

<style>
  a,
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: var(--nav-control-height, 3rem);
    padding-inline: 0.875rem;
    font-size: 1.5rem;
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

    &[data-active] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
      border-color: var(--bevel-recessed);
    }

    :global(svg) {
      flex-shrink: 0;
    }
  }
</style>
