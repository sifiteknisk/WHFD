<script lang="ts">
  import { getInitials } from '$lib/utils/initials'

  type Props = {
    src?: string | null
    name: string
  }

  let { src, name }: Props = $props()

  let failedSrc = $state<string | null>(null)
  const imageSrc = $derived(src && src !== failedSrc ? src : null)
</script>

<span data-part="root">
  <span data-part="fallback" aria-hidden="true">{getInitials(name)}</span>
  {#if imageSrc}
    <img
      src={imageSrc}
      alt={name}
      loading="lazy"
      decoding="async"
      fetchpriority="low"
      width="48"
      height="48"
      onerror={() => (failedSrc = imageSrc)}
    />
  {/if}
</span>

<style>
  [data-part='root'] {
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: var(--avatar-size, 2.5rem);
    block-size: var(--avatar-size, 2.5rem);
    overflow: hidden;
    border-radius: var(--avatar-radius, var(--radius-lg));
    box-shadow: var(--avatar-ring, none);
  }

  [data-part='fallback'] {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--avatar-fallback-color, var(--tui-muted));
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    border-radius: inherit;
    font-size: var(--avatar-fallback-size, var(--step--1));
  }

  img {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }
</style>
