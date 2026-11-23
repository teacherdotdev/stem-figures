<script lang="ts">
  // A beam from beam.ts with the fulcrums it rests on and the distances marked
  // under it: witness lines first, then each fulcrum on its hatched ground,
  // the beam on top of their apexes, and the dimension lines. Put it inside
  // the figure's <svg>, within the mirror transform. Forces and labels are
  // drawn by the figure (VectorArrow, FigureLabel).
  //
  // A beam held at a wall (the Torque's) also takes the wall, the hinge dot
  // where it meets the wall, the cable up to the wall, and the strings its
  // hanging objects hang from (the objects themselves are the figure's, with
  // ObjectShape). The cable and strings go under the beam's outline.
  import type { DistanceMarks, Fulcrum, Rect } from './beam'
  import DimensionLine from './DimensionLine.svelte'
  import Support from './Support.svelte'
  import type { Support as Surface } from './support'
  import type { Point, Segment } from './vector'

  interface Props {
    beam: Rect
    fulcrums?: Fulcrum[]
    marks?: DistanceMarks | null
    ink: string
    /** the beam's fill */
    fill?: string
    /** the fulcrums' fill */
    fulcrumFill?: string
    /** a hatched wall the beam is held at */
    wall?: Surface | null
    /** the hinge dot where the beam meets the wall, when it is pinned there */
    hinge?: Point | null
    /** a cable from the beam to the wall */
    cable?: Segment | null
    /** the strings hanging objects hang from */
    strings?: Segment[]
  }
  let {
    beam, fulcrums = [], marks = null, ink, fill = '#fff', fulcrumFill = '#fff', wall = null, hinge = null, cable = null, strings = [],
  }: Props = $props()
</script>

{#if marks}
  <g stroke={ink} stroke-width="1" stroke-dasharray="4 3" stroke-linecap="butt">
    {#each marks.witnesses as w}<line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} />{/each}
  </g>
{/if}
{#each fulcrums as f}
  <Support support={f.ground} {ink} />
  <polygon points={f.triangle.map((p) => `${p.x},${p.y}`).join(' ')} fill={fulcrumFill} stroke={ink} stroke-width="2.5" stroke-linejoin="round" />
{/each}
{#each strings as s}<line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={ink} stroke-width="2.2" />{/each}
{#if cable}<line x1={cable.x1} y1={cable.y1} x2={cable.x2} y2={cable.y2} stroke={ink} stroke-width="2.2" />{/if}
<rect x={beam.x} y={beam.y} width={beam.width} height={beam.height} rx="2" {fill} stroke={ink} stroke-width="2.5" />
{#if wall}<Support support={wall} {ink} />{/if}
{#if hinge}<circle cx={hinge.x} cy={hinge.y} r="4" fill="#fff" stroke={ink} stroke-width="2" />{/if}
{#if marks}
  {#each marks.marks as m}<DimensionLine m={m.line} color={ink} />{/each}
{/if}
