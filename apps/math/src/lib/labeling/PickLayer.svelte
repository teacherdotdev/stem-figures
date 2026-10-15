<script lang="ts">
  // What the teacher can point at on a figure (see pick.ts), drawn over it in
  // an SVG of its own so nothing here reaches a copy or an export: over
  // LinesFigure.svelte, or the Composite Shape Editor's page. A mouse
  // hovering an angle, a line, a curve or a place for a point lights it ghost blue;
  // clicking or tapping one calls onpick with where to open its popup. A
  // point's place (each crossing, and near each end of each line) wins over
  // all; near a crossing the angles win, even right on a line; a line is
  // picked farther out. `ghost` is an
  // angle shown with its measure (the one a transversal's value sets, while
  // it's being changed), and `selected` the part whose popup is open.
  import type { Snippet } from 'svelte'
  import type { Part, Pickable, Vec } from './pick.js'

  let {
    figure, ghost = null, selected = null, onpick, children,
  }: {
    figure: Pickable
    ghost?: string | null
    selected?: Part | null
    onpick: (part: Part, at: { x: number; y: number }) => void
    /** Anything to go over the hit areas, like handles for dragging labels. */
    children?: Snippet
  } = $props()

  const BLUE = '#2563eb'
  const LINE_NAMES: Record<string, string> = { p: 'Parallel line', t: 'Transversal', r: 'Ray', side: 'Side', extra: 'Extra line', seam: 'Where two pieces meet' }
  let svg = $state<SVGSVGElement>()
  let hover = $state<Part | null>(null)
  const f = $derived(figure.frame)
  const lit = (p: Part) => (hover?.kind === p.kind && hover.key === p.key) || (selected?.kind === p.kind && selected.key === p.key)
  const ghostAngle = $derived(ghost ? figure.angles.find((a) => a.key === ghost) : null)
  // Its measure is written over it, unless its own label already says it.
  const ghostText = $derived(ghostAngle?.ghost && !figure.labels.some((l) => l.part === `angle:${ghost}`) ? ghostAngle.ghost : null)

  /** A point on the figure, on the screen. */
  function onScreen([x, y]: Vec) {
    const m = svg!.getScreenCTM()!
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }
  }

  const pick = (part: Part, at: Vec) => onpick(part, onScreen(at))
  const enter = (event: PointerEvent, part: Part) => event.pointerType === 'mouse' && (hover = part)
  const leave = (part: Part) => hover?.kind === part.kind && hover.key === part.key && (hover = null)
  const key = (event: KeyboardEvent, part: Part, at: Vec) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    pick(part, at)
  }
  const mid = (g: { from: Vec; to: Vec }): Vec => [(g.from[0] + g.to[0]) / 2, (g.from[1] + g.to[1]) / 2]
</script>

<svg bind:this={svg} class="layer" viewBox="{f.x} {f.y} {f.w} {f.h}" aria-label="Parts of the figure">
  <!-- Highlights -->
  <g pointer-events="none">
    {#each figure.angles as a (a.key)}
      {#if lit({ kind: 'angle', key: a.key }) && a.key !== ghost}<path d={a.wedge} fill={BLUE} fill-opacity="0.18" />{/if}
    {/each}
    {#if ghostAngle}
      <path d={ghostAngle.wedge} fill={BLUE} fill-opacity="0.22" />
    {/if}
    {#if ghostText}
      <text x={ghostText.at[0]} y={ghostText.at[1]} fill={BLUE} font-family="'Times New Roman', Times, serif" font-size="20" text-anchor="middle" dominant-baseline="central" stroke="#fff" stroke-width="4" paint-order="stroke">{ghostText.text}</text>
    {/if}
    {#each figure.curves ?? [] as c (c.key)}
      {#if lit({ kind: 'curve', key: c.key })}<path d={c.d} fill="none" stroke={BLUE} stroke-opacity="0.3" stroke-width="9" stroke-linecap="round" />{/if}
    {/each}
    {#each figure.segments as g (g.id)}
      {#if lit({ kind: 'line', key: g.id })}
        <line x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]} stroke={BLUE} stroke-opacity="0.3" stroke-width="9" stroke-linecap="round" />
      {/if}
    {/each}
    {#each figure.spots as p (p.key)}
      {#if lit({ kind: 'point', key: p.key })}
        <circle cx={p.at[0]} cy={p.at[1]} r="7" fill={BLUE} fill-opacity="0.25" />
        <circle cx={p.at[0]} cy={p.at[1]} r="3.5" fill={BLUE} />
      {/if}
    {/each}
  </g>

  <!-- What can be pointed at: angles over lines, so near a crossing the angle wins, even right on a line -->
  {#each figure.segments as g (g.id)}
    {@const part = { kind: 'line', key: g.id } as Part}
    <line
      x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]} stroke="transparent" stroke-width="16" stroke-linecap="round"
      class="hit" role="button" tabindex="0" aria-label={g.name ?? LINE_NAMES[g.kind] ?? 'Line'}
      onclick={() => pick(part, mid(g))}
      onpointerenter={(e) => enter(e, part)} onpointerleave={() => leave(part)} onkeydown={(e) => key(e, part, mid(g))}
    />
  {/each}
  {#each figure.curves ?? [] as c (c.key)}
    {@const part = { kind: 'curve', key: c.key } as Part}
    <path
      d={c.d} fill="none" stroke="transparent" stroke-width="16" stroke-linecap="round" class="hit" role="button" tabindex="0" aria-label={c.name ?? 'Curve'}
      onclick={() => pick(part, c.anchor)}
      onpointerenter={(e) => enter(e, part)} onpointerleave={() => leave(part)} onkeydown={(e) => key(e, part, c.anchor)}
    />
  {/each}
  {#each figure.angles as a (a.key)}
    {@const part = { kind: 'angle', key: a.key } as Part}
    <path
      d={a.wedge} fill="transparent" class="hit" role="button" tabindex="0" aria-label="Angle of {Math.round(a.measure)}°"
      onclick={() => pick(part, a.anchor)}
      onpointerenter={(e) => enter(e, part)} onpointerleave={() => leave(part)} onkeydown={(e) => key(e, part, a.anchor)}
    />
  {/each}
  <!-- Places for points, over everything: each crossing, and near each end of each line -->
  {#each figure.spots as p (p.key)}
    {@const part = { kind: 'point', key: p.key } as Part}
    <circle
      cx={p.at[0]} cy={p.at[1]} r="8" fill="transparent" class="hit" role="button" tabindex="0"
      aria-label={p.name ?? (p.line ? 'Point near the end of a line' : p.key === 'v' ? 'Point at the vertex' : 'Point where lines cross')}
      onclick={() => pick(part, p.at)}
      onpointerenter={(e) => enter(e, part)} onpointerleave={() => leave(part)} onkeydown={(e) => key(e, part, p.at)}
    />
  {/each}
  {@render children?.()}
</svg>

<style>
  .layer { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .hit { cursor: pointer; outline: none; }
  .hit:focus-visible { stroke: #2563eb; stroke-opacity: 0.5; }
</style>
