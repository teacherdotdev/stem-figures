<script lang="ts">
  // The Pulley figure, as a self-contained SVG that prints crisply and exports
  // cleanly. Shapes are drawn inside the mirror transform; labels outside it,
  // so they stay readable.
  import FigureLabel from '$lib/shared/FigureLabel.svelte'
  import { baselineBelowMiddle } from '$lib/shared/label'
  import ObjectShape from '$lib/shared/ObjectShape.svelte'
  import Support from '$lib/shared/Support.svelte'
  import { ceilingHatches } from '$lib/shared/support'
  import VectorArrow from '$lib/shared/VectorArrow.svelte'
  import { styleOf } from '$lib/shared/vector'
  import { mirrorTransform, mirrorX, palette } from '$lib/shared/figure'
  import { buildPulley, type Wheel } from './pulley'
  import type { PulleySettings } from './settings'

  let { settings, id = 'p' }: { settings: PulleySettings; id?: string } = $props()

  const fig = $derived(buildPulley(settings))
  const p = $derived(palette(settings.color))
  const mx = (x: number) => mirrorX(settings.mirror, fig.width, x)
  const SIZE = 22

  function arcPath(wheel: Wheel, from: number, to: number) {
    const at = (deg: number) => {
      const a = (deg * Math.PI) / 180
      return `${Math.round((wheel.cx + wheel.r * Math.cos(a)) * 100) / 100},${Math.round((wheel.cy + wheel.r * Math.sin(a)) * 100) / 100}`
    }
    return `M${at(from)} A${wheel.r},${wheel.r} 0 ${to - from > 180 ? 1 : 0} 1 ${at(to)}`
  }
  const three = $derived(settings.objects.length > 2)
  const row = $derived(three ? `Two objects ${settings.joined === 'touching' ? 'touching' : 'tied together'}` : 'An object')
  const description = $derived(
    {
      atwood: `An Atwood machine: two objects hanging from a string over a pulley${three ? `, and a third hanging below the ${settings.below === 'a' ? 'left' : 'right'} one` : ''}`,
      table: `${row} on a table tied over a pulley at its edge to a hanging object`,
      ramp: `${row} on a ramp tied over a pulley at its top to a hanging object`,
      tackle: `A block and tackle: a load held up by ${settings.strands} strand${settings.strands === 1 ? '' : 's'} of rope`,
    }[settings.setup],
  )
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={description}
  id="{id}-pulley"
>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />
  <g transform={mirrorTransform(settings.mirror, fig.width)} fill="none" stroke-linecap="round">
    {#if fig.ceiling}<Support support={{ line: fig.ceiling, hatches: ceilingHatches(fig.ceiling) }} ink={p.ink} />{/if}
    {#if fig.ground}<Support support={{ line: fig.ground, hatches: fig.groundHatches }} ink={p.ink} />{/if}
    {#if fig.table}
      {#each fig.table.legs as l}<rect x={l.x} y={l.y} width={l.w} height={l.h} fill={p.surface} stroke={p.ink} stroke-width="2" />{/each}
      {@const t = fig.table.slab}
      <rect x={t.x} y={t.y} width={t.w} height={t.h} fill={p.surface} stroke={p.ink} stroke-width="2.5" />
    {/if}
    {#if fig.platform}
      {@const b = fig.platform}
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={p.surface} stroke={p.ink} stroke-width="2.5" />
    {/if}
    {#if fig.ramp}
      {@const r = fig.ramp}
      <path d="M{r.foot.x},{r.foot.y} L{r.corner.x},{r.corner.y} L{r.top.x},{r.top.y} Z" fill={p.surface} stroke={p.ink} stroke-width="2.5" stroke-linejoin="round" />
      <path d={r.arc} transform="translate({r.foot.x} {r.foot.y})" stroke={p.ink} stroke-width="1.5" />
    {/if}
    {#each fig.hatches as h}<line x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} stroke={p.ink} stroke-width="1.3" />{/each}
    {#each fig.rods as r}<line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={p.ink} stroke-width="3" />{/each}

    {#each fig.strings as string}
      <polyline points={string.map((q) => `${q.x},${q.y}`).join(' ')} stroke={p.ink} stroke-width="2.2" stroke-linejoin="round" />
    {/each}

    {#each fig.wheels as w}
      <circle cx={w.cx} cy={w.cy} r={w.r} fill={p.surface} stroke={p.ink} stroke-width="2.5" />
      <circle cx={w.cx} cy={w.cy} r={w.r * 0.3} stroke={p.ink} stroke-width="1.5" />
      <circle cx={w.cx} cy={w.cy} r="3" fill={p.ink} />
    {/each}
    {#each fig.arcs as a}<path d={arcPath(a.wheel, a.from, a.to)} stroke={p.ink} stroke-width="2.2" />{/each}

    {#if fig.tackle}
      {@const t = fig.tackle}
      {#if t.bar}<line x1={t.bar.x1} y1={t.bar.y1} x2={t.bar.x2} y2={t.bar.y2} stroke={p.ink} stroke-width="5" />{/if}
      {#if t.hook}<line x1={t.hook.x1} y1={t.hook.y1} x2={t.hook.x2} y2={t.hook.y2} stroke={p.ink} stroke-width="2.2" />{/if}
      <!-- The free end, where the effort pulls. -->
      <circle cx={t.effort.x} cy={t.effort.y + 6} r="6" fill="#fff" stroke={p.ink} stroke-width="2.2" />
    {/if}

    {#each fig.objects as o}
      <g transform="translate({o.at.x} {o.at.y}) rotate({o.tilt})">
        <ObjectShape kind={o.kind} size={o.size} fill={p.object} stroke={p.ink} />
      </g>
    {/each}
    {#each fig.vectors as v}<VectorArrow v={v.v} color={p.vector} style={styleOf(v.kind)} halo={false} />{/each}
  </g>

  {#each fig.vectors as v}
    <FigureLabel label={v.label} x={mx(v.labelAt.x)} y={v.labelAt.y + SIZE * 0.35} size={SIZE} color={p.vector} />
  {/each}
  {#if fig.ramp}
    <FigureLabel label={settings.angleLabel} x={mx(fig.ramp.angleLabelAt.x)} y={fig.ramp.angleLabelAt.y + SIZE * 0.35} size={SIZE} color={p.ink} />
  {/if}
  {#each fig.objects as o}
    <FigureLabel label={o.label} x={mx(o.labelAt.x)} y={o.labelAt.y + baselineBelowMiddle(o.label, SIZE)} size={SIZE} color={p.ink} halo={false} blank={30} />
  {/each}
</svg>
