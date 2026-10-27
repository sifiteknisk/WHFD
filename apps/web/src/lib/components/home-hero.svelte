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

  // The hero is laid out once at a fixed design size (cropped tight around the
  // composition) and scaled as one piece to fill the space, so browser
  // zoom keeps the composition instead of reflowing it. Below MIN_SCALE the
  // text gets too small, so it falls back to the regular flowing layout. The
  // mode only depends on width, which the flowing content can't feed back into.
  const STAGE_WIDTH = 97.5
  const STAGE_HEIGHT = 48.125
  const MIN_SCALE = 0.55

  let scale = $state(1)
  let scaled = $state(false)

  function fit(node: HTMLElement) {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const { width, height } = entry.contentRect
      scaled = width >= MIN_SCALE * STAGE_WIDTH * rem
      scale = Math.min(
        width / (STAGE_WIDTH * rem),
        height / (STAGE_HEIGHT * rem)
      )
    })
    observer.observe(node)
    return () => observer.disconnect()
  }
</script>

<home-hero
  {@attach fit}
  data-overlay={overlay ? '' : undefined}
  data-scaled={scaled ? '' : undefined}
  style:--stage-width="{STAGE_WIDTH}rem"
  style:--stage-height="{STAGE_HEIGHT}rem"
  style:--stage-scale={scale}
>
  <hero-stage>
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
      x={62.3}
      y={1.2}
    />
    <WindowBox
      image="/video/papers.mp4"
      title="Gross code written by humans"
      size={9}
      x={43.8}
      y={46.8}
    />
  </hero-stage>
</home-hero>

<style>
  home-hero {
    position: relative;
    display: flex;
    flex: 1;

    &:not([data-scaled]) :global(window-box) {
      display: none;
    }

    /* The stage is taken out of flow so the hero's size comes only from the
       page; the floor keeps it from collapsing when sponsors follow it. */
    &[data-scaled] {
      flex: 1 0 0;
      min-block-size: 50dvh;

      > hero-stage {
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        flex: none;
        inline-size: var(--stage-width);
        block-size: var(--stage-height);
        translate: -50% -50%;
        scale: var(--stage-scale);

        > home-start {
          align-self: flex-end;
        }
      }
    }

    &[data-overlay] {
      position: absolute;
      inset: 0;
      z-index: 1;
      min-block-size: 0;
      padding: var(--space-s) var(--space-m-l);
    }
  }

  hero-stage {
    position: relative;
    display: flex;
    flex: 1;
    align-items: center;

    @media (width < 48rem) {
      justify-content: center;

      > img {
        display: none;
      }
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
