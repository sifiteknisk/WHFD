import {
  BadBody,
  BadCaptcha,
  BadEnded,
  BadJson,
  BadNotStarted,
  BadPerms,
  BadRecaptchaCode,
  BadToken,
  Permissions,
  type AnyRouteDefinition,
  type ResponseDefinition,
  type Schema,
} from '@rctf/types'
import { z } from 'zod'

type JsonSchema = Record<string, unknown>

export type RctfAuth =
  | 'required'
  | 'optional'
  | 'none'
  | 'adminBot'
  | 'dynamicChallenge'

export type RctfOperationMeta = {
  auth: RctfAuth
  permissions: string[]
  captchaAction?: string
  onlyWhenStarted: boolean
  startBypassPermissions: string[]
  onlyWhenNotFinished: boolean
  rejectBanned: boolean
  bodyFormat: 'json' | 'form-data'
  returnBodyAsIs: boolean
}

export type OpenApiParameter = {
  name: string
  in: 'path' | 'query'
  required: boolean
  description?: string
  schema: JsonSchema
}

type OpenApiResponse = {
  description: string
  content?: {
    'application/json': { schema: JsonSchema }
  }
  'x-rctf-outcome': 'success' | 'error' | 'mixed'
}

export type OpenApiOperation = {
  operationId: string
  tags: string[]
  summary: string
  description: string
  parameters?: OpenApiParameter[]
  requestBody?: {
    required: boolean
    content: Record<string, { schema: JsonSchema }>
  }
  responses: Record<string, OpenApiResponse>
  security?: Record<string, string[]>[]
  'x-rctf': RctfOperationMeta
}

export type OpenApiDocument = {
  openapi: '3.0.3'
  info: { title: string; version: string; description: string }
  servers: { url: string }[]
  tags: { name: string }[]
  paths: Record<string, Record<string, OpenApiOperation>>
  components: {
    securitySchemes: Record<string, Record<string, unknown>>
  }
}

const PERMISSION_FLAGS = [
  ['challsRead', Permissions.challsRead],
  ['challsWrite', Permissions.challsWrite],
  ['leaderboardRead', Permissions.leaderboardRead],
  ['challsSolveWrite', Permissions.challsSolveWrite],
  ['usersWrite', Permissions.usersWrite],
  ['settingsWrite', Permissions.settingsWrite],
] as const

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const permissionNames = (mask: number | undefined): string[] => {
  if (!mask) return []
  return PERMISSION_FLAGS.filter(([, value]) => (mask & value) === value).map(
    ([name]) => name
  )
}

const schemaOf = (schema: Schema, io: 'input' | 'output'): JsonSchema => {
  try {
    const json = z.toJSONSchema(schema, {
      target: 'openapi-3.0',
      unrepresentable: 'any',
      io,
      override: ctx => {
        const kind = (ctx.zodSchema as { _zod?: { def?: { type?: string } } })
          ._zod?.def?.type
        if (kind === 'custom') {
          Object.assign(ctx.jsonSchema, { type: 'string', format: 'binary' })
        }
      },
    }) as JsonSchema
    delete json.$schema
    return json
  } catch {
    return {}
  }
}

const toOpenApiPath = (path: string): string =>
  path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')

const pathParamNames = (path: string): string[] =>
  [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map(match => match[1] ?? '')

const camel = (value: string): string =>
  value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const operationIdFor = (method: string, path: string): string => {
  const parts = path
    .split('/')
    .filter(Boolean)
    .map(part =>
      part.startsWith(':') ? `By${camel(part.slice(1))}` : camel(part)
    )
  return method.toLowerCase() + parts.join('')
}

const tagFor = (path: string): string => {
  const segments = path.split('/').filter(Boolean)
  const version = segments[0] ?? 'api'
  const area = segments[1] ?? 'root'
  return `${version}/${area}`
}

const objectSchemaProperties = (
  schema: JsonSchema | undefined
): Record<string, JsonSchema> | undefined => {
  const properties = schema?.properties
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return undefined
  }
  return properties as Record<string, JsonSchema>
}

const requiredNames = (schema: JsonSchema | undefined): Set<string> => {
  const required = schema?.required
  if (!Array.isArray(required)) return new Set()
  return new Set(
    required.filter((name): name is string => typeof name === 'string')
  )
}

const parametersFor = (
  location: 'path' | 'query',
  schema: JsonSchema | undefined,
  pathNames: string[]
): OpenApiParameter[] => {
  const properties = objectSchemaProperties(schema)
  const required = requiredNames(schema)
  const names =
    location === 'path'
      ? [
          ...pathNames,
          ...Object.keys(properties ?? {}).filter(
            name => !pathNames.includes(name)
          ),
        ]
      : Object.keys(properties ?? {})

  return names.filter(Boolean).map(name => {
    const property = properties?.[name] ?? { type: 'string' }
    const description = property.description
    const { description: _description, ...rest } = property
    return {
      name,
      in: location,
      required: location === 'path' || required.has(name),
      ...(typeof description === 'string' ? { description } : {}),
      schema: rest,
    }
  })
}

