import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodFlag = response('goodFlag', {
  status: 200,
  message: 'The flag is correct.',
  data: z.object({
    points: example(z.int(), 458).check(
      z.describe(
        'Points this solve is worth right now, after counting it toward the challenge decay.'
      )
    ),
  }),
})
