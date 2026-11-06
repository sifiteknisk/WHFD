<script lang="ts">
  import {
    BadAlreadySolvedChallenge,
    BadInstancerError,
    CreateAdminInstanceRouteV2,
    CreateInstanceRouteV2,
    DeleteAdminInstanceRouteV2,
    DeleteInstanceRouteV2,
    ExtendAdminInstanceRouteV2,
    ExtendInstanceRouteV2,
    GoodFlag,
    GoodInstancerActionResult,
    GoodInstanceStatus,
    InstanceStatus,
    ProtectedAction,
    RunAdminInstanceActionRouteV2,
    RunInstanceActionRouteV2,
    SubmitFlagRoute,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { IconArrowSquareOut, IconCopy, IconSignIn } from '$lib/icons'
  import { isAlreadyStartingError } from '$lib/instancer/pending-start-rules'
  import {
    isStartPending,
    markStarting,
    pendingStarts,
    trackStart,
    untrackStart,
    type PendingStart,
  } from '$lib/instancer/pending-starts.svelte'
  import { useChallengeInstance } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Progress from '$lib/ui/progress.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { CaptchaError } from '$lib/utils/captcha'
  import { copyText } from '$lib/utils/clipboard'
  import { formatEndpoint } from '$lib/utils/instancer'
  import { formatCountdown } from '$lib/utils/time'

  interface Props {
    challengeId: string
    /** Used in the "instance is ready" toast shown after leaving the page. */
    challengeName?: string
    instancerLifetime: number
    instancerExtendable: boolean
    instancerStoppable: boolean
    instancerActions: { id: string; label: string }[]
    /** `points` is what the solve earned, or `null` if it was already solved. */
    onSolve: (challengeId: string, points: number | null) => void
    admin?: boolean
  }

  let {
    challengeId,
    challengeName = 'this challenge',
    instancerLifetime,
    instancerExtendable,
    instancerStoppable,
    instancerActions,
    onSolve,
    admin = false,
  }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)

  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)
  const userId = $derived(userQuery.data?.id)

  const queryClient = useQueryClient()
  const instanceEnabled = $derived(isAuthenticated && !isArchived)
  const instanceQuery = useChallengeInstance(
    () => challengeId,
    () => instanceEnabled,
    () => admin
  )

  const instanceAction = createAsyncAction<string>()

  const status = $derived(instanceQuery.data?.status ?? InstanceStatus.STOPPED)
  const endpoints = $derived(instanceQuery.data?.endpoints ?? [])
  const formattedEndpoints = $derived(
    endpoints.map((endpoint, index) =>
      formatEndpoint(endpoint, index, endpoints.length)
    )
  )

  // A start that timed out or was queued: the instancer may still be building
  // it, so show that instead of offering Start again.
  const startPending = $derived(
    !admin && instanceAction.key !== 'start' && isStartPending(challengeId)
  )

  const transitioning = $derived(
    status === InstanceStatus.STARTING || status === InstanceStatus.STOPPING
  )

  type PanelView =
    | 'archived'
    | 'login'
    | 'loading'
    | 'error'
    | 'stopped'
    | 'queued'
    | 'running'

  const view = $derived.by((): PanelView => {
    if (isArchived) return 'archived'
    if (!isAuthenticated) return 'login'
    if (
      startPending &&
      (status === InstanceStatus.STOPPED || instanceQuery.isError)
    ) {
      return 'queued'
    }
    if (instanceQuery.isLoading) return 'loading'
    if (instanceQuery.isError) return 'error'
    if (status === InstanceStatus.STOPPED) {
      return 'stopped'
    }
    return 'running'
  })

  const actionsDisabled = $derived(
    instanceAction.pending || status === InstanceStatus.STOPPING
  )

  const instanceKey = $derived(
    admin
      ? queryKeys.adminChallengeInstance(challengeId)
      : queryKeys.challengeInstance(challengeId)
  )

  let timeLeft = $derived(instanceQuery.data?.timeLeftMilliseconds ?? null)
  $effect(() => {
    if (
      status !== InstanceStatus.RUNNING &&
      status !== InstanceStatus.STARTING
    ) {
      return
    }
    const tick = setInterval(() => {
      if (timeLeft !== null && timeLeft > 0) {
        timeLeft = Math.max(0, timeLeft - 1000)
      }
    }, 1000)
    return () => clearInterval(tick)
  })

  async function start() {
    // The user can switch challenges or navigate away while Start is pending.
    const id = challengeId
    const name = challengeName
    const key = instanceKey
    const isAdmin = admin
    const owner = userId
    let tracked: PendingStart | undefined
    const stillTracked = () =>
      tracked !== undefined &&
      pendingStarts.get(id)?.startedAt === tracked.startedAt &&
      userQuery.data?.id === owner

    await instanceAction.run(
      async () => {
        if (!isAdmin && owner) {
          tracked = trackStart({
            challengeId: id,
            challengeName: name,
            userId: owner,
          })
        }
        const res = isAdmin
          ? await apiRequest(CreateAdminInstanceRouteV2, { id })
          : await apiRequest(CreateInstanceRouteV2, { id })
        if (userQuery.data?.id !== owner) return
        if (!isAdmin && !stillTracked()) {
          void queryClient.invalidateQueries({ queryKey: key })
          return
        }
        if (res.kind === GoodInstanceStatus.kind) {
          queryClient.setQueryData(key, res.data)
          void queryClient.invalidateQueries({ queryKey: key })
          if (!isAdmin && res.data.status === InstanceStatus.STARTING) {
            markStarting(id)
          } else if (!isAdmin) {
            untrackStart(id)
          }
          toast.success('Instance started')
        } else if (
          !isAdmin &&
          res.kind === BadInstancerError.kind &&
          isAlreadyStartingError(res.data.message)
        ) {
          void queryClient.invalidateQueries({ queryKey: key })
        } else {
          if (!isAdmin) untrackStart(id)
          if (res.kind === BadInstancerError.kind) {
            toast.error(res.data.message)
          } else {
            showApiError(res)
          }
        }
      },
      {
        key: 'start',
        onError: error => {
          if (error instanceof CaptchaError) {
            // The request never went out, and the captcha already toasted.
            if (stillTracked()) untrackStart(id)
          } else if (isAdmin) {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Failed to start instance'
            )
          } else if (stillTracked()) {
            // A 504 or dropped connection can leave the build running.
            void queryClient.invalidateQueries({ queryKey: key })
            toast.info('Lots of teams are starting instances', {
              description:
                "Yours is still starting. We'll tell you when it's ready.",
            })
          }
        },
      }
    )
  }

  async function stop() {
    const id = challengeId
    const key = instanceKey
    const isAdmin = admin
    const owner = userId
    await instanceAction.run(
      async () => {
        const res = isAdmin
          ? await apiRequest(DeleteAdminInstanceRouteV2, { id })
          : await apiRequest(DeleteInstanceRouteV2, { id })
        if (userQuery.data?.id !== owner) return
        if (res.kind === GoodInstanceStatus.kind) {
          if (!isAdmin) untrackStart(id)
          queryClient.setQueryData(key, res.data)
          void queryClient.invalidateQueries({ queryKey: key })
          toast.success('Instance stopped')
        } else if (res.kind === BadInstancerError.kind) {
          toast.error(res.data.message)
        } else {
          showApiError(res)
        }
      },
      { key: 'stop', errorMessage: 'Failed to stop instance' }
    )
  }

  async function extend() {
    await instanceAction.run(
      async () => {
        const res = admin
          ? await apiRequest(ExtendAdminInstanceRouteV2, { id: challengeId })
          : await apiRequest(ExtendInstanceRouteV2, { id: challengeId })
        if (res.kind === GoodInstanceStatus.kind) {
          queryClient.setQueryData(instanceKey, res.data)
          void queryClient.invalidateQueries({ queryKey: instanceKey })
          toast.success('Instance extended')
        } else if (res.kind === BadInstancerError.kind) {
          toast.error(res.data.message)
        } else {
          showApiError(res)
        }
      },
      { key: 'extend', errorMessage: 'Failed to extend instance' }
    )
  }

  async function submitResolvedFlag(flag: string) {
    toast.info(flag, { duration: 15_000 })
    if (admin) {
      // NOTE: Admins only test the instancer, so the flag is shown but not submitted
      return
    }

    const res = await apiRequest(SubmitFlagRoute, { id: challengeId, flag })
    if (res.kind === GoodFlag.kind) {
      toast.success('Flag correct!')
      onSolve(challengeId, res.data.points)
    } else if (res.kind === BadAlreadySolvedChallenge.kind) {
      toast.info('Your team already solved this challenge')
      onSolve(challengeId, null)
    } else {
      showApiError(res)
    }
  }

  async function runAction(actionId: string) {
    await instanceAction.run(
      async () => {
        const res = await apiRequest(
          admin ? RunAdminInstanceActionRouteV2 : RunInstanceActionRouteV2,
          {
            id: challengeId,
            action: actionId,
          }
        )
        if (res.kind === GoodInstancerActionResult.kind) {
          if (res.data.message) {
            toast.success(res.data.message)
          }
          if (res.data.submitFlag) {
            await submitResolvedFlag(res.data.submitFlag)
          }
          void queryClient.invalidateQueries({ queryKey: instanceKey })
        } else if (res.kind === BadInstancerError.kind) {
          toast.error(res.data.message)
        } else {
          showApiError(res)
        }
      },
      { key: actionId, errorMessage: 'Failed to run instance action' }
    )
  }

  const hasActionRow = $derived(
    instancerActions.length > 0 || instancerExtendable || instancerStoppable
  )
