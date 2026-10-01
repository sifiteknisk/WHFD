<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { intervalToDuration } from '$lib/utils/time'

  const configQuery = useClientConfig()
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  let now = $state(Date.now())

  $effect(() => {
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  const duration = $derived(intervalToDuration(Math.max(0, startTime - now)))
  const pad = (value: number) => String(value).padStart(2, '0')
</script>

<countdown-hero>
  <video
    src="/video/whfd.mp4"
    autoplay
    muted
    loop
    playsinline
    aria-hidden="true"
  ></video>
  <countdown-scrim></countdown-scrim>

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
</countdown-hero>

<style>
  countdown-hero {
    position: relative;
    display: grid;
    place-items: center;
    min-block-size: calc(100dvh - var(--header-height));
    overflow: hidden;
    color: white;
    font-family: 'Roboto Mono', ui-monospace, monospace;
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
      linear-gradient(to top, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0.18) 42%),
      rgb(0 0 0 / 0.28);
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
</style>
