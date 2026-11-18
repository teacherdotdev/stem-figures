<script lang="ts">
  // The tree diagram itself: its branches, then every label and blank line
  // over them, as one self-contained SVG that prints crisply and exports
  // cleanly to PNG/SVG (fonts and colors are inline, no page CSS). Clicking
  // labels is PickLayer's job, over this, so none of it reaches an export.
  import { INK } from '$shared/graph/grid'
  import { SERIF } from '$lib/shared/mathSvg.js'
  import type { TreeLayout } from './layout.js'

  let { layout: g, label = 'Tree diagram', svg = $bindable() }: { layout: TreeLayout; label?: string; svg?: SVGSVGElement } = $props()
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {g.width.toFixed(1)} {g.height.toFixed(1)}"
  width={g.width.toFixed(1)}
  height={g.height.toFixed(1)}
  role="img"
  aria-label={label}
>
  <rect width={g.width.toFixed(1)} height={g.height.toFixed(1)} fill="#fff" />

  <g stroke={INK} stroke-width="1.6" stroke-linecap="round">
    {#each g.branches as b}<line x1={b.x1.toFixed(1)} y1={b.y1.toFixed(1)} x2={b.x2.toFixed(1)} y2={b.y2.toFixed(1)} />{/each}
  </g>

  {#each g.texts as p}
    <g transform="translate({p.x.toFixed(1)} {p.y.toFixed(1)})">
      {#each p.box.items as it}
        {#if it.kind === 'text'}
          <text
            x={it.x.toFixed(1)} y={it.y.toFixed(1)} font-family={SERIF} font-size={it.size.toFixed(1)} font-style={it.italic ? 'italic' : undefined} fill={INK}
            xml:space="preserve"
          >{it.text}</text>
        {:else if it.kind === 'line'}
          <line x1={it.x1.toFixed(1)} y1={it.y1.toFixed(1)} x2={it.x2.toFixed(1)} y2={it.y2.toFixed(1)} stroke={INK} stroke-width={it.width} />
        {:else}
          <polyline points={it.points.map((q) => q.join(',')).join(' ')} fill="none" stroke={INK} stroke-width={it.width} stroke-linejoin="round" stroke-linecap="round" />
        {/if}
      {/each}
    </g>
  {/each}

  <g stroke={INK} stroke-width="1.5">
    {#each g.blankLines as b}<line x1={b.x1.toFixed(1)} y1={b.y1.toFixed(1)} x2={b.x2.toFixed(1)} y2={b.y2.toFixed(1)} />{/each}
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
