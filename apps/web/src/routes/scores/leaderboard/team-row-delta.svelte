<script lang="ts">
  interface Props {
    delta: number | undefined | null
  }

  let { delta }: Props = $props()
</script>

{#if delta && delta > 0}
  <score-delta data-trend="positive">+{delta}</score-delta>
{:else if delta && delta < 0}
  <score-delta data-trend="negative">-{Math.abs(delta)}</score-delta>
{/if}

<style>
  score-delta {
    font-size: var(--step--1);
    font-weight: 700;
    font-variant-numeric: tabular-nums;

    &[data-trend='positive'] {
      color: var(--tui-success);
    }

    &[data-trend='negative'] {
      color: var(--tui-danger);
    }

    :global(row-team[data-hovered]) & {
      color: inherit;
    }
  }
</style>
