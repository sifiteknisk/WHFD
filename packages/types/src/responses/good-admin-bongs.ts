import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodAdminBongs = response('goodAdminBongs', {
  status: 200,
  message: 'Team bongs listed.',
  data: z.array(
    z.object({
      id: example(z.string(), 'team-1a2b3c').check(z.describe('Team ID.')),
      name: example(z.string(), 'otter-sec').check(
        z.describe('Team display name.')
      ),
      avatarUrl: example(
        z.nullable(z.string()),
        'https://rctf.osec.io/uploads/avatar.png'
      ).check(z.describe('Avatar URL, or `null` when unset.')),
      score: example(z.int(), 13370).check(z.describe('Total team score.')),
      bongsTotal: example(z.int(), 13).check(
        z.describe(
          'Bongs earned so far from points gained (decay does not revoke).'
        )
      ),
      bongsAvailable: example(z.int(), 2).check(
        z.describe('Available bongs, including manual adjustments.')
      ),
    })
  ),
})

export const GoodAdminBongGiven = response('goodAdminBongGiven', {
  status: 200,
  message: 'Available bongs decreased by 1.',
  data: z.object({
    bongsAvailable: example(z.int(), 1).check(
      z.describe('Bongs the team still has available after this one.')
    ),
  }),
})

export const GoodAdminBongAdded = response('goodAdminBongAdded', {
  status: 200,
  message: 'Available bongs increased by 1.',
  data: z.object({
    bongsTotal: example(z.int(), 14).check(
      z.describe(
        'Total bongs earned; manual availability adjustments do not increase it.'
      )
    ),
    bongsAvailable: example(z.int(), 3).check(
      z.describe('Available bongs the team has after this grant.')
    ),
  }),
})

export const BadNoAvailableBongs = response('badNoAvailableBongs', {
  status: 409,
  message: 'The team has no available bongs.',
})
