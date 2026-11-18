<script lang="ts">
  // The table of values itself, as a self-contained SVG that prints crisply and
  // exports cleanly to PNG/SVG (fonts and colors are inline, no page CSS). A
  // blank cell is drawn empty. Clicking cells into blanks is PickLayer's job,
  // over this, so none of it reaches an export.
  import { INK, SANS } from '$shared/graph/grid'
  import { SERIF, type MathBox } from '$lib/shared/mathSvg.js'
  import { buildTable, type TableLayout } from './layout.js'
  import type { Settings } from './settings.js'

  let { settings, layout, svg = $bindable() }: { settings: Settings; layout?: TableLayout; svg?: SVGSVGElement } = $props()

  const t = $derived(layout ?? buildTable(settings))
  const label = $derived.by(() => {
    const name = settings.titleMode === 'text' && settings.title.trim() ? settings.title.trim() : 'Table of values'
    const pairs = t.read.xs.map((x, k) => {
      const y = t.read.ys[k]
      const say = (c: typeof x) => (c.blank || !c.written ? 'blank' : c.written.replace(/-/g, '−').replace(/pi/g, 'π'))
      return `${say(x)}, ${say(y)}`
    })
    return pairs.length ? `${name}: ${pairs.join('; ')}` : name
  })
  const SHADE = '#e5e7eb'
</script>

{#snippet mathAt(x: number, y: number, box: MathBox)}
  <g transform="translate({x} {y})">
    {#each box.items as it}
      {#if it.kind === 'text'}
        <text
          x={it.x.toFixed(1)} y={it.y.toFixed(1)} font-family={SERIF} font-size={it.size.toFixed(1)} font-style={it.italic ? 'italic' : undefined}
          fill={INK} xml:space="preserve"
        >{it.text}</text>
      {:else if it.kind === 'line'}
        <line x1={it.x1.toFixed(1)} y1={it.y1.toFixed(1)} x2={it.x2.toFixed(1)} y2={it.y2.toFixed(1)} stroke={INK} stroke-width={it.width} />
      {:else}
        <polyline points={it.points.map((p) => p.join(',')).join(' ')} fill="none" stroke={INK} stroke-width={it.width} stroke-linejoin="round" stroke-linecap="round" />
      {/if}
    {/each}
  </g>
{/snippet}

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

  <g stroke={INK} stroke-width="1">
    {#each t.rects as r}<rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.shade ? SHADE : 'none'} />{/each}
  </g>
  <rect x={t.outline.x} y={t.outline.y} width={t.outline.w} height={t.outline.h} fill="none" stroke={INK} stroke-width="2" />

  <g font-family={SANS} font-size={t.fs} fill={INK}>
    {#each t.texts as x}<text x={x.x} y={x.y} font-weight={x.bold ? 'bold' : undefined}>{x.text}</text>{/each}
  </g>
  {#each t.math as m}{@render mathAt(m.x, m.y, m.box)}{/each}

  {#if t.title}
    <text x={t.title.x} y={t.title.y} text-anchor="middle" font-family={SANS} font-size={t.titleFs} font-weight="bold" fill={INK}>{t.title.text}</text>
  {/if}
  {#if t.titleBlank}
    <line x1={t.titleBlank.x1} y1={t.titleBlank.y1} x2={t.titleBlank.x2} y2={t.titleBlank.y2} stroke={INK} stroke-width="1.5" />
  {/if}
  {#if t.rule}{@render mathAt(t.rule.x, t.rule.y, t.rule.box)}{/if}
  {#if t.ruleBlank}
    <line x1={t.ruleBlank.x1} y1={t.ruleBlank.y1} x2={t.ruleBlank.x2} y2={t.ruleBlank.y2} stroke={INK} stroke-width="1.5" />
  {/if}
</svg>
