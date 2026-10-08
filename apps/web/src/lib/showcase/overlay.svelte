<script lang="ts">
  import Button from '$lib/ui/button.svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Snippet } from 'svelte'

  /** Vocal “first blood” in firstblood.mp3 lands here. Hero stamps on this beat. */
  const BUILDUP_MS = 2_500
  /** Full-screen headline hold after the stamp. */
  const TITLE_MS = 2_200
  /** From sequence start: fade the whole overlay out. */
  const FADE_AT_MS = 10_000
  const FADE_MS = 1_000
  const TOTAL_MS = FADE_AT_MS + FADE_MS
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
    children: Snippet<[() => void]>
  }

  let {
    headline,
    onDone,
    sound,
    tone = 'alert',
    instant = false,
    children,
  }: Props = $props()

  let phase = $state<Phase>(1)
  let exiting = $state(false)
  let needsSound = $state(false)

  let settled = false
  let playSynced = () => {}

  function finish() {
    if (settled) return
    settled = true
    onDone()
  }

  function enableSound() {
    playSynced()
  }

  function arm() {
    const timers = [
      setTimeout(() => (exiting = true), FADE_AT_MS),
      setTimeout(finish, TOTAL_MS),
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
    style:--fade-at="{FADE_AT_MS}ms"
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
      onclick={() => (instant || phase === 3) && finish()}
    ></button>

    {#if instant || phase === 3}
      <div data-part="stage">
        {@render children(finish)}
      </div>
    {:else if phase === 2}
      <p data-part="hero">
        {#each headline.split(' ') as word, wi (wi)}
          <span style:--w={wi}>
            {#each word.split('') as letter, li (li)}
              <span style:--i={li}>{letter}</span>
            {/each}
          </span>
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
    animation: showcase-exit var(--fade) var(--fade-at) ease-in forwards;

    &[data-tone='good'] {
      --showcase-accent: light-dark(#e6b400, #ffe14a);
    }

    &[data-exiting] {
      pointer-events: none;
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

    > span {
      display: flex;
      max-inline-size: 100%;

      > span {
        padding: 0.04em 0.045em 0.07em;
        color: #fff6f4;
        background: var(--showcase-accent);
        border: var(--tui-border-width) solid;
        border-color: var(--bevel-raised);
        box-shadow:
          0.045em 0.045em 0 #140404,
          0.09em 0.09em 0
            color-mix(in oklab, var(--showcase-accent) 55%, black);
        animation: showcase-letter 240ms cubic-bezier(0.15, 1.35, 0.25, 1) both;
        animation-delay: calc(var(--w) * 520ms + var(--i) * 52ms);
      }
    }
  }

  showcase:not([data-tone='good']) [data-part='hero'] > span:last-child:not(:only-child) {
    margin-top: 0.04em;
    margin-inline-start: 0.04em;

    > span {
      color: var(--showcase-accent);
      background: #160606;
    }
  }

  showcase[data-tone='good'] [data-part='hero'] > span > span {
    color: #3d2c00;
    background: var(--showcase-accent);
    box-shadow: 0.045em 0.045em 0
      color-mix(in oklab, var(--showcase-accent) 40%, black);
  }

  [data-part='stage'] {
    position: relative;
    z-index: 2;
    inline-size: max-content;
    max-inline-size: min(100%, 40rem);
    animation: showcase-open 280ms steps(5, end) both;
  }

  showcase[data-instant] [data-part='scrim'] {
    animation: showcase-build 220ms ease-out both;

    &::before {
      opacity: 0.8;
      animation: none;
    }
  }

  showcase[data-instant] [data-part='stage'] {
    inline-size: max-content;
    max-inline-size: 100%;
    animation: showcase-arrive 280ms cubic-bezier(0.2, 0.85, 0.2, 1) both;
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

  @keyframes showcase-letter {
    0% {
      opacity: 0;
      translate: 0 -1.35em;
      scale: 1.35 0.45;
    }

    62% {
      opacity: 1;
      translate: 0 0.08em;
      scale: 0.96 1.18;
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
      scale: 0.92;
      translate: 0 0.6rem;
    }
  }

  @keyframes showcase-exit {
    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    showcase {
      animation: showcase-exit var(--fade) var(--fade-at) forwards;
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
    [data-part='hero'] span,
    [data-part='stage'],
    showcase[data-instant] [data-part='scrim'],
    showcase[data-instant] [data-part='stage'] {
      animation: none;
    }
  }
</style>
