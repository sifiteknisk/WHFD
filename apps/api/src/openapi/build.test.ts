import { describe, expect, test } from 'bun:test'
import * as types from '@rctf/types'
import type { AnyRouteDefinition } from '@rctf/types'
import { buildOpenApiDocument } from './build'
import { renderApiDocs } from './page'

const isRoute = (value: unknown): value is AnyRouteDefinition => {
  if (!value || typeof value !== 'object') return false
  const route = value as AnyRouteDefinition
  return (
    typeof route.method === 'string' &&
    typeof route.path === 'string' &&
    Array.isArray(route.goodResponses)
  )
}

const routes = Object.values(types).filter(isRoute)

const document = buildOpenApiDocument(routes)

const operation = (path: string, method: string) =>
  document.paths[path]?.[method.toLowerCase()]

describe('openapi document', () => {
  test('covers every declared route', () => {
    let count = 0
    for (const methods of Object.values(document.paths)) {
      count += Object.keys(methods).length
    }
    expect(routes.length).toBeGreaterThan(40)
    expect(count).toBe(routes.length)
  })

  test('describes register input and captcha', () => {
    const register = operation('/v2/auth/register', 'POST')
    expect(register?.['x-rctf'].auth).toBe('none')
    expect(register?.['x-rctf'].captchaAction).toBe('register')
    const body = register?.requestBody?.content['application/json']?.schema
    expect(body?.properties).toMatchObject({
      email: { type: 'string' },
      name: { type: 'string' },
      ctftimeToken: { type: 'string' },
    })
    expect(body?.required).toEqual(['name'])
  })

  test('lists every permission a route requires', () => {
    const submissions = operation('/v2/admin/submissions', 'GET')
    expect(submissions?.['x-rctf'].auth).toBe('required')
    expect(submissions?.['x-rctf'].permissions).toEqual([
      'challsRead',
      'usersWrite',
    ])
    expect(submissions?.security).toEqual([{ bearerAuth: [] }])
    expect(submissions?.description).toContain('all required')
  })

  test('converts path params and optional auth', () => {
    const user = operation('/v2/users/{id}', 'GET')
    expect(user?.parameters?.[0]).toMatchObject({
      name: 'id',
      in: 'path',
      required: true,
    })
    expect(user?.['x-rctf'].auth).toBe('optional')
    expect(user?.['x-rctf'].startBypassPermissions).toEqual(['challsRead'])
    expect(user?.responses['401']?.description).toContain('badNotStarted')
  })

  test('documents multipart uploads and unwrapped responses', () => {
    const avatar = operation('/v2/users/me/avatar', 'PATCH')
    expect(
      avatar?.requestBody?.content['multipart/form-data']?.schema
    ).toBeTruthy()
    expect(avatar?.['x-rctf'].captchaAction).toBe('avatarUpload')

    const leaderboard = operation('/v1/integrations/ctftime/leaderboard', 'GET')
    const schema =
      leaderboard?.responses['200']?.content?.['application/json'].schema
    expect(schema?.properties).toHaveProperty('standings')
    expect(schema?.properties).not.toHaveProperty('kind')
  })

  test('documents service credentials', () => {
    expect(
      operation('/v2/admin/admin-bot/queue-depth', 'GET')?.['x-rctf'].auth
    ).toBe('adminBot')
    expect(operation('/v2/challs/{id}/scores', 'POST')?.['x-rctf'].auth).toBe(
      'dynamicChallenge'
    )
  })

  test('renders a page that embeds the document', () => {
    const html = renderApiDocs(document)
    const match = html.match(
      /<script id="spec" type="application\/json">(.*)<\/script>/
    )
    expect(match?.[1]).toBeTruthy()
    const parsed = JSON.parse(match?.[1] ?? '')
    expect(parsed.openapi).toBe('3.0.3')
    expect(html).toContain('download-openapi')
    expect(
      parsed.paths['/v2/admin/submissions'].get['x-rctf'].permissions
    ).toEqual(['challsRead', 'usersWrite'])
  })
})
