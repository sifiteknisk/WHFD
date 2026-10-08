<script lang="ts">
  import { IconX } from '$lib/icons'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLElement> & {
    message: string
    title?: string
  }

  let { message, title = 'Error', ...rest }: Props = $props()
</script>

<error-window {...rest}>
  <error-title>
    <span>{title}</span>
    <error-close aria-hidden="true"><IconX /></error-close>
  </error-title>
  <error-body>
    <error-icon aria-hidden="true"></error-icon>
    <p>{message}</p>
  </error-body>
  <error-ok aria-hidden="true">OK</error-ok>
</error-window>

<style>
  error-window {
    display: flex;
    flex-direction: column;
    inline-size: max-content;
    max-inline-size: 100%;
    overflow: hidden;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
  }

  error-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.1rem 0.15rem 0.1rem 0.6ch;
    font-weight: 700;
    color: var(--tui-selection-text);
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--tui-selection-bg), white 25%),
      var(--tui-selection-bg) 45%,
      color-mix(in oklab, var(--tui-selection-bg), black 15%)
    );
  }

  error-close {
    display: grid;
    place-items: center;
    inline-size: 1.2rem;
    block-size: 1.2rem;
    font-size: 0.8rem;
    color: white;
    background: linear-gradient(to bottom, #e8775f, #c4391d);
    border: 1px solid white;
  }

  error-body {
    display: flex;
    flex: 1;
    gap: var(--tui-space-3);
    align-items: center;
    min-block-size: 0;
    padding: var(--tui-space-2) var(--tui-space-3);

    p {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      font-size: var(--error-message, var(--step--1));
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }

  error-icon {
    position: relative;
    flex-shrink: 0;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    background: radial-gradient(circle at 35% 30%, #ff8a7a, #d6261a 45%, #8a0a05);
    border: 2px solid #e6e6e6;
    border-radius: 50%;
    box-shadow:
      0 0 0 1px #9a9a9a,
      1px 2px 2px rgb(0 0 0 / 0.35);

    &::before,
    &::after {
      position: absolute;
      inset: 50% auto auto 50%;
      inline-size: 58%;
      block-size: 18%;
      content: '';
      background: linear-gradient(to bottom, #ffffff, #cfcfcf);
      border-radius: 2px;
      translate: -50% -50%;
      rotate: 45deg;
    }

    &::after {
      rotate: -45deg;
    }
  }

  error-ok {
    align-self: center;
    min-inline-size: 6rem;
    margin-block-end: var(--tui-space-2);
    padding-block: 0.1rem;
    text-align: center;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: 0 0 0 1px var(--tui-text);
  }
</style>
