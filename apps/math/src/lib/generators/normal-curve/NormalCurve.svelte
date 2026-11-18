<script lang="ts">
  // The normal curve itself: the shaded regions under it, then the SD lines,
  // bounds and marked values, the curve and axis over them, and the labels
  // on a white halo, as one self-contained SVG for printing and export.
  import { SANS } from '$shared/graph/grid'
  import { SERIF } from '$lib/shared/mathSvg.js'
  import FillPatterns from '$lib/stats/FillPatterns.svelte'
  import { INK, isPattern, paint, type Fill } from '$lib/stats/fills'
  import { buildCurve } from './layout.js'
  import type { Settings } from './settings.js'

  // id: prefixes the patterns' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'normal' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const c = $derived(buildCurve(settings))
  /** A tint for a color, light gray for gray, and the patterns as they are. */
  const opacity = (f: Fill) => (isPattern(f) ? 1 : f === 'gray' ? 0.5 : 0.35)
  const GUIDE = '#4b5563'
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {c.width} {c.height}"
  width={c.width}
  height={c.height}
  role="img"
  aria-label={c.description}
>
  <defs><FillPatterns {id} fills={c.fills} /></defs>
  <rect width={c.width} height={c.height} fill="#fff" />

  <g transform="translate({c.shift.x} {c.shift.y})">
    {#each c.regions as r}<path d={r.d} fill={paint(r.fill, id)} fill-opacity={opacity(r.fill)} />{/each}

    <g stroke={GUIDE} stroke-width="1.3" stroke-dasharray={settings.sdLines === 'dashed' ? '5 4' : undefined} fill="none">
      {#each c.sdLines as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
    </g>
    <g stroke={INK} stroke-width="1.8">
      {#each c.bounds as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
    </g>
    <g stroke={INK} stroke-width="1.6" stroke-dasharray="1.5 3.5" stroke-linecap="round">
      {#each c.marks as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
    </g>
    <g stroke={INK} stroke-width="1">
      {#each c.leaders as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
    </g>

    <path d={c.curve} fill="none" stroke={INK} stroke-width="2.4" stroke-linejoin="round" />
    <g stroke={INK} stroke-width="1.6">
      <line x1={c.axis.x1} y1="0" x2={c.axis.x2} y2="0" />
      {#each c.ticks as t}<line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
      {#if c.density}
        <line x1={c.density.line.x1} y1={c.density.line.y1} x2={c.density.line.x2} y2={c.density.line.y2} />
        {#each c.density.ticks as t}<line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
      {/if}
    </g>

    <g font-family={SANS} font-size={c.fs} fill={INK} stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">
      {#each [...c.texts, ...(c.density?.numbers ?? [])] as t}
        <text
          x={t.x} y={t.y} text-anchor={t.anchor} font-family={t.italic ? SERIF : undefined} font-style={t.italic ? 'italic' : undefined}
          font-size={t.italic ? c.fs * 1.1 : t.size} font-weight={t.bold ? 'bold' : undefined}
        >{t.text}</text>
      {/each}
    </g>
    <g stroke={INK} stroke-width="1.5">
      {#each c.blanks as b}<line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y} />{/each}
    </g>
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
