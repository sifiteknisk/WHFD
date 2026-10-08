<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'

  type Props = {
    items: MenuItem[]
    selectedLabel: string
    describedBy?: string | undefined
    disabled?: boolean
  }

  let { items, selectedLabel, describedBy, disabled = false }: Props = $props()
</script>

<Menu label="Select division" {items} placement="bottom-start" sameWidth>
  {#snippet trigger({ props })}
    <button {...props} type="button" aria-describedby={describedBy} {disabled}>
      <span>{selectedLabel}</span>
      <IconCaretDown aria-hidden="true" />
    </button>
  {/snippet}
</Menu>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs) 0.625rem;
    color: var(--tui-text);
    text-align: start;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    cursor: pointer;

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1em;
      block-size: 1em;
      color: var(--foreground-l3);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    &:disabled {
      pointer-events: none;
      color: var(--tui-muted);
    }
  }
</style>
