<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { mergeProps } from '@zag-js/svelte'
  import { afterNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import {
    IconCopy,
    IconFlagBannerFold,
    IconGear,
    IconGlobeHemisphereWest,
    IconHouse,
    IconInfo,
    IconMenu2,
    IconSignIn,
    IconSignOut,
    IconTableFilled,
    IconTicket,
    IconUserGear,
    IconX,
  } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Dialog from '$lib/ui/dialog.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { copyLoginUrl, logout } from '$lib/utils/auth'
  import {
    ADMIN_PANEL_PERMISSIONS,
    hasAnyPermission,
    hasPermissions,
  } from '$lib/utils/permissions'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)

  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const canReadChallenges = $derived(
    hasPermissions(user, Permissions.challsRead)
  )
  const canManageUsers = $derived(hasPermissions(user, Permissions.usersWrite))
  const canManageSettings = $derived(
    hasPermissions(user, Permissions.settingsWrite)
  )
  const isAdmin = $derived(hasAnyPermission(user, ADMIN_PANEL_PERMISSIONS))

  const lightLogo = $derived(clientConfig?.logoLightUrl || wordmarkLight)
  const darkLogo = $derived(clientConfig?.logoDarkUrl || wordmarkDark)

  let open = $state(false)

  afterNavigate(() => {
    open = false
  })

  const navItems = $derived(
    [
      {
        href: '/',
        activePath: '/',
        label: 'Home',
        icon: IconHouse,
        show: true,
      },
      {
        href: '/challenges',
        activePath: '/challenges',
        label: 'Challenges',
        icon: IconFlagBannerFold,
        show: true,
      },
      {
        href: '/scores',
        activePath: '/scores',
        label: 'Scoreboard',
        icon: IconGlobeHemisphereWest,
        show: true,
      },
      {
        href: '/info',
        activePath: '/info',
        label: 'Info & Rules',
        icon: IconInfo,
        show: true,
      },
      {
        href: '/profile',
        activePath: '/profile',
        label: 'Manage team',
        icon: IconUserGear,
        show: !!user && !isArchived,
      },
      {
        href: '/admin/challenges',
        activePath: '/admin/challenges',
        label: 'Manage challenges',
        icon: IconFlagBannerFold,
        show: isAdmin && canReadChallenges,
      },
      {
        href: '/admin/teams',
        activePath: '/admin/teams',
        label: 'Manage teams',
        icon: IconUserGear,
        show: isAdmin && canManageUsers,
      },
      {
        href: '/admin/submissions',
        activePath: '/admin/submissions',
        label: 'Submissions',
        icon: IconTableFilled,
        show: isAdmin && canReadChallenges && canManageUsers,
      },
      {
        href: '/admin/bongs',
        activePath: '/admin/bongs',
        label: 'Bongs',
        icon: IconTicket,
        show: isAdmin && canManageUsers,
      },
      {
        href: '/admin/settings',
        activePath: '/admin/settings',
        label: 'Settings',
        icon: IconGear,
        show: isAdmin && (canManageSettings || canManageUsers),
      },
    ].filter(item => item.show)
  )

  const isActive = (activePath: string) =>
    activePath === '/'
      ? page.url.pathname === '/'
      : page.url.pathname.startsWith(activePath)
</script>

<mobile-nav>
  <Dialog bind:open title="Navigation" titleHidden presentation="sheet">
    {#snippet trigger({ props })}
      <button {...props} aria-label="Open navigation">
        <IconMenu2 />
      </button>
    {/snippet}
    {#snippet children({ closeProps })}
      <sheet-header>
        <a href="/" aria-label="Home">
          <logo-light data-theme-visible="light"
            ><img src={lightLogo} alt={clientConfig?.ctfName} /></logo-light
          >
          <logo-dark data-theme-visible="dark"
            ><img src={darkLogo} alt={clientConfig?.ctfName} /></logo-dark
          >
        </a>
        <button {...closeProps} aria-label="Close navigation">
          <IconX />
        </button>
      </sheet-header>
      <nav aria-label="Main">
        {#each navItems as item (item.href)}
          {@const Icon = item.icon}
          <a
            href={item.href}
            data-active={isActive(item.activePath) ? '' : undefined}
          >
            <Icon />
            {item.label}
          </a>
        {/each}
      </nav>
      <sheet-footer>
        <ThemeToggle />
        {#if user && !isArchived}
          {@const currentUser = user}
          <footer-actions>
            <Tooltip label="Copy login URL">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, {
                    onclick: () => {
                      if (currentUser.teamToken)
                        copyLoginUrl(currentUser.teamToken)
                    },
                  })}
                  aria-label="Copy login URL"
                >
                  <IconCopy />
                </button>
              {/snippet}
            </Tooltip>
            <Tooltip label="Log out">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, { onclick: () => logout(queryClient) })}
                  aria-label="Log out"
                >
                  <IconSignOut />
                </button>
              {/snippet}
            </Tooltip>
          </footer-actions>
        {:else if !isArchived}
          <a href="/login" aria-label="Login">
            <IconSignIn />
          </a>
        {/if}
      </sheet-footer>
    {/snippet}
  </Dialog>
</mobile-nav>

<style>
  mobile-nav {
    display: block;

    @media (width >= 48rem) {
      display: none;
    }
  }

  button,
  sheet-footer a {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: var(--nav-control-height, 3rem);
    padding-inline: 0.875rem;
    font-size: 1.5rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    cursor: pointer;

    &:hover {
      background: var(--tui-surface-light);
    }

    &:focus-visible {
      outline-offset: 0;
    }
  }

  sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);

    > a img {
      display: block;
      block-size: 2rem;
    }
  }

  nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-3xs);

    a {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      padding: var(--space-2xs) var(--space-xs);
      color: var(--tui-text);
      text-decoration: none;

      &:hover {
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);
      }

      &:focus-visible {
        outline-offset: 0;
      }

      &[data-active] {
        font-weight: 700;
        color: var(--tui-selection-text);
        background: var(--tui-selection-bg);
      }

      :global(svg) {
        flex-shrink: 0;
        font-size: 1.25rem;
      }
    }
  }

  sheet-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
  }

  footer-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }
</style>
