<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { mergeProps } from '@zag-js/svelte'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import NavigationBongs from '$lib/components/navigation-bongs.svelte'
  import NavigationButton from '$lib/components/navigation-button.svelte'
  import NavigationCountdown from '$lib/components/navigation-countdown.svelte'
  import NavigationMobile from '$lib/components/navigation-mobile.svelte'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import {
    IconCopy,
    IconFlagBannerFold,
    IconGavel,
    IconGear,
    IconGlobeHemisphereWest,
    IconHouse,
    IconInfo,
    IconSignIn,
    IconSignOut,
    IconTableFilled,
    IconTicket,
    IconUserGear,
  } from '$lib/icons'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Avatar from '$lib/ui/avatar.svelte'
  import Menu from '$lib/ui/menu.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { copyLoginUrl, logout } from '$lib/utils/auth'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import {
    ADMIN_PANEL_PERMISSIONS,
    hasAnyPermission,
    hasPermissions,
  } from '$lib/utils/permissions'
  import { createRovingFocus } from '$lib/utils/roving'

  const rovingFocus = createRovingFocus()

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

  const logo = $derived(clientConfig?.logoDarkUrl || wordmarkDark)

  const divisionLabel = $derived(
    user?.division
      ? (clientConfig?.divisions[user.division] ?? user.division)
      : 'No Division'
  )

  const adminMenuItems = $derived(
    [
      {
        value: 'admin-challenges',
        label: 'Manage challenges',
        icon: IconFlagBannerFold,
        href: '/admin/challenges',
        show: canReadChallenges,
      },
      {
        value: 'admin-teams',
        label: 'Manage teams',
        icon: IconUserGear,
        href: '/admin/teams',
        show: canManageUsers,
      },
      {
        value: 'admin-submissions',
        label: 'Submissions',
        icon: IconTableFilled,
        href: '/admin/submissions',
        show: canReadChallenges && canManageUsers,
      },
      {
        value: 'admin-bongs',
        label: 'Bongs',
        icon: IconTicket,
        href: '/admin/bongs',
        show: canManageUsers,
      },
      {
        value: 'admin-settings',
        label: 'Settings',
        icon: IconGear,
        href: '/admin/settings',
        show: canManageSettings || canManageUsers,
      },
    ].filter(item => item.show)
  )

  const userMenuItems = $derived([
    {
      value: 'copy-login-url',
      label: 'Copy login URL',
      icon: IconCopy,
      onSelect: () => {
        if (user?.teamToken) copyLoginUrl(user.teamToken)
      },
    },
    {
      value: 'profile',
      label: 'Manage team',
      icon: IconUserGear,
      href: '/profile',
    },
    {
      value: 'logout',
      label: 'Log out',
      icon: IconSignOut,
      onSelect: () => logout(queryClient),
    },
  ])
</script>

