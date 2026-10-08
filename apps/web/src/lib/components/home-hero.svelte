<script lang="ts">
  import ErrorWindow from '$lib/components/error-window.svelte'
  import HomeCountdown from '$lib/components/home-countdown.svelte'
  import HomeLogo from '$lib/components/home-logo.svelte'
  import HomeMenu from '$lib/components/home-menu.svelte'
  import WindowBox from '$lib/components/window-box.svelte'
  import Card from '$lib/ui/card.svelte'

  type Props = {
    overlay?: boolean
    interactive?: boolean
  }

  let { overlay = false, interactive = true }: Props = $props()
</script>

<home-hero data-overlay={overlay ? '' : undefined}>
  <home-start>
    <logo-row>
      <Card>
        <home-logo>
          <HomeLogo />
        </home-logo>
      </Card>
      <logo-error>
        <ErrorWindow message="Vibecode Galore" />
      </logo-error>
    </logo-row>
    <HomeCountdown />
    <Card title="Main menu">
      <HomeMenu hotkeys={interactive} />
    </Card>
  </home-start>
  {#if !overlay}
    <img src="/home.gif" alt="" />
  {/if}
  <WindowBox
    image="/video/meeting.mp4"
    title="Meeting with the new President"
    size={8}
    x={54}
    y={1}
  />
  <WindowBox
    image="/video/papers.mp4"
    title="Gross code written by humans"
    size={9}
    x={38}
    y={40}
  />
</home-hero>

<style>
  home-hero {
    display: flex;
    flex: 1;
    align-items: center;

    &[data-overlay] {
      position: absolute;
      inset: 0;
      z-index: 1;
      padding: var(--space-s) var(--space-m-l);
    }
  }

  home-start {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    inline-size: min(100%, 26rem);

    :global(ui-card) {
      box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
        var(--tui-shadow);
    }
  }

  logo-row {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  logo-error {
    display: none;

    @media (width >= 48rem) {
      display: block;
      --error-message: 2.5rem;
      position: absolute;
      inset-block: 50% auto;
      inset-inline: 17rem auto;
      z-index: 1;
      translate: 0 -40%;
      rotate: 3deg;
    }
  }

  home-logo {
    display: block;
    align-self: center;
    inline-size: min(100%, 19rem);

    @media (width >= 48rem) {
      align-self: flex-start;
      inline-size: 14.5rem;
    }
  }
</style>
