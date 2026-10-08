<script lang="ts">
  import {
    CreateExternalAuthClientRouteV2,
    DeleteExternalAuthClientRouteV2,
    GoodAdminExternalAuthClientCreate,
    GoodAdminExternalAuthClientDelete,
    isHttpUrl,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { IconCopy, IconTrash, IconX } from '$lib/icons'
  import { useAdminExternalAuthClients } from '$lib/query/admin'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { copyText } from '$lib/utils/clipboard'
  import { clampSelected } from './settings-model'

  type Client = {
    id: string
    name: string
    redirectUri: string
    createdAt: string
    createdBy: string | null
  }

  const queryClient = useQueryClient()
  const clientsQuery = useAdminExternalAuthClients()
  const clients = $derived(clientsQuery.data ?? [])

  const revealAfterLoading = clientsQuery.isPending

  let creating = $state(false)
  const createAction = createAsyncAction()
  const deleteAction = createAsyncAction()
  let name = $state('')
  let redirectUri = $state('')
  let secretReveal = $state<{ name: string; secret: string } | null>(null)
  let deleteTarget = $state<{ id: string; name: string } | null>(null)

  let selected = $state(0)
  const index = $derived(clampSelected(selected, clients.length))
  const selectedClient = $derived(clients[index])

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.adminExternalAuthClients,
    })

  function openCreate() {
    creating = true
    name = ''
    redirectUri = ''
  }

  function selectClient(i: number) {
    creating = false
    selected = i
  }

  async function submitCreate(event: SubmitEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedRedirect = redirectUri.trim()
    if (!trimmedName || !trimmedRedirect) {
      toast.error('Name and redirect URI are required.')
      return
    }
    if (!isHttpUrl(trimmedRedirect)) {
      toast.error('Redirect URI must be an absolute HTTP or HTTPS URL.')
      return
    }
    await createAction.run(
      async () => {
        const response = await apiRequest(CreateExternalAuthClientRouteV2, {
          name: trimmedName,
          redirectUri: trimmedRedirect,
        })
        if (response.kind === GoodAdminExternalAuthClientCreate.kind) {
          const { secret, ...client } = response.data
          queryClient.setQueryData(
            queryKeys.adminExternalAuthClients,
            (old: Client[] | undefined) => [...(old ?? []), client]
          )
          invalidate()
          creating = false
          selected = clients.length
          secretReveal = { name: client.name, secret }
        } else {
          showApiError(response)
        }
      },
      { errorMessage: 'Failed to register external app' }
    )
  }

  async function confirmDelete() {
    const target = deleteTarget
    if (!target) return
    await deleteAction.run(
      async () => {
        const response = await apiRequest(DeleteExternalAuthClientRouteV2, {
          id: target.id,
        })
        if (response.kind === GoodAdminExternalAuthClientDelete.kind) {
          toast.success('App deleted.')
          deleteTarget = null
          invalidate()
        } else {
          showApiError(response)
        }
      },
      { errorMessage: 'Failed to delete external app' }
    )
  }

  const dateFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
</script>

