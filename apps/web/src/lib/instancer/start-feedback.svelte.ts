import { goto } from '$app/navigation'
import { page } from '$app/state'
import { toast } from '$lib/toast'
import { SvelteMap } from 'svelte/reactivity'

/** Why the last start of each challenge's instance failed, for its panel. */
export const startNotices = new SvelteMap<string, string>()

export function isViewingChallenge(challengeId: string): boolean {
  return (
    document.visibilityState === 'visible' &&
    page.url.pathname.startsWith('/challenges') &&
    page.url.searchParams.get('challenge') === challengeId
  )
}

function openChallenge(challengeId: string) {
  return {
    label: 'Open',
    onClick: () => {
      void goto(`/challenges?challenge=${encodeURIComponent(challengeId)}`)
    },
  }
}

// NOTE: Start results show in the challenge's panel. A toast is only added
// when that panel is not on screen, so the same news never shows up twice.

export function reportStartReady(challengeId: string, challengeName: string) {
  if (isViewingChallenge(challengeId)) return
  toast.success('Instance ready', {
    description: challengeName,
    duration: 10_000,
    action: openChallenge(challengeId),
  })
}

export function reportStartFailure(
  challengeId: string,
  challengeName: string,
  message: string,
  title = 'Instance failed to start'
) {
  startNotices.set(challengeId, message)
  if (isViewingChallenge(challengeId)) return
  toast.error(title, {
    description: `${challengeName}: ${message}`,
    duration: 10_000,
    action: openChallenge(challengeId),
  })
}
