import type { ListAdminBongsRouteV2, RouteResponseData } from '@rctf/types'
import { normalizeSearchText, searchMatches } from '$lib/filters/ui'
import type { SortOrder, SortState } from '../admin-table-logic'

export type BongTeam = RouteResponseData<typeof ListAdminBongsRouteV2>[number]

export type BongSortBy = 'name' | 'score' | 'bongsTotal' | 'bongsAvailable'

export const ROW_HEIGHT = 48

export const SORT_DEFAULTS: Record<BongSortBy, SortOrder> = {
  name: 'asc',
  score: 'desc',
  bongsTotal: 'desc',
  bongsAvailable: 'desc',
}

export const INITIAL_SORT: SortState<BongSortBy> = {
  by: 'bongsAvailable',
  order: 'desc',
}

export function filterBongTeams(
  teams: readonly BongTeam[],
  search: string
): BongTeam[] {
  const query = normalizeSearchText(search)
  if (!query) return [...teams]
  return teams.filter(team => searchMatches(query, team.name))
}

export function sortBongTeams(
  teams: readonly BongTeam[],
  sort: SortState<BongSortBy>
): BongTeam[] {
  const direction = sort.order === 'asc' ? 1 : -1
  return [...teams].sort((left, right) => {
    const result =
      sort.by === 'name'
        ? left.name.localeCompare(right.name)
        : left[sort.by] - right[sort.by]
    if (result === 0) return left.name.localeCompare(right.name)
    return result * direction
  })
}

export function bongFingerprint(
  search: string,
  sort: SortState<BongSortBy>
): string {
  return `${search.trim()}|${sort.by}|${sort.order}`
}
