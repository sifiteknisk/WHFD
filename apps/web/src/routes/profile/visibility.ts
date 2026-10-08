export function isRelaxedDivision(division: string) {
  return division.toLowerCase() === 'relaxed'
}

export type ProfileViewer = {
  division: string
  viewerId: string | null
  teamId: string
  isAdmin: boolean
}

export function canViewTeamProfile(viewer: ProfileViewer) {
  if (!isRelaxedDivision(viewer.division)) return true
  if (viewer.isAdmin) return true
  return viewer.viewerId !== null && viewer.viewerId === viewer.teamId
}
