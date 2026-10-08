<script lang="ts">
  import ErrorWindow from '$lib/components/error-window.svelte'
  import Showcase from '$lib/showcase/overlay.svelte'
  import { useUserById } from '$lib/query/user'
  import LazyAvatar from '$lib/ui/lazy-avatar.svelte'
  import type { FirstBlood } from '../model/first-blood.svelte'

  type Props = {
    blood: FirstBlood
    onDone: () => void
  }

  type Fall = {
    id: number
    x: string
    y: string
    tilt: string
    delay: number
    dur: number
    message: string
  }

  const messages = [
    'Segmentation fault (core dumped)',
    'ACCESS_VIOLATION at 0x00000000',
    'Kernel panic - not syncing',
    'stack smashing detected',
    'Illegal instruction',
    'double free or corruption',
    'Bus error (core dumped)',
    'malloc(): corrupted top size',
    'General protection fault',
    'STATUS_STACK_BUFFER_OVERRUN',
    'Unhandled exception 0xC0000005',
    'fatal error: first blood',
  ]

  function unit(n: number) {
    const x = Math.sin(n * 12.9898) * 43758.5453
    return x - Math.floor(x)
  }

  function ramp(): Fall[] {
    const list: Fall[] = []
    let id = 1
    const push = (count: number, start: number, gap: number, dur: number) => {
      for (let i = 0; i < count; i++) {
        const n = id
        list.push({
          id: id++,
          x: `${unit(n) * 112 - 10}%`,
          y: `${unit(n + 7) * 112 - 10}%`,
          tilt: `${(unit(n + 11) - 0.5) * 18}deg`,
          delay: start + i * gap,
          dur,
          message: messages[n % messages.length]!,
        })
      }
    }
    // Few with the card, then the gaps collapse until the screen is buried.
    push(12, 0, 40, 500)
    push(48, 450, 12, 420)
    push(110, 1050, 6, 360)
    push(160, 1750, 4, 300)
    push(200, 2450, 3, 260)
    push(180, 3100, 2, 220)
    return list
  }

  const falls = ramp()

  let { blood, onDone }: Props = $props()

  const team = useUserById(() => blood.teamId)
  const teamName = $derived(
    team.isPending ? '…' : (team.data?.name ?? 'Unknown team'),
  )
</script>

