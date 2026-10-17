<script lang="ts">
  // The Food Webs and Energy Pyramids figure: a web or chain of organisms
  // in boxes with their names under them and arrows the way energy flows,
  // or an energy pyramid. With `onselect`, clicking an organism selects it
  // for changing; the selection and click targets are left out of exports.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import { answerText, buildFigure, describeFigure, fillOf } from './figure'
  import { uploads } from './images'
  import { BLANK_WIDTH, BOX, headPath, lineHeight, NAME_GAP, PICTURE, type Node } from './layout'
  import { energyText } from './pyramid'
  import Picture from './Picture.svelte'
  import type { FoodWebSettings } from './settings'
  import { UPLOAD } from './web'

  interface Props {
    settings: FoodWebSettings
    selected?: string | null
    onselect?: (key: string) => void
    id?: string
    svg?: SVGSVGElement
  }
  let { settings, selected = null, onselect, id, svg = $bindable() }: Props = $props()

  const INK = '#111'
  const fig = $derived(buildFigure(settings))
  const layout = $derived(fig.layout)
  const pyramid = $derived(fig.pyramid)
  const font = $derived(layout?.font ?? pyramid?.font ?? 15)
  const lh = $derived(lineHeight(font))
  const picked = $derived(selected ? layout?.nodes.find((n) => n.key === selected) : undefined)

  const blankPicture = (n: Node) => n.entry.blank === 'p' || n.entry.blank === 'b'
  /** An upload this browser doesn't have: drawn as a dashed box. */
  const missing = (picture: string) => UPLOAD.test(picture) && !uploads.get(picture)
  const r = (n: number) => Math.round(n * 10) / 10
</script>

