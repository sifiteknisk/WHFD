<script lang="ts">
  import { IconSearch } from '$lib/icons'

  type Props = {
    value: string
    placeholder: string
    onInput: (value: string) => void
    variant?: 'menu' | 'mobile'
  }

  let { value, placeholder, onInput, variant = 'menu' }: Props = $props()
</script>

<filter-search data-variant={variant}>
  <IconSearch aria-hidden="true" />
  <input
    type="text"
    {placeholder}
    {value}
    oninput={event => onInput(event.currentTarget.value)}
  />
</filter-search>

<style>
  filter-search {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-2xs);
    block-size: 2rem;
    margin: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--tui-muted);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &:focus-within {
      outline: 2px dotted var(--tui-focus);
      outline-offset: -4px;
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    &[data-variant='mobile'] {
      block-size: 2.5rem;
      margin: 0;

      &:focus-within {
        outline-offset: 2px;
      }
    }
  }

  input {
    min-inline-size: 0;
    flex: 1;
    color: var(--tui-text);
    background: transparent;
    border: none;
    font-size: var(--step--1);

    &::placeholder {
      color: var(--tui-muted);
    }

    &:focus-visible {
      outline: none;
    }
  }
</style>
