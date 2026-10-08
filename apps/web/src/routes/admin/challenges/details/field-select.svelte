<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'

  interface Props {
    label: string
    items: MenuItem[]
    disabled?: boolean
  }

  let { label, items, disabled = false }: Props = $props()
</script>

{#if disabled}
  <button type="button" data-field-trigger data-disabled disabled>
    {label}<IconCaretDown />
  </button>
{:else}
  <Menu {label} {items} sameWidth>
    {#snippet trigger({ props })}
      <button type="button" data-field-trigger {...props}>
        {label}<IconCaretDown />
      </button>
    {/snippet}
  </Menu>
{/if}

<style>
  [data-field-trigger] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--tui-text);
    text-align: start;
    cursor: pointer;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    &[data-disabled] {
      cursor: default;
      color: var(--tui-muted);
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--tui-muted);
    }
  }
</style>
