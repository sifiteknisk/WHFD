export type PointsTier = 'low' | 'mid' | 'high'

export function pointsTier(points: number): PointsTier {
  if (points <= 100) return 'low'
  if (points <= 200) return 'mid'
  return 'high'
}
