<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = Omit<HTMLInputAttributes, 'type' | 'checked'> & {
    checked?: boolean
    children?: Snippet
  }

  let { checked = $bindable(false), children, ...rest }: Props = $props()
</script>

{#snippet control()}
  <check-control>
    <input type="checkbox" bind:checked {...rest} />
    <check-box aria-hidden="true"></check-box>
  </check-control>
{/snippet}

{#if children}
  <label>
    {@render control()}
    {@render children()}
  </label>
{:else}
  {@render control()}
{/if}

<style>
  label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    cursor: pointer;
  }

  check-control {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  check-box {
    display: block;
    inline-size: 3ch;
    font-weight: 700;
    white-space: pre;
    pointer-events: none;

    &::before {
      content: '[ ]';
    }
  }

  input:checked + check-box::before {
    content: '[x]';
  }

  input:focus-visible + check-box {
    outline: 2px dotted var(--tui-focus);
    outline-offset: 2px;
  }

  input:disabled {
    cursor: default;
  }

  input:disabled + check-box {
    opacity: 0.5;
  }
</style>