{#snippet blank(x: number, y: number, width: number)}
  <line x1={r(x)} y1={r(y)} x2={r(x + width)} y2={r(y)} stroke={INK} stroke-width="1.3" />
{/snippet}

{#snippet organism(n: Node)}
  {@const boxX = n.x - n.boxWidth / 2}
  {@const none = n.entry.picture === 'none'}
  {@const lost = !none && !blankPicture(n) && missing(n.entry.picture)}
  {#if lost}
    <rect x={r(boxX + 1)} y={r(n.top + 1)} width={n.boxWidth - 2} height={n.boxHeight - 2} rx="8" fill="none" stroke={INK} stroke-width="1.3" stroke-dasharray="6 5" />
  {:else if settings.boxes || none || blankPicture(n)}
    <rect x={r(boxX + 0.75)} y={r(n.top + 0.75)} width={n.boxWidth - 1.5} height={n.boxHeight - 1.5} rx="8" fill="#fff" stroke={INK} stroke-width="1.5" />
  {/if}
  {#if !none && !blankPicture(n) && !lost}
    <Picture picture={n.entry.picture} x={n.x - PICTURE / 2} y={n.top + (BOX - PICTURE) / 2} size={PICTURE} color={settings.colors === 'color'} />
  {/if}
  {#if none}
    {#if n.lines.length}
      {#each n.lines as line, i (i)}
        <text x={r(n.x)} y={r(n.top + n.boxHeight / 2 - (n.lines.length * lh) / 2 + font * 0.85 + i * lh)} text-anchor="middle" font-size={font} fill={INK}>{line}</text>
      {/each}
    {:else}
      {@render blank(n.x - BLANK_WIDTH / 2 + 8, n.top + n.boxHeight / 2 + font * 0.4, BLANK_WIDTH - 16)}
    {/if}
  {:else if n.lines.length}
    {#each n.lines as line, i (i)}
      <text x={r(n.x)} y={r(n.top + BOX + NAME_GAP + font * 0.9 + i * lh)} text-anchor="middle" font-size={font} fill={INK}>{line}</text>
    {/each}
  {:else}
    {@render blank(n.x - BLANK_WIDTH / 2, n.top + BOX + NAME_GAP + lh - 1, BLANK_WIDTH)}
  {/if}
{/snippet}

<FigureFrame
  bind:svg
  width={fig.width}
  height={fig.height}
  label={describeFigure(settings, fig)}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerText(settings, fig) : ''}
>
  {#if layout}
    <g {id}>
      {#if picked}
        <rect data-no-export x={r(picked.x - picked.width / 2 - 8)} y={r(picked.top - 8)} width={picked.width + 16} height={picked.height + 16} rx="10" fill="#dbeafe" />
      {/if}
      {#each layout.labels as l, i (i)}
        {#if settings.levelLabels === 'blank'}
          {@render blank(l.anchor === 'start' ? l.x : l.x - BLANK_WIDTH / 2, l.y + font * 0.4, BLANK_WIDTH)}
        {:else}
          <text x={r(l.x)} y={r(l.y)} dominant-baseline="central" text-anchor={l.anchor} font-size={font} font-weight="700" fill={INK}>{l.text}</text>
        {/if}
      {/each}
      {#if settings.arrows}
        <g fill="none" stroke={INK} stroke-width="2" stroke-dasharray="7 5">
          {#each layout.lines as d, i (i)}<path {d} />{/each}
        </g>
        {#each layout.arrows as a, i (i)}
          <path d={a.d} fill="none" stroke={INK} stroke-width="2" stroke-dasharray={a.dashed ? '7 5' : undefined} />
          <path d={headPath(a)} fill={INK} />
        {/each}
      {/if}
      {#each layout.nodes as n (n.key)}{@render organism(n)}{/each}
    </g>
    {#if onselect}
      <!-- Click targets for picking an organism to change. The same choices
           are in the settings for keyboard and screen reader users. -->
      <g data-no-export aria-hidden="true">
        {#each layout.nodes as n (n.key)}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <rect x={n.x - n.width / 2 - 4} y={n.top - 4} width={n.width + 8} height={n.height + 8} fill="transparent" style="cursor: pointer" onclick={() => onselect(n.key)} />
        {/each}
      </g>
    {/if}
  {:else if pyramid}
    <g {id}>
      {#each pyramid.levels as l (l.index)}
        <polygon points={l.points.map((p) => `${r(p.x)},${r(p.y)}`).join(' ')} fill={fillOf(settings.colors, l.index + 1)} stroke={INK} stroke-width="2" stroke-linejoin="round" />
        {@const rows = (l.name === null ? 1 : l.name.length) + (l.value === null ? 0 : 1)}
        {@const first = l.cy - (rows * lh) / 2 + font * 0.85}
        {#if l.name === null}
          {@render blank(l.cx - BLANK_WIDTH / 2, first + 2, BLANK_WIDTH)}
        {:else}
          {#each l.name as line, i (i)}
            <text x={r(l.cx)} y={r(first + i * lh)} text-anchor="middle" font-size={font} font-weight="700" fill={INK}>{line}</text>
          {/each}
        {/if}
        {#if l.value !== null}
          {@const y = first + (rows - 1) * lh}
          {#if l.blankValue}
            {@const unit = l.value.slice(energyText(l.energy).length + 1)}
            {@render blank(l.cx - 52, y + 2, 64)}
            <text x={r(l.cx + 18)} y={r(y)} font-size={font} fill={INK}>{unit}</text>
          {:else}
            <text x={r(l.cx)} y={r(y)} text-anchor="middle" font-size={font} fill={INK}>{l.value}</text>
          {/if}
        {/if}
        {#if l.picture}
          {@const p = l.picture}
          {#if p.entry.blank === 'p' || p.entry.blank === 'b' || p.entry.picture === 'none' || missing(p.entry.picture)}
            <rect x={r(p.x + 0.75)} y={r(p.y + 0.75)} width={p.size - 1.5} height={p.size - 1.5} rx="8" fill="none" stroke={INK} stroke-width="1.3" stroke-dasharray={missing(p.entry.picture) ? '6 5' : undefined} />
          {:else}
            <Picture picture={p.entry.picture} x={p.x} y={p.y} size={p.size} color={settings.colors === 'color'} />
          {/if}
        {/if}
        {#if l.heat}
          {@const h = l.heat}
          <line x1={r(h.from.x)} y1={r(h.from.y)} x2={r(h.to.x - 10)} y2={r(h.to.y)} stroke={INK} stroke-width="2" />
          <path d={headPath({ tip: h.to, angle: 0 })} fill={INK} />
          {#if h.text}
            <text x={r(h.x)} y={r(h.y)} dominant-baseline="central" font-size={font} fill={INK}>{h.text}</text>
          {:else}
            {@render blank(h.x, h.y + font * 0.4, BLANK_WIDTH)}
          {/if}
        {/if}
      {/each}
    </g>
  {/if}
</FigureFrame>