<header>
  <nav-start>
    <a href="/" aria-label="Home">
      <img src={logo} alt={clientConfig?.ctfName} />
    </a>
    <nav aria-label="Main" {@attach rovingFocus}>
      <Tooltip label="Home">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            data-roving
            href="/"
            activePath="/"
            label="Home"
            icon={IconHouse}
          />
        {/snippet}
      </Tooltip>
      <Tooltip label="Challenges">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            data-roving
            href="/challenges"
            activePath="/challenges"
            label="Challenges"
            icon={IconFlagBannerFold}
          />
        {/snippet}
      </Tooltip>
      <Tooltip label="Scoreboard">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            data-roving
            href="/scores"
            activePath="/scores"
            label="Scoreboard"
            icon={IconGlobeHemisphereWest}
          />
        {/snippet}
      </Tooltip>
      <Tooltip label="Info">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            data-roving
            href="/info"
            activePath="/info"
            label="Info"
            icon={IconInfo}
          />
        {/snippet}
      </Tooltip>
      {#if isAdmin}
        <Tooltip label="Admin">
          {#snippet children({ props: tooltipProps })}
            <Menu label="Admin menu" items={adminMenuItems}>
              {#snippet trigger({ props: menuProps })}
                <NavigationButton
                  {...mergeProps(tooltipProps, menuProps)}
                  data-roving
                  activePath="/admin"
                  label="Admin menu"
                  icon={IconGavel}
                />
              {/snippet}
            </Menu>
          {/snippet}
        </Tooltip>
      {/if}
    </nav>
  </nav-start>

  <header-end>
    <NavigationBongs />
    <nav-end>
      <NavigationCountdown />
      {#if user && !isArchived}
        {@const currentUser = user}
        {#await import('$lib/components/navigation-team-stats.svelte') then { default: NavigationTeamStats }}
          <NavigationTeamStats />
        {/await}
        <Menu label="Account" items={userMenuItems} placement="bottom-end">
          {#snippet trigger({ props })}
            <button {...props}>
              <user-details>
                <user-name>{currentUser.name}</user-name>
                <user-meta>
                  {#if currentUser.countryCode}
                    <img
                      src="/flags/{countryCodeToFlagFilename(
                        currentUser.countryCode
                      )}"
                      alt="{currentUser.countryCode} flag"
                    />
                  {/if}
                  {#if currentUser.countryCode && currentUser.statusText}
                    <meta-separator>·</meta-separator>
                  {/if}
                  {#if currentUser.statusText}
                    <user-status>{currentUser.statusText}</user-status>
                  {:else if !currentUser.countryCode}
                    <user-status>{divisionLabel}</user-status>
                  {/if}
                </user-meta>
              </user-details>
              <Avatar src={currentUser.avatarUrl} name={currentUser.name} />
            </button>
          {/snippet}
        </Menu>
      {:else if !isArchived}
        <Tooltip label="Login">
          {#snippet children({ props })}
            <NavigationButton
              {...props}
              href="/login"
              label="Login"
              icon={IconSignIn}
            />
          {/snippet}
        </Tooltip>
      {/if}
      <ThemeToggle />
    </nav-end>

    <NavigationMobile />
  </header-end>
</header>

<style>
  header {
    --nav-control-height: 3rem;

    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: var(--layer-nav);
    display: flex;
    align-items: center;
    justify-content: space-between;
    block-size: var(--header-height);
    padding: 0.75rem var(--shell-gap);
    color: var(--tui-selection-text);
    background: transparent;
  }

  nav-start {
    display: flex;
    align-items: center;
    gap: var(--space-s);

    > a img {
      display: block;
      block-size: 2rem;
    }
  }

  header-end {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    min-inline-size: 0;
  }

  nav,
  nav-end {
    display: none;
    align-items: center;
    gap: var(--space-2xs);

    @media (width >= 48rem) {
      display: flex;
    }
  }

  [data-scope='menu'][data-part='trigger'] {
    --avatar-size: calc(
      var(--nav-control-height) - 2 * var(--tui-border-width)
    );

    display: flex;
    align-items: center;
    gap: 0.75rem;
    block-size: var(--nav-control-height);
    padding-inline-start: 0.5rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    cursor: pointer;

    &:hover {
      background: var(--tui-surface-light);
    }

    &[data-state='open'] {
      border-color: var(--bevel-recessed);
    }
  }

  user-details {
    display: flex;
    flex-direction: column;
    align-items: end;
  }

  user-name {
    display: block;
    max-inline-size: 16rem;
    overflow: hidden;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.25;
    color: var(--tui-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  user-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);

    img {
      block-size: 1.25rem;
      inline-size: auto;
      flex-shrink: 0;
    }
  }

  meta-separator {
    display: block;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--foreground-l3);
  }

  user-status {
    display: block;
    max-inline-size: 10rem;
    overflow: hidden;
    font-size: 0.875rem;
    color: var(--foreground-l3);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
