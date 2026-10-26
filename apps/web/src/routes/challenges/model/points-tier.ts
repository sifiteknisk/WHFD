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
