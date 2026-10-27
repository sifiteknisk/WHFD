import { GiveAdminBongRouteV2 } from '@rctf/types'
import { bumpBongVersion } from '../../../../cache/bong-version'
import { giveBong } from '../../../../services/bongs'
import adminGroup from '../group'

adminGroup.route(GiveAdminBongRouteV2, async ({ ctx, res, params }) => {
  const bongsAvailable = await giveBong(ctx.var.db, params.id)
  if (bongsAvailable === undefined) {
    return res.badNoAvailableBongs()
  }
  await bumpBongVersion(ctx.var.redis, [params.id])
  return res.goodAdminBongGiven({ bongsAvailable })
})
