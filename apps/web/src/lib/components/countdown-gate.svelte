<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { playErrorWipe } from '$lib/components/page-wipe.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Portal from '$lib/ui/portal.svelte'
  import CountdownHero from '$lib/ui/countdown-hero.svelte'
  import {
    ADMIN_PANEL_PERMISSIONS,
    hasAnyPermission,
  } from '$lib/utils/permissions'
  import { tick, type Snippet } from 'svelte'

  const BLUESCREEN_HOLD = 1500

  const { children }: { children: Snippet } = $props()

  const configQuery = useClientConfig()
  const userQuery = useCurrentUser()
  const startTime = $derived(configQuery.data?.startTime ?? 0)
  const isAdmin = $derived(
    hasAnyPermission(userQuery.data, ADMIN_PANEL_PERMISSIONS)
  )
  const section = $derived(
    page.url.pathname.split('/').filter(Boolean)[0] ?? ''
  )
  const fullCover = $derived(
    section === '' || section === 'challenges' || section === 'scores'
  )

  let now = $state(Date.now())
  let hold = $state(false)
  let released = $state(false)
  let bluescreen = $state(false)
  let crashing = false
  let primed = false

  function primeFinale() {
    if (primed) return
    primed = true
    const img = new Image()
    img.src = '/images/bluescreen.png'
    const audio = new Audio('/sound/error.mp3')
    audio.preload = 'auto'
  }

  const showHero = $derived(
    !released && !isAdmin && configQuery.data != null && (now < startTime || hold)
  )
  const blockPage = $derived(showHero && fullCover)

  async function crash() {
    if (crashing) return
    crashing = true
    bluescreen = true
    const audio = new Audio('/sound/error.mp3')
    void audio.play().catch(() => {})
    await new Promise(resolve => setTimeout(resolve, BLUESCREEN_HOLD))
    await playErrorWipe(async () => {
      bluescreen = false
      released = true
      await tick()
      if (page.url.pathname !== '/') await goto('/')
      await tick()
    })
  }

  $effect(() => {
    if (released || isAdmin || configQuery.data == null) return
    const start = startTime
    if (Date.now() >= start) return

    let timeout = 0
    const tickClock = () => {
      now = Date.now()
      if (now >= start) {
        hold = true
        void crash()
        return
      }
      if (start - now <= 60_000) primeFinale()
      const delay = (start - Date.now()) % 1000 || 1000
      timeout = window.setTimeout(tickClock, delay)
    }

    now = Date.now()
    if (start - now <= 60_000) primeFinale()
    const delay = (start - Date.now()) % 1000 || 1000
    timeout = window.setTimeout(tickClock, delay)
    return () => clearTimeout(timeout)
  })
</script>

{#if showHero}
  <CountdownHero {now} covered={!blockPage} />
{/if}

{#if bluescreen}
  <Portal>
    <crash-screen>
      <img
        src="/images/bluescreen.png"
        alt="Your PC ran into a problem and needs to restart."
      />
    </crash-screen>
  </Portal>
{/if}

{#if !blockPage}
  <gate-content data-front={showHero ? '' : undefined}>
    {@render children()}
  </gate-content>
{/if}

<style>
  gate-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  gate-content[data-front] {
    position: relative;
    z-index: calc(var(--layer-nav) - 1);
  }

  crash-screen {
    position: fixed;
    inset: 0;
    z-index: calc(var(--layer-wipe) - 1);
    background: #0078d4;

    img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
  }
</style>
