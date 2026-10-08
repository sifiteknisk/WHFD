<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = HTMLInputAttributes

  let { value = $bindable(), ...rest }: Props = $props()
</script>

<input bind:value {...rest} />

<style>
  input {
    display: block;
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--tui-text);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }

    &[aria-invalid='true'] {
      border-color: var(--tui-danger);
    }
  }
</style>
