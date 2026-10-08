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
  import { onMount, tick, type Snippet } from 'svelte'

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
  let watched = false
  let soundUnlocked = false
  let crashAudio: HTMLAudioElement | undefined

  function crashSound() {
    crashAudio ??= new Audio('/sound/error.mp3')
    crashAudio.preload = 'auto'
    return crashAudio
  }

  function unlockSound() {
    const node = crashSound()
    if (crashing) {
      node.muted = false
      node.volume = 1
      if (node.paused) void node.play().catch(() => {})
      soundUnlocked = true
      return
    }
    if (soundUnlocked) return
    node.muted = true
    void node.play().then(
      () => {
        if (crashing) {
          node.muted = false
          soundUnlocked = true
          return
        }
        node.pause()
        node.currentTime = 0
        node.muted = false
        soundUnlocked = true
      },
      () => {
        node.muted = false
      }
    )
  }

  function playCrashSound() {
    const node = crashSound()
    node.muted = false
    node.volume = 1
    if (node.readyState >= 1) node.currentTime = 0
    void node.play().catch(() => {})
  }

  function primeFinale() {
    if (primed) return
    primed = true
    const img = new Image()
    img.src = '/images/bluescreen.png'
    crashSound()
  }

  onMount(() => {
    window.addEventListener('pointerdown', unlockSound)
    window.addEventListener('keydown', unlockSound)
    return () => {
      window.removeEventListener('pointerdown', unlockSound)
      window.removeEventListener('keydown', unlockSound)
    }
  })

  const showHero = $derived(
    !released && !isAdmin && configQuery.data != null && (now < startTime || hold)
  )
  const blockPage = $derived(showHero && fullCover)

  async function crash() {
    if (crashing) return
    crashing = true
    bluescreen = true
    playCrashSound()
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
    let clock = 0

    const crossed = () => {
      clearTimeout(clock)
      now = Date.now()
      hold = true
      void crash()
    }

    if (Date.now() >= start) {
      now = Date.now()
      if (watched) crossed()
      return
    }

    watched = true
    const tickClock = () => {
      const current = Date.now()
      if (current >= start) {
        crossed()
        return
      }
      now = current
      if (start - current <= 60_000) primeFinale()
      const remain = start - current
      clock = window.setTimeout(
        tickClock,
        Math.min(remain, remain % 1000 || 1000)
      )
    }

    if (start - Date.now() <= 60_000) primeFinale()
    const remain = start - Date.now()
    clock = window.setTimeout(
      tickClock,
      Math.min(remain, remain % 1000 || 1000)
    )
    return () => clearTimeout(clock)
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
