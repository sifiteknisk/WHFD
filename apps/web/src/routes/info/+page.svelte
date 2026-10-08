<script lang="ts">
  import Markdown from '$lib/components/markdown.svelte'
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

  const tools = `
TODO: add every tool that is needed.
`
</script>

<info-page>
  <info-stack>
    <Card title="Info">
      <Markdown content={info} />
    </Card>

    <Card title="Tools">
      <Markdown content={tools} />
    </Card>
  </info-stack>

  <Card title="Rules">
    <Markdown content={rules} />
  </Card>
</info-page>

<style>
  info-page {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space-m) + var(--tui-shadow-offset));
    inline-size: 100%;
    max-inline-size: calc(var(--measure) + 2rem);
    margin-inline: auto;
    padding: var(--space-m) 1rem;

    @media (width >= 48rem) {
      max-inline-size: calc(var(--measure) + 4.5rem);
      padding-inline: 2.25rem;
    }

    @media (width >= 64rem) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: start;
      max-inline-size: calc(var(--measure) * 2 + 4.5rem);
    }

    :global(ui-card) {
      box-shadow: var(--tui-shadow-offset) var(--tui-shadow-offset) 0
        var(--tui-shadow);
    }
  }

  info-stack {
    display: flex;
    flex-direction: column;
    gap: calc(var(--space-m) + var(--tui-shadow-offset));
    min-inline-size: 0;
  }

  :global(app-shell:has(countdown-hero)) info-page {
    position: relative;
    z-index: calc(var(--layer-nav) - 1);
  }
</style>
