import { AddAdminBongRouteV2 } from '@rctf/types'
import { addBong } from '../../../../services/bongs'
import adminGroup from '../group'

adminGroup.route(AddAdminBongRouteV2, async ({ ctx, res, params }) => {
  const result = await addBong(ctx.var.db, params.id)
  if (!result) {
    return res.badUnknownUser()
  }
  return res.goodAdminBongAdded(result)
})
