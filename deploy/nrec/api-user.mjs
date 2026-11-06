import { execFileSync } from 'node:child_process'

// Match apps/api/src/lib/tokens.ts; keep the token entirely inside the container.
export async function createAuthToken(secret, userId) {
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(secret, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const payload = JSON.stringify({
    k: 0,
    t: Math.floor(Date.now() / 1000),
    d: userId,
  })
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    Buffer.from(payload)
  )
  return Buffer.concat([iv, Buffer.from(ciphertext)]).toString('base64url')
}

export async function userRequest(actor, target, action) {
  const methods = {
    user: 'GET',
    ban: 'PUT',
    unban: 'PUT',
    deleteuser: 'DELETE',
  }
  if (!Object.hasOwn(methods, action) || !actor || !target)
    throw new Error('Invalid user operation')
  const secret = execFileSync('rctf', ['config', 'get', 'tokenKey'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
  const token = await createAuthToken(secret, actor)
  const response = await fetch(
    `http://127.0.0.1/api/v2/admin/users/${encodeURIComponent(target)}`,
    {
      method: methods[action],
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body:
        action === 'ban' || action === 'unban'
          ? JSON.stringify({ data: { banned: action === 'ban' } })
          : undefined,
      signal: AbortSignal.timeout(15000),
    }
  )
  const body = await response.json()
  if (!response.ok)
    throw new Error(
      `${response.status}: ${body.kind ?? 'API error'}: ${body.message ?? ''}`
    )
  if (action === 'user') {
    const { id, name, email, division, perms, banned, score } = body.data
    console.log(
      JSON.stringify(
        { id, name, email, division, perms, banned, score },
        null,
        2
      )
    )
  } else {
    console.log(`${action} succeeded for ${target}`)
  }
}

if (import.meta.main) {
  try {
    await userRequest(...process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
