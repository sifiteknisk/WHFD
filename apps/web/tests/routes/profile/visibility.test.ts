import {
  canViewTeamProfile,
  isRelaxedDivision,
} from '$routes/profile/visibility'
import { describe, expect, it } from 'bun:test'

describe('isRelaxedDivision', () => {
  it('matches the relaxed division regardless of case', () => {
    expect(isRelaxedDivision('relaxed')).toBe(true)
    expect(isRelaxedDivision('Relaxed')).toBe(true)
    expect(isRelaxedDivision('open')).toBe(false)
  })
})

describe('canViewTeamProfile', () => {
  const relaxed = {
    division: 'relaxed',
    viewerId: 'viewer',
    teamId: 'team',
    isAdmin: false,
  }

  it('allows any viewer to open a ranked division', () => {
    expect(canViewTeamProfile({ ...relaxed, division: 'open' })).toBe(true)
  })

  it('hides a relaxed team from other players', () => {
    expect(canViewTeamProfile(relaxed)).toBe(false)
  })

  it('hides a relaxed team from logged-out visitors', () => {
    expect(canViewTeamProfile({ ...relaxed, viewerId: null })).toBe(false)
  })

  it('lets a relaxed team open its own profile', () => {
    expect(
      canViewTeamProfile({ ...relaxed, viewerId: 'team', teamId: 'team' })
    ).toBe(true)
  })

  it('lets an admin open a relaxed team profile', () => {
    expect(canViewTeamProfile({ ...relaxed, isAdmin: true })).toBe(true)
  })
})
