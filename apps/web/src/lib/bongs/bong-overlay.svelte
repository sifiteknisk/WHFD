<script lang="ts">
  import ticket from '$lib/assets/bong-ticket.svg'
  import Showcase from '$lib/showcase/overlay.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import Button from '$lib/ui/button.svelte'

  type Props = {
    onDone: () => void
  }

  type Sticker = {
    src: string
    top: string
    left: string
    w: string
    rot: string
    delay: string
    pixel?: boolean
  }

  const CAT = '/images/chinese-cat.png'
  const JACKPOT_MS = 6_000
  const rare = Math.random() < 0.1

  const STICKERS: Sticker[] = [
    {
      src: '/images/bong/lantern-png.png',
      top: '8%',
      left: '7%',
      w: '5.2rem',
      rot: '-11deg',
      delay: '160ms',
    },
    {
      src: '/images/bong/hongbao.png',
      top: '14%',
      left: '84%',
      w: '3.2rem',
      rot: '16deg',
      delay: '220ms',
    },
    {
      src: '/images/bong/chinese-coin.png',
      top: '70%',
      left: '9%',
      w: '4rem',
      rot: '-18deg',
      delay: '280ms',
    },
    {
      src: '/images/bong/lanterns-ny.png',
      top: '80%',
      left: '72%',
      w: '8.5rem',
      rot: '-5deg',
      delay: '300ms',
    },
    {
      src: '/images/bong/chinese-coin.png',
      top: '60%',
      left: '88%',
      w: '3.4rem',
      rot: '24deg',
      delay: '200ms',
    },
    {
      src: '/images/bong/red-envelope.png',
      top: '28%',
      left: '16%',
      w: '3rem',
      rot: '7deg',
      delay: '240ms',
      pixel: true,
    },
  ]

  let { onDone }: Props = $props()

  let settled = false

  function finish() {
    if (settled) return
    settled = true
    onDone()
  }

  function arm(node: HTMLElement) {
    void node
    const timer = setTimeout(finish, JACKPOT_MS)
    return () => clearTimeout(timer)
  }
</script>

<svelte:window
  onkeydown={event => rare && event.key === 'Escape' && finish()}
/>

{#if rare}
  <Portal>
    <bong-jackpot {@attach arm} role="dialog" aria-label="Bong">
      <button
        type="button"
        tabindex="-1"
        aria-hidden="true"
        data-part="scrim"
        onclick={finish}
      ></button>

      {#each STICKERS as s, i (i)}
        <img
          src={s.src}
          alt=""
          data-part="sticker"
          data-pixel={s.pixel || undefined}
          data-mobile={Number.parseFloat(s.top) >= 50 ? 'hide' : undefined}
          style:top={s.top}
          style:left={s.left}
          style:--w={s.w}
          style:--r={s.rot}
          style:--d={s.delay}
          aria-hidden="true"
        />
      {/each}

      <bong-rare>
        <img src={CAT} alt="" data-part="cat" />
        <p data-part="label">bong</p>
        <Button size="sm" onclick={finish}>OK</Button>
      </bong-rare>
    </bong-jackpot>
  </Portal>
{:else}
  <Showcase
    headline="Bong"
    {onDone}
    tone="good"
    instant
    backdropDismiss={false}
    fadeAtMs={8_000}
  >
    {#snippet children(close)}
      <bong-window>
        <bong-title>bong</bong-title>
        <bong-body>
          <img src={ticket} alt="" data-part="ticket" />
        </bong-body>
        <bong-actions>
          <Button size="sm" onclick={() => close()}>OK</Button>
        </bong-actions>
      </bong-window>
    {/snippet}
  </Showcase>
{/if}

<style>
  /* --- common yellow ticket (90%) --- */
  bong-window {
    display: flex;
    flex-direction: column;
    inline-size: min(24rem, calc(100vw - 2rem));
    max-block-size: calc(100dvh - 2rem);
    overflow: hidden;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
  }

  bong-title {
    flex-shrink: 0;
    padding: 0.35rem 0.85ch;
    overflow: hidden;
    font-size: 1.15rem;
    font-weight: 700;
    color: #3d2c00;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: light-dark(#ffe14a, #f0c84a);
  }

  bong-body {
    display: grid;
    place-items: center;
    margin: 0.5rem 0.5rem 0;
    padding: 1.4rem 1.5rem;
    background: color-mix(
      in oklab,
      light-dark(#ffe14a, #f0c84a) 46%,
      var(--tui-surface)
    );
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
  }

  [data-part='ticket'] {
    inline-size: min(100%, 18rem);
    image-rendering: pixelated;
    animation: bong-sway 2.6s ease-in-out infinite alternate;
  }

  bong-actions {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    padding: 0.5rem;
  }

  @keyframes bong-sway {
    from {
      translate: -0.85rem 0;
      rotate: -7deg;
    }

    to {
      translate: 0.85rem 0;
      rotate: 7deg;
    }
  }

  /* --- rare jackpot (10%) --- */
  bong-jackpot {
    position: fixed;
    inset: 0;
    z-index: var(--layer-blood);
    display: grid;
    place-items: center;
    padding: var(--space-m);
  }

  [data-part='scrim'] {
    position: absolute;
    inset: 0;
    border: none;
    background: rgb(0 0 0 / 45%);
    animation: bong-fade 140ms ease-out both;
  }

  [data-part='sticker'] {
    position: absolute;
    z-index: 1;
    inline-size: var(--w);
    height: auto;
    pointer-events: none;
    translate: -50% -50%;
    rotate: var(--r);
    filter: drop-shadow(2px 3px 0 rgb(0 0 0 / 45%));
    animation: bong-sticker 260ms ease-out var(--d) both;
  }

  [data-part='sticker'][data-pixel] {
    image-rendering: pixelated;
  }

  bong-rare {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    align-items: center;
    animation: bong-in 280ms ease-out both;
  }

  bong-rare [data-part='cat'] {
    inline-size: min(18rem, calc(100vw - 3rem));
    aspect-ratio: 1;
    object-fit: cover;
    border: 3px solid #fff;
    box-shadow: 4px 4px 0 rgb(0 0 0 / 55%);
  }

  bong-rare [data-part='label'] {
    margin: 0;
    color: #fff;
    font-size: 1.25rem;
    font-weight: 700;
  }

  @keyframes bong-fade {
    from {
      opacity: 0;
    }
  }

  @keyframes bong-in {
    from {
      opacity: 0;
      scale: 0.94;
    }
  }

  @keyframes bong-sticker {
    from {
      opacity: 0;
      scale: 0.5;
    }

    to {
      opacity: 1;
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-part='ticket'] {
      animation: none;
    }

    [data-part='scrim'],
    [data-part='sticker'],
    bong-rare {
      animation: none;
    }
  }

  @media (width < 48rem) {
    [data-part='sticker'] {
      inline-size: calc(var(--w) * 0.55);
    }

    [data-part='sticker'][data-mobile='hide'] {
      display: none;
    }

    bong-rare [data-part='cat'] {
      inline-size: min(12rem, calc(100vw - 3rem));
    }
  }

  @media (width < 40rem) {
    bong-rare [data-part='cat'] {
      inline-size: min(10rem, calc(100vw - 3rem));
    }
  }
</style>
