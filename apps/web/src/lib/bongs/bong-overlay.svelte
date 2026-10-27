<script lang="ts">
  import ticket from '$lib/assets/bong-ticket.svg'
  import Showcase from '$lib/showcase/overlay.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import Button from '$lib/ui/button.svelte'

  type Props = {
    /** This bong hit the cap: always play the jackpot, as a max win. */
    max?: boolean
    onDone: () => void
  }

  type Drop = {
    src: string
    x: string
    w: string
    dur: string
    delay: string
    drift: string
    spin: string
    pixel?: boolean
    front?: boolean
  }

  type DropKind = {
    src: string
    min: number
    max: number
    pixel?: boolean
  }

  const CAT = '/images/chinese-cat.png'
  const LANTERN = '/images/bong/lantern-png.png'
  const BANNER = '/images/bong/lanterns-ny.png'
  const JACKPOT_MS = 6_000
  const MAX_WIN_MS = 9_000
  const EXIT_MS = 500
  const CAPTION = ['you', 'got', 'a', 'bong!']
  const MAX_CAPTION = ['all', 'bongs', 'collected!']

  /** Slot-machine shouts stamped around the max win card. */
  const SHOUTS = [
    { text: 'max win!!!', top: '16%', left: '15%', tilt: '-12deg', d: '700ms' },
    { text: 'jackpot!!', top: '20%', left: '85%', tilt: '10deg', d: '950ms' },
    { text: 'mega bong!', top: '80%', left: '14%', tilt: '8deg', d: '1.2s' },
    { text: 'big win!!', top: '78%', left: '86%', tilt: '-9deg', d: '1.45s' },
    { text: '福', top: '48%', left: '9%', tilt: '-6deg', d: '1.7s', side: true },
    { text: 'lucky!!', top: '50%', left: '91%', tilt: '7deg', d: '1.95s', side: true },
  ]

  const FIREWORK_COLORS = ['#ffd34d', '#ff4d5e', '#fff4c2', '#ff8ad8']
  const SPARKS = 14

  const SPARKLES = [
    { top: '14%', left: '12%', d: '700ms' },
    { top: '22%', left: '86%', d: '1.1s' },
    { top: '74%', left: '8%', d: '1.5s' },
    { top: '68%', left: '90%', d: '900ms' },
  ]
  const lucky = Math.random() < 0.1

  const DROP_KINDS: DropKind[] = [
    { src: '/images/bong/chinese-coin.png', min: 1.8, max: 2.8 },
    { src: '/images/bong/hongbao.png', min: 1.4, max: 2.1 },
    { src: '/images/bong/red-envelope.png', min: 1.5, max: 2, pixel: true },
  ]

  const between = (min: number, max: number) =>
    min + Math.random() * (max - min)

  /** Coins and red envelopes raining down, spread evenly across the width. */
  const DROPS: Drop[] = Array.from({ length: 20 }, (_, i) => {
    const kind = DROP_KINDS[i % DROP_KINDS.length] as DropKind
    return {
      src: kind.src,
      pixel: kind.pixel,
      front: i % 5 === 0,
      x: `${((i + between(0.1, 0.9)) / 20) * 100}%`,
      w: `${between(kind.min, kind.max).toFixed(2)}rem`,
      dur: `${Math.round(between(2_600, 4_200))}ms`,
      delay: `${Math.round(between(0, 2_400))}ms`,
      drift: `${between(-3, 3).toFixed(2)}rem`,
      spin: `${Math.round(between(-540, 540))}deg`,
    }
  })

  /** Bursts scattered around the edges, each repeating on its own beat. */
  const FIREWORKS = Array.from({ length: 7 }, (_, i) => ({
    top: `${between(10, 55).toFixed(1)}%`,
    left: `${((i + between(0.2, 0.8)) / 7) * 100}%`,
    color: FIREWORK_COLORS[i % FIREWORK_COLORS.length],
    size: `${between(5, 9).toFixed(2)}rem`,
    delay: `${Math.round(300 + i * 380 + between(0, 250))}ms`,
  }))

  let { max = false, onDone }: Props = $props()

  const rare = $derived(max || lucky)

  let exiting = $state(false)
  let settled = false

  function done() {
    if (settled) return
    settled = true
    onDone()
  }

  /** Fade out first, then unmount. Never hard-cut. */
  function finish() {
    if (exiting) return
    exiting = true
    setTimeout(done, EXIT_MS)
  }

  function arm(node: HTMLElement) {
    void node
    const timer = setTimeout(finish, max ? MAX_WIN_MS : JACKPOT_MS)
    return () => clearTimeout(timer)
  }
