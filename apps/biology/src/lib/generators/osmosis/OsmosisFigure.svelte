<script lang="ts">
  // The Osmosis and Tonicity figure: each picture of the scene (a cell in its
  // solution, a split beaker, a U-tube or a bag in a beaker) with its solute
  // and water particles, the arrows across its membrane and the words over
  // and under it; the part labels down the left, the arrow from the start to
  // the result, and the key. In color the cells, solution and water are
  // tinted; in black and white everything is gray and outlined, for a copier.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import Discs from '$shared/particles/Discs.svelte'
  import KeyDrawing from '$shared/particles/KeyDrawing.svelte'
  import type { Disc } from '$shared/particles/particles'
  import { answerLines, buildOsmosis, describe, wordsWidth, type Arrow, type Words } from './figure'
  import type { OsmosisSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: OsmosisSettings; svg?: SVGSVGElement } = $props()

  const fig = $derived(buildOsmosis(settings))
  const answers = $derived(answerLines(settings))
  // Wide enough for the title and answer key, with the drawing in the middle.
  const width = $derived(
    Math.max(
      fig.width,
      settings.answerKey ? Math.max(...answers.map((a) => wordsWidth(a, 18))) : 0,
      settings.titleMode === 'text' ? wordsWidth(settings.title, 22) : 0,
    ),
  )
  const dx = $derived((width - fig.width) / 2)

  const INK = '#222'
  const COLOR = {
    solution: '#e6f1fb', water: '#7fb3e6', waterInk: '#245a8f', arrow: '#1f5ea8',
    cell: '#f0b4b4', cellInk: '#9b2c2c', pale: '#fae0e0',
    wall: '#b7da98', wallInk: '#3d6b21', cytoplasm: '#e4f2d4', vacuole: '#f3f0fb', vacuoleInk: '#56497f',
    nucleus: '#b6a0d6', nucleusInk: '#4a3a6b', chloroplast: '#5ea548', chloroplastInk: '#2e5c21',
    bag: '#f6efd6', bagInk: '#7a6326',
  }
  const GRAY = {
    solution: '#f1f1f1', water: '#fff', waterInk: '#555', arrow: '#111',
    cell: '#e2e2e2', cellInk: INK, pale: '#f7f7f7',
    wall: '#cfcfcf', wallInk: INK, cytoplasm: '#e4e4e4', vacuole: '#fff', vacuoleInk: INK,
    nucleus: '#9c9c9c', nucleusInk: INK, chloroplast: '#7d7d7d', chloroplastInk: INK,
    bag: '#fff', bagInk: INK,
  }
  const c = $derived(settings.color ? COLOR : GRAY)

  /** An arrowhead's three corners at `to`, pointing away from `from`. */
  function head(from: [number, number], to: [number, number], size: number) {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
    const ux = (to[0] - from[0]) / len
    const uy = (to[1] - from[1]) / len
    const back: [number, number] = [to[0] - ux * size, to[1] - uy * size]
    const w = size * 0.55
    return `${to[0]},${to[1]} ${back[0] - uy * w},${back[1] + ux * w} ${back[0] + uy * w},${back[1] - ux * w}`
  }
  /** Where an arrow's line stops, short of its point. */
  const shaft = (a: Arrow, size: number): [number, number] => {
    const len = Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]) || 1
    return [a.to[0] - ((a.to[0] - a.from[0]) / len) * (size - 1), a.to[1] - ((a.to[1] - a.from[1]) / len) * (size - 1)]
  }
</script>