<Showcase headline="First blood" {onDone} sound="/sound/firstblood.mp3">
  <crash>
      {#each falls as fall (fall.id)}
        <crash-error
          aria-hidden="true"
          style:left={fall.x}
          style:top={fall.y}
          style:--tilt={fall.tilt}
          style:--delay="{fall.delay}ms"
          style:--dur="{fall.dur}ms"
        >
          <ErrorWindow message={fall.message} />
        </crash-error>
      {/each}

      <crash-anchor>
        <crash-card role="dialog" aria-label="First blood">
          <crash-bar>
            <crash-mark aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle cx="13" cy="14" r="7" fill="#4cc83a" />
                <circle cx="23" cy="13" r="7.2" fill="#2f7cf6" />
                <path
                  fill="#f6b429"
                  d="M6 27c6-8 16-9 24-2-6 1-12 0-18 3-2 1-4 1-6-1z"
                />
              </svg>
            </crash-mark>
            <span>First blood</span>
          </crash-bar>
          <crash-body>
            <crash-portrait>
              <LazyAvatar src={team.data?.avatarUrl} name={teamName} />
            </crash-portrait>
            <crash-copy>
              <strong>{teamName}</strong>
              <p>has just drawn first blood on</p>
              <b>{blood.challengeName}</b>
            </crash-copy>
          </crash-body>
        </crash-card>
      </crash-anchor>

      <crash-blue aria-hidden="true">
        <img
          src="/images/bluescreen.png"
          alt=""
        />
      </crash-blue>
  </crash>
</Showcase>

<style>
  crash {
    --blue-at: 4.35s;

    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  crash-error {
    position: absolute;
    z-index: 1;
    inline-size: min(13rem, 58vw);
    pointer-events: none;
    rotate: var(--tilt);
    animation:
      crash-drop var(--dur) cubic-bezier(0.45, 0, 0.85, 0.4) var(--delay) both,
      crash-clear 1ms steps(1, end) var(--blue-at) both;

    :global(error-window) {
      inline-size: 100%;
      max-inline-size: none;
    }
  }

  crash-anchor {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 46%;
    pointer-events: none;
    translate: -50% -50%;
  }

  crash-card {
    --slit: calc(1.15rem + 2.45rem);

    position: relative;
    display: flex;
    flex-direction: column;

    inline-size: min(54rem, calc(100vw - 1.25rem));
    max-block-size: calc(100dvh - 1.25rem);
    padding: 1.15rem 1.45rem 1.85rem;
    overflow: auto;
    pointer-events: auto;
    font-family: 'Segoe UI', 'Trebuchet MS', 'Noto Sans', sans-serif;
    color: #243040;
    text-align: start;
    background:
      radial-gradient(
        130% 80% at 12% -10%,
        rgb(255 255 255 / 100%),
        transparent 46%
      ),
      linear-gradient(
        180deg,
        transparent 0 calc(var(--slit) - 1.6rem),
        rgb(255 255 255 / 70%) calc(var(--slit) - 0.15rem),
        transparent var(--slit)
      ),
      linear-gradient(
        180deg,
        #ffffff 0%,
        #d7eefb calc(var(--slit) - 1px),
        #3f86b8 var(--slit),
        #3f86b8 calc(var(--slit) + 2px),
        #d2ebf8 calc(var(--slit) + 2px),
        #6aa8d0 100%
      );
    border: 1px solid #fff;
    border-radius: 1.15rem;
    box-shadow:
      inset 0 2px 0 #fff,
      inset 0 -0.7rem 1.1rem rgb(20 70 110 / 28%),
      0 0 0 1px rgb(30 80 120 / 55%),
      0 1.35rem 2.2rem rgb(8 35 65 / 55%);

    &::before {
      position: absolute;
      inset: 3px 4px auto 4px;
      block-size: var(--slit);
      pointer-events: none;
      content: '';
      background: linear-gradient(
        185deg,
        rgb(255 255 255 / 95%) 0%,
        rgb(255 255 255 / 55%) 42%,
        rgb(255 255 255 / 0%) 100%
      );
      border-radius: 1rem 1rem 42% 42%;
    }
  }

  crash-bar {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    font-size: clamp(1.7rem, 3vw, 2.15rem);
    font-weight: 500;
    line-height: 1;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  crash-mark {
    display: grid;
    flex-shrink: 0;
    inline-size: 2.45rem;
    block-size: 2.45rem;

    svg {
      inline-size: 100%;
      block-size: 100%;
    }
  }

  crash-body {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 1.6rem;
    align-items: center;
    padding: 1.35rem 0.55rem 0.55rem 0.45rem;
  }

  crash-portrait {
    --avatar-size: clamp(7.5rem, 18vh, 9.5rem);
    --avatar-radius: 0.55rem;
    --avatar-ring: inset 0 1px 0 rgb(255 255 255 / 70%);
    --avatar-fallback-size: 2.2rem;
    --avatar-fallback-color: #24527a;

    display: grid;
    flex-shrink: 0;
    padding: 0.38rem;
    background: linear-gradient(
      165deg,
      #f4ffd4 0%,
      #b6f56a 28%,
      #5cbf18 62%,
      #2f8c0e 100%
    );
    border-radius: 0.9rem;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 90%),
      0 0 0 1px rgb(255 255 255 / 75%),
      0 0 1.3rem 0.2rem rgb(150 235 70 / 95%);

    :global([data-part='fallback']) {
      background: #e7f3fb;
      border: none;
    }
  }

  crash-copy {
    min-inline-size: 0;

    strong,
    b {
      display: block;
      color: #101820;
      font-size: clamp(2rem, 3.6vw, 2.7rem);
      font-weight: 700;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }

    b {
      margin-top: 0.2rem;
      color: #0c4f86;
    }

    p {
      margin: 0.35rem 0 0;
      color: #4d5d6c;
      font-size: clamp(1.15rem, 2vw, 1.4rem);
      line-height: 1.25;
    }
  }

  crash-blue {
    position: absolute;
    z-index: 3;
    inset: 0;
    pointer-events: none;
    background: #0078d4;
    opacity: 0;
    animation: crash-cover 1ms steps(1, end) var(--blue-at) both;

    img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
  }

  @keyframes crash-drop {
    0% {
      translate: 0 calc(-100dvh - 120%);
    }

    76% {
      translate: 0 0;
    }

    88% {
      translate: 0 -0.45rem;
    }

    100% {
      translate: 0 0;
    }
  }

  @keyframes crash-clear {
    to {
      visibility: hidden;
    }
  }

  @keyframes crash-cover {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    crash-error,
    crash-blue {
      animation: none;
    }

    crash-error:nth-child(n + 5),
    crash-blue {
      display: none;
    }
  }
</style>
