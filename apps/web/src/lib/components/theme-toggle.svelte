<script lang="ts">
  import { IconMoonStars, IconSun } from '$lib/icons'

  function toggle() {
    const root = document.documentElement
    const dark =
      root.dataset.theme === 'dark' ||
      (!root.dataset.theme &&
        matchMedia('(prefers-color-scheme: dark)').matches)
    const theme = dark ? 'light' : 'dark'
    root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }
</script>

<button type="button" onclick={toggle} aria-label="Toggle theme">
  <sun-icon data-theme-visible="dark"><IconSun /></sun-icon>
  <moon-icon data-theme-visible="light"><IconMoonStars /></moon-icon>
</button>

<style>
  button {
    display: inline-flex;
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

    &:active {
      border-color: var(--bevel-recessed);
      transform: translate(1px, 1px);
    }
  }
</style>
