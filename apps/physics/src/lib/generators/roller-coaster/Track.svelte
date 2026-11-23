<script lang="ts">
  // The Roller Coaster figure, as a self-contained SVG that prints crisply and
  // exports cleanly. Shapes are drawn inside the mirror transform; labels
  // outside it, so they stay readable. Each label has a white box behind it,
  // so it reads over the track or a mark.
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import LabelBackdrop from '$lib/shared/LabelBackdrop.svelte'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { mirrorTransform, mirrorX, palette } from '$lib/shared/figure'
  import { LABEL_SIZE } from '$lib/shared/layout'
  import { styleOf } from '$lib/shared/vector'
  import { DOT_R, buildTrack, describe } from './track'
  import type { CoasterSettings } from './settings'

  let { settings, id = 'r' }: { settings: CoasterSettings; id?: string } = $props()

  const fig = $derived(buildTrack(settings))
  const p = $derived(palette(settings.color))
  const mx = (x: number) => mirrorX(settings.mirror, fig.width, x)
  const baseline = LABEL_SIZE * 0.35
  // A point's letter (A, B, C) is upright; a quantity typed in its place (KE, h) is italic, like every other label.
  const LETTER = /^[A-Z]$/
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={describe(settings)}
  id="{id}-roller-coaster"
>
  <defs><LabelBackdrop id="{id}-label-box" /></defs>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />
  <g transform={mirrorTransform(settings.mirror, fig.width)} stroke-linecap="round">
    {#if fig.ground}
      <line x1={fig.ground.x1} y1={fig.ground.y1} x2={fig.ground.x2} y2={fig.ground.y2} stroke={p.ink} stroke-width="2" />
    {/if}
    {#each fig.hatches as h}<line x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke={p.ink} stroke-width="1.3" />{/each}

    {#each fig.extensions as e}<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={p.ink} stroke-width="1" />{/each}
    {#each fig.heightMarks as m}{#if m}<DimensionLine {m} color={p.ink} />{/if}{/each}
    {#each fig.lengthMarks as m}<DimensionLine m={m.m} color={p.ink} />{/each}

    <path d={fig.path} fill="none" stroke={p.ink} stroke-width="3" stroke-linejoin="round" />
    {#if fig.loop}
      <circle cx={fig.loop.center.x} cy={fig.loop.center.y} r={fig.loop.r} fill="none" stroke={p.ink} stroke-width="3" />
      {#if fig.loop.radius}
        <line x1={fig.loop.radius.x1} y1={fig.loop.radius.y1} x2={fig.loop.radius.x2} y2={fig.loop.radius.y2} stroke={p.ink} stroke-width="1.5" />
        <circle cx={fig.loop.center.x} cy={fig.loop.center.y} r="2.5" fill={p.ink} />
      {/if}
      {#if fig.loop.topDot}<circle cx={fig.loop.top.x} cy={fig.loop.top.y} r={DOT_R} fill={p.ink} />{/if}
    {/if}
    {#each fig.points as point}
      {#if point.dot}<circle cx={point.at.x} cy={point.at.y} r={DOT_R} fill={p.ink} />{/if}
    {/each}

    {#if fig.object}
      <g transform="translate({fig.object.at.x} {fig.object.at.y}) rotate({fig.object.tilt})">
        <ObjectShape kind={fig.object.kind} size={fig.object.size} fill={p.object} stroke={p.ink} />
      </g>
    {/if}
    <!-- Velocity is motion, not a force, so it's dashed. -->
    {#if fig.velocity}<VectorArrow v={fig.velocity} color={p.vector} style={styleOf('velocity')} halo={false} />{/if}
  </g>

  {#if fig.object?.inside}
    <FigureLabel label={fig.object.label} x={mx(fig.object.inside.at.x)} y={fig.object.inside.at.y} size={fig.object.inside.size} color={p.ink} halo={false} blank={fig.object.width * 0.5} />
  {/if}
  {#each fig.labels as l}
    <FigureLabel
      label={l.label}
      x={mx(l.at.x)}
      y={l.at.y + baseline}
      size={LABEL_SIZE}
      color={l.kind === 'velocity' ? p.vector : p.ink}
      italic={!((l.kind === 'point' || l.kind === 'loopTop') && LETTER.test(l.label.text))}
      backdrop="{id}-label-box"
    />
  {/each}
</svg>
