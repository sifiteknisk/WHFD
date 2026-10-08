<script lang="ts">
  import { IconX } from '$lib/icons'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLElement> & {
    title: string
    image?: string
    size?: number
    x?: number
    y?: number
    floating?: boolean
    children?: Snippet
    onclose?: () => void
    ontitledown?: (event: MouseEvent) => void
  }

  let {
    image,
    title,
    size,
    x,
    y,
    floating = false,
    children,
    onclose,
    ontitledown,
    ...rest
  }: Props = $props()

  const videoSource = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#]|$)/i
  let video = $derived(image != null && videoSource.test(image))
</script>

<window-box
  {...rest}
  data-floating={floating ? '' : undefined}
  style:--x={x == null ? undefined : `${x}%`}
  style:--y={y == null ? undefined : `${y}%`}
  style:--size={size}
>
  <window-title
    data-draggable={ontitledown ? '' : undefined}
    role={ontitledown ? 'presentation' : undefined}
    onmousedown={ontitledown}
  >
    <span>{title}</span>
    <window-controls aria-hidden={onclose ? undefined : 'true'}>
      <window-min aria-hidden="true"></window-min>
      <window-max aria-hidden="true"></window-max>
      {#if onclose}
        <button
          type="button"
          aria-label="Close {title}"
          onmousedown={event => event.stopPropagation()}
          onclick={onclose}
        >
          <IconX aria-hidden="true" />
        </button>
      {:else}
        <window-close><IconX /></window-close>
      {/if}
    </window-controls>
  </window-title>
  <window-body>
    {#if children}
      {@render children()}
    {:else if image && video}
      <video src={image} autoplay muted loop playsinline></video>
    {:else if image}
      <img src={image} alt="" />
    {/if}
  </window-body>
</window-box>

<style>
  window-box {
    position: absolute;
    display: none;
    flex-direction: column;
    overflow: hidden;
    pointer-events: none;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
    inset-block-start: var(--y);
    inset-inline-start: var(--x);
    inline-size: min(calc(var(--size) * 4.5rem), calc(100% - var(--x)));
    block-size: min(calc(var(--size) * 2.7rem), calc(100% - var(--y) - 1.5rem));

    @media (width >= 64rem) {
      display: flex;
    }
  }

  window-box[data-floating] {
    position: fixed;
    display: flex;
    pointer-events: auto;
    inset: auto;
    inline-size: auto;
    block-size: auto;
  }

  window-title {
    display: flex;
    flex-shrink: 0;
    gap: 0.4rem;
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

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  window-title[data-draggable] {
    cursor: grab;
    user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  window-controls {
    display: flex;
    flex-shrink: 0;
    gap: 0.12rem;
  }

  window-min,
  window-max,
  window-close,
  button {
    display: grid;
    place-items: center;
    inline-size: 1.2rem;
    block-size: 1.2rem;
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--tui-selection-bg), white 18%),
      color-mix(in oklab, var(--tui-selection-bg), black 10%)
    );
    border: 1px solid white;
  }

  window-close,
  button {
    margin-inline-start: 0.1rem;
    padding: 0;
    font-size: 0.8rem;
    color: white;
    background: linear-gradient(to bottom, #e8775f, #c4391d);
  }

  button {
    cursor: pointer;

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 1px;
    }
  }

  window-min::before,
  window-max::before {
    content: '';
  }

  window-min::before {
    inline-size: 0.45rem;
    block-size: 2px;
    background: white;
    translate: 0 0.2rem;
  }

  window-max::before {
    inline-size: 0.45rem;
    block-size: 0.38rem;
    border: 1.5px solid white;
    border-block-start-width: 2.5px;
  }

  window-body {
    position: relative;
    display: grid;
    flex: 1;
    min-block-size: 0;
    margin: 0.3rem;
    overflow: hidden;
    background: color-mix(in oklab, var(--tui-surface), black 8%);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
  }

  img,
  video {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    width: 100%;
    height: 100%;
    max-width: none;
    object-fit: cover;
  }

  video {
    scale: 1.36;
  }
</style>
