import { GetUserSelfBongVersionRouteV2 } from '@rctf/types'
import { getBongVersion } from '../../../../cache/bong-version'
import usersGroup from '../group'

usersGroup.route(GetUserSelfBongVersionRouteV2, async ({ ctx, user, res }) => {
  // Every open tab polls this every few seconds; keep it out of info logs.
  ctx.var.logger.setResLevel('debug')
  return res.goodBongVersion({
    version: await getBongVersion(ctx.var.redis, user.id),
  })
})
