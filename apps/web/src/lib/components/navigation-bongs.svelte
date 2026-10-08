<script lang="ts">
  import { useCurrentUser } from '$lib/query/user'

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const available = $derived(user?.bongsAvailable ?? 0)
  const label = $derived(
    available > 0
      ? `${available.toLocaleString()} ${available === 1 ? 'bong' : 'bongs'} available!`
      : 'no bongs available'
  )
</script>

{#if user}
  <nav-bongs role="status" aria-label={label} data-ready={available > 0 || undefined}>
    {label}
  </nav-bongs>
{/if}

<style>
  nav-bongs {
    display: flex;
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
