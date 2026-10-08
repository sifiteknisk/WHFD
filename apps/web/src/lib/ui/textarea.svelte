<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  type Props = HTMLTextareaAttributes

  let { value = $bindable(), ...rest }: Props = $props()
</script>

<textarea bind:value {...rest}></textarea>

<style>
  textarea {
    display: block;
    inline-size: 100%;
    min-block-size: 4.5rem;
    padding: var(--space-3xs) var(--space-2xs);
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
