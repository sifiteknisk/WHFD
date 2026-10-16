<script lang="ts">
  import ApiDocsViewer from '$lib/components/api-docs-viewer.svelte'
  import type { OpenApiDocument } from '$lib/components/api-docs-model'
  import { IconSignIn, IconWarningCircle } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import Button from '$lib/ui/button.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import StatusCard from '$lib/ui/status-card.svelte'
  import { onMount } from 'svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)

  type DocsState =
    | { kind: 'loading' }
    | { kind: 'ready'; document: OpenApiDocument }
    | { kind: 'unauthorized' }
    | { kind: 'forbidden' }
    | { kind: 'error'; message: string }

  let state = $state<DocsState>({ kind: 'loading' })

  onMount(() => {
    let cancelled = false

    async function load() {
      const token = localStorage.getItem('token')
      if (!token) {
        state = { kind: 'unauthorized' }
        return
      }

      const res = await fetch('/api/openapi.json', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (cancelled) return

      if (res.status === 401) {
        state = { kind: 'unauthorized' }
        return
      }
      if (res.status === 403) {
        state = { kind: 'forbidden' }
        return
      }
      if (!res.ok) {
        state = {
          kind: 'error',
          message: `Failed to load API docs (${res.status}).`,
        }
        return
      }

      const document = (await res.json()) as OpenApiDocument
      if (cancelled) return

      state = { kind: 'ready', document }
    }

    void load().catch(() => {
      if (!cancelled) {
        state = { kind: 'error', message: 'Failed to load API docs.' }
      }
    })

    return () => {
      cancelled = true
    }
  })
</script>

<svelte:head>
  {#if ctfName}
    <title>API docs | {ctfName}</title>
  {/if}
</svelte:head>

{#if state.kind === 'loading'}
  <api-docs-status>
    <Spinner />
  </api-docs-status>
{:else if state.kind === 'unauthorized'}
  <api-docs-status>
    <StatusCard
      icon={IconSignIn}
      title="Admin access required"
      subtitle="You need to be logged in with an administrator account to view this page."
    >
      <Button href="/login">Login</Button>
    </StatusCard>
  </api-docs-status>
{:else if state.kind === 'forbidden'}
  <api-docs-status>
    <StatusCard
      icon={IconWarningCircle}
      title="Access denied"
      subtitle="Your account does not have permission to view the admin panel."
    >
      <Button href="/">Home</Button>
    </StatusCard>
  </api-docs-status>
{:else if state.kind === 'error'}
  <api-docs-status>
    <StatusCard
      icon={IconWarningCircle}
      title="Unable to load API docs"
      subtitle={state.message}
    />
  </api-docs-status>
{:else}
  <ApiDocsViewer document={state.document} />
{/if}

<style>
  api-docs-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);
  }
</style>
