import { z } from 'zod/mini'
import { response } from '../internal'
import { example } from '../util/example'

export const GoodBongVersion = response('goodBongVersion', {
  status: 200,
  message: 'The team bong version was retrieved.',
  data: z.object({
    version: example(z.int(), 7).check(
      z.describe(
        'Counter that changes whenever the team may have gained or spent a bong.'
      )
    ),
  }),
})
