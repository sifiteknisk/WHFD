import { GetChallengeSolvesRouteV2 } from '@rctf/types'
import { getChallengeSolvesResponse } from '../../../../services/challenge-solves'
import challsGroup from '../group'

challsGroup.route(
  GetChallengeSolvesRouteV2,
  ({ res, ctx, params, query, user }) =>
    getChallengeSolvesResponse({
      res,
      db: ctx.var.db,
      challengeId: params.id,
      userId: user?.id ?? null,
      limit: query.limit,
      offset: query.offset,
    })
)
