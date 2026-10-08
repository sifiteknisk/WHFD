<script lang="ts">
  import {
    GiveAdminBongRouteV2,
    GoodAdminBongGiven,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { useAdminBongs } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import type { SortState } from '../admin-table-logic'
  import { createConfirmState } from '../confirm-state.svelte'
  import ConfirmDialog from '../profile/confirm-dialog.svelte'
  import {
    bongFingerprint,
    filterBongTeams,
    INITIAL_SORT,
    sortBongTeams,
    type BongSortBy,
    type BongTeam,
  } from './bongs-model'
  import BongsTable from './bongs-table.svelte'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const currentUserQuery = useCurrentUser()

  const clientConfig = $derived(configQuery.data)
  const canWrite = $derived(
    hasPermissions(currentUserQuery.data, Permissions.usersWrite)
  )
  const bongsQuery = useAdminBongs(() => canWrite)

  let sort = $state<SortState<BongSortBy>>(INITIAL_SORT)
  let search = $state('')

  const revealAfterLoading = bongsQuery.isPending
  const teams = $derived(bongsQuery.data ?? [])
  const rows = $derived(sortBongTeams(filterBongTeams(teams, search), sort))
  const fingerprint = $derived(bongFingerprint(search, sort))
  const showError = $derived(!!bongsQuery.error && !bongsQuery.data)
  const showLoading = $derived(
    !clientConfig || (canWrite && bongsQuery.isPending && !bongsQuery.data)
  )

  const giveAction = createAsyncAction<string>()
  const confirmState = createConfirmState()

  async function give(team: BongTeam) {
    await giveAction.run(
      async () => {
        const response = await apiRequest(GiveAdminBongRouteV2, { id: team.id })
        if (response.kind === GoodAdminBongGiven.kind) {
          toast.success(`Gave a bong to ${team.name}.`)
          queryClient.setQueryData(
            queryKeys.adminBongs,
            (current: BongTeam[] | undefined) =>
              current?.map(row =>
                row.id === team.id
                  ? { ...row, bongsAvailable: response.data.bongsAvailable }
                  : row
              )
          )
          queryClient.invalidateQueries({ queryKey: queryKeys.adminBongs })
        } else {
          showApiError(response)
        }
      },
      {
        key: team.id,
        errorMessage: `Failed to give a bong to ${team.name}`,
      }
    )
  }

  function requestGive(team: BongTeam) {
    confirmState.request({
      title: 'Give bong',
      message: `Mark one bong as handed out to ${team.name}? This lowers their available bongs by 1.`,
      confirmLabel: 'Give bong',
      destructive: false,
      run: () => give(team),
    })
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Bongs | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<bongs-page>
  {#if !canWrite}
    <bongs-status>
      <Card title="Bongs unavailable">
        <p>
          Your account needs the manage-teams permission to view and give bongs.
        </p>
      </Card>
    </bongs-status>
  {:else if showLoading}
    <bongs-status>
      <Spinner />
    </bongs-status>
  {:else if showError}
    <bongs-status>
      <Card title="Failed to load bongs">
        <p>{bongsQuery.error?.message ?? 'Something went wrong.'}</p>
      </Card>
    </bongs-status>
  {:else}
    <bongs-reveal data-reveal={revealAfterLoading || undefined}>
      <BongsTable
        {rows}
        bind:sort
        bind:search
        fetching={bongsQuery.isFetching}
        {fingerprint}
        givingId={giveAction.key}
        onGive={requestGive}
      />
    </bongs-reveal>
  {/if}
</bongs-page>

<ConfirmDialog
  open={confirmState.current !== null}
  onOpenChange={(open: boolean) => {
    if (!open) confirmState.cancel()
  }}
  title={confirmState.current?.title ?? ''}
  message={confirmState.current?.message ?? ''}
  confirmLabel={confirmState.current?.confirmLabel ?? 'Confirm'}
  destructive={confirmState.current?.destructive ?? false}
  onConfirm={confirmState.confirm}
/>

<style>
  bongs-reveal {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  bongs-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-block-size: 0;
    padding: var(--space-2xs);
    overflow: hidden;
  }

  bongs-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    p {
      color: var(--tui-muted);
    }
  }
</style>