<settings-group>
  <group-header>
    <group-title>External apps</group-title>
  </group-header>
  <group-body>
    <group-note>
      The issued token grants full account access to the signing-in user. Only
      register services you trust.
    </group-note>
    <clients-editor data-reveal={revealAfterLoading || undefined}>
      <client-list>
        <client-items>
          {#if clients.length === 0}
            <client-empty>No external apps</client-empty>
          {:else}
            {#each clients as client, i (client.id)}
              <client-item
                data-active={!creating && index === i ? '' : undefined}
              >
                <button
                  type="button"
                  data-select
                  onclick={() => selectClient(i)}
                >
                  {client.name || 'Untitled app'}
                </button>
                <button
                  type="button"
                  data-remove
                  aria-label="Delete {client.name || 'app'}"
                  onclick={() =>
                    (deleteTarget = { id: client.id, name: client.name })}
                >
                  <IconX />
                </button>
              </client-item>
            {/each}
          {/if}
        </client-items>
        <client-footer>
          <Button size="sm" onclick={openCreate}>Register</Button>
        </client-footer>
      </client-list>
      <client-detail>
        {#if clientsQuery.isPending}
          <loading-row><Spinner /></loading-row>
        {:else if creating}
          <form onsubmit={submitCreate}>
            <Field label="App name">
              {#snippet children({ id, describedBy })}
                <Input
                  {id}
                  type="text"
                  aria-describedby={describedBy}
                  bind:value={name}
                  placeholder="My scoring backend"
                  maxlength={100}
                  required
                />
              {/snippet}
            </Field>
            <Field
              label="Redirect URI"
              description="Matched byte-for-byte at authorize and token time."
            >
              {#snippet children({ id, describedBy })}
                <Input
                  {id}
                  type="url"
                  aria-describedby={describedBy}
                  bind:value={redirectUri}
                  placeholder="https://example.com/callback"
                  maxlength={1024}
                  required
                />
              {/snippet}
            </Field>
            <form-actions>
              <Button
                type="button"
                variant="ghost"
                onclick={() => (creating = false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAction.pending}>
                {#if createAction.pending}<Spinner />{/if}
                Register
              </Button>
            </form-actions>
          </form>
        {:else if selectedClient}
          {@const client = selectedClient}
          <client-heading>
            <client-name>{client.name || 'Untitled app'}</client-name>
            <client-date
              >Registered {dateFormat.format(
                new Date(client.createdAt)
              )}</client-date
            >
          </client-heading>
          <Field label="Client ID">
            <button
              type="button"
              data-copy
              onclick={() => copyText(client.id, 'Client ID copied.')}
              title="Click to copy"
            >
              <code>{client.id}</code>
              <IconCopy />
            </button>
          </Field>
          <Field label="Redirect URI">
            <code data-readonly>{client.redirectUri}</code>
          </Field>
          <client-actions>
            <Button
              size="sm"
              variant="destructive"
              onclick={() =>
                (deleteTarget = { id: client.id, name: client.name })}
            >
              <IconTrash />
              Delete
            </Button>
          </client-actions>
        {:else}
          <client-placeholder>Register an app to get started</client-placeholder
          >
        {/if}
      </client-detail>
    </clients-editor>
  </group-body>
</settings-group>

<Dialog
  open={secretReveal !== null}
  onOpenChange={open => !open && (secretReveal = null)}
  title="App registered"
  description="Copy the secret now. It is shown only once and cannot be retrieved later. If you lose it, delete the app and register a new one."
>
  {#snippet children({ closeProps })}
    {#if secretReveal}
      <secret-row>
        <code>{secretReveal.secret}</code>
        <Button
          variant="outline"
          onclick={() => copyText(secretReveal!.secret, 'Secret copied.')}
        >
          <IconCopy />
          Copy
        </Button>
      </secret-row>
    {/if}
    <dialog-actions>
      <Button {...closeProps}>I have copied the secret</Button>
    </dialog-actions>
  {/snippet}
</Dialog>

<Dialog
  open={deleteTarget !== null}
  onOpenChange={open => !open && (deleteTarget = null)}
  title="Delete external app"
  description="Existing access tokens issued through this app stay valid (they are regular rCTF auth tokens) but no new sign-ins will succeed."
>
  <dialog-actions>
    <Button variant="ghost" onclick={() => (deleteTarget = null)}>Cancel</Button
    >
    <Button
      variant="destructive"
      onclick={confirmDelete}
      disabled={deleteAction.pending}
    >
      {#if deleteAction.pending}<Spinner />{/if}
      Delete app
    </Button>
  </dialog-actions>
</Dialog>

<style>
  settings-group {
    display: block;
    overflow: clip;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
  }

  group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-s);
    padding: 0.25rem 1rem;
    color: var(--tui-selection-text);
    background: var(--tui-selection-bg);
  }

  group-title {
    font-weight: 700;
  }

  group-body {
    display: flex;
    flex-direction: column;
  }

  group-note {
    display: block;
    padding: var(--space-2xs) 1rem;
    font-size: var(--step--1);
    color: var(--tui-muted);
    border-block-end: 1px solid var(--tui-border-mid);
  }

  clients-editor {
    display: flex;
    flex-direction: column;
    min-block-size: 12rem;

    @media (min-width: 40rem) {
      flex-direction: row;
    }
  }

  client-list {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    margin: var(--space-2xs);
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);

    @media (min-width: 40rem) {
      inline-size: 11rem;
      margin-inline-end: 0;
    }
  }

  client-items {
    display: flex;
    flex: 1;
    flex-direction: row;
    flex-wrap: wrap;
    padding-block: 0.125rem;
    overflow: hidden;

    @media (min-width: 40rem) {
      flex-direction: column;
      flex-wrap: nowrap;
    }
  }

  client-footer {
    display: flex;
    flex-shrink: 0;
    padding: var(--space-2xs);
    border-block-start: 1px solid var(--tui-border-mid);

    :global(button) {
      inline-size: 100%;
    }
  }

  client-item {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    max-inline-size: 100%;
    color: var(--tui-text);

    &:hover {
      background: var(--background-accent);
    }

    &[data-active] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }

    @media (min-width: 40rem) {
      inline-size: 100%;
    }

    button[data-select] {
      overflow: hidden;
      flex: 1;
      padding: 0.125rem 0.5rem;
      color: inherit;
      white-space: nowrap;
      text-align: start;
      text-overflow: ellipsis;
      background: none;
      border: none;
      cursor: pointer;

      &:focus-visible {
        outline: 1px dotted currentColor;
        outline-offset: -2px;
      }
    }

    button[data-remove] {
      display: flex;
      flex-shrink: 0;
      margin-inline-end: var(--space-3xs);
      padding: 0.125rem;
      color: inherit;
      background: none;
      border: none;
      cursor: pointer;
      opacity: 0;

      :global(svg) {
        inline-size: 0.75rem;
        block-size: 0.75rem;
      }

      &:hover {
        color: var(--tui-selection-text);
        background: var(--tui-danger);
      }

      &:focus-visible {
        opacity: 1;
        outline: 1px dotted currentColor;
        outline-offset: -2px;
      }
    }

    &:hover button[data-remove],
    &[data-active] button[data-remove] {
      opacity: 1;
    }
  }

  client-empty,
  client-placeholder {
    display: block;
    padding: 0.375rem var(--space-2xs);
    font-size: var(--step--1);
    color: var(--tui-muted);
  }

  client-placeholder {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 100%;
  }

  client-detail {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-inline-size: 0;
    flex: 1;
    padding: var(--space-s) 1rem;
  }

  form,
  form-actions,
  dialog-actions,
  client-actions {
    display: flex;
  }

  form {
    flex-direction: column;
    gap: var(--space-s);
  }

  form-actions,
  dialog-actions {
    justify-content: flex-end;
    gap: var(--space-2xs);
  }

  client-actions {
    justify-content: flex-end;
  }

  loading-row {
    display: flex;
    justify-content: center;
    padding: var(--space-m);
  }

  client-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
  }

  client-name {
    font-weight: 700;
    color: var(--tui-text);
  }

  client-date {
    padding: 0 0.5ch;
    font-size: var(--step--1);
    color: var(--tui-muted);
    background: var(--tui-surface-light);
    border: 1px solid var(--tui-border-mid);
  }

  button[data-copy] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    inline-size: 100%;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--tui-text);
    text-align: start;
    background: var(--tui-surface-light);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-recessed);
    cursor: pointer;

    code {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      color: var(--tui-muted);
    }

    &:hover {
      background: var(--background-accent);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }

  code {
    font-family: var(--font-mono);
    font-size: var(--step--1);

    &[data-readonly] {
      display: block;
      padding: var(--space-3xs) var(--space-2xs);
      word-break: break-all;
      background: var(--tui-surface-light);
      border: var(--tui-border-width) solid;
      border-color: var(--bevel-recessed);
    }
  }

  secret-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);

    code {
      overflow: hidden;
      flex: 1;
      padding: var(--space-2xs);
      white-space: nowrap;
      text-overflow: ellipsis;
      background: var(--tui-surface-light);
      border: var(--tui-border-width) solid;
      border-color: var(--bevel-recessed);
    }
  }
</style>
