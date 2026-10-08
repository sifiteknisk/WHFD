<script lang="ts">
  import { IconCaretDown } from '$lib/icons'
  import Menu from '$lib/ui/menu.svelte'

  type Option = { value: string; label: string }

  type Props = {
    value: string
    options: Option[]
    onValueChange: (value: string) => void
    label: string
    placeholder?: string
    disabled?: boolean
  }

  let {
    value,
    options,
    onValueChange,
    label,
    placeholder = 'Select...',
    disabled = false,
  }: Props = $props()

  const current = $derived(options.find(option => option.value === value))
  const items = $derived(
    options.map(option => ({
      value: option.value,
      label: option.label,
      checked: option.value === value,
      onSelect: () => onValueChange(option.value),
    }))
  )
</script>

<Menu {label} {items} sameWidth>
  {#snippet trigger({ props })}
    <button
      type="button"
      {disabled}
      data-placeholder={current ? undefined : ''}
      {...props}
    >
      <span>{current?.label ?? placeholder}</span>
      <IconCaretDown />
    </button>
  {/snippet}
</Menu>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--tui-text);
    text-align: start;
    cursor: pointer;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &[data-placeholder] span {
      color: var(--tui-muted);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--tui-muted);
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1em;
      block-size: 1em;
      color: var(--tui-muted);
    }
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
