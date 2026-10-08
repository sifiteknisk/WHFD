import {
  bongFingerprint,
  filterBongTeams,
  sortBongTeams,
  type BongTeam,
} from '$routes/admin/bongs/bongs-model'
import { describe, expect, test } from 'bun:test'

const teams: BongTeam[] = [
  { id: 'a', name: 'otter-sec', score: 2400, bongsTotal: 2, bongsAvailable: 1 },
  { id: 'b', name: 'zzz-crew', score: 900, bongsTotal: 0, bongsAvailable: 0 },
  { id: 'c', name: 'alpha', score: 5100, bongsTotal: 5, bongsAvailable: 3 },
]

describe('filterBongTeams', () => {
  test('returns every team when search is empty', () => {
    expect(filterBongTeams(teams, '  ')).toEqual(teams)
  })

  test('matches team names case-insensitively', () => {
    expect(filterBongTeams(teams, 'OTTER')).toEqual([teams[0]!])
  })
})

describe('sortBongTeams', () => {
  test('sorts available bongs descending and breaks ties by name', () => {
    expect(
      sortBongTeams(teams, { by: 'bongsAvailable', order: 'desc' }).map(
        team => team.id
      )
    ).toEqual(['c', 'a', 'b'])
  })

  test('sorts names ascending', () => {
    expect(
      sortBongTeams(teams, { by: 'name', order: 'asc' }).map(team => team.id)
    ).toEqual(['c', 'a', 'b'])
  })
})

describe('bongFingerprint', () => {
  test('changes when search or sort changes', () => {
    const base = bongFingerprint('', { by: 'name', order: 'asc' })
    expect(bongFingerprint('otter', { by: 'name', order: 'asc' })).not.toBe(base)
    expect(bongFingerprint('', { by: 'score', order: 'asc' })).not.toBe(base)
  })
})
