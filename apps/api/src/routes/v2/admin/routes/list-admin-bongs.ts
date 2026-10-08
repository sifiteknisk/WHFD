import { ListAdminBongsRouteV2 } from '@rctf/types'
import { listBongs } from '../../../../services/bongs'
import adminGroup from '../group'

adminGroup.route(ListAdminBongsRouteV2, async ({ ctx, res }) => {
  return res.goodAdminBongs(await listBongs(ctx.var.db))
})
