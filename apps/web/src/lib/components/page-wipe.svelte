<script lang="ts" module>
  type Swap = () => void | Promise<void>

  let run: ((swap: Swap) => Promise<void>) | null = null

  export async function playErrorWipe(swap: Swap) {
    if (!run) {
      await swap()
      return
    }
    await run(swap)
  }
</script>

<script lang="ts">
  import { onNavigate } from '$app/navigation'
  import { getClientConfig } from '$lib/api'
  import ErrorWindow from '$lib/components/error-window.svelte'
  import { tick } from 'svelte'

  type Box = {
    x: number
    y: number
    delay: number
    tilt: number
    message: string
  }

  type Phase = 'cover' | 'reveal'

  const CELL_W = 288
  const CELL_H = 120
  const OVERLAP = 24
  const SPEED = 1
  const ROW_SPREAD = 110 / SPEED
  const JITTER = 30 / SPEED
  const DROP = 190 / SPEED
  const FALL = 220 / SPEED

  const messages = [
    'Segmentation fault (core dumped)',
    '*** stack smashing detected ***: terminated',
    'General protection fault at 0028:C0011E36',
    'Unhandled exception 0xC0000005: ACCESS_VIOLATION',
    'Kernel panic - not syncing: Attempted to kill init!',
    'Illegal instruction at 0x00401337',
    'double free or corruption (!prev)',
    'flag{not_here} rejected: Incorrect flag',
    'Bus error: unaligned access at 0xDEADBEEF',
    'malloc(): corrupted top size',
  ]

  let boxes = $state<Box[]>([])
  let phase = $state<Phase | null>(null)
  let overlay = $state<HTMLElement>()

  function layout(): Box[] {
    const cols = Math.ceil(innerWidth / CELL_W)
    const rows = Math.ceil(innerHeight / CELL_H)
    return Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      return {
        x: col * CELL_W - Math.random() * OVERLAP,
        y: row * CELL_H - Math.random() * OVERLAP,
        delay: ((rows - 1 - row) / rows) * ROW_SPREAD + Math.random() * JITTER,
        tilt: (Math.random() - 0.5) * 14,
        message: messages[Math.floor(Math.random() * messages.length)]!,
      }
    })
  }

  async function play(next: Phase) {
    phase = next
    await tick()
    const animations = overlay?.getAnimations({ subtree: true }) ?? []
    await Promise.all(animations.map(animation => animation.finished))
  }

  async function reveal() {
    await play('reveal')
    phase = null
    boxes = []
  }

  async function wipe(complete: Promise<void>) {
    boxes = layout()
    await play('cover')
    void Promise.allSettled([complete]).then(reveal)
  }

  function crossfade(complete: Promise<void>) {
    if (!document.startViewTransition) return
    return new Promise<void>(resolve => {
      document.startViewTransition(async () => {
        resolve()
        await complete
      })
    })
  }

  function ctfHasStarted() {
    const startTime = getClientConfig()?.startTime ?? 0
    return Date.now() >= startTime
  }

  onNavigate(navigation => {
    if (navigation.willUnload || phase || !ctfHasStarted()) return
    const sameRoute = navigation.from?.route.id === navigation.to?.route.id
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (sameRoute || reducedMotion) return crossfade(navigation.complete)
    return wipe(navigation.complete)
  })

  $effect(() => {
    run = async swap => {
      if (phase || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await swap()
        return
      }
      boxes = layout()
      await play('cover')
      await swap()
      await reveal()
    }
    return () => {
      run = null
    }
  })
</script>

{#if phase}
  <page-wipe
    bind:this={overlay}
    data-phase={phase}
    style:--box-w="{CELL_W + OVERLAP}px"
    style:--box-h="{CELL_H + OVERLAP}px"
    style:--drop="{DROP}ms"
    style:--fall="{FALL}ms"
    aria-hidden="true"
  >
    {#each boxes as box, index (index)}
      <wipe-box
        style:left="{box.x}px"
        style:top="{box.y}px"
        style:--delay="{box.delay}ms"
        style:--tilt="{box.tilt}deg"
      >
        <ErrorWindow message={box.message} />
      </wipe-box>
    {/each}
  </page-wipe>
{/if}

<style>
  page-wipe {
    position: fixed;
    inset: 0;
    z-index: var(--layer-wipe);
    overflow: clip;
  }

  wipe-box {
    position: absolute;
    display: flex;
    inline-size: var(--box-w);
    block-size: var(--box-h);

    [data-phase='cover'] & {
      animation: wipe-drop var(--drop) var(--delay) both;
    }

    [data-phase='reveal'] & {
      animation: wipe-fall var(--fall) var(--delay) forwards;
    }

    :global(error-window) {
      flex: 1;
      inline-size: 100%;
      max-inline-size: none;
      min-inline-size: 0;
    }
  }

  @keyframes wipe-drop {
    0% {
      translate: 0 calc(-100dvh - 100%);
      animation-timing-function: cubic-bezier(0.5, 0, 1, 0.5);
    }

    80% {
      translate: 0 0;
      animation-timing-function: ease-out;
    }

    90% {
      translate: 0 -0.35rem;
      animation-timing-function: ease-in;
    }

    100% {
      translate: 0 0;
    }
  }

  @keyframes wipe-fall {
    0% {
      animation-timing-function: ease-out;
    }

    15% {
      translate: 0 -0.5rem;
      animation-timing-function: cubic-bezier(0.5, 0, 1, 0.5);
    }

    100% {
      translate: 0 calc(100dvh + 2rem);
      rotate: var(--tilt);
    }
  }
</style>
