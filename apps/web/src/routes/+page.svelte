<script lang="ts">
  import HomeHero from '$lib/components/home-hero.svelte'
  import Markdown from '$lib/components/markdown.svelte'
  import { IconDiscordLogo } from '$lib/icons'
  import Card from '$lib/ui/card.svelte'
  import type { PageProps } from './$types'

  const { data }: PageProps = $props()
</script>

<home-page>
  <HomeHero />

  {#if data.clientConfig.sponsors.length > 0}
    <Card title="Sponsors">
      <sponsor-grid>
        {#each data.clientConfig.sponsors as sponsor (sponsor.name)}
          {@const lightIcon = sponsor.iconLight || sponsor.icon}
          {@const darkIcon = sponsor.iconDark}
          <svelte:element
            this={sponsor.url ? 'a' : 'article'}
            href={sponsor.url}
            target={sponsor.url ? '_blank' : undefined}
            rel={sponsor.url ? 'noopener noreferrer' : undefined}
          >
            {#if lightIcon || darkIcon}
              <sponsor-icon
                data-theme-visible="light"
                data-invert={lightIcon ? undefined : ''}
              >
                <img
                  src={lightIcon || darkIcon}
                  alt={sponsor.name}
                  loading="lazy"
                />
              </sponsor-icon>
              <sponsor-icon
                data-theme-visible="dark"
                data-invert={darkIcon ? undefined : ''}
              >
                <img
                  src={darkIcon || lightIcon}
                  alt={sponsor.name}
                  loading="lazy"
                />
              </sponsor-icon>
            {/if}
            <h3>{sponsor.name}</h3>
            <Markdown content={sponsor.description} />
          </svelte:element>
        {/each}
      </sponsor-grid>
    </Card>
  {/if}

  <footer>
    <made-with>
      made with
      <a href="https://rctf.osec.io" target="_blank" rel="noopener noreferrer"
        >rCTF</a
      >
    </made-with>
    <a
      class="discord"
      href="https://discord.gg/ZnsrgrtqDG"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join our Discord"
    >
      <IconDiscordLogo />
    </a>
  </footer>
</home-page>

<style>
  home-page {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-xs) var(--space-m-l);
  }

  sponsor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    a,
    article {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-s);
      background: var(--tui-surface-light);
      border: var(--tui-border-width) solid;
      border-color: var(--bevel-recessed);
    }

    a {
      color: inherit;
      text-decoration: none;
    }

    a:hover {
      color: var(--tui-selection-text);
      background: var(--tui-selection-bg);
    }

    sponsor-icon[data-invert] img {
      filter: invert(1);
    }

    img {
      inline-size: 100%;
      block-size: auto;
      max-block-size: 8rem;
      object-fit: contain;
      padding: var(--space-2xs);
    }

    h3 {
      font-size: var(--step-1);
      font-weight: var(--font-weight-medium);
    }
  }

  .discord {
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    font-size: 2.25rem;
    color: var(--tui-text);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);

    &:hover,
    &:focus-visible {
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

  footer {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-s);

    @media (width >= 64rem) {
      position: absolute;
      inset-block-end: var(--space-s);
      inset-inline-end: var(--space-m-l);
    }
  }

  made-with {
    padding: var(--space-3xs) var(--space-xs);
    font-size: var(--step--1);
    color: var(--tui-muted);
    background: var(--tui-surface);
    border: var(--tui-border-width) solid;
    border-color: var(--bevel-raised);
    box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
      var(--tui-shadow);

    a {
      --underline: currentColor;
      color: var(--tui-text);
    }
  }
</style>
