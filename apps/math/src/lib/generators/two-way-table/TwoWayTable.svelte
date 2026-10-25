<script lang="ts">
  // The two-way table itself, as a self-contained SVG that prints crisply and
  // exports cleanly to PNG/SVG (fonts and colors are inline, no page CSS). A
  // cell left empty in the settings is drawn empty.
  import { INK, SANS } from '$shared/graph/grid'
  import { SERIF } from '$lib/shared/mathSvg.js'
  import { buildTable } from './layout.js'
  import type { Settings } from './settings.js'

  let { settings, svg = $bindable() }: { settings: Settings; svg?: SVGSVGElement } = $props()

  const t = $derived(buildTable(settings))
  const label = $derived(settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Two-way table')
  const SHADE = '#e5e7eb'
</script>

<svg
  bind:this={svg}
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 {t.width} {t.height}"
  width={t.width}
  height={t.height}
  role="img"
  aria-label={label}
>
  <rect width={t.width} height={t.height} fill="#fff" />

  <g stroke={settings.rules === 'all' ? INK : 'none'} stroke-width="1">
    {#each t.rects as r}<rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.shade ? SHADE : 'none'} />{/each}
  </g>
  {#if t.outline}<polygon points={t.outline} fill="none" stroke={INK} stroke-width="2" stroke-linejoin="miter" />{/if}
  <g stroke={INK} stroke-width="1.5" stroke-linecap="square">
    {#each t.rules as l}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
  </g>

  <g font-family={SANS} font-size={t.fs} fill={INK}>
    {#each t.texts as x}
      <text
        x={x.x} y={x.y} text-anchor={x.anchor} font-weight={x.bold ? 'bold' : undefined}
        transform={x.rotate ? `rotate(-90 ${x.x} ${x.y})` : undefined}
      >{x.text}</text>
    {/each}
    {#each t.fractions as f}
      <g font-weight={f.bold ? 'bold' : undefined} text-anchor="middle">
        <text x={f.x} y={f.y - t.fs * 0.25}>{f.num}</text>
        <line x1={f.x - f.w / 2} y1={f.y} x2={f.x + f.w / 2} y2={f.y} stroke={INK} stroke-width="1.3" />
        <text x={f.x} y={f.y + t.fs}>{f.den}</text>
      </g>
    {/each}
  </g>

  {#each t.math as m}
    <g transform="translate({m.x} {m.y})">
      {#each m.box.items as it}
        {#if it.kind === 'text'}
          <text
            x={it.x.toFixed(1)} y={it.y.toFixed(1)} font-family={SERIF} font-size={it.size} font-style={it.italic ? 'italic' : undefined}
            fill={INK} xml:space="preserve"
          >{it.text}</text>
        {:else if it.kind === 'line'}
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke={INK} stroke-width={it.width} />
        {:else}
          <polyline points={it.points.map((p) => p.join(',')).join(' ')} fill="none" stroke={INK} stroke-width={it.width} stroke-linejoin="round" stroke-linecap="round" />
        {/if}
      {/each}
    </g>
  {/each}

  {#if t.title}
    <text x={t.title.x} y={t.title.y} text-anchor="middle" font-family={SANS} font-size={t.fs * 1.15} font-weight="bold" fill={INK}>{t.title.text}</text>
  {/if}
  {#if t.titleBlank}
    <line x1={t.titleBlank.x1} y1={t.titleBlank.y1} x2={t.titleBlank.x2} y2={t.titleBlank.y2} stroke={INK} stroke-width="1.5" />
  {/if}
</svg>
