import { ChallengeScoringKind, type Challenge } from '@rctf/types'

export type PointsTier = 'easy' | 'medium' | 'hard' | 'fire'

/** Max points that still count as this tier (inclusive). */
export const easy = 125
export const medium = 250
/** Min points that count as fire. */
export const fire = 1000

export function pointsTier(points: number): PointsTier {
  if (points <= easy) return 'easy'
  if (points <= medium) return 'medium'
  if (points < fire) return 'hard'
  return 'fire'
}

/** Whether the score shown for a challenge lands in the fire tier. */
export function isOnFire(challenge: Challenge): boolean {
  if (challenge.scoringKind === ChallengeScoringKind.DYNAMIC) {
    return pointsTier(challenge.yourScore ?? 0) === 'fire'
  }
  return challenge.hasFlag && pointsTier(challenge.points) === 'fire'
}
