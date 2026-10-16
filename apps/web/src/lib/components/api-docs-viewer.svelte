<script lang="ts">
  import Accordion from '$lib/ui/accordion.svelte'
  import {
    accessLine,
    authChipLabel,
    downloadOpenApiJson,
    isComplex,
    matchesFilter,
    operationsFromDocument,
    requiredSet,
    schemaBranches,
    schemaProperties,
    typeLabel,
    type ApiOperationItem,
    type JsonSchema,
    type OpenApiDocument,
    type RctfOperationMeta,
  } from './api-docs-model'

  type Props = {
    document: OpenApiDocument
  }

  type RouteGroup = {
    tag: string
    items: ApiOperationItem[]
  }

  let { document: spec }: Props = $props()

  const ops = $derived(operationsFromDocument(spec))
  let filter = $state('')
  let openTags = $state<string[]>([])

  const query = $derived(filter.trim().toLowerCase())
  const filtered = $derived(ops.filter(item => matchesFilter(item, query)))

  const groups = $derived.by((): RouteGroup[] => {
    const byTag: Record<string, ApiOperationItem[]> = {}
    const discoveryOrder: string[] = []
    for (const item of filtered) {
      const tag = item.op.tags[0] ?? 'api'
      if (!byTag[tag]) {
        byTag[tag] = []
        discoveryOrder.push(tag)
      }
      byTag[tag].push(item)
    }

    const ordered: RouteGroup[] = []
    const seen: Record<string, true> = {}
    for (const { name } of spec.tags) {
      const items = byTag[name]
      if (!items?.length) continue
      ordered.push({ tag: name, items })
      seen[name] = true
    }
    for (const tag of discoveryOrder) {
      if (seen[tag]) continue
      ordered.push({ tag, items: byTag[tag] })
    }
    return ordered
  })

  const groupByTag = $derived(
    Object.fromEntries(groups.map(g => [g.tag, g])) as Record<
      string,
      RouteGroup
    >
  )
  const allTags = $derived(groups.map(g => g.tag))
  const accordionValue = $derived(
    openTags.filter(tag => allTags.includes(tag))
  )
  const anyOpen = $derived(accordionValue.length > 0)

  const handleValueChange = (open: string[]) => {
    openTags = open
  }

  const toggleCollapseAll = () => {
    openTags = anyOpen ? [] : [...allTags]
  }

  const pathParts = (path: string): string[] => path.split('/')

  const bodyMedia = (
    body: NonNullable<ApiOperationItem['op']['requestBody']>
  ): string => Object.keys(body.content)[0] ?? 'application/json'

  const bodySchema = (
    body: NonNullable<ApiOperationItem['op']['requestBody']>
  ): JsonSchema | undefined => {
    const media = bodyMedia(body)
    return body.content[media]?.schema
  }

  const responseEntries = (
    responses: ApiOperationItem['op']['responses']
  ): [string, (typeof responses)[string]][] => Object.entries(responses)

  const metaChips = (meta: RctfOperationMeta): string[] => {
    const chips: string[] = []
    if (!meta.permissions.length && meta.auth === 'required') {
      chips.push('any signed-in user')
    }
    for (const name of meta.permissions) chips.push(name)
    if (meta.permissions.length > 1) chips.push('all permissions required')
    if (meta.captchaAction) chips.push(`captcha ${meta.captchaAction}`)
    if (meta.onlyWhenStarted) {
      const bypass = meta.startBypassPermissions.length
        ? ` (bypass ${meta.startBypassPermissions.join(' + ')})`
        : ''
      chips.push(`after CTF start${bypass}`)
    }
    if (meta.onlyWhenNotFinished) chips.push('before CTF end')
    if (meta.rejectBanned) chips.push('rejects banned users')
    if (meta.bodyFormat === 'form-data') chips.push('multipart form')
    if (meta.returnBodyAsIs) chips.push('unwrapped data body')
    return chips
  }

  const noteLines = (description: string): string[] =>
    description.split('\n').map(line => line.replace(/\*\*/g, ''))
</script>

