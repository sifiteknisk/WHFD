import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createAuthToken, userRequest } from './api-user.mjs'

const secret = Buffer.alloc(32, 7).toString('base64')

async function decode(token) {
  const bytes = Buffer.from(token, 'base64url')
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(secret, 'base64'),
    'AES-GCM',
    false,
    ['decrypt']
  )
  return JSON.parse(
    Buffer.from(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.subarray(0, 12) },
        key,
        bytes.subarray(12)
      )
    ).toString()
  )
}

test('auth token matches the application format and uses a fresh IV', async () => {
  const first = await createAuthToken(secret, 'admin-id')
  const second = await createAuthToken(secret, 'admin-id')
  assert.notEqual(first, second)
  const payload = await decode(first)
  assert.equal(payload.k, 0)
  assert.equal(payload.d, 'admin-id')
  assert.ok(Math.abs(payload.t - Date.now() / 1000) < 2)
})

test('user API operations authenticate privately, send the right request and propagate failures', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'rctf-api-test-'))
  const originalPath = process.env.PATH
  const originalFetch = globalThis.fetch
  const originalLog = console.log
  const output = []
  try {
    writeFileSync(
      join(directory, 'rctf'),
      `#!/bin/sh\nprintf '%s\\n' '${secret}'\n`,
      { mode: 0o755 }
    )
    process.env.PATH = `${directory}:${originalPath}`
    console.log = (...args) => output.push(args.join(' '))
    for (const [action, method] of Object.entries({
      user: 'GET',
      ban: 'PUT',
      unban: 'PUT',
      deleteuser: 'DELETE',
    })) {
      globalThis.fetch = async (url, request) => {
        assert.equal(url, 'http://127.0.0.1/api/v2/admin/users/team%2Fid')
        assert.equal(request.method, method)
        const auth = await decode(request.headers.Authorization.slice(7))
        assert.equal(auth.d, 'admin-id')
        assert.equal(
          request.body,
          method === 'PUT'
            ? JSON.stringify({ data: { banned: action === 'ban' } })
            : undefined
        )
        return {
          ok: true,
          json: async () => ({
            data: {
              id: 'team/id',
              email: 'test@example.org',
              privateField: 'excluded',
            },
          }),
        }
      }
      await userRequest('admin-id', 'team/id', action)
    }
    assert.ok(
      output.every(line => !line.includes(secret) && !line.includes('excluded'))
    )
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        kind: 'badUserPrivileged',
        message: 'Protected admin',
      }),
    })
    await assert.rejects(
      userRequest('admin-id', 'team/id', 'deleteuser'),
      /403: badUserPrivileged/
    )
    await assert.rejects(
      userRequest('admin-id', 'team/id', 'invalid'),
      /Invalid user operation/
    )
  } finally {
    process.env.PATH = originalPath
    globalThis.fetch = originalFetch
    console.log = originalLog
    rmSync(directory, { recursive: true, force: true })
  }
})
