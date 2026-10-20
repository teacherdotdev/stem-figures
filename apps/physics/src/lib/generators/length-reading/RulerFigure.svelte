<script lang="ts">
  // Length Reading's ruler figure for a set of settings: a ruler with the object
  // lying along its marked edge, and a magnifier above each end being read,
  // the right end only while the left is lined up with 0. With `onmove`, the
  // object can be dragged along the ruler: onmove(start) gets where its left
  // end would be, in cm or inches.
  import FigureFrame from '$shared/FigureFrame.svelte'
  import Magnifier from '$shared/Magnifier.svelte'
  import { sizeAt } from '$shared/magnify'
  import Ruler from './Ruler.svelte'
  import RulerObject from './RulerObject.svelte'
  import { rulerLayout } from './layout'
  import { objectHeight, objectOnRuler } from './objects'
  import { rulerGeometry, rulerScale } from './ruler'
  import { answerLine, endOf, figureLabel, type LengthSettings } from './settings'

  interface Props {
    settings: LengthSettings
    svg?: SVGSVGElement
    onmove?: ((start: number) => void) | null
  }
  let { settings, svg = $bindable(), onmove = null }: Props = $props()

  const scale = $derived(rulerScale(settings))
  const g = $derived(rulerGeometry(scale))
  const end = $derived(endOf(settings))
  const placed = $derived(objectOnRuler(settings.object, settings.marbles, g.xOf(settings.start), g.xOf(end)))
  // Room above the ruler for the object, and a little more.
  const top = $derived(Math.ceil(objectHeight(placed)) + 6)
  const height = $derived(top + g.height)

  const sources = $derived.by(() => {
    if (settings.view === 'whole') return []
    const r = (settings.span * scale.numbered * g.perUnit) / 2
    // A little below the ruler's edge, so the object's end shows above it
    // and the marks and numbers below.
    const y = top + Math.min(0.3 * r, 20)
    return (settings.start ? [settings.start, end] : [end]).map((v) => ({ x: g.xOf(v), y, r }))
  })
  const layout = $derived(rulerLayout(g.width, height, sources, g.xOf(0), g.xOf(scale.size)))

  let drag: { id: number; x: number; start: number } | null = null

  function down(event: PointerEvent & { currentTarget: Element }) {
    if (!onmove || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag = { id: event.pointerId, x: event.clientX, start: settings.start }
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return
    const k = svg?.getScreenCTM()?.a || 1
    onmove!(drag.start + (event.clientX - drag.x) / k / g.perUnit)
  }
  function up(event: PointerEvent) {
    if (drag?.id === event.pointerId) drag = null
  }
</script>

{#snippet drawing(zoom: number, draggable: boolean)}
  <g transform="translate(0 {top})">
    <Ruler {g} {scale} {zoom} />
    {#if settings.guides}
      {#each [settings.start, end] as v (v)}
        <line
          x1={g.xOf(v)} x2={g.xOf(v)} y1={4 - top} y2="0"
          stroke="#111" stroke-width={1.2 * sizeAt(zoom)} stroke-dasharray="{5 * sizeAt(zoom)} {4 * sizeAt(zoom)}"
        />
      {/each}
    {/if}
    {#if draggable && onmove}
      <!-- Dragging is a shortcut for the mouse; the Left end box does the
           same for everyone. -->
      <g
        class="draggable"
        style="cursor: grab; touch-action: none"
        role="presentation"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
      >
        <RulerObject {placed} k={sizeAt(zoom)} />
      </g>
    {:else}
      <RulerObject {placed} k={sizeAt(zoom)} />
    {/if}
  </g>
{/snippet}

{#snippet scene(zoom: number)}
  {@render drawing(zoom, false)}
{/snippet}

<FigureFrame
  bind:svg
  width={layout.width}
  height={layout.height}
  label={figureLabel(settings)}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLine(settings) : ''}
>
  <g transform="translate({layout.origin.x} {layout.origin.y})">{@render drawing(1, true)}</g>
  {#each layout.magnifiers as target, i (i)}
    <Magnifier source={sources[i]} {target} marked origin={layout.origin} {scene} />
  {/each}
</FigureFrame>

<style>
  .draggable:active { cursor: grabbing; }
</style>
