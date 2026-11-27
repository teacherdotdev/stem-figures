<script lang="ts">
  // A composite 3D shape as SVG, for the editor's page, its export and its
  // directory card: visible lines, hidden ones dashed, seams pale, unit-cube
  // lines thin, the pieces' height and radius lines, labels, and dimension
  // lines and leaders. Colors and
  // fonts are inline so it exports cleanly. With `onmove`, labels can be
  // dragged (see FigureLabels).
  import FigureLabels from '$lib/shapes/FigureLabels.svelte'
  import { INK, type Offset } from '$lib/shapes/parts.js'
  import type { Drawing, Look, Vec } from './draw'

  let {
    drawn, onmove = null, ondrag, hot = null, ghosts = false,
  }: {
    drawn: Drawing; onmove?: ((part: string, offset: Offset) => void) | null; ondrag?: (dragging: boolean) => void
    /** A measure to draw in blue, all of it (its line, dimension line, arrows and number): the one hovered or being labeled. Never exported. */
    hot?: string | null
    /** Show hidden lines the teacher left out, faintly, so they can be brought back. Never exported. */
    ghosts?: boolean
  } = $props()
  const HOT = '#2563eb'
  const hotPart = $derived(hot ? drawn.labelables.find((l) => l.key === hot) : null)

  const DASH = '6 5'
  const pts = (list: Vec[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const STROKE: Record<Look, { color: string; width: number; dash?: string }> = {
    hidden: { color: INK, width: 1.6, dash: DASH },
    grid: { color: INK, width: 1.1 },
    seam: { color: '#9aa3b2', width: 1.4 },
    line: { color: INK, width: 2.4 },
  }
  // Hidden lines first, so the lines in front are drawn over them.
  const ORDER: Look[] = ['hidden', 'grid', 'seam', 'line']
</script>

<g pointer-events="none" fill="none" stroke-linecap="round" stroke-linejoin="round">
  {#if ghosts}
    <g stroke="#9aa3b2" stroke-width="1.2" stroke-dasharray="1.5 4" opacity="0.6">
      {#each drawn.unseen as r}<polyline points={pts(r.pts)} />{/each}
    </g>
  {/if}
  {#each ORDER as look}
    {@const st = STROKE[look]}
    <g stroke={st.color} stroke-width={st.width} stroke-dasharray={st.dash} stroke-linecap={st.dash ? 'butt' : 'round'}>
      {#each drawn.runs.filter((r) => r.look === look) as r}<polyline points={pts(r.pts)} />{/each}
    </g>
  {/each}
  <g stroke={INK} stroke-width="1.6">
    {#each drawn.extras as e}<line x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke-dasharray={e.dashed ? DASH : undefined} />{/each}
    {#each drawn.squares as sq}<polyline points={pts(sq)} />{/each}
  </g>
  <!-- Dimension lines, their extension lines and ticks, and leaders to dragged labels. -->
  <g stroke={INK} stroke-width="1.1">
    {#each drawn.dims as [a, b], i}<line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={hot && drawn.dimOwner[i] === hot ? HOT : undefined} stroke-width={hot && drawn.dimOwner[i] === hot ? 1.8 : undefined} />{/each}
    {#each drawn.leaders as [a, b], i}<line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={hot && drawn.leaderOwner[i] === hot ? HOT : undefined} />{/each}
  </g>
  <g fill={INK} stroke="none">
    {#each drawn.arrows as tri, i}<polygon points={pts(tri)} fill={hot && drawn.arrowOwner[i] === hot ? HOT : undefined} />{/each}
  </g>
  {#if hot?.startsWith('h:')}
    <g stroke={HOT} stroke-width="2.2" stroke-dasharray={DASH}>
      {#each [...drawn.runs, ...drawn.unseen].filter((r) => r.key === hot) as r}<polyline points={pts(r.pts)} />{/each}
    </g>
  {/if}
  {#if hotPart}
    <!-- The measured line itself, drawn over in blue. -->
    <line x1={hotPart.a[0]} y1={hotPart.a[1]} x2={hotPart.b[0]} y2={hotPart.b[1]} stroke={HOT} stroke-width="3" stroke-linecap="round" />
  {/if}
</g>
<FigureLabels labels={drawn.labels.filter((l) => l.part !== hot)} ink={INK} {onmove} {ondrag} />
{#if hot}<FigureLabels labels={drawn.labels.filter((l) => l.part === hot)} ink={HOT} {onmove} {ondrag} />{/if}
