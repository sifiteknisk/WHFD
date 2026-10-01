<script lang="ts">
  import { page } from '$app/state'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import CountdownHero from '$lib/ui/countdown-hero.svelte'
  import {
    ADMIN_PANEL_PERMISSIONS,
    hasAnyPermission,
  } from '$lib/utils/permissions'
  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()

  const configQuery = useClientConfig()
  const userQuery = useCurrentUser()
  const startTime = $derived(configQuery.data?.startTime ?? 0)
  const isAdmin = $derived(
    hasAnyPermission(userQuery.data, ADMIN_PANEL_PERMISSIONS)
  )

  let now = $state(Date.now())

  $effect(() => {
    const start = startTime
    if (configQuery.data == null || Date.now() >= start) return
    const interval = setInterval(() => {
      now = Date.now()
      if (now >= start) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  })

  const showCountdown = $derived(
    (page.url.pathname === '/' ||
      page.url.pathname === '/challenges' ||
      page.url.pathname === '/scores') &&
      configQuery.data != null &&
      now < startTime &&
      !isAdmin
  )
</script>

{#if showCountdown}
  <CountdownHero />
{:else}
  {@render children()}
{/if}