</script>

<instancer-panel data-view={view}>
  {#if view === 'archived'}
    <instancer-message
      >Instancer is not available in archived mode.</instancer-message
    >
  {:else if view === 'login'}
    <instancer-empty>
      <instancer-message>Login to use the instancer.</instancer-message>
      <Button href="/login">
        <IconSignIn />
        Login
      </Button>
    </instancer-empty>
  {:else if view === 'loading'}
    <instancer-loading><Spinner /></instancer-loading>
  {:else if view === 'error'}
    <instancer-empty>
      <instancer-message data-tone="error">
        {instanceQuery.error?.message ?? 'Failed to load instance status.'}
      </instancer-message>
      <Button size="sm" onclick={() => instanceQuery.refetch()}>Retry</Button>
    </instancer-empty>
  {:else if view === 'stopped'}
    <instancer-empty>
      <instancer-message>No instance running.</instancer-message>
      <Button onclick={start} disabled={instanceAction.pending}>
        {#if instanceAction.key === 'start'}<Spinner />{/if}
        Start instance
      </Button>
      <CaptchaNotice
        config={clientConfig}
        action={ProtectedAction.InstancerStart}
      />
    </instancer-empty>
  {:else if view === 'queued'}
    <instancer-empty>
      <instancer-status><Spinner /><span>Starting…</span></instancer-status>
      <instancer-message>
        Lots of teams are starting instances. You can keep browsing; we'll tell
        you when it's ready.
      </instancer-message>
    </instancer-empty>
  {:else}
    <instancer-running>
      {#if status === InstanceStatus.STARTING}
        <instancer-status><Spinner /><span>Starting…</span></instancer-status>
      {:else if status === InstanceStatus.STOPPING}
        <instancer-status><Spinner /><span>Stopping…</span></instancer-status>
      {:else if status === InstanceStatus.ERRORED}
        <instancer-status data-tone="error"
          ><span>Errored</span></instancer-status
        >
      {/if}

      {#each formattedEndpoints as endpoint, index (index)}
        <instancer-endpoint data-dimmed={transitioning || undefined}>
          <endpoint-head>
            <span>{endpoint.label}</span>
            {#if endpoint.protocolTag}<span>{endpoint.protocolTag}</span>{/if}
          </endpoint-head>
          <endpoint-value>
            <code>{endpoint.value}</code>
            {#if !transitioning}
              <endpoint-actions>
                {#if endpoint.href}
                  <a
                    href={endpoint.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open {endpoint.label}"
                  >
                    <IconArrowSquareOut />
                  </a>
                {/if}
                <button
                  type="button"
                  aria-label="Copy {endpoint.label}"
                  onclick={() =>
                    copyText(
                      endpoint.copyValue,
                      'Copied to clipboard',
                      'Failed to copy'
                    )}
                >
                  <IconCopy />
                </button>
              </endpoint-actions>
            {/if}
          </endpoint-value>
        </instancer-endpoint>
      {/each}

      {#if timeLeft !== null}
        <instancer-countdown>
          <Progress value={timeLeft} max={instancerLifetime} />
          <span>{formatCountdown(timeLeft)} remaining</span>
        </instancer-countdown>
      {/if}

      {#if hasActionRow}
        <instancer-actions>
          {#each instancerActions as action (action.id)}
            <Button
              variant="secondary"
              onclick={() => runAction(action.id)}
              disabled={actionsDisabled}
            >
              {#if instanceAction.key === action.id}<Spinner />{/if}
              {action.label}
            </Button>
          {/each}
          {#if instancerExtendable}
            <Button
              variant="secondary"
              onclick={extend}
              disabled={actionsDisabled}
            >
              {#if instanceAction.key === 'extend'}<Spinner />{/if}
              Extend
            </Button>
          {/if}
          {#if instancerStoppable}
            <Button
              variant="destructive"
              onclick={stop}
              disabled={actionsDisabled}
            >
              {#if instanceAction.key === 'stop'}<Spinner />{/if}
              Stop
            </Button>
          {/if}
        </instancer-actions>
      {/if}

      <CaptchaNotice
        config={clientConfig}
        action={ProtectedAction.InstancerExtend}
      />
    </instancer-running>
  {/if}
</instancer-panel>

<style>
  instancer-panel {
    display: flex;
    flex-direction: column;
    block-size: 100%;
  }

  instancer-message {
    color: var(--foreground-l3);
    font-size: var(--step--1);
    text-align: center;
    text-wrap: balance;

    &[data-tone='error'] {
      color: var(--foreground-destructive);
    }
  }

  instancer-empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    :global(a[data-variant]),
    :global(button[data-variant]) {
      inline-size: 100%;
    }
  }

  instancer-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    color: var(--foreground-l4);
    font-size: 1.25rem;
  }

  instancer-running {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
  }

  instancer-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);

    &[data-tone='error'] {
      color: var(--foreground-destructive);
    }
  }

  instancer-endpoint {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);

    &[data-dimmed] {
      opacity: 0.5;

      endpoint-value code {
        color: var(--foreground-l4);
      }
    }
  }

  endpoint-head {
    display: flex;
    justify-content: space-between;
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  endpoint-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-s);
    background: var(--background-l4);
    border-radius: var(--radius-md);

    code {
      overflow: hidden;
      color: var(--foreground-accent);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    endpoint-actions {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: var(--space-3xs);
    }

    a,
    button {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--foreground-l4);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l2);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
      }

      :global(svg) {
        inline-size: 1rem;
        block-size: 1rem;
      }
    }
  }

  instancer-countdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    margin-block-start: auto;
    --progress-height: var(--space-3xs);

    span {
      color: var(--foreground-l3);
      font-size: var(--step--1);
      text-align: center;
    }
  }

  instancer-actions {
    display: flex;
    gap: var(--space-2xs);

    :global(button[data-variant]) {
      flex: 1;
    }
  }
</style>
