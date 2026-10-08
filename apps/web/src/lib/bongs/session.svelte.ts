import { noteLocalSolve, noteServerBongs } from './queue'

type LocalSolve = {
  score: number
  points: number
}

let solves = $state.raw<LocalSolve[]>([])

export function pendingSolves(): readonly LocalSolve[] {
  return solves
}

export function announceSolvePoints(score: number, points: number): void {
  solves = [...solves, { score, points }]
}
