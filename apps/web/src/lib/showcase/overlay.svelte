<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Snippet } from 'svelte'

  /** Vocal “first blood” in firstblood.mp3 lands here. Hero stamps on this beat. */
  const BUILDUP_MS = 2_500
  /** Full-screen headline hold after the stamp. */
  const TITLE_MS = 2_200
  /** From sequence start: fade the whole overlay out. */
  const DEFAULT_FADE_AT_MS = 10_000
  const FADE_MS = 1_000
  /** Last stretch of the sting: ramp volume to 0 by the end of the file. */
  const TAIL_FADE_SEC = 0.5

  type Phase = 1 | 2 | 3

  type Tone = 'alert' | 'good'

  type Props = {
    headline: string
    onDone: () => void
    sound?: string
    tone?: Tone
    /** Skip the buildup and headline stamp. The stage is on screen immediately. */
    instant?: boolean
    /** When the overlay starts fading out. */
    fadeAtMs?: number
    /** Allow clicking the backdrop to dismiss (after phase 3, or immediately when instant). */
    backdropDismiss?: boolean
    children: Snippet<[() => void]>
  }

  let {
    headline,
    onDone,
    sound,
    tone = 'alert',
    instant = false,
    fadeAtMs = DEFAULT_FADE_AT_MS,
    backdropDismiss = true,
    children,
  }: Props = $props()

  const totalMs = $derived(fadeAtMs + FADE_MS)

  let phase = $state<Phase>(1)
  let exiting = $state(false)
  let needsSound = $state(false)

  let settled = false
  let playSynced = () => {}

  function done() {
    if (settled) return
    settled = true
    onDone()
  }

  /** Fade out first, then unmount — never hard-cut. */
  function finish() {
    if (settled || exiting) return
    exiting = true
    setTimeout(done, FADE_MS)
  }

  function enableSound() {
    playSynced()
  }

  function arm() {
    const timers = [
      setTimeout(() => (exiting = true), fadeAtMs),
      setTimeout(done, totalMs),
    ]
    if (!instant) {
      timers.push(
        setTimeout(() => (phase = 2), BUILDUP_MS),
        setTimeout(() => (phase = 3), BUILDUP_MS + TITLE_MS),
      )
    }

    let audio: HTMLAudioElement | undefined
    let onTime: (() => void) | undefined

    if (sound) {
      const started = performance.now()
      audio = new Audio(sound)
      audio.preload = 'auto'
      onTime = () => {
        if (!audio || audio.paused) return
        const duration = audio.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        const remain = duration - audio.currentTime
        audio.volume =
          remain <= TAIL_FADE_SEC ? Math.max(0, remain / TAIL_FADE_SEC) : 1
      }
      audio.addEventListener('timeupdate', onTime)

      let arming = false
      playSynced = () => {
        if (!audio) return
        const begin = () => {
          if (!audio) return
          const elapsed = (performance.now() - started) / 1000
          const duration = audio.duration
          if (Number.isFinite(duration) && elapsed >= duration) {
            needsSound = false
            return
          }
          if (Number.isFinite(duration) && elapsed > 0) audio.currentTime = elapsed
          audio.volume = 1
          void audio.play().then(
            () => (needsSound = false),
            () => (needsSound = true),
          )
        }
        if (audio.readyState >= 1) begin()
        else if (!arming) {
          arming = true
          audio.addEventListener(
            'loadedmetadata',
            () => {
              arming = false
              begin()
            },
            { once: true },
          )
        }
      }
      playSynced()
    }

    return () => {
      for (const timer of timers) clearTimeout(timer)
      if (audio && onTime) audio.removeEventListener('timeupdate', onTime)
      audio?.pause()
      playSynced = () => {}
    }
  }
</script>

<svelte:window onkeydown={event => event.key === 'Escape' && finish()} />