const accessMeta = (route: AnyRouteDefinition): RctfOperationMeta => {
  const requiresAuth = route.authRequired || (route.permissions ?? 0) !== 0
  const optional =
    !requiresAuth &&
    (route.optionalAuth || route.onlyWhenStartedPermissionsBypass !== undefined)

  const auth: RctfAuth = route.serviceAuth
    ? route.serviceAuth
    : requiresAuth
      ? 'required'
      : optional
        ? 'optional'
        : 'none'

  return {
    auth,
    permissions: permissionNames(route.permissions),
    ...(route.captchaAction ? { captchaAction: route.captchaAction } : {}),
    onlyWhenStarted: route.onlyWhenStarted,
    startBypassPermissions: permissionNames(
      route.onlyWhenStartedPermissionsBypass
    ),
    onlyWhenNotFinished: route.onlyWhenNotFinished,
    rejectBanned: route.rejectBanned,
    bodyFormat: route.bodyFormat,
    returnBodyAsIs: route.returnBodyAsIs,
  }
}

const describeAccess = (meta: RctfOperationMeta): string => {
  const lines = [
    meta.auth === 'required'
      ? 'Auth: bearer token required (`Authorization: Bearer <token>`).'
      : meta.auth === 'optional'
        ? 'Auth: bearer token optional.'
        : meta.auth === 'adminBot'
          ? 'Auth: admin-bot bearer token (`Authorization: Bearer <secret>`). A wrong token is rejected with HTTP 401.'
          : meta.auth === 'dynamicChallenge'
            ? 'Auth: dynamic scoring webhook. Send `X-RCTF-Timestamp` and `X-RCTF-Signature`.'
            : 'Auth: none.',
  ]

  if (meta.permissions.length === 1) {
    lines.push(`Permissions: \`${meta.permissions[0]}\` required.`)
  } else if (meta.permissions.length > 1) {
    lines.push(
      `Permissions: ${meta.permissions.map(name => `\`${name}\``).join(' and ')} all required.`
    )
  } else if (meta.auth === 'required') {
    lines.push('Permissions: any authenticated user.')
  }

  if (meta.captchaAction) {
    lines.push(`Captcha: \`${meta.captchaAction}\`.`)
  }
  if (meta.onlyWhenStarted) {
    const bypass = meta.startBypassPermissions.length
      ? ` Users with ${meta.startBypassPermissions.map(name => `\`${name}\``).join(' and ')} can call it before the start.`
      : ''
    lines.push(`Timing: only after the CTF starts.${bypass}`)
  }
  if (meta.onlyWhenNotFinished) {
    lines.push('Timing: only before the CTF ends.')
  }
  if (meta.rejectBanned) {
    lines.push('Banned users are rejected.')
  }
  if (meta.bodyFormat === 'form-data') {
    lines.push('Body: multipart form data.')
  }
  if (meta.returnBodyAsIs) {
    lines.push(
      'Response body is the `data` payload, without the kind/message wrapper.'
    )
  }

  return lines.join('\n')
}

const automaticErrors = (route: AnyRouteDefinition): ResponseDefinition[] => {
  const extra: ResponseDefinition[] = []
  const requiresAuth = route.authRequired || (route.permissions ?? 0) !== 0
  if (requiresAuth) extra.push(BadToken)
  if (route.permissions || route.rejectBanned) extra.push(BadPerms)
  if (route.onlyWhenStarted) extra.push(BadNotStarted)
  if (route.onlyWhenNotFinished) extra.push(BadEnded)
  if (route.captchaAction) {
    extra.push(route.path.startsWith('/v1/') ? BadRecaptchaCode : BadCaptcha)
  }
  if (route.body && route.bodyFormat !== 'form-data') extra.push(BadJson)
  if (route.body || route.query || route.params) extra.push(BadBody)
  return extra
}

const responseSchema = (
  route: AnyRouteDefinition,
  definition: ResponseDefinition
): JsonSchema | undefined => {
  if (route.returnBodyAsIs) {
    return definition.dataSchema
      ? schemaOf(definition.dataSchema, 'output')
      : undefined
  }
  return schemaOf(definition.schema, 'output')
}

const responsesFor = (
  route: AnyRouteDefinition
): Record<string, OpenApiResponse> => {
  const seen = new Set<string>()
  const listed: {
    definition: ResponseDefinition
    outcome: 'success' | 'error'
  }[] = []

  for (const definition of route.goodResponses) {
    if (seen.has(definition.kind)) continue
    seen.add(definition.kind)
    listed.push({ definition, outcome: 'success' })
  }
  for (const definition of [...route.badResponses, ...automaticErrors(route)]) {
    if (seen.has(definition.kind)) continue
    seen.add(definition.kind)
    listed.push({ definition, outcome: 'error' })
  }

  const grouped = new Map<
    number,
    {
      outcome: 'success' | 'error' | 'mixed'
      lines: string[]
      schemas: JsonSchema[]
    }
  >()

  for (const { definition, outcome } of listed) {
    const current = grouped.get(definition.status) ?? {
      outcome,
      lines: [],
      schemas: [],
    }
    current.outcome = current.outcome === outcome ? current.outcome : 'mixed'
    current.lines.push(`${definition.kind}: ${definition.message}`)
    const schema = responseSchema(route, definition)
    if (schema) current.schemas.push(schema)
    grouped.set(definition.status, current)
  }

  const responses: Record<string, OpenApiResponse> = {}
  for (const [status, group] of grouped) {
    const schema =
      group.schemas.length > 1 ? { oneOf: group.schemas } : group.schemas[0]
    responses[String(status)] = {
      description: group.lines.join('\n'),
      ...(schema ? { content: { 'application/json': { schema } } } : {}),
      'x-rctf-outcome': group.outcome,
    }
  }
  return responses
}

const securityFor = (
  meta: RctfOperationMeta
): Record<string, string[]>[] | undefined => {
  if (meta.auth === 'required') return [{ bearerAuth: [] }]
  if (meta.auth === 'adminBot') return [{ adminBot: [] }]
  if (meta.auth === 'dynamicChallenge') return [{ dynamicChallenge: [] }]
  return undefined
}

export const buildOpenApiDocument = (
  routes: readonly AnyRouteDefinition[]
): OpenApiDocument => {
  const usedIds = new Set<string>()
  const operations = routes.map(route => {
    const meta = accessMeta(route)
    const openPath = toOpenApiPath(route.path)
    let operationId = operationIdFor(route.method, route.path)
    if (usedIds.has(operationId)) {
      let suffix = 2
      while (usedIds.has(`${operationId}${suffix}`)) suffix += 1
      operationId = `${operationId}${suffix}`
    }
    usedIds.add(operationId)

    const parameters = [
      ...parametersFor(
        'path',
        route.params ? schemaOf(route.params, 'input') : undefined,
        pathParamNames(route.path)
      ),
      ...parametersFor(
        'query',
        route.query ? schemaOf(route.query, 'input') : undefined,
        []
      ),
    ]
    const bodySchema = route.body ? schemaOf(route.body, 'input') : undefined
    const mediaType =
      route.bodyFormat === 'form-data'
        ? 'multipart/form-data'
        : 'application/json'

    const operation: OpenApiOperation = {
      operationId,
      tags: [tagFor(route.path)],
      summary:
        route.goodResponses[0]?.message ?? `${route.method} ${route.path}`,
      description: describeAccess(meta),
      ...(parameters.length ? { parameters } : {}),
      ...(bodySchema
        ? {
            requestBody: {
              required: requiredNames(bodySchema).size > 0,
              content: { [mediaType]: { schema: bodySchema } },
            },
          }
        : {}),
      responses: responsesFor(route),
      ...(securityFor(meta) ? { security: securityFor(meta) } : {}),
      'x-rctf': meta,
    }

    return { path: openPath, method: route.method, operation }
  })

  operations.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method)
  )

  const paths: OpenApiDocument['paths'] = {}
  for (const { path, method, operation } of operations) {
    const existing = paths[path]
    if (existing?.[method.toLowerCase()]) {
      throw new Error(`Duplicate route ${method} ${path}`)
    }
    paths[path] = { ...existing, [method.toLowerCase()]: operation }
  }

  const tags = [
    ...new Set(operations.map(item => item.operation.tags[0] ?? '')),
  ]
    .filter(Boolean)
    .sort()
    .map(name => ({ name }))

  return {
    openapi: '3.0.3',
    info: {
      title: 'rCTF API',
      version: '2.0.0',
      description:
        'Generated from the live route definitions. A permission list means every listed flag is required. Admin-only: open /admin/api-docs while signed in, or GET /api/docs with a bearer token that has any admin panel permission.',
    },
    servers: [{ url: '/api' }],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'User auth token.',
        },
        adminBot: {
          type: 'http',
          scheme: 'bearer',
          description: 'Admin-bot shared secret.',
        },
        dynamicChallenge: {
          type: 'apiKey',
          in: 'header',
          name: 'X-RCTF-Signature',
          description: 'Webhook HMAC. Also send the X-RCTF-Timestamp header.',
        },
      },
    },
  }
}
