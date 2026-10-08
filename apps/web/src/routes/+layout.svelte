<script lang="ts">
  import '../styles/reset.css'
  import '../styles/tui/tokens.css'
  import '../styles/tui/tui.css'
  import '../styles/tui-theme.css'
  import '../styles/fonts.css'
  import '../styles/color.css'
  import '../styles/typography.css'
  import '../styles/layout.css'
  import '../styles/shape.css'
  import '../styles/layers.css'
  import '../styles/prose.css'
  import '../styles/reveal.css'
  import '../styles/theme-visibility.css'
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import { page } from '$app/state'
  import favicon from '$lib/assets/favicon.svg'
  import BongReceiver from '$lib/bongs/bong-receiver.svelte'
  import CircuitBoard from '$lib/circuit/circuit-board.svelte'
  import Brainrot from '$lib/components/brainrot.svelte'
  import CountdownGate from '$lib/components/countdown-gate.svelte'
  import Navigation from '$lib/components/navigation.svelte'
  import PageWipe from '$lib/components/page-wipe.svelte'
  import RootEdgeFades from '$lib/components/root-edge-fades.svelte'
  import { resetSessionQueries } from '$lib/query/core'
  import ToastHost from '$lib/ui/toast-host.svelte'
  import { initAnalytics } from '$lib/utils/analytics'
  import { initFadeFallback } from '$lib/utils/fade-fallback'
  import { onMount } from 'svelte'
  import type { LayoutProps } from './$types'

  const { data, children }: LayoutProps = $props()

  const sectionTitles: Record<string, string> = {
    challenges: 'Challenges',
    scores: 'Scoreboard',
    info: 'Info & Rules',
    profile: 'Team',
    admin: 'Administration',
    login: 'Login',
    register: 'Register',
    verify: 'Verify',
    recover: 'Recover',
    integrations: 'Integrations',
  }

  const section = $derived(page.url.pathname.split('/')[1])
  const bare = $derived(
    !section ||
      section === 'info' ||
      section === 'challenges' ||
      section === 'profile' ||
      !!page.route.id?.startsWith('/(auth)')
  )
  const windowTitle = $derived(
    section ? (sectionTitles[section] ?? section) : data.clientConfig.ctfName
  )
  const keyHints = $derived(
    section === 'challenges'
      ? '<↑/↓> move | <←/→> switch pane | <Enter> open | </> search | <Esc> back to list'
      : !section
        ? '<↑/↓> move | <Enter> select | <1-4> jump'
        : '<Tab>/<Shift-Tab> between elements | <Space> selects | <Enter> activates'
  )

  onMount(() => {
    initAnalytics(data.clientConfig)
    const cleanupFadeFallback = initFadeFallback()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') void resetSessionQueries(data.queryClient)
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      cleanupFadeFallback?.()
      window.removeEventListener('storage', handleStorage)
    }
  })

  function onAnimationEnd(event: AnimationEvent) {
    if (event.animationName !== 'reveal-fade-in') return
    if (event.target instanceof HTMLElement)
      event.target.removeAttribute('data-reveal')
  }
</script>

<svelte:document onanimationend={onAnimationEnd} />

<svelte:head>
  <link rel="icon" href={data.clientConfig.faviconUrl ?? favicon} />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="apple-mobile-web-app-title" content={data.clientConfig.ctfName} />
  <title>{data.clientConfig.ctfName}</title>

  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />

  <meta name="description" content={data.clientConfig.meta.description} />

  <meta name="theme-color" content="#3f6fa3" />
  <link rel="canonical" href={data.clientConfig.origin} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.clientConfig.ctfName} />
  <meta
    property="og:description"
    content={data.clientConfig.meta.description}
  />
  <meta property="og:image" content={data.clientConfig.meta.imageUrl} />
  <meta property="og:url" content={data.clientConfig.origin} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.clientConfig.ctfName} />
  <meta
    name="twitter:description"
    content={data.clientConfig.meta.description}
  />
  <meta name="twitter:image" content={data.clientConfig.meta.imageUrl} />
  <meta name="twitter:url" content={data.clientConfig.origin} />
</svelte:head>

<QueryClientProvider client={data.queryClient}>
  <app-shell>
    <CircuitBoard />
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <Navigation />

    <main
      id="main-content"
      tabindex="-1"
      aria-labelledby="window-title"
      data-bare={bare ? '' : undefined}
    >
      <h1 class="tui-dialog-title" id="window-title">{windowTitle}</h1>
      <main-body>
        <CountdownGate>
          {@render children()}
        </CountdownGate>
      </main-body>
    </main>

    <RootEdgeFades />

    <key-hints aria-hidden="true">{keyHints}</key-hints>
  </app-shell>
  <BongReceiver />
</QueryClientProvider>

<ToastHost />

<Brainrot />

<PageWipe />

<style>
  app-shell {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    block-size: 100dvh;
    overflow: hidden;
    padding-block: var(--header-height)
      calc(
        var(--shell-gap) + var(--tui-shadow-offset) + var(--shell-hint-height)
      );
    padding-inline: var(--shell-gap)
      calc(var(--shell-gap) + var(--tui-shadow-offset));
  }

  main {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-block-size: 0;
    margin-block-start: var(--shell-gap);
    padding-block-start: var(--shell-title-space);
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);
    outline: none;

    > .tui-dialog-title {
      z-index: 1;
      font-size: var(--step-0);
    }

    &[data-bare] {
      padding-block-start: 0;
      background: none;
      border-color: transparent;
      box-shadow: none;

      > .tui-dialog-title {
        position: absolute;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    }
  }

  main-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);
  }

  key-hints {
    position: fixed;
    inset-block-end: 0;
    inset-inline: 0;
    display: flex;
    align-items: center;
    block-size: var(--shell-hint-height);
    padding-inline: var(--shell-gap);
    overflow: hidden;
    font-size: var(--step--1);
    color: var(--tui-selection-text);
    white-space: nowrap;
    background: transparent;

    @media (width < 48rem) {
      display: none;
    }
  }

  .skip-link {
    position: fixed;
    inset-block-start: var(--space-3xs);
    inset-inline-start: var(--space-3xs);
    z-index: var(--layer-toast);
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);

    &:not(:focus-visible) {
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
</style>
