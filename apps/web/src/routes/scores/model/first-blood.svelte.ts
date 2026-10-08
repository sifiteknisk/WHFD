import { SvelteSet } from 'svelte/reactivity'
import type { ScoresData } from './data.svelte'

export type FirstBlood = {
  challengeId: string
  challengeName: string
  category: string
  points: number
  teamId: string
}

export function createFirstBloodQueue(
  data: ScoresData,
  enabled: () => boolean
) {
  // Plain on purpose: bloods that existed before the board was opened are
  // never announced, and new ones keep their arrival order across polls.
  let known: Set<string> | undefined
  const queue: string[] = []
  const shown = new SvelteSet<string>()

  const current = $derived.by((): FirstBlood | null => {
    const challenges = data.challengesData
    const ids = Object.keys(challenges)
    if (ids.length === 0) return null

    const blooded = ids.filter(id => challenges[id]!.firstSolvers.length > 0)
    known ??= new Set(blooded)
    for (const id of blooded) {
      if (known.has(id)) continue
      known.add(id)
      queue.push(id)
    }
    // Bloods that land while disabled are dropped, not replayed on re-enable.
    if (!enabled()) {
      queue.length = 0
      return null
    }

    const id = queue.find(id => !shown.has(id))
    if (!id) return null
    const challenge = challenges[id]!
    return {
      challengeId: id,
      challengeName: challenge.name,
      category: challenge.category,
      points: challenge.points,
      teamId: challenge.firstSolvers[0]!.id,
    }
  })

  return {
    get current() {
      return current
    },
    dismiss: (challengeId: string) => shown.add(challengeId),
  }
}
