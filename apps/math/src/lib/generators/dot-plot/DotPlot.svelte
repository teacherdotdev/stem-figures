<script lang="ts">
  // The dot plot itself, as a self-contained SVG that prints crisply and
  // exports cleanly to PNG/SVG (fonts and colors are inline, no page CSS).
  import type { Cap } from '$shared/graph/caps'
  import { buildPlot } from './dotplot.js'
  import { INK, type Settings } from './settings.js'

  // id: prefixes the end caps' ids, which have to be unique on the page.
  let { settings, svg = $bindable(), id = 'd' }: { settings: Settings; svg?: SVGSVGElement; id?: string } = $props()

  const g = $derived(buildPlot(settings))
  const cap = (c: Cap) => (c === 'none' ? undefined : `url(#${id}-${c})`)
  const SANS = 'Arial, Helvetica, sans-serif'
  // An X's half width, a little inside its mark's box so it looks the size of a dot.
  const arm = $derived(g.mark * 0.4)
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {g.width} {g.height}"
  width={g.width}
  height={g.height}
  role="img"
  aria-labelledby="{id}-title {id}-desc"
>
  <title id="{id}-title">{settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Dot plot'}</title>
  <desc id="{id}-desc">{g.description}</desc>
  <defs>
    <!-- The line's end caps; it runs from its start (left) to its end (right). -->
    <marker id="{id}-triangle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={INK} />
    </marker>
    <marker id="{id}-line" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M1.5,1 L8.6,5 L1.5,9" fill="none" stroke={INK} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </marker>
    <marker id="{id}-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="5" fill={INK} />
    </marker>
  </defs>

  <rect width={g.width} height={g.height} fill="#fff" />

  <line
    x1={g.axis.x1} y1={g.axis.y} x2={g.axis.x2} y2={g.axis.y} stroke={INK} stroke-width="2.4"
    marker-start={cap(settings.startCap)} marker-end={cap(settings.endCap)}
  />
  <g stroke={INK} stroke-width="2">
    {#each g.ticks as t}<line x1={t.x} y1={t.y1} x2={t.x} y2={t.y2} />{/each}
  </g>

  {#if settings.mark === 'x'}
    <g stroke={INK} stroke-width={Math.max(1, g.mark * 0.16)} stroke-linecap="round">
      {#each g.marks as m}
        <path d="M{(m.x - arm).toFixed(2)},{(m.y - arm).toFixed(2)} L{(m.x + arm).toFixed(2)},{(m.y + arm).toFixed(2)} M{(m.x - arm).toFixed(2)},{(m.y + arm).toFixed(2)} L{(m.x + arm).toFixed(2)},{(m.y - arm).toFixed(2)}" />
      {/each}
    </g>
  {:else}
    <g fill={INK}>
      {#each g.marks as m}<circle cx={m.x.toFixed(2)} cy={m.y.toFixed(2)} r={(g.mark / 2).toFixed(2)} />{/each}
    </g>
  {/if}

  <g font-family={SANS} font-size={g.fs} font-weight="bold" fill={INK} text-anchor="middle">
    {#each g.numbers as n}
      {#if n.den}
        <text x={n.x} y={n.numY}>{n.num}</text>
        <line x1={n.x - Math.max(n.num.length, n.den.length) * g.fs * 0.32 - 1} y1={n.barY} x2={n.x + Math.max(n.num.length, n.den.length) * g.fs * 0.32 + 1} y2={n.barY} stroke={INK} stroke-width="1.5" />
        <text x={n.x} y={n.denY}>{n.den}</text>
        {#if n.sign}
          <text x={n.x - Math.max(n.num.length, n.den.length) * g.fs * 0.32 - 3} y={n.barY + g.fs * 0.35} text-anchor="end">{n.sign}</text>
        {/if}
      {:else}
        <text x={n.x} y={n.y}>{n.text}</text>
      {/if}
    {/each}
    {#each g.texts as t}<text x={t.x} y={t.y} font-size={t.size}>{t.text}</text>{/each}
  </g>

  <g stroke={INK} stroke-width="1.5">
    {#each g.blanks as b}<line x1={b.x1} y1={b.y} x2={b.x2} y2={b.y} />{/each}
  </g>
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
