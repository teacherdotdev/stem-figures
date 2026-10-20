<script lang="ts">
  // The Ray Diagram Generator: the lens or mirror, the object, the rays and
  // how much is shown, the labels and marks down the left, the figure on the
  // right. Settings live in the page address.
  import { ArrowUpFromLine, Flashlight, Glasses, Ruler, SlidersHorizontal, Tag, Type } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import FigureTextSettings from '$shared/FigureTextSettings.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import { CAP } from './figure'
  import { ELEMENTS, RAYS_OF, cmText, imageOf, isLens, type Element, type RayId } from './optics'
  import RayDiagram from './RayDiagram.svelte'
  import { answerLines, raySettings, type Shown } from './settings'

  const gen = generatorState(raySettings, 'ray-diagram', { history: 'physicsfigures.ray-diagram.history', presets: 'physicsfigures.ray-diagram.presets' })
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const ELEMENT_NAMES: Record<Element, string> = {
    converging: 'Converging lens',
    diverging: 'Diverging lens',
    concave: 'Concave mirror',
    convex: 'Convex mirror',
    plane: 'Plane mirror',
  }
  const SHOWN_NAMES: Record<Shown, string> = { setup: 'Setup', rays: 'Rays', complete: 'Complete' }

  const lens = $derived(isLens(clean.element))
  const plane = $derived(clean.element === 'plane')
  const converging = $derived(clean.element === 'converging' || clean.element === 'concave')
  const image = $derived(imageOf(clean.element, clean.focalLength, clean.distance, clean.height))
  const offEdge = $derived(!!image && !plane && Math.abs(image.x) > CAP * clean.focalLength + 1e-9)
  const thing = $derived(lens ? 'lens' : 'mirror')

  // Quick places for the object, in focal lengths. On a mirror, 2F is C.
  const PLACES = [
    { at: 3, lens: 'Beyond 2F', mirror: 'Beyond C' },
    { at: 2, lens: 'At 2F', mirror: 'At C' },
    { at: 1.5, lens: 'Between F and 2F', mirror: 'Between C and F' },
    { at: 1, lens: 'At F', mirror: 'At F' },
    { at: 0.5, lens: 'Inside F', mirror: 'Inside F' },
  ]
  const place = (at: number) => (s.distance = Math.round(clean.focalLength * at * 100) / 100)

  const RAY_KEYS: Record<RayId, 'parallelRay' | 'centerRay' | 'focalRay' | 'vertexRay' | 'upperRay'> = {
    parallel: 'parallelRay',
    center: 'centerRay',
    focal: 'focalRay',
    vertex: 'vertexRay',
    upper: 'upperRay',
  }
  const rayName = (id: RayId): string => {
    const e = clean.element
    if (e === 'plane') return id === 'vertex' ? 'To the mirror level with the object’s foot' : 'To the mirror above the tip'
    if (id === 'parallel') return converging ? `Parallel, then through ${lens ? 'F′' : 'F'}` : 'Parallel, then as if from F'
    if (id === 'focal') return converging ? 'Through F, then parallel' : `Toward ${lens ? 'F′' : 'F'}, then parallel`
    if (id === 'center') return lens ? 'Through the center, straight on' : converging ? 'Through C, back on itself' : 'Toward C, back on itself'
    return 'To the vertex, back at the same angle'
  }
  const rays = $derived(RAYS_OF[clean.element])
  const anyRay = $derived(rays.some((id) => clean[RAY_KEYS[id]]))

  const shown = (l: Label) => (l.mode === 'text' ? `“${l.text}”` : l.mode === 'blank' ? 'blank' : '')
  const elementSummary = $derived(
    [ELEMENT_NAMES[clean.element], plane ? '' : `f = ${clean.focalLength} cm`, lens && clean.lensStyle === 'symbol' ? 'symbol' : ''].filter(Boolean).join(' · '),
  )
  const objectSummary = $derived(`${clean.distance} cm away · ${clean.height} cm tall${clean.inverted ? ' · inverted' : ''}`)
  const raysSummary = $derived(
    clean.shown === 'setup' ? 'Setup only, for students to draw the rays' : `${SHOWN_NAMES[clean.shown]} · ${rays.filter((id) => clean[RAY_KEYS[id]]).length} of ${rays.length} rays`,
  )
  const pointLabels = $derived(
    plane
      ? []
      : lens
        ? [
            { key: 'fLabel', name: 'F' },
            { key: 'fBackLabel', name: 'F′' },
            { key: 'twoFLabel', name: '2F' },
            { key: 'twoFBackLabel', name: '2F′' },
          ]
        : [
            { key: 'fLabel', name: 'F' },
            { key: 'cLabel', name: 'C' },
          ],
  ) as { key: 'fLabel' | 'fBackLabel' | 'twoFLabel' | 'twoFBackLabel' | 'cLabel'; name: string }[]
  const labelsSummary = $derived(
    [...pointLabels.map((l) => shown(clean[l.key])), shown(clean.objectLabel), clean.shown === 'complete' ? shown(clean.imageLabel) : '']
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const MARKS = [
    { mark: 'doMark', label: 'doLabel', name: 'Object distance' },
    { mark: 'diMark', label: 'diLabel', name: 'Image distance' },
    { mark: 'fMark', label: 'fMarkLabel', name: 'Focal length' },
    { mark: 'hoMark', label: 'hoLabel', name: 'Object height' },
    { mark: 'hiMark', label: 'hiLabel', name: 'Image height' },
  ] as const
  const marks = $derived(MARKS.filter((m) => !(plane && m.mark === 'fMark')))
  const marksSummary = $derived(
    [...marks.filter((m) => clean[m.mark]).map((m) => shown(clean[m.label]) || m.name.toLowerCase()), clean.scale ? 'cm scale' : ''].filter(Boolean).join(' · ') ||
      'none',
  )
  const textSummary = $derived(
    [clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title', clean.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
</script>

<GeneratorPage name="Ray Diagram Generator" filename="ray-diagram" {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet settings()}
    <Section title="Lens or mirror" icon={Glasses} summary={elementSummary}>
      <div class="head-row">
        <span class="field-name">Type</span>
        <HelpTip id="ray-element-tip" label="How the figure is worked out">
          Drawn to scale in cm. The image is where 1/f = 1/d<sub>o</sub> + 1/d<sub>i</sub> puts it. Rays bend at the line
          through the middle of a lens, and reflect at the line through a mirror’s vertex, as textbooks draw them, so they
          meet exactly at the image. The answer key takes real as positive.
        </HelpTip>
      </div>
      <div class="chips" role="radiogroup" aria-label="Lens or mirror">
        {#each ELEMENTS as e (e)}
          <button type="button" role="radio" aria-checked={s.element === e} class="chip" class:on={s.element === e} onclick={() => (s.element = e)}>
            {ELEMENT_NAMES[e]}
          </button>
        {/each}
      </div>
      {#if lens}
        <div class="field below">
          Drawn as
          <Choice name="Lens drawn as" options={[['shape', 'Lens shape'], ['symbol', 'Line symbol']] as const} bind:value={s.lensStyle} />
        </div>
      {/if}
      {#if !plane}
        <label class="field below">
          Focal length (cm)
          <input type="number" min="1" max="100" step="any" bind:value={s.focalLength} />
        </label>
      {/if}
    </Section>

    <Section title="Object" icon={ArrowUpFromLine} summary={objectSummary}>
      <div class="field-row">
        <label class="field">
          Distance (cm)
          <input type="number" min="0.5" max="300" step="any" bind:value={s.distance} />
        </label>
        <label class="field">
          Height (cm)
          <input type="number" min="0.1" max="100" step="any" bind:value={s.height} />
        </label>
      </div>
      {#if !plane}
        <div class="field">
          Place it
          <div class="chips places">
            {#each PLACES as q (q.at)}
              {@const on = Math.abs(clean.distance - clean.focalLength * q.at) < 0.005}
              <button type="button" class="chip" class:on aria-pressed={on} onclick={() => place(q.at)}>{lens ? q.lens : q.mirror}</button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="field">
        Arrow
        <Choice name="Object arrow" options={[['up', 'Upright'], ['down', 'Inverted']] as const} bind:value={() => (s.inverted ? 'down' : 'up'), (v) => (s.inverted = v === 'down')} />
      </div>
      {#if !image}
        <p class="note warning" role="status">The object is at F, so its rays leave parallel and there’s no image.</p>
      {:else if offEdge}
        <p class="note warning" role="status">
          The image is {cmText(Math.abs(image.distance))} from the {thing}, past the edge of the figure, so its rays run off the edge.
        </p>
      {/if}
    </Section>

    <Section title="Rays and image" icon={Flashlight} summary={raysSummary}>
      <div class="field">
        Show
        <Choice name="Show" options={[['setup', 'Setup'], ['rays', 'Rays'], ['complete', 'Complete']] as const} bind:value={s.shown} />
      </div>
      {#if clean.shown !== 'setup'}
        {#each rays as id (id)}
          <label class="check"><input type="checkbox" bind:checked={s[RAY_KEYS[id]]} /> {rayName(id)}</label>
        {/each}
        {#if !anyRay}<p class="note warning" role="status">Turn on a ray to draw it.</p>{/if}
      {/if}
    </Section>

    <Section title="Labels" icon={Tag} summary={labelsSummary}>
      {#each pointLabels as l (l.key)}
        <div class="field">{l.name} <LabelField name="{l.name} label" bind:label={s[l.key]} /></div>
      {/each}
      <div class="field">Object <LabelField name="Object label" bind:label={s.objectLabel} /></div>
      {#if clean.shown === 'complete'}
        <div class="field">Image <LabelField name="Image label" bind:label={s.imageLabel} /></div>
      {/if}
    </Section>

    <Section title="Marks" icon={Ruler} summary={marksSummary}>
      {#each marks as m (m.mark)}
        <div class="mark">
          <label class="check"><input type="checkbox" bind:checked={s[m.mark]} /> {m.name}</label>
          {#if clean[m.mark]}
            {#if (m.mark === 'diMark' || m.mark === 'hiMark') && clean.shown !== 'complete'}
              <p class="note warning" role="status">Shown with the image.</p>
            {:else if (m.mark === 'diMark' || m.mark === 'hiMark') && (!image || offEdge)}
              <p class="note warning" role="status">There’s no image in the figure to mark.</p>
            {:else}
              <div class="field"><LabelField name="{m.name} label" bind:label={s[m.label]} /></div>
            {/if}
          {/if}
        </div>
      {/each}
      <label class="check"><input type="checkbox" bind:checked={s.scale} /> Numbered cm scale</label>
    </Section>

    <Section title="Title and answer key" icon={Type} summary={textSummary}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answerLines(clean).join(' · ')} />
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={clean.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <RayDiagram settings={clean} bind:svg id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.45rem; }
  .field-name { font-weight: 600; font-size: 0.88rem; }
  .below { margin-top: 0.9rem; }
  .places { gap: 0.35rem; }
  .places .chip { font-size: 0.82rem; }
  .mark + .mark { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.25rem; }
  .mark:last-of-type { margin-bottom: 0.75rem; }
  .warning { color: var(--ink); background: #fffbeb; border-left: 3px solid var(--amber); border-radius: 6px; padding: 0.5rem 0.7rem; margin: 0.5rem 0 0; }
</style>