{#snippet schemaNode(schema: JsonSchema | undefined)}
  <div class="schema">
    {#if !schema || typeof schema !== 'object'}
      any
    {:else if schema.oneOf || schema.anyOf}
      {#each schemaBranches(schema) as branch, i (i)}
        {@render schemaNode(branch)}
      {/each}
    {:else if schema.type === 'array'}
      <div class="type">array of</div>
      {@render schemaNode((schema.items as JsonSchema) ?? {})}
    {:else if schema.type === 'object' && schema.properties}
      {@const required = requiredSet(schema)}
      <table>
        <tbody>
          {#each schemaProperties(schema) as [name, prop] (name)}
            <tr>
              <td class="prop">
                {name}{#if required.has(name)}<span class="req">
                    required</span
                  >{/if}
              </td>
              <td class="type">{typeLabel(prop)}</td>
              <td>{prop.description ?? ''}</td>
            </tr>
            {#if isComplex(prop) && prop.type !== 'array'}
              <tr>
                <td colspan="3">{@render schemaNode(prop)}</td>
              </tr>
            {/if}
            {#if prop.type === 'array' && isComplex(prop.items as JsonSchema)}
              <tr>
                <td colspan="3"
                  >{@render schemaNode(prop.items as JsonSchema)}</td
                >
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="type">{typeLabel(schema)}</div>
      {#if schema.description}
        <p>{schema.description}</p>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet pathLabel(path: string)}
  <span class="path">
    {#each pathParts(path) as part, index (index)}
      {#if index > 0}<wbr />/{/if}{part}
    {/each}
  </span>
{/snippet}

{#snippet routeBody(item: ApiOperationItem)}
  {@const op = item.op}
  {@const meta = op['x-rctf']}
  <p class="summary">{op.summary}</p>
  <div class="chips">
    <span class="chip auth">{authChipLabel(meta.auth)}</span>
    {#each metaChips(meta) as chip, i (i)}
      <span class="chip">{chip}</span>
    {/each}
  </div>
  <div class="notes">
    {#each noteLines(op.description) as line, i (i)}
      <p>{line}</p>
    {/each}
  </div>

  <h3>Input</h3>
  {#if op.parameters?.length}
    <div class="panel">
      <table>
        <tbody>
          {#each op.parameters as param (param.name + param.in)}
            <tr>
              <td class="prop">{param.name}</td>
              <td class="type"
                >{param.in}{param.required ? ' required' : ' optional'}</td
              >
              <td class="type">{typeLabel(param.schema)}</td>
              <td>{param.description ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
  {#if op.requestBody}
    {@const body = op.requestBody}
    {@const media = bodyMedia(body)}
    {@const schema = bodySchema(body)}
    <div class="panel">
      <h4>{body.required ? 'Required' : 'Optional'} {media}</h4>
      {@render schemaNode(schema)}
    </div>
  {/if}
  {#if !op.parameters?.length && !op.requestBody}
    <p class="empty">No path, query, or body input.</p>
  {/if}

  <h3>Output</h3>
  {#each responseEntries(op.responses) as [status, response] (status)}
    <div class="panel">
      <h4>{status} {response['x-rctf-outcome']}</h4>
      {#each response.description.split('\n') as line, i (i)}
        <p>{line}</p>
      {/each}
      {#if response.content?.['application/json']?.schema}
        {@render schemaNode(response.content['application/json'].schema)}
      {/if}
    </div>
  {/each}
{/snippet}

<api-docs-viewer>
  <header>
    <div class="title-row">
      <h1>rCTF API</h1>
      <div class="meta">
        <span>{filtered.length}/{ops.length} routes</span>
        <button type="button" class="link" onclick={toggleCollapseAll}>
          {anyOpen ? 'collapse all' : 'expand all'}
        </button>
        <button
          type="button"
          class="link"
          onclick={() => downloadOpenApiJson(spec)}
        >
          openapi.json
        </button>
      </div>
    </div>
    <input
      type="search"
      placeholder="Filter path, permission, response"
      bind:value={filter}
      aria-label="Filter routes"
    />
  </header>

  <docs-scroll>
    {#if groups.length === 0}
      <p class="empty">No matching routes.</p>
    {:else}
      <Accordion
        items={allTags}
        value={accordionValue}
        onValueChange={handleValueChange}
      >
        {#snippet header({ value, props, expanded })}
          {@const entries = groupByTag[value]?.items ?? []}
          <docs-group-header>
            <button {...props}>
              <span data-slot="toggle">[{expanded ? '-' : '+'}]</span>
              <span data-slot="name">{value}</span>
              <span data-slot="rule"></span>
              <span data-slot="count">{entries.length}</span>
            </button>
          </docs-group-header>
        {/snippet}

        {#snippet content({ value, props })}
          {@const entries = groupByTag[value]?.items ?? []}
          <docs-group-body {...props}>
            {#each entries as item (item.id)}
              <details>
                <summary>
                  <span class={['method', item.method]}>{item.method}</span>
                  {@render pathLabel(`/api${item.path}`)}
                  <span class="access">{accessLine(item.op['x-rctf'])}</span>
                </summary>
                <div class="route-detail">
                  {@render routeBody(item)}
                </div>
              </details>
            {/each}
          </docs-group-body>
        {/snippet}
      </Accordion>
    {/if}
  </docs-scroll>
</api-docs-viewer>

<style>
  api-docs-viewer {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
    color: var(--tui-text);
    background: var(--tui-surface);
    font-family: var(--tui-font);
    font-size: var(--tui-font-size);
  }

  header {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-xs) var(--space-s);
    border-block-end: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    background: var(--tui-surface);
  }

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2xs) var(--space-s);
  }

  h1 {
    margin: 0;
    font-size: 1em;
    font-weight: 700;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    color: var(--tui-muted);
    font-size: 0.875em;
  }

  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--tui-link);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
  }

  input {
    inline-size: 100%;
    max-inline-size: 40rem;
    padding: var(--space-3xs) var(--space-2xs);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    background: var(--tui-surface-light);
    color: var(--tui-text);
    font: inherit;
  }

  input::placeholder {
    color: var(--tui-muted);
  }

  docs-scroll {
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    overscroll-behavior: none;
    margin: var(--space-2xs);
    padding: var(--space-2xs) var(--space-xs) var(--space-s);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    scrollbar-color: var(--tui-border-mid) var(--tui-surface);
  }

  docs-group-header {
    position: sticky;
    inset-block-start: 0;
    z-index: 2;
    display: block;
    background: var(--tui-surface-light);

    button {
      display: flex;
      align-items: center;
      gap: 1ch;
      inline-size: 100%;
      padding: var(--space-3xs) var(--space-2xs);
      color: var(--tui-text);
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);

        [data-slot] {
          color: inherit;
          border-color: currentColor;
        }
      }

      &:focus-visible {
        outline: 1px dotted var(--tui-selection-text);
        outline-offset: -2px;
      }
    }

    [data-slot='toggle'] {
      flex: 0 0 3ch;
      color: var(--tui-muted);
    }

    [data-slot='name'] {
      text-transform: uppercase;
    }

    [data-slot='rule'] {
      flex: 1;
      border-block-end: 1px dashed var(--tui-border-mid);
    }

    [data-slot='count'] {
      color: var(--tui-muted);
      font-weight: normal;
      font-variant-numeric: tabular-nums;
    }
  }

  docs-group-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-2xs) 0 var(--space-xs);
  }

  details {
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    background: var(--tui-surface);
  }

  summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2xs) 1ch;
    padding: var(--space-3xs) var(--space-2xs);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:hover,
    &:focus-visible {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }

    &:focus-visible {
      outline: 1px dotted var(--tui-selection-text);
      outline-offset: -2px;
    }
  }

  .path {
    overflow-wrap: anywhere;
  }

  .access {
    margin-inline-start: auto;
    color: var(--tui-muted);
    font-size: 0.875em;
  }

  summary:hover .access,
  summary:focus-visible .access {
    color: inherit;
  }

  .method {
    flex: 0 0 5ch;
    font-weight: 700;
    font-size: 0.875em;
  }

  .GET {
    color: light-dark(#176b22, #5cc969);
  }
  .POST {
    color: light-dark(#1f4f83, #9cc3ee);
  }
  .PUT {
    color: light-dark(#8a5a00, #e0b24a);
  }
  .PATCH {
    color: light-dark(#5b3d8a, #c4a8f0);
  }
  .DELETE {
    color: light-dark(#a40000, #ff7a70);
  }

  .route-detail {
    padding: var(--space-2xs) var(--space-xs) var(--space-xs);
    border-block-start: 1px solid var(--tui-border-mid);
  }

  .summary {
    margin: 0 0 var(--space-2xs);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3xs);
    margin-block-end: var(--space-2xs);
  }

  .chip {
    padding: 0 var(--space-2xs);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    background: var(--tui-surface-light);
    font-size: 0.875em;
  }

  .chip.auth {
    color: var(--tui-link);
    border-color: var(--tui-link);
  }

  .notes p {
    margin: 0 0 var(--space-3xs);
    color: var(--tui-muted);
  }

  h3 {
    margin: var(--space-xs) 0 var(--space-3xs);
    font-size: 1em;
    font-weight: 700;
  }

  h4 {
    margin: 0 0 var(--space-3xs);
    font-size: 0.875em;
    font-weight: 700;
  }

  .panel {
    margin-block-end: var(--space-2xs);
    padding: var(--space-2xs);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    background: var(--tui-surface-light);
  }

  table {
    inline-size: 100%;
    border-collapse: collapse;
  }

  td {
    padding: var(--space-3xs) var(--space-2xs);
    border-block-start: 1px solid var(--tui-border-mid);
    vertical-align: top;
  }

  tr:first-child td {
    border-block-start: 0;
  }

  .prop {
    white-space: nowrap;
  }

  .req {
    color: var(--tui-danger);
    font-size: 0.875em;
  }

  .type {
    color: var(--tui-muted);
    font-size: 0.875em;
  }

  .empty {
    color: var(--tui-muted);
    margin: var(--space-s);
  }
</style>
