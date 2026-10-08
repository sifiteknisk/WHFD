export type LastFirstBloodChallenge = {
  name: string
  category: string
  points: number
  firstBloodAt: number | null
  firstSolvers: { id: string }[]
}

export type LastFirstBlood = {
  challengeId: string
  challengeName: string
  category: string
  points: number
  teamId: string
  at: number
}

export function latestFirstBlood(
  challenges: Record<string, LastFirstBloodChallenge>
): LastFirstBlood | null {
  let best: LastFirstBlood | null = null
  for (const [challengeId, challenge] of Object.entries(challenges)) {
    const teamId = challenge.firstSolvers[0]?.id
    const at = challenge.firstBloodAt
    if (!teamId || at == null) continue
    if (
      best &&
      (at < best.at || (at === best.at && challengeId <= best.challengeId))
    ) {
      continue
    }
    best = {
      challengeId,
      challengeName: challenge.name,
      category: challenge.category,
      points: challenge.points,
      teamId,
      at,
    }
  }
  return best
}