<Portal>
  <showcase
    {@attach arm}
    style:--buildup="{BUILDUP_MS}ms"
    style:--fade="{FADE_MS}ms"
    style:--fade-at="{fadeAtMs}ms"
    data-tone={tone}
    data-instant={instant || undefined}
    data-exiting={exiting || undefined}
    role="alert"
  >
    <div data-part="scrim" aria-hidden="true"></div>
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      data-part="backdrop"
      onclick={() =>
        backdropDismiss && (instant || phase === 3) && finish()}
    ></button>

    {#if instant || phase === 3}
      <div data-part="stage">
        {@render children(finish)}
      </div>
    {:else if phase === 2}
      <p data-part="hero">
        {#each headline.split(' ') as word, wi (wi)}
          <span style:--w={wi} data-from={wi === 0 ? 'left' : 'right'}>{word}</span>
        {/each}
      </p>
    {:else}
      <span data-visually-hidden>{headline}</span>
    {/if}

    {#if needsSound}
      <div data-part="unlock">
        <Button size="sm" onclick={enableSound}>Enable sound</Button>
      </div>
    {/if}
  </showcase>
</Portal>

<style>
  showcase {
    --showcase-accent: var(--tui-title);

    position: fixed;
    inset: 0;
    z-index: var(--layer-blood);
    display: grid;
    place-items: center;
    padding: var(--space-m);

    &[data-tone='good'] {
      --showcase-accent: light-dark(#e6b400, #ffe14a);
    }

    &[data-exiting] {
      pointer-events: none;
      animation: showcase-exit var(--fade) ease-in forwards;
    }
  }

  [data-part='scrim'] {
    position: absolute;
    inset: 0;
    pointer-events: none;
    animation: showcase-build var(--buildup) cubic-bezier(0.6, 0, 0.9, 0.4) both;

    &::before {
      position: absolute;
      inset: 0;
      content: '';
      background: radial-gradient(
        ellipse at center,
        transparent 28%,
        color-mix(in oklab, var(--showcase-accent) 62%, transparent)
      );
      animation: showcase-pulse var(--buildup) ease-in both;
    }
  }

  [data-part='backdrop'] {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: none;
    border: none;
  }

  [data-part='hero'] {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-inline-size: 100%;
    margin: 0;
    font-size: clamp(4.4rem, 18vw, 11rem);
    font-weight: 700;
    line-height: 0.78;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--showcase-accent);
    text-shadow: 0 0.04em 0.12em color-mix(in oklab, var(--tui-shadow) 55%, transparent);

    > span {
      display: block;
      max-inline-size: 100%;
      animation: showcase-word 240ms cubic-bezier(0.15, 1.35, 0.25, 1) both;
      animation-delay: calc(var(--w) * 520ms);

      &[data-from='right'] {
        animation-name: showcase-word-right;
      }
    }
  }

  showcase:not([data-tone='good']) [data-part='hero'] > span:first-child:not(:only-child) {
    color: #fff6f4;
  }

  showcase:not([data-tone='good']) [data-part='hero'] > span:last-child:not(:only-child) {
    color: var(--showcase-accent);
  }

  [data-part='stage'] {
    position: relative;
    z-index: 2;
    inline-size: max-content;
    max-inline-size: min(100%, 40rem);
    animation: showcase-open 280ms steps(5, end) both;
  }

  showcase[data-instant] [data-part='scrim'] {
    animation: showcase-build 420ms ease-out both;

    &::before {
      opacity: 0.8;
      animation: none;
    }
  }

  showcase[data-instant] [data-part='stage'] {
    inline-size: max-content;
    max-inline-size: 100%;
    animation: showcase-arrive 450ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  showcase:not([data-instant]) {
    overflow: hidden;
  }

  showcase:not([data-instant]) [data-part='stage'] {
    position: absolute;
    inset: 0;
    display: grid;
    inline-size: auto;
    max-inline-size: none;
    pointer-events: none;
    animation: none;
  }

  [data-part='unlock'] {
    position: absolute;
    z-index: 3;
    inset-block-end: var(--space-m);
    display: flex;
    justify-content: center;
  }

  @keyframes showcase-build {
    from {
      backdrop-filter: blur(0) saturate(1);
      background-color: transparent;
    }

    to {
      backdrop-filter: blur(16px) saturate(0.55);
      background-color: color-mix(in oklab, var(--tui-shadow) 78%, transparent);
    }
  }

  @keyframes showcase-pulse {
    0% {
      opacity: 0;
    }

    30% {
      opacity: 0.35;
    }

    42% {
      opacity: 0.1;
    }

    64% {
      opacity: 0.7;
    }

    74% {
      opacity: 0.28;
    }

    92% {
      opacity: 1;
    }

    100% {
      opacity: 0.8;
    }
  }

  @keyframes showcase-word {
    0% {
      opacity: 0;
      translate: -1.2em 0;
      scale: 1.12 0.88;
    }

    62% {
      opacity: 1;
      translate: 0.06em 0;
      scale: 0.96 1.08;
    }

    100% {
      opacity: 1;
      translate: 0 0;
      scale: 1;
    }
  }

  @keyframes showcase-word-right {
    0% {
      opacity: 0;
      translate: 1.2em 0;
      scale: 1.12 0.88;
    }

    62% {
      opacity: 1;
      translate: -0.06em 0;
      scale: 0.96 1.08;
    }

    100% {
      opacity: 1;
      translate: 0 0;
      scale: 1;
    }
  }

  @keyframes showcase-open {
    0% {
      opacity: 0;
      scale: 1.4;
    }

    55% {
      opacity: 1;
      scale: 0.96;
    }

    100% {
      scale: 1;
    }
  }

  @keyframes showcase-arrive {
    from {
      opacity: 0;
      scale: 0.94;
      translate: 0 1rem;
    }

    to {
      opacity: 1;
      scale: 1;
      translate: 0 0;
    }
  }

  @keyframes showcase-exit {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    showcase[data-exiting] {
      animation: none;
      opacity: 0;
    }

    [data-part='scrim'] {
      backdrop-filter: blur(16px) saturate(0.55);
      background-color: color-mix(in oklab, var(--tui-shadow) 78%, transparent);
      animation: none;

      &::before {
        opacity: 0.8;
        animation: none;
      }
    }

    [data-part='hero'],
    [data-part='hero'] > span,
    [data-part='stage'],
    showcase[data-instant] [data-part='scrim'],
    showcase[data-instant] [data-part='stage'] {
      animation: none;
    }
  }
</style>
