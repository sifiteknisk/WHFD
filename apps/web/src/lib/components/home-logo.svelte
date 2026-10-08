<script lang="ts">
  const art = [
    '██╗    ██╗██╗  ██╗███████╗██████╗ ',
    '██║    ██║██║  ██║██╔════╝██╔══██╗',
    '██║ █╗ ██║███████║█████╗  ██║  ██║',
    '██║███╗██║██╔══██║██╔══╝  ██║  ██║',
    '╚███╔███╔╝██║  ██║██║     ██████╔╝',
    ' ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝     ╚═════╝ ',
  ]

  const CELL_H = 2

  const strokes: Record<string, ('l' | 'r' | 'u' | 'd')[]> = {
    '═': ['l', 'r'],
    '║': ['u', 'd'],
    '╗': ['l', 'd'],
    '╔': ['r', 'd'],
    '╝': ['l', 'u'],
    '╚': ['r', 'u'],
  }

  const cells = art.flatMap((line, row) =>
    [...line].map((char, col) => ({ char, x: col, y: row * CELL_H }))
  )

  const blocks = cells.filter(cell => cell.char === '█')

  const shadow = cells
    .flatMap(({ char, x, y }) =>
      (strokes[char] ?? []).map(side => {
        const cx = x + 0.5
        const cy = y + CELL_H / 2
        if (side === 'l') return `M${x} ${cy}H${cx}`
        if (side === 'r') return `M${cx} ${cy}H${x + 1}`
        if (side === 'u') return `M${cx} ${y}V${cy}`
        return `M${cx} ${cy}V${y + CELL_H}`
      })
    )
    .join('')

  const width = [...art[0]!].length
  const height = art.length * CELL_H
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label="WHFD">
  <path d={shadow} />
  {#each blocks as block (`${block.x},${block.y}`)}
    <rect x={block.x} y={block.y} width="1" height={CELL_H} />
  {/each}
</svg>

<style>
  svg {
    display: block;
    inline-size: 100%;
    block-size: auto;
    shape-rendering: crispEdges;
  }

  path {
    fill: none;
    stroke: light-dark(var(--gray-9), var(--tui-selection-bg));
    stroke-width: 0.3;
    stroke-linecap: square;
  }

  rect {
    fill: var(--tui-text);
  }
</style>
