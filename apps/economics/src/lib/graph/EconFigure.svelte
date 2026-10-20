<script lang="ts">
  // An economics figure as one self-contained SVG that prints crisply and
  // exports cleanly (fonts and colors inline): its panels side by side, the
  // dashed lines running across between them, and the arrowheads and hatching
  // they share.
  import { INK } from '$shared/graph/grid'
  import Panel from './Panel.svelte'
  import type { FigureLayout } from './figure'

  interface Props {
    figure: FigureLayout
    /** What the figure shows, for screen readers. */
    label: string
    svg?: SVGSVGElement
    /** Prefixes the arrowheads' and patterns' ids, which have to be unique on the page. */
    id?: string
  }
  let { figure: f, label, svg = $bindable(), id = 'econ' }: Props = $props()

  // An arrowhead for each color an arrow is drawn in, and a hatch for each angle.
  const colors = $derived([...new Set(f.panels.flatMap((p) => [...p.arrows.map((a) => a.color), INK]))])
  const hatches = $derived([...new Set(f.panels.flatMap((p) => p.regions.flatMap((r) => (r.hatch === null ? [] : [r.hatch]))))])
  const arrowId = (color: string) => `${id}-arrow-${colors.indexOf(color)}`
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {f.width} {f.height}"
  width={f.width}
  height={f.height}
  role="img"
  aria-label={label}
>
  <defs>
    <!-- Axis end caps, as $shared/graph's Grid draws them. -->
    <marker id="{id}-triangle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill={INK} />
    </marker>
    <marker id="{id}-line" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M1.5,1 L8.6,5 L1.5,9" fill="none" stroke={INK} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </marker>
    <marker id="{id}-circle" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse">
      <circle cx="5" cy="5" r="5" fill={INK} />
    </marker>
    <!-- Shift arrows' and callouts' heads, their tips at the line's end. -->
    {#each colors as color, k}
      <marker id="{id}-arrow-{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
        <path d="M0,1 L10,5 L0,9 z" fill={color} />
      </marker>
    {/each}
    {#each hatches as angle}
      <pattern id="{id}-hatch-{angle}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate({angle})">
        <line x1="3.5" y1="0" x2="3.5" y2="7" stroke={INK} stroke-width="1.3" />
      </pattern>
    {/each}
  </defs>

  <rect width={f.width} height={f.height} fill="#fff" />

  {#each f.panels as p}
    <g transform={p.at.x || p.at.y ? `translate(${p.at.x} ${p.at.y})` : undefined}>
      <Panel {p} {id} {arrowId} />
    </g>
  {/each}

  {#if f.connectors.length}
    <g stroke={INK} stroke-width="1.5" stroke-dasharray="6 4">
      {#each f.connectors as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
    </g>
  {/if}
</svg>

<style>
  svg { display: block; width: 100%; height: auto; }
</style>
