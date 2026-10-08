<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { intervalToDuration } from '$lib/utils/time'

  type Props = {
    now: number
    covered: boolean
  }

  let { now, covered }: Props = $props()

  const configQuery = useClientConfig()
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  const secondsLeft = $derived(
    Math.max(0, Math.ceil((startTime - now) / 1000))
  )
  const popping = $derived(!covered && secondsLeft <= 60)
  const duration = $derived(intervalToDuration(Math.max(0, startTime - now)))
  const pad = (value: number) => String(value).padStart(2, '0')
</script>

<countdown-hero
  data-pop={popping ? '' : undefined}
  data-covered={covered ? '' : undefined}
  aria-hidden={covered ? 'true' : undefined}
  inert={covered}
>
  <video
    src="/video/whfd.mp4"
    autoplay
    muted
    loop
    playsinline
    aria-hidden="true"
  ></video>
  <countdown-scrim></countdown-scrim>

  {#if !covered}
    {#if popping}
      {#if secondsLeft > 0}
        {#key secondsLeft}
          <pop-digit role="timer" aria-label="{secondsLeft} seconds"
            >{secondsLeft}</pop-digit
          >
        {/key}
      {/if}
    {:else}
      <countdown-copy>
        <h1>WHFD: VG</h1>

        <countdown>
          {#if duration.days > 0}
            <countdown-unit>
              <countdown-value>{duration.days}</countdown-value>
              <countdown-caption>days</countdown-caption>
            </countdown-unit>
            <countdown-separator>:</countdown-separator>
          {/if}
          <countdown-unit>
            <countdown-value>{pad(duration.hours)}</countdown-value>
            <countdown-caption>hours</countdown-caption>
          </countdown-unit>
          <countdown-separator>:</countdown-separator>
          <countdown-unit>
            <countdown-value>{pad(duration.minutes)}</countdown-value>
            <countdown-caption>mins</countdown-caption>
          </countdown-unit>
          <countdown-separator>:</countdown-separator>
          <countdown-unit>
            <countdown-value>{pad(duration.seconds)}</countdown-value>
            <countdown-caption>secs</countdown-caption>
          </countdown-unit>
        </countdown>

        <p>
          sign up at
          <a
            href="https://peoply.app/events/TMIPRAKD"
            target="_blank"
            rel="noopener noreferrer">peoply</a
          >
        </p>
      </countdown-copy>
    {/if}
  {/if}
</countdown-hero>

<style>
  countdown-hero {
    position: fixed;
    inset: 0;
    z-index: calc(var(--layer-nav) - 1);
    display: grid;
    place-items: center;
    padding-block-start: var(--header-height);
    overflow: hidden;
    color: white;
    background: black;
    font-family: 'Roboto Mono', ui-monospace, monospace;

    &[data-covered] {
      z-index: calc(var(--layer-nav) - 2);
      pointer-events: none;
    }

    &[data-pop] {
      z-index: calc(var(--layer-wipe) - 2);
      padding-block-start: 0;
    }
  }

  :global(app-shell:has(countdown-hero[data-pop]) header),
  :global(app-shell:has(countdown-hero[data-pop]) .skip-link) {
    visibility: hidden;
  }

  video,
  countdown-scrim {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
  }

  video {
    object-fit: cover;
  }

  countdown-scrim {
    background:
      linear-gradient(to bottom, rgb(0 0 0 / 0.55), transparent 22%),
      linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0.18) 42%),
      rgb(0 0 0 / 0.28);

    [data-pop] & {
      background: rgb(0 0 0 / 0.55);
    }
  }

  pop-digit {
    position: relative;
    font-size: min(42vw, 58vh);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    line-height: 0.8;
    letter-spacing: -0.06em;
    text-shadow: 0 0.08em 0.22em rgb(0 0 0 / 0.55);
    animation: digit-pop 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  countdown-copy {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-m);
    padding: var(--space-m);
    text-align: center;
    text-shadow: 0 2px 18px rgb(0 0 0 / 0.55);
  }

  countdown-copy h1 {
    font-size: clamp(3.25rem, 9vw, 7.5rem);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  countdown {
    display: flex;
    align-items: flex-start;
    gap: var(--space-xs);
  }

  countdown-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-inline-size: 3.5rem;
  }

  countdown-value,
  countdown-separator {
    font-size: clamp(1.75rem, 4vw, 3rem);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  countdown-caption {
    margin-block-start: var(--space-3xs);
    font-size: var(--step--1);
    letter-spacing: 0.04em;
    text-transform: lowercase;
    opacity: 0.82;
  }

  countdown-copy p {
    font-size: clamp(1.125rem, 2vw, 1.5rem);
  }

  countdown-copy a {
    --underline: white;
    color: inherit;
  }

  @keyframes digit-pop {
    0% {
      opacity: 0;
      scale: 1.75;
    }

    45% {
      opacity: 1;
      scale: 0.94;
    }

    100% {
      opacity: 1;
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    pop-digit {
      animation: none;
    }
  }
</style>
