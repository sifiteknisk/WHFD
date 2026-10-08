import { GiveAdminBongRouteV2 } from '@rctf/types'
import { giveBong } from '../../../../services/bongs'
import adminGroup from '../group'

adminGroup.route(GiveAdminBongRouteV2, async ({ ctx, res, params }) => {
  const bongsAvailable = await giveBong(ctx.var.db, params.id)
  if (bongsAvailable === undefined) {
    return res.badNoAvailableBongs()
  }
  return res.goodAdminBongGiven({ bongsAvailable })
})
