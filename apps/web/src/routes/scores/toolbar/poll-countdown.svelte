<script lang="ts">
  import { LEADERBOARD_POLL_INTERVAL_MS } from '$lib/query/leaderboard'
  import { createSubscriber } from 'svelte/reactivity'
  import { secondsUntilNextPoll } from '../model/poll-countdown'

  type Props = {
    updatedAt: number
  }

  let { updatedAt }: Props = $props()

  const subscribe = createSubscriber(update => {
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  })

  const seconds = $derived.by(() => {
    subscribe()
    return secondsUntilNextPoll(
      updatedAt,
      Date.now(),
      LEADERBOARD_POLL_INTERVAL_MS
    )
  })

  const ticks = Array.from(
    { length: LEADERBOARD_POLL_INTERVAL_MS / 1000 },
    (_, index) => index
  )
</script>

{#if seconds !== null}
  <poll-countdown
    role="timer"
    aria-label="Next poll in {seconds} seconds"
    data-due={seconds === 0 || undefined}
  >
    <span>next poll</span>
    <poll-meter aria-hidden="true">
      {#each ticks as index (index)}
        <poll-tick data-on={index < seconds || undefined}></poll-tick>
      {/each}
    </poll-meter>
    <time>{seconds}s</time>
  </poll-countdown>
{/if}

<style>
  poll-countdown {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.7rem;
    color: var(--foreground-l3);
    background: color-mix(in oklab, var(--tui-border-dark) 32%, var(--tui-surface));
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  poll-meter {
    display: flex;
    gap: 1px;
    inline-size: 6rem;
    block-size: 0.7rem;
  }

  poll-tick {
    flex: 1;
    background: color-mix(in oklab, var(--tui-text) 16%, transparent);

    &[data-on] {
      background: var(--tui-selection-bg);
    }
  }

  time {
    min-inline-size: 3ch;
    color: var(--tui-text);
    text-align: end;
  }

  poll-countdown[data-due] time {
    color: var(--foreground-l3);
  }
</style>
