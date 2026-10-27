<script lang="ts">
  import { pointsToNextBong } from '@rctf/util'
  import { useCurrentUser } from '$lib/query/user'

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const available = $derived(user?.bongsAvailable ?? 0)
  const label = $derived(
    available > 0
      ? `${available.toLocaleString()} ${available === 1 ? 'bong' : 'bongs'} available!`
      : 'no bongs available'
  )
  const toNext = $derived(user ? pointsToNextBong(user.bongPoints) : null)
  const nextLabel = $derived(
    toNext === null ? 'max bongs reached' : `${toNext.toLocaleString()} pts to next bong`
  )
</script>

{#if user}
  <nav-bongs
    role="status"
    aria-label="{label}, {nextLabel}"
    data-ready={(available > 0 && toNext !== null) || undefined}
    data-maxed={toNext === null || undefined}
  >
    <span>{label}</span>
    <span data-next>{nextLabel}</span>
  </nav-bongs>
{/if}

<style>
  nav-bongs {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    block-size: var(--nav-control-height, 3rem);
    padding-inline: var(--space-s);
    color: var(--foreground-l3);
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    &[data-ready] {
      animation: bongs-pulse 2.8s ease-in-out infinite;
    }

    &[data-maxed] {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      color: var(--foreground-gold-l0);
      background-image: linear-gradient(var(--background-gold) 0 0);

      /* Tiled gold stars drifting behind the text. One tile oversized and moved
         with transform so the drift stays composited and sub-pixel smooth. */
      &::before {
        position: absolute;
        inset: 0 0 -28px -28px;
        z-index: -1;
        pointer-events: none;
        content: '';
        background: var(--foreground-gold-l0);
        opacity: 0.22;
        mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M7 2Q7.6 6.4 12 7Q7.6 7.6 7 12Q6.4 7.6 2 7Q6.4 6.4 7 2ZM21 16Q21.4 18.6 24 19Q21.4 19.4 21 22Q20.6 19.4 18 19Q20.6 18.6 21 16Z'/%3E%3C/svg%3E");
        mask-size: 28px 28px;
        animation: bongs-stars 40s linear infinite;
      }
    }
  }

  [data-next] {
    font-size: 0.6875rem;
    font-weight: 500;
    opacity: 0.75;
  }

  @keyframes bongs-stars {
    to {
      transform: translate(28px, -28px);
    }
  }

  @keyframes bongs-pulse {
    0%,
    100% {
      color: var(--tui-success);
      background-color: var(--tui-surface-light);
    }

    50% {
      color: var(--tui-text);
      background-color: color-mix(in oklch, var(--tui-success) 32%, var(--tui-surface-light));
    }
  }
</style>
