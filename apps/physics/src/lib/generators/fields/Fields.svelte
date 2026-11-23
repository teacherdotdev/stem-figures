<script lang="ts">
  // The Electric and Magnetic Field figure, as a self-contained SVG that prints
  // crisply and exports cleanly (fonts and colors inline, no page CSS). Lines
  // go first, so the charges, plates, magnet and wire sit on top of their ends.
  import { SANS, palette } from '$lib/shared/figure'
  import { linePath } from '$lib/shared/field'
  import { CHARGE_R, WIRE_R, buildFields, describe } from './fields'
  import type { FieldSettings } from './settings'

  let { settings, id = 'e' }: { settings: FieldSettings; id?: string } = $props()

  const fig = $derived(buildFields(settings))
  const p = $derived(palette(settings.color))
  // In color, + is red and − is blue, like a magnet's N and S; in black and white, the signs tell them apart.
  const plus = $derived(settings.color ? p.north : p.ink)
  const minus = $derived(settings.color ? p.south : p.ink)
  const PLATE = 8
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {fig.width} {fig.height}"
  width={fig.width}
  height={fig.height}
  role="img"
  aria-label={describe(settings)}
  id="{id}-fields"
>
  <defs>
    <clipPath id="{id}-clip"><rect width={fig.width} height={fig.height} /></clipPath>
  </defs>
  <rect class="paper" width={fig.width} height={fig.height} fill="#fff" />

  {#if settings.fieldLines}
    <g clip-path="url(#{id}-clip)" fill="none" stroke-linecap="round">
      {#each fig.lines as line}<path d={linePath(line.points)} stroke={p.field} stroke-width="1.6" />{/each}
      {#if settings.arrows}
        {#each fig.lines as line}
          {#each line.arrows as a}
            <polygon points="6,0 -5,-5 -5,5" fill={p.field} transform="translate({a.x} {a.y}) rotate({a.angle})" />
          {/each}
        {/each}
      {/if}
    </g>
  {/if}

  {#each fig.charges as c}
    {@const color = c.q > 0 ? plus : minus}
    <circle cx={c.x} cy={c.y} r={CHARGE_R} fill={settings.color ? color : '#fff'} stroke={color} stroke-width="2.5" />
    <!-- The sign drawn as strokes, so it sits exactly in the middle in every font. -->
    <g stroke={settings.color ? '#fff' : p.ink} stroke-width="3" stroke-linecap="round">
      <line x1={c.x - 9} y1={c.y} x2={c.x + 9} y2={c.y} />
      {#if c.q > 0}<line x1={c.x} y1={c.y - 9} x2={c.x} y2={c.y + 9} />{/if}
    </g>
  {/each}

  {#if fig.plates}
    {@const pl = fig.plates}
    <rect x={pl.left} y={pl.top - PLATE} width={pl.right - pl.left} height={PLATE} fill={plus} />
    <rect x={pl.left} y={pl.bottom} width={pl.right - pl.left} height={PLATE} fill={minus} />
    <g stroke-width="2.5" stroke-linecap="round">
      {#each pl.signs as x}
        {@const y = pl.top - PLATE - 14}
        <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke={plus} />
        <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke={plus} />
        <line x1={x - 6} y1={pl.bottom + PLATE + 14} x2={x + 6} y2={pl.bottom + PLATE + 14} stroke={minus} />
      {/each}
    </g>
  {/if}

  {#if fig.magnet}
    {@const m = fig.magnet}
    {@const half = m.length / 2}
    <rect x={m.x} y={m.y} width={half} height={m.height} fill={p.south} />
    <rect x={m.x + half} y={m.y} width={half} height={m.height} fill={p.north} />
    <rect x={m.x} y={m.y} width={m.length} height={m.height} fill="none" stroke={p.ink} stroke-width="2.5" />
    <line x1={m.x + half} y1={m.y} x2={m.x + half} y2={m.y + m.height} stroke={p.ink} stroke-width="1.5" />
    {#each [{ letter: 'S', x: m.x + half / 2, fill: p.onSouth }, { letter: 'N', x: m.x + 1.5 * half, fill: p.onNorth }] as pole}
      <text x={pole.x} y={m.y + m.height / 2 + 9} text-anchor="middle" font-family={SANS} font-size="26" font-weight="bold" fill={pole.fill}>{pole.letter}</text>
    {/each}
  {/if}

  {#if fig.wire}
    {@const w = fig.wire}
    <circle cx={w.x} cy={w.y} r={WIRE_R} fill="#fff" stroke={p.ink} stroke-width="2.5" />
    {#if w.current === 'out'}
      <circle cx={w.x} cy={w.y} r="5" fill={p.ink} />
    {:else}
      {@const d = WIRE_R * 0.55}
      <g stroke={p.ink} stroke-width="2.5" stroke-linecap="round">
        <line x1={w.x - d} y1={w.y - d} x2={w.x + d} y2={w.y + d} />
        <line x1={w.x - d} y1={w.y + d} x2={w.x + d} y2={w.y - d} />
      </g>
    {/if}
  {/if}
</svg>
