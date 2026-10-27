import { AddAdminBongRouteV2 } from '@rctf/types'
import { bumpBongVersion } from '../../../../cache/bong-version'
import { addBong } from '../../../../services/bongs'
import adminGroup from '../group'

adminGroup.route(AddAdminBongRouteV2, async ({ ctx, res, params }) => {
  const result = await addBong(ctx.var.db, params.id)
  if (!result) {
    return res.badUnknownUser()
  }
  await bumpBongVersion(ctx.var.redis, [params.id])
  return res.goodAdminBongAdded(result)
})
