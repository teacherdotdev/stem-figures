<script lang="ts">
  // The Dot-and-Cross Diagram figure: every ring and outer circle, the
  // element symbols in their middles, the electrons as marks, each ion's
  // brackets and charge, the numbers in front of ions, and the chart title
  // and answer key around it. With `onedit`, the teacher can click an
  // electron, symbol or charge to change it (editing.ts); the click targets
  // and their outline are marked data-no-export, so they stay out of copies,
  // downloads and example pictures, and aren't printed.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import Marks from './Marks.svelte'
  import { editItems, itemAt, type EditItem } from './editing'
  import type { EditTarget } from './edits'
  import { BLANK_CHARGE, COUNT_FONT, buildFigure } from './figure'
  import { INK } from './marks'
  import { BRACKET_ARM, CHARGE_FONT, SYMBOL_FONT } from './shells'
  import type { DotCrossSettings } from './settings'

  interface Props {
    settings: DotCrossSettings
    svg?: SVGSVGElement
    onedit?: (target: EditTarget) => void
  }
  let { settings, svg = $bindable(), onedit }: Props = $props()

  const figure = $derived(buildFigure(settings))

  // ---- Editing by hand --------------------------------------------------------

  /** Half a click target's least size on screen, in pixels: 24 across, for fingers. */
  const REACH_PX = 12
  const items = $derived(onedit ? editItems(figure) : [])
  /** The figure's on-screen pixels per unit, so targets stay big enough on a phone. */
  let scale = $state(1)
  const reach = $derived(Math.max(6, REACH_PX / scale))
  let layer = $state<SVGGElement>()
  /** the item under the pointer, and the one the keyboard is on */
  let hovered = $state<string | null>(null)
  let current = $state<string | null>(null)
  let focusShown = $state(false)
  /** The one target Tab stops at; the arrow keys move between them. */
  const tabKey = $derived(items.some((it) => it.key === current) ? current : (items[0]?.key ?? null))
  const outlined = $derived(items.find((it) => it.key === (focusShown ? current : hovered)))

  $effect(() => {
    if (!onedit || !svg) return
    const el = svg
    // read so the scale is measured again when the drawing's size changes
    void [figure.width, figure.height]
    const measure = () => {
      const box = el.getBoundingClientRect()
      const vb = el.viewBox.baseVal
      if (vb.width && vb.height && box.width && box.height) scale = Math.min(box.width / vb.width, box.height / vb.height)
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => watch.disconnect()
  })

  /** The item at a pointer's place on the figure. */
  function pick(e: MouseEvent | PointerEvent) {
    const m = layer?.getScreenCTM()
    if (!m) return undefined
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return itemAt(items, p.x, p.y, reach)
  }

  function edit(it: EditItem) {
    current = it.key
    onedit?.(it.target)
  }

  function onkeydown(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      edit(items[i])
      return
    }
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    const j = (to + items.length) % items.length
    current = items[j].key
    layer?.querySelectorAll<SVGRectElement>('.hit')[j]?.focus()
  }
</script>

<FigureFrame
  bind:svg
  width={figure.width}
  height={figure.height}
  label={figure.label}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={figure.keyLines.join('\n')}
>
  {#if figure.read.ok}
    {#each figure.circles as c, i (i)}
      <circle cx={c.x} cy={c.y} r={c.r} fill="none" stroke="#222" stroke-width="1.5" />
    {/each}
    {#each figure.symbols as t, i (i)}
      {#if !t.blank}
        <text x={t.x} y={t.y} dy="0.35em" text-anchor="middle" font-size={SYMBOL_FONT} fill={INK}>{t.text}</text>
      {/if}
    {/each}
    <Marks marks={figure.marks} />
    {#each figure.brackets as b, i (i)}
      <path
        d="M {b.x - b.half + BRACKET_ARM} {b.y - b.half} H {b.x - b.half} V {b.y + b.half} H {b.x - b.half + BRACKET_ARM} M {b.x + b.half - BRACKET_ARM} {b.y - b.half} H {b.x + b.half} V {b.y + b.half} H {b.x + b.half - BRACKET_ARM}"
        fill="none"
        stroke="#222"
        stroke-width="1.8"
      />
      {#if b.charge?.blank}
        <rect x={b.charge.x} y={b.charge.y - 16} width={BLANK_CHARGE} height="20" fill="none" stroke={INK} stroke-width="1.3" />
      {:else if b.charge}
        <text x={b.charge.x} y={b.charge.y} font-size={CHARGE_FONT} fill={INK}>{b.charge.text}</text>
      {/if}
    {/each}
    {#each figure.counts as t, i (i)}
      <text x={t.x} y={t.y} dy="0.35em" text-anchor="end" font-size={COUNT_FONT} fill={INK}>{t.text}</text>
    {/each}
    {#if onedit && items.length}
      <!-- Click targets, each at least 24 pixels across on screen; where they
           overlap, the item drawn nearest the pointer is the one changed. -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
      <g
        bind:this={layer}
        data-no-export
        class="edit-layer"
        role="toolbar"
        aria-label="Change the figure: electrons, symbols and charges"
        onpointermove={(e) => (hovered = pick(e)?.key ?? null)}
        onpointerdown={(e) => (hovered = pick(e)?.key ?? null)}
        onpointerleave={() => (hovered = null)}
        onclick={(e) => {
          const it = pick(e)
          if (it) edit(it)
        }}
      >
        {#if outlined}
          {@const o = outlined}
          {@const pad = 3}
          <rect
            class="outline"
            x={o.x - o.halfW - pad}
            y={o.y - o.halfH - pad}
            width={2 * (o.halfW + pad)}
            height={2 * (o.halfH + pad)}
            rx={Math.min(o.halfW, o.halfH) + pad}
          />
        {/if}
        {#each items as it, i (it.key)}
          <rect
            class="hit"
            role="button"
            tabindex={it.key === tabKey ? 0 : -1}
            aria-label={it.label}
            x={it.x - Math.max(it.halfW, reach)}
            y={it.y - Math.max(it.halfH, reach)}
            width={2 * Math.max(it.halfW, reach)}
            height={2 * Math.max(it.halfH, reach)}
            fill="transparent"
            onfocus={(e) => {
              current = it.key
              focusShown = e.currentTarget.matches(':focus-visible')
            }}
            onblur={() => (focusShown = false)}
            onkeydown={(e) => onkeydown(e, i)}
          />
        {/each}
      </g>
    {/if}
  {:else}
    <text x={figure.width / 2} y={figure.height / 2} dy="0.35em" text-anchor="middle" font-size="16" fill="#666">Nothing to draw</text>
  {/if}
</FigureFrame>

<style>
  .hit { cursor: pointer; outline: none; }
  .outline { fill: #dbeafe; fill-opacity: 0.45; stroke: #2563eb; stroke-width: 1.5px; vector-effect: non-scaling-stroke; pointer-events: none; }
  @media print {
    .edit-layer { display: none; }
  }
</style>
