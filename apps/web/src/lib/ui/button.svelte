<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from 'svelte/elements'

  type BaseProps = {
    variant?:
      | 'default'
      | 'destructive'
      | 'outline'
      | 'secondary'
      | 'ghost'
      | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
    disabled?: boolean
    children?: Snippet
  }

  type AnchorProps = Omit<HTMLAnchorAttributes, 'href'> & { href: string }
  type ButtonProps = HTMLButtonAttributes & { href?: undefined }

  type Props = BaseProps & (AnchorProps | ButtonProps)

  let {
    variant = 'default',
    size = 'default',
    disabled,
    children,
    ...rest
  }: Props = $props()
</script>

{#if rest.href !== undefined}
  {@const { href, ...anchorRest } = rest as AnchorProps}
  <a
    data-variant={variant}
    data-size={size}
    href={disabled ? undefined : href}
    aria-disabled={disabled || undefined}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...anchorRest}
  >
    {@render children?.()}
  </a>
{:else}
  {@const { type = 'button', ...buttonRest } = rest as Omit<
    ButtonProps,
    'href'
  >}
  <button
    data-variant={variant}
    data-size={size}
    {type}
    {disabled}
    {...buttonRest}
  >
    {@render children?.()}
  </button>
{/if}

<style>
  a,
  button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: var(--space-3xs);
    block-size: 2.25rem;
    padding-inline: var(--space-xs);
    color: var(--tui-text);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);

    &:not([data-size^='icon'], [data-variant='ghost'], [data-variant='link']) {
      &::before {
        content: '<' / '';
      }

      &::after {
        content: '>' / '';
      }
    }

    &:hover {
      background: var(--tui-surface-light);
    }

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      flex-shrink: 0;
      pointer-events: none;
    }

    &[data-size='sm'] {
      block-size: 2rem;
      padding-inline: var(--space-xs);
    }

    &[data-size='lg'] {
      block-size: 2.5rem;
      padding-inline: var(--space-m);
    }

    &[data-size='icon'] {
      inline-size: 2.25rem;
      padding-inline: 0;
    }

    &[data-size='icon-sm'] {
      inline-size: 2rem;
      block-size: 2rem;
      padding-inline: 0;
    }

    &[data-size='icon-lg'] {
      inline-size: 2.5rem;
      block-size: 2.5rem;
      padding-inline: 0;
    }

    &[data-variant='default'] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);

      &:hover {
        background: color-mix(in oklab, var(--tui-selection-bg) 85%, white);
      }
    }

    &[data-variant='destructive'] {
      font-weight: 700;
      color: var(--tui-danger);
    }

    &[data-variant='ghost'],
    &[data-variant='link'] {
      background: transparent;
      border-color: transparent;
    }

    &[data-variant='ghost']:hover {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }

    &[data-variant='link'] {
      color: var(--tui-link);
      text-underline-offset: 4px;

      &:hover {
        text-decoration: underline;
      }
    }

    &:disabled,
    &[aria-disabled='true'] {
      pointer-events: none;
      color: var(--tui-muted);
      background: var(--tui-surface);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }
</style>
