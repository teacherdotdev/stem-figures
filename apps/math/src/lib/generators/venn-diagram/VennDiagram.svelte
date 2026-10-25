<script lang="ts">
  // The Venn diagram itself: the shaded regions, then the box and circles
  // over them, then the names and what's written in each region (on a white
  // halo over hatching or dots), as one self-contained SVG for printing and
  // export. Clicking regions is PickLayer's job, over this, so none of it
  // reaches an export.
  import { SERIF } from '$lib/shared/mathSvg.js'
  import FillPatterns from '$lib/stats/FillPatterns.svelte'
  import { INK, isPattern, paint, type Fill } from '$lib/stats/fills'
  import type { Placed, VennLayout } from './layout.js'

  // id: prefixes the patterns' ids, which have to be unique on the page.
  let { layout: g, label = 'Venn diagram', svg = $bindable(), id = 'venn' }: { layout: VennLayout; label?: string; svg?: SVGSVGElement; id?: string } = $props()

  /** A tint for a color, light gray for gray, and the patterns as they are. */
  const opacity = (f: Fill) => (isPattern(f) ? 1 : f === 'gray' ? 0.45 : 0.3)
  const fills = $derived(g.regions.flatMap((r) => (r.fill ? [r.fill] : [])))
</script>

{#snippet math(p: Placed)}
  <g transform="translate({p.x.toFixed(1)} {p.y.toFixed(1)})">
    {#each p.box.items as it}
      {#if it.kind === 'text'}
        <text
          x={it.x.toFixed(1)} y={it.y.toFixed(1)} font-family={SERIF} font-size={it.size} font-style={it.italic ? 'italic' : undefined} fill={INK}
          stroke={p.halo ? '#fff' : undefined} stroke-width={p.halo ? it.size * 0.5 : undefined} stroke-linejoin="round" paint-order="stroke"
          xml:space="preserve"
        >{it.text}</text>
      {:else if it.kind === 'line'}
        <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke={INK} stroke-width={it.width} />
      {:else}
        <polyline points={it.points.map((q) => q.join(',')).join(' ')} fill="none" stroke={INK} stroke-width={it.width} stroke-linejoin="round" stroke-linecap="round" />
      {/if}
    {/each}
  </g>
{/snippet}

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {g.width.toFixed(1)} {g.height.toFixed(1)}"
  width={g.width.toFixed(1)}
  height={g.height.toFixed(1)}
  role="img"
  aria-label={label}
>
  <defs><FillPatterns {id} {fills} /></defs>
  <rect width={g.width.toFixed(1)} height={g.height.toFixed(1)} fill="#fff" />

  {#each g.regions as r (r.key)}
    {#if r.fill}<path d={r.d} fill={paint(r.fill, id)} fill-opacity={opacity(r.fill)} />{/if}
  {/each}

  <g fill="none" stroke={INK} stroke-width="2">
    <rect x={g.box.x.toFixed(1)} y={g.box.y.toFixed(1)} width={g.box.w.toFixed(1)} height={g.box.h.toFixed(1)} />
    {#each g.circles as c}<circle cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={c.r.toFixed(1)} stroke-width="2.2" />{/each}
  </g>

  {#if g.universe}{@render math(g.universe)}{/if}
  {#each g.names as p}{@render math(p)}{/each}
  {#each g.items as p}{@render math(p)}{/each}

  <g stroke={INK} stroke-width="1.5">
    {#each g.blanks as b}<line x1={b.x1.toFixed(1)} y1={b.y.toFixed(1)} x2={b.x2.toFixed(1)} y2={b.y.toFixed(1)} />{/each}
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
