export type JsonSchema = Record<string, unknown>

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

export type OpenApiResponse = {
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

export type ApiOperationItem = {
  path: string
  method: string
  op: OpenApiOperation
  id: string
}

export const operationsFromDocument = (
  document: OpenApiDocument
): ApiOperationItem[] => {
  const ops: ApiOperationItem[] = []
  for (const [path, methods] of Object.entries(document.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const upper = method.toUpperCase()
      ops.push({ path, method: upper, op, id: `${upper} ${path}` })
    }
  }
  return ops
}

export const accessLine = (meta: RctfOperationMeta): string => {
  if (meta.auth === 'adminBot') return 'admin bot'
  if (meta.auth === 'dynamicChallenge') return 'webhook signature'
  if (meta.permissions.length) return meta.permissions.join(' + ')
  if (meta.auth === 'required') return 'signed in'
  if (meta.auth === 'optional') return 'public, token optional'
  return 'public'
}

export const authChipLabel = (auth: RctfAuth): string => {
  switch (auth) {
    case 'required':
      return 'Bearer token'
    case 'optional':
      return 'Bearer token optional'
    case 'none':
      return 'No auth'
    case 'adminBot':
      return 'Admin-bot token'
    case 'dynamicChallenge':
      return 'Webhook signature'
  }
}

export const typeLabel = (schema: JsonSchema | undefined): string => {
  if (!schema || typeof schema !== 'object') return 'any'
  if (Array.isArray(schema.enum)) return schema.enum.map(String).join(' | ')
  if (schema.oneOf) return `one of ${(schema.oneOf as unknown[]).length}`
  if (schema.anyOf) return `any of ${(schema.anyOf as unknown[]).length}`
  const bits: string[] = []
  if (schema.type) bits.push(String(schema.type))
  if (schema.format) bits.push(String(schema.format))
  if (schema.nullable) bits.push('nullable')
  if (schema.minimum != null) bits.push(`>= ${schema.minimum}`)
  if (schema.maximum != null) bits.push(`<= ${schema.maximum}`)
  if (schema.minLength != null) bits.push(`min ${schema.minLength}`)
  if (schema.maxLength != null) bits.push(`max ${schema.maxLength}`)
  return bits.join(' · ') || 'any'
}

export const isComplex = (schema: JsonSchema | undefined): boolean => {
  if (!schema || typeof schema !== 'object') return false
  if (schema.oneOf || schema.anyOf) return true
  if (schema.type === 'object' && schema.properties) return true
  if (
    schema.type === 'array' &&
    schema.items &&
    isComplex(schema.items as JsonSchema)
  ) {
    return true
  }
  return false
}

export const schemaBranches = (
  schema: JsonSchema | undefined
): JsonSchema[] => {
  const oneOf = schema?.oneOf
  const anyOf = schema?.anyOf
  if (Array.isArray(oneOf)) return oneOf as JsonSchema[]
  if (Array.isArray(anyOf)) return anyOf as JsonSchema[]
  return []
}

export const schemaProperties = (
  schema: JsonSchema
): [string, JsonSchema][] => {
  const properties = schema.properties
  if (
    !properties ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return []
  }
  return Object.entries(properties as Record<string, JsonSchema>)
}

export const requiredSet = (schema: JsonSchema): Set<string> => {
  const required = schema.required
  if (!Array.isArray(required)) return new Set()
  return new Set(
    required.filter((name): name is string => typeof name === 'string')
  )
}

export const downloadOpenApiJson = (spec: OpenApiDocument): void => {
  const blob = new Blob([JSON.stringify(spec, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = globalThis.document.createElement('a')
  link.href = url
  link.download = 'openapi.json'
  link.click()
  URL.revokeObjectURL(url)
}

export const matchesFilter = (
  item: ApiOperationItem,
  query: string
): boolean => {
  if (!query) return true
  const meta = item.op['x-rctf']
  const haystack = [
    item.method,
    item.path,
    item.op.summary,
    accessLine(meta),
    meta.permissions.join(' '),
    item.op.description,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}
