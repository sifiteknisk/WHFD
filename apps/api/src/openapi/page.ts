import type { OpenApiDocument } from './build'

const page = (payload: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>rCTF API</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f4f1ec;
    --panel: #fffdf9;
    --ink: #1c1917;
    --muted: #57534e;
    --line: #e7e5e4;
    --accent: #9f1239;
    --chip: #f5f5f4;
    --get: #047857;
    --post: #1d4ed8;
    --put: #b45309;
    --patch: #6d28d9;
    --delete: #be123c;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1c1917;
      --panel: #292524;
      --ink: #fafaf9;
      --muted: #a8a29e;
      --line: #44403c;
      --accent: #fb7185;
      --chip: #44403c;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    background: var(--bg);
    font: 14px/1.45 ui-sans-serif, system-ui, sans-serif;
  }
  .app { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh; }
  aside {
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: auto;
    border-right: 1px solid var(--line);
    background: var(--panel);
  }
  .side-head { padding: 16px; position: sticky; top: 0; background: var(--panel); border-bottom: 1px solid var(--line); }
  .side-head h1 { margin: 0 0 4px; font-size: 18px; }
  .side-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); font-size: 12px; margin-bottom: 10px; }
  .side-meta a { color: var(--accent); }
  input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    color: var(--ink);
  }
  nav { padding: 8px; }
  .group { margin: 12px 8px 4px; color: var(--muted); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
  a.route {
    display: block;
    padding: 8px 10px;
    margin-bottom: 2px;
    border-radius: 8px;
    color: inherit;
    text-decoration: none;
  }
  a.route:hover, a.route.selected { background: var(--chip); }
  a.route.selected { box-shadow: inset 2px 0 0 var(--accent); }
  .route-line { display: flex; gap: 8px; align-items: baseline; }
  .path { font-family: ui-monospace, monospace; font-size: 12px; overflow-wrap: anywhere; }
  .perm-line { margin-top: 2px; color: var(--muted); font-size: 12px; }
  .method { font-size: 11px; font-weight: 700; }
  .GET { color: var(--get); }
  .POST { color: var(--post); }
  .PUT { color: var(--put); }
  .PATCH { color: var(--patch); }
  .DELETE { color: var(--delete); }
  main { padding: 28px 32px 64px; max-width: 960px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .chip { padding: 3px 8px; border-radius: 999px; background: var(--chip); font-size: 12px; }
  .chip.auth { background: #ffe4e6; color: #9f1239; }
  @media (prefers-color-scheme: dark) {
    .chip.auth { background: #4c0519; color: #fecdd3; }
  }
  .notes p { margin: 0 0 6px; }
  h2 { margin: 28px 0 8px; font-size: 16px; }
  h3 { margin: 0 0 6px; font-size: 14px; }
  .card {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 10px;
    background: var(--panel);
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 8px; border-top: 1px solid var(--line); vertical-align: top; }
  tr:first-child td { border-top: 0; }
  .prop { font-family: ui-monospace, monospace; white-space: nowrap; }
  .req { color: var(--accent); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; }
  .type { color: var(--muted); font-family: ui-monospace, monospace; font-size: 12px; }
  .empty { color: var(--muted); }
  @media (max-width: 800px) {
    .app { display: block; }
    aside { position: static; height: auto; max-height: 42vh; }
    main { padding: 16px; }
  }
</style>
</head>
<body>
<div class="app">
  <aside>
    <div class="side-head">
      <h1>rCTF API</h1>
      <div class="side-meta">
        <span id="count"></span>
        <a href="#" id="download-openapi">openapi.json</a>
      </div>
      <input id="filter" placeholder="Filter path, permission, response" autofocus>
    </div>
    <nav id="nav"></nav>
  </aside>
  <main id="main"></main>
</div>
<script id="spec" type="application/json">${payload}</script>
<script>
const spec = JSON.parse(document.getElementById('spec').textContent)
const ops = []
Object.entries(spec.paths).forEach(function (entry) {
  const path = entry[0]
  Object.entries(entry[1]).forEach(function (methodEntry) {
    ops.push({ path: path, method: methodEntry[0].toUpperCase(), op: methodEntry[1] })
  })
})

const nav = document.getElementById('nav')
const main = document.getElementById('main')
const filter = document.getElementById('filter')
document.getElementById('count').textContent = ops.length + ' routes'
document.getElementById('download-openapi').addEventListener('click', function (event) {
  event.preventDefault()
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'openapi.json'
  link.click()
  URL.revokeObjectURL(url)
})

function el(tag, className) {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}
function addText(node, value) {
  node.appendChild(document.createTextNode(value == null ? '' : String(value)))
  return node
}
function appendPath(node, path) {
  path.split('/').forEach(function (part, index) {
    if (index > 0) {
      node.appendChild(document.createElement('wbr'))
      addText(node, '/')
    }
    addText(node, part)
  })
}
function idFor(op) {
  return op.method + ' ' + op.path
}
function currentId() {
  const raw = location.hash.slice(1)
  try { return decodeURIComponent(raw) } catch (err) { return raw }
}
function typeLabel(schema) {
  if (!schema || typeof schema !== 'object') return 'any'
  if (Array.isArray(schema.enum)) return schema.enum.map(String).join(' | ')
  if (schema.oneOf) return 'one of ' + schema.oneOf.length
  if (schema.anyOf) return 'any of ' + schema.anyOf.length
  const bits = []
  if (schema.type) bits.push(schema.type)
  if (schema.format) bits.push(schema.format)
  if (schema.nullable) bits.push('nullable')
  if (schema.minimum != null) bits.push('>= ' + schema.minimum)
  if (schema.maximum != null) bits.push('<= ' + schema.maximum)
  if (schema.minLength != null) bits.push('min ' + schema.minLength)
  if (schema.maxLength != null) bits.push('max ' + schema.maxLength)
  return bits.join(' · ') || 'any'
}
function isComplex(schema) {
  if (!schema || typeof schema !== 'object') return false
  if (schema.oneOf || schema.anyOf) return true
  if (schema.type === 'object' && schema.properties) return true
  if (schema.type === 'array' && schema.items && isComplex(schema.items)) return true
  return false
}
function schemaNode(schema) {
  const wrap = el('div', 'schema')
  if (!schema || typeof schema !== 'object') {
    addText(wrap, 'any')
    return wrap
  }
  const branches = schema.oneOf || schema.anyOf
  if (branches) {
    branches.forEach(function (branch) { wrap.appendChild(schemaNode(branch)) })
    return wrap
  }
  if (schema.type === 'array') {
    addText(elAppend(wrap, 'div', 'type'), 'array of')
    wrap.appendChild(schemaNode(schema.items || {}))
    return wrap
  }
  if (schema.type === 'object' && schema.properties) {
    const table = el('table')
    const required = new Set(schema.required || [])
    Object.entries(schema.properties).forEach(function (entry) {
      const name = entry[0]
      const prop = entry[1]
      const row = el('tr')
      const nameCell = el('td', 'prop')
      addText(nameCell, name)
      if (required.has(name)) addText(elAppend(nameCell, 'span', 'req'), ' required')
      const typeCell = addText(el('td', 'type'), typeLabel(prop))
      const descCell = el('td')
      if (prop.description) addText(descCell, prop.description)
      row.append(nameCell, typeCell, descCell)
      table.appendChild(row)
      if (isComplex(prop) && prop.type !== 'array') {
        const nest = el('tr')
        const cell = el('td')
        cell.colSpan = 3
        cell.appendChild(schemaNode(prop))
        nest.appendChild(cell)
        table.appendChild(nest)
      }
      if (prop.type === 'array' && isComplex(prop.items)) {
        const nest = el('tr')
        const cell = el('td')
        cell.colSpan = 3
        cell.appendChild(schemaNode(prop.items))
        nest.appendChild(cell)
        table.appendChild(nest)
      }
    })
    wrap.appendChild(table)
    return wrap
  }
  addText(elAppend(wrap, 'div', 'type'), typeLabel(schema))
  if (schema.description) addText(elAppend(wrap, 'p'), schema.description)
  return wrap
}
function elAppend(parent, tag, className) {
  const node = el(tag, className)
  parent.appendChild(node)
  return node
}
function accessLine(meta) {
  if (meta.auth === 'adminBot') return 'admin bot'
  if (meta.auth === 'dynamicChallenge') return 'webhook signature'
  if (meta.permissions.length) return meta.permissions.join(' + ')
  if (meta.auth === 'required') return 'signed in'
  if (meta.auth === 'optional') return 'public, token optional'
  return 'public'
}
function chips(meta) {
  const row = el('div', 'chips')
  const auth = {
    required: 'Bearer token',
    optional: 'Bearer token optional',
    none: 'No auth',
    adminBot: 'Admin-bot token',
    dynamicChallenge: 'Webhook signature'
  }[meta.auth]
  row.appendChild(addText(el('span', 'chip auth'), auth))
  meta.permissions.forEach(function (name) {
    row.appendChild(addText(el('span', 'chip'), name))
  })
  if (!meta.permissions.length && meta.auth === 'required') {
    row.appendChild(addText(el('span', 'chip'), 'any signed-in user'))
  }
  if (meta.permissions.length > 1) {
    row.appendChild(addText(el('span', 'chip'), 'all permissions required'))
  }
  if (meta.captchaAction) row.appendChild(addText(el('span', 'chip'), 'captcha ' + meta.captchaAction))
  if (meta.onlyWhenStarted) {
    const bypass = meta.startBypassPermissions.length ? ' (bypass ' + meta.startBypassPermissions.join(' + ') + ')' : ''
    row.appendChild(addText(el('span', 'chip'), 'after CTF start' + bypass))
  }
  if (meta.onlyWhenNotFinished) row.appendChild(addText(el('span', 'chip'), 'before CTF end'))
  if (meta.rejectBanned) row.appendChild(addText(el('span', 'chip'), 'rejects banned users'))
  if (meta.bodyFormat === 'form-data') row.appendChild(addText(el('span', 'chip'), 'multipart form'))
  if (meta.returnBodyAsIs) row.appendChild(addText(el('span', 'chip'), 'unwrapped data body'))
  return row
}
function renderList() {
  const query = filter.value.trim().toLowerCase()
  nav.textContent = ''
  let group = ''
  let shown = 0
  ops.forEach(function (item) {
    const meta = item.op['x-rctf']
    const haystack = [
      item.method,
      item.path,
      item.op.summary,
      accessLine(meta),
      (meta.permissions || []).join(' '),
      item.op.description
    ].join(' ').toLowerCase()
    if (query && haystack.indexOf(query) === -1) return
    shown += 1
    const tag = item.op.tags[0] || 'api'
    if (tag !== group) {
      group = tag
      nav.appendChild(addText(el('div', 'group'), tag))
    }
    const link = el('a', 'route' + (idFor(item) === currentId() ? ' selected' : ''))
    link.href = '#' + encodeURIComponent(idFor(item))
    const line = el('div', 'route-line')
    line.appendChild(addText(el('span', 'method ' + item.method), item.method))
    const path = el('span', 'path')
    appendPath(path, item.path)
    line.appendChild(path)
    link.appendChild(line)
    link.appendChild(addText(el('div', 'perm-line'), accessLine(meta)))
    nav.appendChild(link)
  })
  if (!shown) nav.appendChild(addText(el('p', 'empty'), 'No matching routes.'))
}
function renderMain() {
  const selected = ops.find(function (item) { return idFor(item) === currentId() })
  main.textContent = ''
  if (!selected) {
    main.appendChild(addText(el('p'), 'Pick a route. The list shows the permission needed to call it.'))
    return
  }
  const op = selected.op
  const meta = op['x-rctf']
  const title = el('div', 'route-line')
  title.appendChild(addText(el('span', 'method ' + selected.method), selected.method))
  const path = el('span', 'path')
  appendPath(path, '/api' + selected.path)
  title.appendChild(path)
  main.appendChild(title)
  main.appendChild(addText(el('p'), op.summary))
  main.appendChild(chips(meta))
  const notes = el('div', 'notes')
  op.description.split('\\n').forEach(function (line) {
    notes.appendChild(addText(el('p'), line.replace(/\\*\\*/g, '')))
  })
  main.appendChild(notes)

  main.appendChild(addText(el('h2'), 'Input'))
  if (op.parameters && op.parameters.length) {
    const card = el('div', 'card')
    const table = el('table')
    op.parameters.forEach(function (param) {
      const row = el('tr')
      row.appendChild(addText(el('td', 'prop'), param.name))
      row.appendChild(addText(el('td', 'type'), param.in + (param.required ? ' required' : ' optional')))
      row.appendChild(addText(el('td', 'type'), typeLabel(param.schema)))
      const desc = el('td')
      if (param.description) addText(desc, param.description)
      row.appendChild(desc)
      table.appendChild(row)
    })
    card.appendChild(table)
    main.appendChild(card)
  }
  const body = op.requestBody
  if (body) {
    const card = el('div', 'card')
    const media = Object.keys(body.content)[0]
    card.appendChild(addText(el('h3'), (body.required ? 'Required ' : 'Optional ') + media))
    card.appendChild(schemaNode(body.content[media].schema))
    main.appendChild(card)
  }
  if ((!op.parameters || !op.parameters.length) && !body) {
    main.appendChild(addText(el('p', 'empty'), 'No path, query, or body input.'))
  }

  main.appendChild(addText(el('h2'), 'Output'))
  Object.entries(op.responses).forEach(function (entry) {
    const card = el('div', 'card')
    const outcome = entry[1]['x-rctf-outcome']
    card.appendChild(addText(el('h3'), entry[0] + ' ' + outcome))
    entry[1].description.split('\\n').forEach(function (line) {
      card.appendChild(addText(el('p'), line))
    })
    const schema = entry[1].content && entry[1].content['application/json'] && entry[1].content['application/json'].schema
    if (schema) card.appendChild(schemaNode(schema))
    main.appendChild(card)
  })
}
function selectedStillVisible() {
  return !!nav.querySelector('a.route.selected')
}
filter.addEventListener('input', function () {
  renderList()
  if (!selectedStillVisible()) {
    const first = nav.querySelector('a.route')
    if (first) first.click()
  }
})
window.addEventListener('hashchange', function () {
  renderList()
  renderMain()
})
if (!location.hash && ops[0]) location.hash = encodeURIComponent(idFor(ops[0]))
renderList()
renderMain()
</script>
</body>
</html>`

export const renderApiDocs = (document: OpenApiDocument): string =>
  page(JSON.stringify(document).replaceAll('<', '\\u003c'))