</script>

<svelte:window
  onkeydown={event => rare && event.key === 'Escape' && finish()}
/>

{#snippet caption()}
  <bong-caption>
    {#each max ? MAX_CAPTION : CAPTION as word, i (i)}
      <span style:--i={i}>{word}</span>{' '}
    {/each}
  </bong-caption>
{/snippet}

{#if rare}
  <Portal>
    <bong-jackpot
      {@attach arm}
      style:--exit="{EXIT_MS}ms"
      data-exiting={exiting || undefined}
      data-max={max || undefined}
      role="dialog"
      aria-label={max ? 'Max win' : 'Bong'}
    >
      <button
        type="button"
        tabindex="-1"
        aria-hidden="true"
        data-part="scrim"
        onclick={finish}
      ></button>

      <div data-part="rays" aria-hidden="true"></div>

      <img src={BANNER} alt="" data-part="banner" aria-hidden="true" />
      <img
        src={LANTERN}
        alt=""
        data-part="lantern"
        data-side="left"
        aria-hidden="true"
      />
      <img
        src={LANTERN}
        alt=""
        data-part="lantern"
        data-side="right"
        aria-hidden="true"
      />

      {#each DROPS as d, i (i)}
        <img
          src={d.src}
          alt=""
          data-part="drop"
          data-pixel={d.pixel || undefined}
          data-front={d.front || undefined}
          style:left={d.x}
          style:--w={d.w}
          style:--dur={d.dur}
          style:--d={d.delay}
          style:--drift={d.drift}
          style:--spin={d.spin}
          aria-hidden="true"
        />
      {/each}

      {#if max}
        {#each FIREWORKS as fw, i (i)}
          <bong-firework
            style:top={fw.top}
            style:left={fw.left}
            style:--c={fw.color}
            style:--r={fw.size}
            style:--d={fw.delay}
            aria-hidden="true"
          >
            {#each { length: SPARKS }, j (j)}
              <span style:--a="{j / SPARKS}turn"></span>
            {/each}
          </bong-firework>
        {/each}

        {#each SHOUTS as shout, i (i)}
          <bong-shout
            style:top={shout.top}
            style:left={shout.left}
            style:--tilt={shout.tilt}
            style:--d={shout.d}
            data-side={shout.side || undefined}
            aria-hidden="true">{shout.text}</bong-shout
          >
        {/each}
      {/if}

      <bong-rare>
        <bong-rare-title>{max ? 'max win!!!' : 'bong!!'}</bong-rare-title>
        <bong-rare-body>
          <img src={CAT} alt="" data-part="cat" />
        </bong-rare-body>
        {@render caption()}
        <bong-actions>
          <Button size="sm" onclick={finish}>OK</Button>
        </bong-actions>
      </bong-rare>

      <div data-part="flash" aria-hidden="true"></div>
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
          {#each SPARKLES as sp, i (i)}
            <span
              data-part="sparkle"
              style:top={sp.top}
              style:left={sp.left}
              style:--d={sp.d}
              aria-hidden="true">✦</span
            >
          {/each}
          <img src={ticket} alt="" data-part="ticket" />
          {@render caption()}
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
    position: relative;
    display: grid;
    gap: 0.9rem;
    place-items: center;
    margin: 0.5rem 0.5rem 0;
    padding: 1.4rem 1.5rem 1rem;
    overflow: hidden;
    isolation: isolate;
    background: color-mix(
      in oklab,
      light-dark(#ffe14a, #f0c84a) 46%,
      var(--tui-surface)
    );
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    /* soft light rays turning behind the ticket */
    &::before {
      position: absolute;
      inset-block-start: 42%;
      inset-inline-start: 50%;
      z-index: -1;
      inline-size: 180%;
      aspect-ratio: 1;
      content: '';
      translate: -50% -50%;
      background: repeating-conic-gradient(
        rgb(255 255 255 / 45%) 0deg 9deg,
        transparent 9deg 24deg
      );
      mask-image: radial-gradient(circle, #000 8%, transparent 45%);
      animation:
        bong-rays-in 500ms ease-out 250ms both,
        bong-spin 18s linear infinite;
    }
  }

  [data-part='ticket'] {
    inline-size: min(100%, 18rem);
    image-rendering: pixelated;
    filter: drop-shadow(3px 4px 0 rgb(61 44 0 / 35%));
    animation:
      bong-ticket-in 650ms cubic-bezier(0.2, 1.3, 0.4, 1) 120ms both,
      bong-sway 2.6s ease-in-out 770ms infinite alternate;
  }

  [data-part='sparkle'] {
    position: absolute;
    z-index: 1;
    font-size: 1.3rem;
    line-height: 1;
    color: #fff;
    pointer-events: none;
    text-shadow: 0 0 0.4rem #ffb800;
    translate: -50% -50%;
    opacity: 0;
    animation: bong-twinkle 1.6s ease-in-out var(--d) infinite;
  }

  bong-caption {
    display: block;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    color: #3d2c00;
    text-shadow: 1px 1px 0 rgb(255 255 255 / 55%);

    > span {
      display: inline-block;
      animation: bong-word 420ms cubic-bezier(0.2, 1.6, 0.4, 1) both;
      animation-delay: calc(var(--caption-at, 550ms) + var(--i) * 90ms);
    }

    > span:last-child {
      color: #fff;
      text-shadow:
        -1px -1px 0 #3d2c00,
        1px -1px 0 #3d2c00,
        -1px 1px 0 #3d2c00,
        1px 1px 0 #3d2c00,
        2px 2px 0 #3d2c00;
      animation:
        bong-word 420ms cubic-bezier(0.2, 1.6, 0.4, 1)
          calc(var(--caption-at, 550ms) + var(--i) * 90ms) both,
        bong-wobble 1.4s ease-in-out
          calc(var(--caption-at, 550ms) + var(--i) * 90ms + 420ms) infinite;
    }
  }

  bong-actions {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    padding: 0.5rem;
  }

  @keyframes bong-ticket-in {
    0% {
      opacity: 0;
      translate: -0.85rem -2.5rem;
      rotate: -200deg;
      scale: 0.3;
    }

    60% {
      opacity: 1;
      scale: 1.12;
    }

    100% {
      opacity: 1;
      translate: -0.85rem 0;
      rotate: -7deg;
      scale: 1;
    }
  }

  @keyframes bong-twinkle {
    0%,
    100% {
      opacity: 0;
      scale: 0.3;
      rotate: 0deg;
    }

    50% {
      opacity: 1;
      scale: 1;
      rotate: 90deg;
    }
  }

  @keyframes bong-word {
    from {
      opacity: 0;
      translate: 0 0.6em;
      scale: 0.4;
    }
  }

  @keyframes bong-wobble {
    0%,
    100% {
      rotate: 0deg;
      scale: 1;
    }

    25% {
      rotate: -6deg;
      scale: 1.1;
    }

    50% {
      rotate: 4deg;
      scale: 1.05;
    }
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
    --jp-red: #c8102e;
    --jp-gold: #ffd34d;

    position: fixed;
    inset: 0;
    z-index: var(--layer-blood);
    display: grid;
    place-items: center;
    padding: var(--space-m);
    overflow: hidden;
    animation: bong-shake 360ms ease-out 420ms both;

    &[data-exiting] {
      pointer-events: none;
      animation: bong-out var(--exit) ease-in forwards;
    }
  }

  [data-part='scrim'] {
    position: absolute;
    inset: 0;
    border: none;
    background: radial-gradient(
      ellipse at center,
      color-mix(in oklab, var(--jp-gold) 30%, transparent) 0%,
      color-mix(in oklab, var(--jp-red) 55%, transparent) 45%,
      rgb(30 0 4 / 85%) 100%
    );
    backdrop-filter: blur(10px) saturate(0.6);
    animation: bong-fade 300ms ease-out both;
  }

  [data-part='rays'] {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: 160vmax;
    aspect-ratio: 1;
    pointer-events: none;
    translate: -50% -50%;
    background: repeating-conic-gradient(
      color-mix(in oklab, var(--jp-gold) 55%, transparent) 0deg 7deg,
      transparent 7deg 20deg
    );
    mask-image: radial-gradient(circle, #000 4%, transparent 38%);
    animation:
      bong-rays-in 600ms ease-out 300ms both,
      bong-spin 24s linear infinite;
  }

  [data-part='banner'],
  [data-part='lantern'],
  [data-part='drop'] {
    position: absolute;
    pointer-events: none;
    filter: drop-shadow(2px 3px 0 rgb(0 0 0 / 40%));
  }

  [data-part='banner'] {
    --drop-x: -50%;

    inset-block-start: 0;
    inset-inline-start: 50%;
    z-index: 1;
    inline-size: min(30rem, 70vw);
    translate: -50% 0;
    opacity: 0.9;
    animation: bong-drop-in 700ms cubic-bezier(0.3, 1.4, 0.5, 1) 200ms both;
  }

  [data-part='lantern'] {
    inset-block-start: -0.75rem;
    z-index: 2;
    inline-size: 6.5rem;
    transform-origin: 50% 0;
    animation:
      bong-drop-in 650ms cubic-bezier(0.3, 1.4, 0.5, 1) 120ms both,
      bong-swing 2.4s ease-in-out 770ms infinite alternate;

    &[data-side='left'] {
      inset-inline-start: 5%;
    }

    &[data-side='right'] {
      inset-inline-end: 5%;
      animation-delay: 160ms, 1.1s;
      animation-direction: normal, alternate-reverse;
    }
  }

  [data-part='drop'] {
    inset-block-start: 0;
    z-index: 2;
    inline-size: var(--w);
    opacity: 0;
    animation: bong-fall var(--dur) linear calc(var(--d) + 350ms) infinite;

    &[data-pixel] {
      image-rendering: pixelated;
    }

    &[data-front] {
      z-index: 4;
      inline-size: calc(var(--w) * 1.35);
    }
  }

  bong-rare {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    inline-size: min(20rem, calc(100vw - 2rem));
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow:
      var(--tui-shadow-offset) var(--tui-shadow-offset) 0 var(--tui-shadow),
      0 0 3rem color-mix(in oklab, var(--jp-gold) 55%, transparent);
    animation: bong-stamp 520ms cubic-bezier(0.2, 1.3, 0.35, 1) 120ms both;
  }

  bong-rare-title {
    padding: 0.35rem 0.85ch;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--jp-gold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--jp-red);
    text-shadow: 1px 1px 0 rgb(0 0 0 / 45%);
  }

  bong-rare-body {
    position: relative;
    display: grid;
    margin: 0.5rem 0.5rem 0;
    overflow: hidden;
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    /* glint sweeping across the cat */
    &::after {
      position: absolute;
      inset: 0;
      content: '';
      pointer-events: none;
      background: linear-gradient(
        105deg,
        transparent 40%,
        rgb(255 255 255 / 55%) 50%,
        transparent 60%
      );
      translate: -100% 0;
      animation: bong-glint 2.8s ease-in-out 700ms infinite;
    }
  }

  bong-rare bong-caption {
    --caption-at: 650ms;

    margin: 0.5rem 0.5rem 0;
    padding: 0.45rem 0.5rem;
    font-size: 1.5rem;
    color: var(--jp-gold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--jp-red);
    text-shadow: 2px 2px 0 rgb(0 0 0 / 50%);

    > span:last-child {
      color: #fff;
      text-shadow: inherit;
    }
  }

  bong-rare [data-part='cat'] {
    display: block;
    inline-size: 100%;
    aspect-ratio: 1;
    object-fit: cover;
  }

  /* --- max win: fireworks + shouts on top of the jackpot --- */
  bong-jackpot[data-max] bong-rare {
    box-shadow:
      var(--tui-shadow-offset) var(--tui-shadow-offset) 0 var(--tui-shadow),
      0 0 4rem color-mix(in oklab, var(--jp-gold) 80%, transparent);
  }

  bong-firework {
    position: absolute;
    z-index: 1;
    pointer-events: none;

    > span {
      position: absolute;
      inline-size: 0.9rem;
      block-size: 0.2rem;
      background: var(--c);
      border-radius: 999px;
      box-shadow: 0 0 0.45rem var(--c);
      opacity: 0;
      transform-origin: 0 50%;
      animation: bong-burst 1.9s cubic-bezier(0.1, 0.75, 0.3, 1) var(--d) infinite;
    }
  }

  bong-shout {
    position: absolute;
    z-index: 4;
    font-size: clamp(1.4rem, 3.2vw, 2.5rem);
    font-weight: 900;
    line-height: 1;
    color: var(--jp-gold);
    white-space: nowrap;
    text-transform: uppercase;
    pointer-events: none;
    text-shadow:
      -2px -2px 0 var(--jp-red),
      2px -2px 0 var(--jp-red),
      -2px 2px 0 var(--jp-red),
      2px 2px 0 var(--jp-red),
      4px 4px 0 rgb(0 0 0 / 45%);
    transform: translate(-50%, -50%) rotate(var(--tilt));
    animation:
      bong-shout-in 480ms cubic-bezier(0.2, 1.6, 0.4, 1) var(--d) both,
      bong-wobble 1.6s ease-in-out calc(var(--d) + 480ms) infinite;
  }

  @keyframes bong-burst {
    0% {
      opacity: 1;
      translate: 0 0;
      transform: rotate(var(--a)) translateX(0) scaleX(0.4);
    }

    65% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      translate: 0 1.75rem;
      transform: rotate(var(--a)) translateX(var(--r)) scaleX(0.6);
    }
  }

  @keyframes bong-shout-in {
    from {
      opacity: 0;
      scale: 2.6;
    }
  }

  [data-part='flash'] {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    background: radial-gradient(circle, #fff 0%, var(--jp-gold) 60%);
    opacity: 0;
    animation: bong-flash 420ms ease-out 400ms both;
  }

  @keyframes bong-fade {
    from {
      opacity: 0;
    }
  }

  @keyframes bong-out {
    to {
      opacity: 0;
      scale: 1.04;
    }
  }

  @keyframes bong-stamp {
    0% {
      opacity: 0;
      scale: 2.4;
      rotate: -10deg;
    }

    55% {
      opacity: 1;
      scale: 0.93;
      rotate: 2deg;
    }

    100% {
      opacity: 1;
      scale: 1;
      rotate: 0deg;
    }
  }

  @keyframes bong-shake {
    0%,
    100% {
      translate: 0 0;
    }

    20% {
      translate: -6px 4px;
    }

    40% {
      translate: 5px -3px;
    }

    60% {
      translate: -3px 2px;
    }

    80% {
      translate: 2px -1px;
    }
  }

  @keyframes bong-flash {
    0% {
      opacity: 0;
    }

    25% {
      opacity: 0.55;
    }

    100% {
      opacity: 0;
    }
  }

  @keyframes bong-rays-in {
    from {
      opacity: 0;
      scale: 0.4;
    }
  }

  @keyframes bong-spin {
    to {
      rotate: 1turn;
    }
  }

  @keyframes bong-drop-in {
    from {
      translate: var(--drop-x, 0) -120%;
    }
  }

  @keyframes bong-swing {
    from {
      rotate: -6deg;
    }

    to {
      rotate: 6deg;
    }
  }

  @keyframes bong-fall {
    0% {
      opacity: 0;
      translate: -50% -15vh;
      rotate: 0deg;
    }

    8%,
    85% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      translate: calc(-50% + var(--drift)) 110vh;
      rotate: var(--spin);
    }
  }

  @keyframes bong-glint {
    0% {
      translate: -100% 0;
    }

    35%,
    100% {
      translate: 100% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-part='ticket'],
    bong-body::before,
    bong-caption > span,
    bong-caption > span:last-child {
      animation: none;
    }

    [data-part='sparkle'] {
      display: none;
    }

    bong-jackpot,
    [data-part='scrim'],
    [data-part='rays'],
    [data-part='banner'],
    [data-part='lantern'],
    bong-rare,
    bong-rare-body::after {
      animation: none;
    }

    bong-jackpot[data-exiting] {
      opacity: 0;
    }

    [data-part='drop'],
    [data-part='flash'],
    bong-firework {
      display: none;
    }

    bong-shout {
      animation: none;
    }
  }

  @media (width < 48rem) {
    [data-part='lantern'] {
      inline-size: 3.75rem;
    }

    [data-part='drop'] {
      inline-size: calc(var(--w) * 0.75);
    }

    bong-rare {
      inline-size: min(15rem, calc(100vw - 2rem));
    }

    bong-shout {
      font-size: 1.1rem;

      &[data-side] {
        display: none;
      }
    }

    bong-caption,
    bong-rare bong-caption {
      font-size: 1.15rem;
    }
  }

  @media (height < 44rem) {
    [data-part='banner'] {
      display: none;
    }
  }
</style>