{#snippet line(w: Words)}
  {#if w.blank}
    <line x1={w.blank.x1} y1={w.y} x2={w.blank.x2} y2={w.y} stroke={INK} stroke-width="1.5" />
  {:else}
    <text x={w.x} y={w.y} text-anchor={w.anchor} font-size={w.size} font-weight={w.bold ? 700 : undefined} fill="#111"
      >{#each w.spans as span, i (i)}<tspan font-size={span.size} dy={span.dy || undefined}>{span.text}</tspan>{/each}</text
    >
  {/if}
{/snippet}

{#snippet water(discs: Disc[])}
  {#each discs as d, i (i)}
    <circle cx={d.x} cy={d.y} r={d.r} fill={c.water} stroke={c.waterInk} stroke-width="1.2" />
  {/each}
{/snippet}

{#snippet arrow(a: Arrow)}
  {@const size = a.kind === 'water' ? 13 : 11}
  {@const color = a.kind === 'water' ? c.arrow : '#111'}
  {#if a.blank}
    {@const x0 = Math.min(a.from[0], a.to[0]) - 7}
    {@const y0 = Math.min(a.from[1], a.to[1]) - 7}
    <rect
      x={x0} y={y0} width={Math.abs(a.to[0] - a.from[0]) + 14} height={Math.abs(a.to[1] - a.from[1]) + 14} rx="4"
      fill="#fff" stroke={INK} stroke-width="1.2" stroke-dasharray="4 3"
    />
  {:else}
    {@const end = shaft(a, size)}
    <line
      x1={a.from[0]} y1={a.from[1]} x2={end[0]} y2={end[1]} stroke={color} stroke-width={a.kind === 'water' ? 3.5 : 2.5}
      stroke-dasharray={a.kind === 'solute' ? '5 3' : undefined}
    />
    <polygon points={head(a.from, a.to, size)} fill={color} />
  {/if}
{/snippet}

<FigureFrame
  bind:svg
  {width}
  height={fig.height}
  label={describe(settings)}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answers.join('\n') : ''}
>
  <g transform="translate({dx} 0)">
    {#each fig.pictures as p, i (i)}
      {@const d = p.shape.drawing}
      <g transform="translate({p.x} {p.y})">
        {#if d.kind === 'blood'}
          <path d={d.box} fill={c.solution} stroke={INK} stroke-width="1.5" />
          <path d={d.cell} fill={d.torn.length ? c.pale : c.cell} stroke={d.torn.length ? 'none' : c.cellInk} stroke-width="2.5" stroke-linejoin="round" />
          {#if d.pale}<circle cx={d.pale.cx} cy={d.pale.cy} r={d.pale.r} fill={c.pale} />{/if}
          {#each [...d.torn, ...d.bits] as t, k (k)}
            <path d={t} fill="none" stroke={c.cellInk} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          {/each}
        {:else if d.kind === 'plant'}
          <path d={d.box} fill={c.solution} stroke={INK} stroke-width="1.5" />
          {#if d.gap}<path d={d.gap} fill={c.solution} fill-rule="evenodd" />{/if}
          <path d={d.membrane} fill={c.cytoplasm} stroke={INK} stroke-width="1.5" stroke-linejoin="round" />
          <path d={d.wall} fill={c.wall} fill-rule="evenodd" stroke={c.wallInk} stroke-width="2" stroke-linejoin="round" />
          <path d={d.vacuole} fill={c.vacuole} stroke={c.vacuoleInk} stroke-width="1.5" stroke-linejoin="round" />
          <circle cx={d.nucleus.cx} cy={d.nucleus.cy} r={d.nucleus.r} fill={c.nucleus} stroke={c.nucleusInk} stroke-width="1.5" />
          <!-- its nucleolus, so it reads as a nucleus, not a particle -->
          <circle cx={d.nucleus.cx + d.nucleus.r * 0.2} cy={d.nucleus.cy - d.nucleus.r * 0.15} r={d.nucleus.r * 0.38} fill={c.nucleusInk} />
          {#each d.chloroplasts as k, j (j)}
            <ellipse
              cx={k.cx} cy={k.cy} rx="7" ry="3.6" transform="rotate({k.angle} {k.cx} {k.cy})"
              fill={c.chloroplast} stroke={c.chloroplastInk} stroke-width="1"
            />
          {/each}
        {:else if d.kind === 'beaker'}
          <path d={d.liquidA} fill={c.solution} />
          <path d={d.liquidB} fill={c.solution} />
          <path d={d.walls} fill="none" stroke={INK} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        {:else if d.kind === 'utube'}
          <path d={d.liquidA} fill={c.solution} />
          <path d={d.liquidB} fill={c.solution} />
          <path d="{d.outer} {d.inner}" fill="none" stroke={INK} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
        {:else}
          <path d={d.liquid} fill={c.solution} />
          <path d={d.walls} fill="none" stroke={INK} stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          <line x1={d.rod[0][0]} y1={d.rod[0][1]} x2={d.rod[1][0]} y2={d.rod[1][1]} stroke={INK} stroke-width="5" stroke-linecap="round" />
          <line x1={d.string[0][0]} y1={d.string[0][1]} x2={d.string[1][0]} y2={d.string[1][1]} stroke={INK} stroke-width="1.5" />
          <path d={d.bag} fill={c.bag} stroke={c.bagInk} stroke-width="2.5" stroke-linejoin="round" />
          <path d={d.knot} fill={c.bagInk} stroke={c.bagInk} stroke-width="1.5" stroke-linejoin="round" />
        {/if}

        <Discs discs={p.solutes} />
        {@render water(p.water)}

        {#if d.kind !== 'blood' && d.kind !== 'plant'}
          <!-- The liquid's surface on each side -->
          {#each d.surfaces as [a, b], k (k)}
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c.waterInk} stroke-width="1.5" />
          {/each}
        {/if}
        {#if d.kind === 'beaker' || d.kind === 'utube'}
          <!-- The membrane between the sides -->
          <line x1={d.membrane[0][0]} y1={d.membrane[0][1]} x2={d.membrane[1][0]} y2={d.membrane[1][1]} stroke="#fff" stroke-width="5" />
          <line
            x1={d.membrane[0][0]} y1={d.membrane[0][1]} x2={d.membrane[1][0]} y2={d.membrane[1][1]}
            stroke={INK} stroke-width="3" stroke-dasharray="7 4"
          />
        {/if}

        {#each p.arrows as a, k (k)}{@render arrow(a)}{/each}
        {#each p.words as w, k (k)}{@render line(w)}{/each}
      </g>
    {/each}

    {#if fig.between}
      {@const b = fig.between}
      <line x1={b.from[0]} y1={b.from[1]} x2={b.to[0] - 12} y2={b.to[1]} stroke={INK} stroke-width="3" />
      <polygon points="{b.to[0]},{b.to[1]} {b.to[0] - 16},{b.to[1] - 8} {b.to[0] - 16},{b.to[1] + 8}" fill={INK} />
    {/if}

    {#each fig.leaders as l, k (k)}
      <!-- white under the leader, so it reads where it crosses particles -->
      <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke="#fff" stroke-width="4" />
      <line x1={l.from[0]} y1={l.from[1]} x2={l.to[0]} y2={l.to[1]} stroke={INK} stroke-width="1.2" />
      <circle cx={l.to[0]} cy={l.to[1]} r="2.2" fill={INK} />
    {/each}
    {#each fig.labels as w, k (k)}{@render line(w)}{/each}

    {#if fig.key}
      {@const key = fig.key}
      <g transform="translate({key.x} {key.y})">
        <KeyDrawing key={key.layout} />
        {#if key.water}{@render water(key.layout.lines[0].discs)}{/if}
      </g>
    {/if}
  </g>
</FigureFrame>
