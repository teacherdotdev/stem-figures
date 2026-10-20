<script lang="ts">
  // A Ray Diagram figure, inside the shared frame that adds the chart title
  // and the answer key: the principal axis, the lens or mirror, its focal
  // points, the object, the principal rays and the image (./figure). Rays are
  // solid where light goes and dashed where it only seems to come from; a
  // virtual image is dashed too. Labels sit on white boxes, so they read over
  // the rays.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import DimensionLine from '$lib/shared/DimensionLine.svelte'
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import LabelBackdrop from '$lib/shared/LabelBackdrop.svelte'
  import { SANS, palette } from '$lib/shared/figure'
  import type { Label } from '$lib/shared/label'
  import type { Point } from '$lib/shared/vector'
  import { buildRayFigure, type Arrow } from './figure'
  import { imageOf, type RayId } from './optics'
  import { answerLines, type RaySettings } from './settings'

  let { settings, svg = $bindable(), id = 'r' }: { settings: RaySettings; svg?: SVGSVGElement; id?: string } = $props()

  const fig = $derived(buildRayFigure(settings))
  const p = $derived(palette(settings.color))
  const ink = $derived(p.ink)
  /** Each ray its own color on slides; all black in black and white. */
  const RAY_COLORS: Record<RayId, string> = { parallel: '#dc2626', center: '#16a34a', focal: '#2563eb', vertex: '#9333ea', upper: '#ea580c' }
  const rayColor = (r: RayId) => (settings.color ? RAY_COLORS[r] : ink)
  const glass = $derived(settings.color ? '#dbeafe' : '#eef1f5')
  const baseline = $derived(fig.labelSize * 0.35)

  const NAMES = { converging: 'converging lens', diverging: 'diverging lens', concave: 'concave mirror', convex: 'convex mirror', plane: 'plane mirror' }
  const description = $derived.by(() => {
    const s = settings
    const what = `A ray diagram of a ${NAMES[s.element]}${s.element === 'plane' ? '' : ` of focal length ${s.focalLength} cm`}, with an object ${s.distance} cm from it`
    if (s.shown === 'setup') return `${what}, for students to draw the rays`
    if (s.shown === 'rays') return `${what} and its principal rays`
    const image = imageOf(s.element, s.focalLength, s.distance, s.height)
    return image ? `${what}, its principal rays and its ${image.real ? 'real' : 'virtual'} image` : `${what} at the focal point, its rays leaving parallel`
  })

  const head = (a: Arrow) => {
    const len = Math.hypot(a.tip.x - a.base.x, a.tip.y - a.base.y)
    const size = Math.min(13, len * 0.4)
    const angle = (Math.atan2(a.tip.y - a.base.y, a.tip.x - a.base.x) * 180) / Math.PI
    return { size, angle }
  }
</script>

{#snippet arrow(a: Arrow, color: string, dashed: boolean)}
  {@const hd = head(a)}
  {#if hd.size > 1}
    <line
      x1={a.base.x}
      y1={a.base.y}
      x2={a.tip.x - Math.cos((hd.angle * Math.PI) / 180) * hd.size * 0.8}
      y2={a.tip.y - Math.sin((hd.angle * Math.PI) / 180) * hd.size * 0.8}
      stroke={color}
      stroke-width="3"
      stroke-dasharray={dashed ? '7 5' : undefined}
    />
    <polygon
      points="0,0 {-hd.size},{-hd.size * 0.45} {-hd.size},{hd.size * 0.45}"
      fill={color}
      transform="translate({a.tip.x} {a.tip.y}) rotate({hd.angle})"
    />
  {/if}
{/snippet}

{#snippet text(label: Label, at: Point | null, italic = true)}
  {#if at}<FigureLabel {label} x={at.x} y={at.y + baseline} size={fig.labelSize} color={ink} {italic} backdrop="{id}-label-box" />{/if}
{/snippet}

<FigureFrame
  bind:svg
  width={fig.width}
  height={fig.height}
  label={description}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLines(settings).join('\n') : ''}
>
  <defs><LabelBackdrop id="{id}-label-box" /></defs>
  <g transform="translate({-fig.left} {-fig.top})" stroke-linecap="round">
    <line x1={fig.axis.x1} y1={fig.axis.y1} x2={fig.axis.x2} y2={fig.axis.y2} stroke={ink} stroke-width="1.5" />

    <!-- The lens or mirror -->
    {#if fig.element.filled}
      <path d={fig.element.path} fill={glass} stroke={ink} stroke-width="2" stroke-linejoin="round" />
    {:else}
      <path d={fig.element.path} fill="none" stroke={ink} stroke-width="3" />
    {/if}
    {#each fig.element.heads as points}<polygon {points} fill={ink} />{/each}
    {#if fig.element.hatches.length}
      <g stroke={ink} stroke-width="1.3">
        {#each fig.element.hatches as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
      </g>
    {/if}

    <!-- Dimension arrows, their lines out, and the scale -->
    <g stroke={p.hidden} stroke-width="1">
      {#each fig.marks as m}
        {#each m.extensions as e}<line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />{/each}
      {/each}
    </g>
    {#each fig.marks as m}<DimensionLine m={m.line} color={ink} />{/each}
    {#if fig.ruler}
      {@const r = fig.ruler}
      <g stroke={ink} stroke-width="1.2">
        <line x1={r.line.x1} y1={r.line.y1} x2={r.line.x2} y2={r.line.y2} />
        {#each r.ticks as t}<line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />{/each}
      </g>
      <g font-family={SANS} font-size={r.size} fill={ink} text-anchor="middle">
        {#each r.numbers as n}<text x={n.x} y={n.y}>{n.text}</text>{/each}
      </g>
      <text x={r.unit.x} y={r.unit.y} font-family={SANS} font-size={r.size} fill={ink}>cm</text>
    {/if}

    <!-- The rays: dashed lines first, then the light itself, with its arrowheads -->
    {#each fig.rays as ray}
      <g stroke={rayColor(ray.id)} fill="none">
        {#each ray.dashed as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke-width="1.4" stroke-dasharray="6 5" />{/each}
        {#each ray.solid as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke-width="1.7" />{/each}
      </g>
      {#each ray.heads as a}
        <polygon points="5,0 -4,-4.2 -4,4.2" fill={rayColor(ray.id)} transform="translate({a.x} {a.y}) rotate({a.angle})" />
      {/each}
    {/each}

    <!-- Focal points, the object and the image -->
    {#each fig.points as pnt}<circle cx={pnt.dot.x} cy={pnt.dot.y} r="3.2" fill={ink} />{/each}
    {@render arrow(fig.object, ink, false)}
    {#if fig.image}{@render arrow(fig.image, ink, !fig.image.real)}{/if}

    {#each fig.points as pnt}{@render text(pnt.label, pnt.at)}{/each}
    {@render text(settings.objectLabel, fig.objectLabelAt)}
    {#if fig.image}{@render text(settings.imageLabel, fig.imageLabelAt)}{/if}
    {#each fig.marks as m}{@render text(m.label, m.at)}{/each}
  </g>
</FigureFrame>
