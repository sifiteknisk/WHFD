<script lang="ts">
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import * as toast from '@zag-js/toast'
  type Props = {
    actor: toast.Props
    parent: toast.GroupService
    index: number
  }

  let { actor, parent, index }: Props = $props()

  const service = useMachine(toast.machine, () => ({
    ...actor,
    parent,
    index,
    translations: { closeTriggerLabel: 'Dismiss notification' },
  }))
  const api = $derived(toast.connect(service, normalizeProps))
</script>

<div {...api.getRootProps()}>
  <div {...api.getGhostBeforeProps()}></div>
  <span {...api.getTitleProps()}>{api.title}</span>
  {#if api.description}
    <span {...api.getDescriptionProps()}>{api.description}</span>
  {/if}
  <button {...api.getCloseTriggerProps()}>&times;</button>
  {#if actor.action}
    <button {...api.getActionTriggerProps()}>{actor.action.label}</button>
  {/if}
  <div {...api.getGhostAfterProps()}></div>
</div>

<style>
  [data-part='root'] {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    column-gap: var(--space-2xs);
    row-gap: var(--space-3xs);
    inline-size: 20rem;
    height: var(--height);
    padding: var(--space-2xs) var(--space-xs);
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--space-3xs) var(--space-3xs) 0 var(--tui-shadow);
    translate: var(--x) var(--y);
    scale: var(--scale);
    opacity: var(--opacity);
    z-index: var(--z-index);
    will-change: translate, opacity, scale;
    transition:
      translate 200ms ease,
      scale 200ms ease,
      opacity 200ms ease;

    &[data-type='error'] {
      color: var(--foreground-destructive);
    }

    &[data-type='success'] {
      color: var(--foreground-success);
    }
  }

  [data-part='title'] {
    grid-area: 1 / 1;
    font-size: var(--step--1);
  }

  [data-part='description'] {
    grid-column: 1 / -1;
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-part='close-trigger'] {
    grid-area: 1 / 2;
    align-self: start;
    cursor: pointer;
  }

  [data-part='action-trigger'] {
    grid-column: 1 / -1;
    justify-self: start;
    block-size: 1.75rem;
    margin-block-start: var(--space-3xs);
    padding-inline: var(--space-xs);
    color: var(--tui-text);
    font-size: var(--step--1);
    cursor: pointer;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);

    &::before {
      content: '<' / '';
    }

    &::after {
      content: '>' / '';
    }

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }
</style>
