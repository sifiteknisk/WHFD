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
      score: example(z.int(), 13370).check(z.describe('Total team score.')),
      bongsTotal: example(z.int(), 13).check(
        z.describe('Bongs earned so far, one per 1000 points reached.')
      ),
      bongsAvailable: example(z.int(), 2).check(
        z.describe('Earned bongs that have not been handed out yet.')
      ),
    })
  ),
})

export const GoodAdminBongGiven = response('goodAdminBongGiven', {
  status: 200,
  message: 'Bong marked as given.',
  data: z.object({
    bongsAvailable: example(z.int(), 1).check(
      z.describe('Bongs the team still has available after this one.')
    ),
  }),
})

export const BadNoAvailableBongs = response('badNoAvailableBongs', {
  status: 409,
  message: 'The team has no available bongs.',
})
