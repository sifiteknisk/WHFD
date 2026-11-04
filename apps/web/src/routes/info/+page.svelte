<script lang="ts">
  import Markdown from '$lib/components/markdown.svelte'
  import { IconArrowSquareOut } from '$lib/icons'
  import Card from '$lib/ui/card.svelte'

  const info = `
WHFD is a jeopardy-style CTF. Solve challenges across categories, submit flags and climb the scoreboard.

If you want to be on the leaderboard you need to be in the competitive group, go into the [profile settings](https://whfd.sifi.no/profile) and select "divisions" and join the competitive group.

Questions or problems? Ask in our [Discord](https://discord.gg/ZnsrgrtqDG) or ask the organizers in person (we don't bite like the SIFI-cat does).
`

  const rules = `
1. Flags have the format \`WHFD{...}\` unless the challenge says otherwise.
2. Do not attack the CTF infrastructure. Only attack the challenge targets you are given.
3. Do not share flags, solutions or hints with other teams while the CTF is running.
4. One account per team. Do not register multiple accounts to gain an advantage.
5. Denial of service against challenges or other players is forbidden. (I would cry)
6. If you find an unintended bug in a challenge please reach out and we will try fo fix!
7. Try to use as little AI as possible, the organizers will try to help you as much as possible! (use humans not AI)
`

  const tools = [
    {
      name: 'Ghidra',
      href: 'https://ghidra-sre.org/',
      description: 'Decompile binaries.',
    },
    {
      name: 'DogBolt',
      href: 'https://dogbolt.org/',
      description: 'Online decompilers.',
    },
    {
      name: 'pwntools',
      href: 'https://docs.pwntools.com/',
      description: 'Write Python exploits.',
    },
    {
      name: 'CyberChef',
      href: 'https://gchq.github.io/CyberChef/',
      description: 'Decode and encode data.',
    },
    {
      name: 'binwalk',
      href: 'https://github.com/ReFirmLabs/binwalk',
      description: 'Extract embedded files.',
    },
    {
      name: 'xjwt',
      href: 'https://xjwt.io/',
      description: 'Decode and test JWTs.',
    },
    {
      name: 'curl',
      href: 'https://curl.se/',
      description: 'Send terminal requests.',
    },
  ]
</script>

<info-page>
  <info-sidebar>
    <Card title="Info">
      <Markdown content={info} />
    </Card>

    <Card title="Tools">
      <ul class="tools-list">
        {#each tools as tool (tool.name)}
          <li>
            <a href={tool.href} target="_blank" rel="noopener noreferrer">
              <span class="tool-details">
                <strong>{tool.name}</strong>
                <span class="tool-description">{tool.description}</span>
              </span>
              <IconArrowSquareOut aria-hidden="true" />
            </a>
          </li>
        {/each}
      </ul>
    </Card>
  </info-sidebar>

  <info-rules>
    <Card title="Rules">
      <Markdown content={rules} />
    </Card>
  </info-rules>
</info-page>

<style>
  info-page {
    display: grid;
    align-content: start;
    gap: calc(var(--space-s) + var(--tui-shadow-offset));
    inline-size: 100%;
    max-inline-size: calc(var(--measure) + 2rem);
    margin-inline: auto;
    padding: var(--space-s) var(--space-xs);

    @media (width >= 64rem) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
      max-inline-size: 84rem;
    }

    :global(ui-card) {
      min-inline-size: 0;
      padding: var(--space-s);
      box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
        var(--tui-shadow);
    }

    :global(card-header) {
      display: contents;
    }

    :global(card-title) {
      inset-inline-start: var(--space-s);
      translate: 0 -55%;
    }

    :global(prose-content) {
      font-size: var(--step--1);
      line-height: 1.45;
    }
  }

  info-sidebar {
    display: grid;
    gap: calc(var(--space-s) + var(--tui-shadow-offset));
    min-inline-size: 0;

    > :global(ui-card:first-child) {
      padding-block: calc(var(--space-s) + var(--space-3xs));

      :global(prose-content) {
        line-height: 1.55;
      }
    }
  }

  .tools-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3xs);

    li:last-child {
      grid-column: 1 / -1;

      .tool-details {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--space-2xs);
      }
    }

    a {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: var(--space-2xs);
      block-size: 100%;
      padding: var(--space-3xs) var(--space-2xs);
      color: var(--tui-link);
      background: var(--tui-surface-light);
      border: 1px solid var(--tui-border-mid);
      text-decoration: none;

      &:hover {
        border-color: var(--tui-link);

        strong {
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }
      }

      &:focus-visible {
        outline: 2px dotted var(--tui-focus);
        outline-offset: -2px;
      }

      :global(svg) {
        flex-shrink: 0;
        margin-block-start: 0.25em;
      }
    }
  }

  .tool-details {
    display: grid;
    flex: 1;
    min-inline-size: 0;
    font-size: var(--step--1);
  }

  .tool-description {
    font-size: var(--step--1);
    color: var(--tui-muted);
  }

  info-rules {
    display: block;
    min-inline-size: 0;

    :global(ol) {
      padding: 0;
      list-style: none;
      counter-reset: rules;
    }

    :global(li) {
      position: relative;
      margin: 0;
      padding: var(--space-2xs) 0 var(--space-2xs) 3ch;
      counter-increment: rules;
    }

    :global(li + li) {
      border-block-start: 1px solid var(--tui-border-mid);
    }

    :global(li::before) {
      position: absolute;
      inset-inline-start: 0;
      color: var(--tui-title);
      font-weight: 700;
      content: counter(rules, decimal-leading-zero);
    }
  }

  @media (64rem <= width < 76rem) {
    info-page :global(ui-card) {
      padding: var(--space-xs);
    }

    info-sidebar :global(prose-content p:not(:last-child)) {
      margin-block-end: 0.75em;
    }

    info-sidebar > :global(ui-card:first-child) {
      padding-block: var(--space-s);
    }

    .tools-list a {
      padding-block: 0.125rem;
    }
  }

  :global(app-shell:has(countdown-hero)) info-page {
    position: relative;
    z-index: calc(var(--layer-nav) - 1);
  }
</style>
