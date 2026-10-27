/** Points needed for the first bong. */
export const BONG_START_POINTS = 250
/** Each bong costs this many times the previous one (2 = doubles). */
export const BONG_COST_MULTIPLIER = 2
/** Total bongs a team can earn from points. */
export const MAX_BONGS = 4

/** Points the nth bong costs on its own (1-based). */
export function bongCost(n: number): number {
  return Math.round(BONG_START_POINTS * BONG_COST_MULTIPLIER ** (n - 1))
}

/** Cumulative points needed to have earned `count` bongs. */
export function bongThreshold(count: number): number {
  let total = 0
  for (let n = 1; n <= count; n++) total += bongCost(n)
  return total
}

/** Bongs earned from cumulative points gained (decay does not revoke). */
export function bongsFromPoints(points: number, max = MAX_BONGS): number {
  let earned = 0
  while (earned < max && points >= bongThreshold(earned + 1)) earned++
  return earned
}

/** Points still needed for the next bong, or `null` once the cap is reached. */
export function pointsToNextBong(
  points: number,
  max = MAX_BONGS
): number | null {
  const earned = bongsFromPoints(points, max)
  if (earned >= max) return null
  return bongThreshold(earned + 1) - Math.max(0, points)
}
