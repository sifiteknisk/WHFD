type LocalSolve = {
  score: number
  points: number
  bongPoints: number
}

let solves = $state.raw<LocalSolve[]>([])

export function pendingSolves(): readonly LocalSolve[] {
  return solves
}

export function announceSolvePoints(
  score: number,
  points: number,
  bongPoints: number
): void {
  solves = [...solves, { score, points, bongPoints }]
}
