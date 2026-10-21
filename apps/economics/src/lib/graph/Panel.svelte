<script lang="ts">
  // One economics graph, as laid out by panel.ts: the gridlines, shaded
  // regions, the axes, dashed guides, lines across, curves, shift
  // arrows, braces, points, callouts and every label, with subscripts
  // lowered. Drawn inside EconFigure's <svg>, which holds the arrowheads and
  // hatching it refers to.
  import { INK, SANS } from '$shared/graph/grid'
  import type { Cap } from '$shared/graph/caps'
  import { ARROW_BACK, type Label, type PanelLayout } from './panel'

  let { p, id, arrowId }: { p: PanelLayout; id: string; arrowId: (color: string) => string } = $props()

  const cap = (c: Cap) => (c === 'none' ? undefined : `url(#${id}-${c})`)
  const TINT = 0.2
  /** An arrow's line, ended where its head is wide enough to cover it (ARROW_BACK short of the tip). */
  const shortEnd = (l: { x1: number; y1: number; x2: number; y2: number }) => {
    const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1) || 1
    const back = Math.min(ARROW_BACK, len / 2)
    return { x2: l.x2 - ((l.x2 - l.x1) / len) * back, y2: l.y2 - ((l.y2 - l.y1) / len) * back }
  }
</script>

{#snippet words(l: Label, fs: number)}
  {#if l.runs}<text x={l.x} y={l.y} text-anchor={l.anchor} font-size={fs}>{#each l.runs as r}<tspan dy={r.dy || undefined} font-size={r.sub ? fs * 0.7 : undefined}>{r.text}</tspan>{/each}</text>{/if}
{/snippet}

{#if p.minorV.length}
  <g stroke="#9ca3af" stroke-width="0.5">
    {#each p.minorV as x}<line x1={x} y1={p.grid.y} x2={x} y2={p.grid.y + p.grid.h} />{/each}
    {#each p.minorH as y}<line x1={p.grid.x} y1={y} x2={p.grid.x + p.grid.w} y2={y} />{/each}
  </g>
{/if}
{#if p.vLines.length}
  <g stroke="#9ca3af" stroke-width="1" shape-rendering="crispEdges">
    {#each p.vLines as x}<line x1={x} y1={p.grid.y} x2={x} y2={p.grid.y + p.grid.h} />{/each}
    {#each p.hLines as y}<line x1={p.grid.x} y1={y} x2={p.grid.x + p.grid.w} y2={y} />{/each}
  </g>
{/if}

<!-- White under the guides' dashes, so one along a gridline still reads as
     dashed; drawn before the axes, so it doesn't notch them where a guide ends. -->
{#if p.guides.length}
  <g stroke="#fff" stroke-width="4">
    {#each p.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>
{/if}

<!-- Shaded regions over the gridlines and that white, so a guide across one
     leaves no pale seam in it. -->
{#each p.regions as r}
  {#if r.hatch === null}
    <path d={r.d} fill={r.color} fill-opacity={TINT} />
  {:else}
    <path d={r.d} fill="url(#{id}-hatch-{r.hatch})" />
  {/if}
{/each}

<g stroke={INK} stroke-width="2.4">
  <line x1={p.xAxis.x1} y1={p.xAxis.y} x2={p.xAxis.x2} y2={p.xAxis.y} marker-end={cap(p.ends.x)} />
  <line x1={p.yAxis.x} y1={p.yAxis.y1} x2={p.yAxis.x} y2={p.yAxis.y2} marker-end={cap(p.ends.y)} />
</g>
{#if p.ticks.length}
  <g stroke={INK} stroke-width="1.5">
    {#each p.ticks as t}<line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
  </g>
{/if}

{#if p.guides.length}
  <g stroke={INK} stroke-width="1.4" stroke-dasharray="5 4">
    {#each p.guides as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>
{/if}

{#each p.levels as l}
  {#each l.paths as d}<path {d} fill="none" stroke={l.color} stroke-width="2.2" stroke-dasharray={l.dash} />{/each}
{/each}

{#each p.curves as c}
  {#each c.paths as d}
    <path {d} fill="none" stroke={c.color} stroke-width={c.width} stroke-dasharray={c.dash} stroke-linecap={c.dash ? 'butt' : 'round'} stroke-linejoin="round" />
  {/each}
{/each}

{#each p.arrows as a}
  <line x1={a.x1} y1={a.y1} {...shortEnd(a)} stroke={a.color} stroke-width="2" marker-end="url(#{arrowId(a.color)})" />
{/each}

{#if p.braces.length}
  <g fill="none" stroke={INK} stroke-width="1.6" stroke-linejoin="round">
    {#each p.braces as d}<path {d} />{/each}
  </g>
{/if}

{#each p.leaders as l}
  <line x1={l.x1} y1={l.y1} {...shortEnd(l)} stroke={INK} stroke-width="1.4" marker-end="url(#{arrowId(INK)})" />
{/each}

{#each p.dots as d}<circle cx={d.x} cy={d.y} r={p.r} fill={INK} />{/each}

<g font-family={SANS} font-size={p.fs} font-weight="bold" fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
  {#each p.numbers as n}<text x={n.x} y={n.y} text-anchor={n.anchor}>{n.text}</text>{/each}
  {#each p.labels as l}{@render words(l, p.labelFs)}{/each}
  {#each p.big as l}{@render words(l, l.y < p.grid.y ? p.titleFs : p.captionFs)}{/each}
</g>

<g stroke={INK} stroke-width="1.5">
  {#each p.labels as l}
    {#if l.blank}<line x1={l.blank.x1} y1={l.blank.y1} x2={l.blank.x2} y2={l.blank.y2} />{/if}
  {/each}
  {#each p.blanks as b}<line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} />{/each}
</g>
