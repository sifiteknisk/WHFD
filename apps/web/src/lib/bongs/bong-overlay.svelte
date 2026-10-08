<script lang="ts">
  import ticket from '$lib/assets/bong-ticket.svg'
  import Showcase from '$lib/showcase/overlay.svelte'
  import Button from '$lib/ui/button.svelte'

  type Props = {
    onDone: () => void
  }

  let { onDone }: Props = $props()
</script>

<Showcase headline="Bong achieved" {onDone} tone="good" instant>
  {#snippet children(close)}
    <bong-window>
      <bong-title>Bong achieved</bong-title>
      <bong-body>
        <img src={ticket} alt="" data-part="ticket" />
      </bong-body>
      <bong-actions>
        <Button size="sm" onclick={() => close()}>OK</Button>
      </bong-actions>
    </bong-window>
  {/snippet}
</Showcase>

<style>
  bong-window {
    display: flex;
    flex-direction: column;
    inline-size: min(16.5rem, calc(100vw - 2rem));
    max-block-size: calc(100dvh - 2rem);
    overflow: hidden;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
  }

  bong-title {
    flex-shrink: 0;
    padding: 0.2rem 0.7ch;
    overflow: hidden;
    font-weight: 700;
    color: #3d2c00;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: light-dark(#ffe14a, #f0c84a);
  }

  bong-body {
    display: grid;
    place-items: center;
    margin: 0.35rem 0.35rem 0;
    padding: 0.85rem 1rem;
    background: color-mix(
      in oklab,
      light-dark(#ffe14a, #f0c84a) 46%,
      var(--tui-surface)
    );
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
  }

  [data-part='ticket'] {
    inline-size: min(100%, 11.5rem);
    image-rendering: pixelated;
    animation: bong-sway 2.6s ease-in-out infinite alternate;
  }

  bong-actions {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    padding: 0.35rem;
  }

  @keyframes bong-sway {
    from {
      translate: -0.85rem 0;
      rotate: -7deg;
    }

    to {
      translate: 0.85rem 0;
      rotate: 7deg;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-part='ticket'] {
      animation: none;
    }
  }
</style>
