<script lang="ts">
  import { getClientConfig } from '$lib/api'
  import Card from '$lib/ui/card.svelte'
  import { intervalToDuration } from '$lib/utils/time'

  const clientConfig = getClientConfig()

  const startTime = clientConfig?.startTime ?? 0
  const endTime = clientConfig?.endTime ?? 0
  const isArchived = clientConfig?.isArchived ?? false

  let now = $state(Date.now())

  const hasStarted = $derived(now >= startTime)
  const hasEnded = $derived(isArchived || now >= endTime)
  const duration = $derived(
    intervalToDuration((hasStarted ? endTime : startTime) - now)
  )
  const elapsed = $derived(
    Math.min(100, Math.floor(((now - startTime) / (endTime - startTime)) * 100))
  )

  $effect(() => {
    if (hasEnded) return
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  const pad = (value: number) => String(value).padStart(2, '0')

  const segments = $derived.by(() => {
    if (hasEnded) {
      return [
        { value: '--', label: 'hrs' },
        { value: '--', label: 'min' },
        { value: '--', label: 'sec' },
      ]
    }

    const next = [
      { value: pad(duration.hours), label: 'hrs' },
      { value: pad(duration.minutes), label: 'min' },
      { value: pad(duration.seconds), label: 'sec' },
    ]

    if (duration.days > 0) {
      next.unshift({
        value: String(duration.days),
        label: duration.days === 1 ? 'day' : 'days',
      })
    }

    return next
  })
</script>

<Card
  title={hasEnded
    ? 'CTF is over'
    : hasStarted
      ? 'CTF ends in'
      : 'CTF starts in'}
>
  <home-countdown>
    <countdown-clock role="timer">
      {#each segments as segment, index (segment.label)}
        {#if index > 0}
          <countdown-colon aria-hidden="true">:</countdown-colon>
        {/if}
        <countdown-unit>
          <countdown-digits>{segment.value}</countdown-digits>
          <countdown-caption>{segment.label}</countdown-caption>
        </countdown-unit>
      {/each}
    </countdown-clock>
    {#if hasStarted}
      <countdown-bar
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={hasEnded ? 100 : elapsed}
        aria-label="CTF progress"
      >
        <countdown-fill style:inline-size="{hasEnded ? 100 : elapsed}%"></countdown-fill>
        {#if !hasEnded}
          <countdown-sheen aria-hidden="true"></countdown-sheen>
        {/if}
      </countdown-bar>
      <span class="tui-gauge-value">{hasEnded ? 100 : elapsed}% elapsed</span>
    {/if}
  </home-countdown>
</Card>

<style>
  home-countdown {
    display: grid;
    gap: var(--tui-space-2);
  }

  countdown-clock {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0.4rem;
  }

  countdown-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-inline-size: 2.75rem;
  }

  countdown-digits {
    font-size: var(--step-3);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: 0.04em;
    color: var(--tui-text);
  }

  countdown-caption {
    margin-block-start: 0.2rem;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: lowercase;
    color: var(--tui-muted);
  }

  countdown-colon {
    padding-block-start: 0.05em;
    font-size: var(--step-3);
    line-height: 1;
    color: var(--tui-muted);
  }

  countdown-bar {
    position: relative;
    display: block;
    overflow: hidden;
    block-size: var(--tui-progress-height);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
  }

  countdown-fill {
    display: block;
    block-size: 100%;
    background:
      linear-gradient(
        to bottom,
        color-mix(in srgb, white 28%, var(--tui-selection-bg)),
        var(--tui-selection-bg) 46%,
        color-mix(in srgb, black 16%, var(--tui-selection-bg))
      );
  }

  countdown-sheen {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: 42%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      light-dark(rgb(0 0 0 / 0.2), rgb(255 255 255 / 0.06)) 34%,
      rgb(255 255 255 / 0.82) 50%,
      light-dark(rgb(0 0 0 / 0.2), rgb(255 255 255 / 0.06)) 66%,
      transparent 100%
    );
    translate: -120% 0;
    animation: countdown-sheen 1.35s linear infinite;
    pointer-events: none;
  }

  .tui-gauge-value {
    font-size: var(--step--1);
    font-weight: 400;
    color: var(--tui-muted);
  }

  @keyframes countdown-sheen {
    to {
      translate: 280% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    countdown-sheen {
      animation: none;
    }

    countdown-sheen {
      opacity: 0;
    }
  }
</style>
