<script lang="ts">
  import { useUserById } from '$lib/query/user'
  import LazyAvatar from '$lib/ui/lazy-avatar.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { intervalToDuration } from '$lib/utils/time'
  import { createSubscriber } from 'svelte/reactivity'
  import type { LastFirstBlood } from '../model/last-first-blood'

  type Props = {
    blood: LastFirstBlood
    onFocus: () => void
  }

  let { blood, onFocus }: Props = $props()

  const team = useUserById(() => blood.teamId)
  const teamName = $derived(
    team.isPending ? '…' : (team.data?.name ?? 'Unknown team')
  )
  const category = $derived(getCategoryConfig(blood.category))

  const subscribe = createSubscriber(update => {
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  })

  const ago = $derived.by(() => {
    subscribe()
    return formatAgo(blood.at, Date.now())
  })

  function formatAgo(at: number, now: number) {
    const { days, hours, minutes } = intervalToDuration(Math.max(0, now - at))
    if (days > 0) return hours > 0 ? `${days}d ${hours}h ago` : `${days}d ago`
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m ago` : `${hours}h ago`
    }
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }
</script>

<last-blood>
  <span data-label>last first blood</span>
  <blood-mark aria-hidden="true">[1]</blood-mark>
  <a href="/profile/{blood.teamId}">
    <LazyAvatar src={team.data?.avatarUrl} name={teamName} />
    <strong>{teamName}</strong>
  </a>
  <span data-verb>on</span>
  <button
    type="button"
    data-category-color={category.color}
    onclick={onFocus}
  >
    <category.icon aria-hidden="true" />
    <span>{blood.challengeName}</span>
  </button>
  <span data-points>{blood.points.toLocaleString()} pts</span>
  <time datetime={new Date(blood.at).toISOString()}>{ago}</time>
</last-blood>

<style>
  last-blood {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    min-inline-size: 0;
    margin-inline: var(--space-2xs);
    margin-block-end: 0.5rem;
    padding: 0.35rem 0.7rem;
    color: var(--tui-text);
    background: color-mix(
      in oklab,
      var(--tui-border-dark) 32%,
      var(--tui-surface)
    );
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    font-size: var(--step--1);

    @media (width >= 48rem) {
      margin-inline: 1rem;
    }
  }

  [data-label],
  blood-mark {
    color: var(--foreground-gold-l0);
    font-weight: 700;
    white-space: nowrap;
  }

  a,
  button {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-inline-size: 0;
    max-inline-size: 100%;
    padding: 0;
    color: inherit;
    background: transparent;
    border: 0;
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
    text-decoration-color: color-mix(in oklab, currentColor 50%, transparent);
    text-underline-offset: 2px;

    &:hover {
      text-decoration-color: currentColor;
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
    }

    span,
    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  a {
    --avatar-size: 1.5rem;
    --avatar-radius: 0.2rem;
    --avatar-fallback-size: 0.65rem;
  }

  button {
    color: var(--category-foreground-l1);

    :global(svg) {
      flex-shrink: 0;
      font-size: 1rem;
    }
  }

  [data-verb],
  [data-points],
  time {
    color: var(--foreground-l3);
    white-space: nowrap;
  }

  [data-points],
  time {
    font-variant-numeric: tabular-nums;
  }

  time {
    margin-inline-start: auto;
  }
</style>
