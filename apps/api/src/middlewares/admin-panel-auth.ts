import { BadPerms, BadToken, Permissions } from '@rctf/types'
import type { MiddlewareHandler } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { getCachedUser, setCachedUser } from '../cache/auth-cache'
import type { AppEnv } from '../lib/app-env'
import { parseToken, TokenKind } from '../lib/tokens'
import { getUser } from '../services/users'

const AUTH_PREFIX = 'Bearer '

/** Same gate as the web admin panel: any one of these flags. */
export const ADMIN_PANEL_PERMISSIONS =
  Permissions.challsRead | Permissions.usersWrite | Permissions.settingsWrite

export const adminPanelAuthMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith(AUTH_PREFIX)) {
    return c.json(
      { kind: BadToken.kind, message: BadToken.message },
      BadToken.status as ContentfulStatusCode
    )
  }

  const userId = await parseToken(
    TokenKind.Auth,
    authHeader.slice(AUTH_PREFIX.length)
  )
  if (!userId) {
    return c.json(
      { kind: BadToken.kind, message: BadToken.message },
      BadToken.status as ContentfulStatusCode
    )
  }

  const cached = await getCachedUser(c.var.redis, userId)
  const user = cached ?? (await getUser(c.var.db, userId)) ?? null
  if (user && !cached) {
    setCachedUser(c.var.redis, user).catch(() => {
      c.var.logger.error({ userId }, 'failed to set cached user')
    })
  }

  if (!user) {
    return c.json(
      { kind: BadToken.kind, message: BadToken.message },
      BadToken.status as ContentfulStatusCode
    )
  }

  if ((user.perms & ADMIN_PANEL_PERMISSIONS) === 0) {
    return c.json(
      { kind: BadPerms.kind, message: BadPerms.message },
      BadPerms.status as ContentfulStatusCode
    )
  }

  await next()
}
