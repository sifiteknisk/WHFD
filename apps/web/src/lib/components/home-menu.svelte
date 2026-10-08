<script lang="ts">
  import { goto } from '$app/navigation'
  import { useCurrentUser } from '$lib/query/user'

  type Props = {
    hotkeys?: boolean
  }

  let { hotkeys = true }: Props = $props()

  const userQuery = useCurrentUser()

  const items = $derived([
    { href: '/challenges', label: 'Challenges' },
    { href: '/scores', label: 'Scoreboard' },
    { href: '/info', label: 'Info & Rules' },
    userQuery.data
      ? { href: '/profile', label: 'Team' }
      : { href: '/login', label: 'Login' },
  ])

  const INTERACTIVE =
    'a, button, input, textarea, select, [contenteditable], [role="menu"]'

  let selected = $state(0)
  const links: HTMLAnchorElement[] = []

  function select(index: number) {
    selected = (index + items.length) % items.length
    links[selected]?.focus()
  }

  function open(index: number) {
    select(index)
    void goto(items[index]!.href)
  }

  function onKeydown(event: KeyboardEvent) {
    if (!hotkeys) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target as HTMLElement
    const inMenu = links.includes(target as HTMLAnchorElement)
    if (!inMenu && target.closest(INTERACTIVE)) return

    const key = event.key.toLowerCase()
    const hotkey = items.findIndex((_, index) => String(index + 1) === key)

    if (key === 'arrowdown' || key === 'arrowright') select(selected + 1)
    else if (key === 'arrowup' || key === 'arrowleft') select(selected - 1)
    else if (key === 'home') select(0)
    else if (key === 'end') select(items.length - 1)
    else if (key === 'enter' && !inMenu) open(selected)
    else if (hotkey !== -1) open(hotkey)
    else return

    event.preventDefault()
  }
</script>

<svelte:window onkeydown={onKeydown} />

<nav aria-label="Main menu">
  {#each items as item, index (item.href)}
    <a
      bind:this={links[index]}
      href={item.href}
      tabindex={index === selected ? 0 : -1}
      aria-keyshortcuts={String(index + 1)}
      data-selected={index === selected ? '' : undefined}
      onfocus={() => (selected = index)}
      onpointerenter={() => (selected = index)}
    >
      <menu-label>{item.label}</menu-label>
      <menu-index aria-hidden="true">{index + 1}</menu-index>
    </a>
  {/each}
</nav>

<style>
  nav {
    --row: 2.75rem;
    --gap: 0.5rem;

    display: flex;
    flex-direction: column;
    gap: var(--gap);
  }

  a {
    display: flex;
    align-items: center;
    gap: var(--tui-space-3);
    block-size: var(--row);
    padding-inline: var(--tui-space-4);
    font-size: var(--step-1);
    color: var(--tui-text);
    text-decoration: none;
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);

    &[data-selected] {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }

    &:active {
      border-color: var(--bevel-recessed);
      box-shadow: none;
      translate: var(--tui-shadow-offset) var(--tui-shadow-offset);
    }

    &:focus-visible {
      outline: 2px dotted var(--tui-focus);
      outline-offset: 2px;
    }
  }

  menu-label {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  menu-index {
    font-size: var(--step--1);
    opacity: 0.6;
  }
</style>
