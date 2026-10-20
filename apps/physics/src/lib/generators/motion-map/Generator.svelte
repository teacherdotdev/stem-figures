<script lang="ts">
  // The Motion Map Generator: the motion segment by segment (the Motion
  // Graph's SegmentList), the dots, arrows, number line, title and answer key
  // on the left, the figure on the right. Settings live in the page address,
  // and the motion's part of it means the same on the Motion Graph page, so
  // "See it as a motion graph" is a plain link.
  import { ChartLine, CircleDot, Heading, MoveRight, Route, Ruler, SlidersHorizontal } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { motionOf, numberText } from '../motion-graphs/motion'
  import SegmentList from '../motion-graphs/SegmentList.svelte'
  import type { Kind } from '../motion-graphs/settings'
  import { buildMap } from './map'
  import MotionMap from './MotionMap.svelte'
  import { DOT_LABELS, graphLink, mapSettings, STEPS, type DotLabels, type Step } from './settings'

  const gen = createGenerator(mapSettings, 'motion-map')
  const s = $derived(gen.snapshot())
  const m = $derived(motionOf(s.segments, s.start))
  const f = $derived(buildMap(s))
  let svg = $state<SVGSVGElement>()

  const shown = (l: Label) => (l.mode === 'text' ? `“${l.text}”` : l.mode === 'blank' ? 'blank' : '')
  const SHORT: Record<Kind, string> = { rest: 'rest', forward: 'forward', back: 'back', faster: 'speeding up', slower: 'slowing down' }
  const LABEL_NAMES: Record<DotLabels, string> = {
    none: 'None',
    times: 'Times: t = 0 s, 1 s…',
    letters: 'A letter on every dot',
    ends: 'Letters at the segment ends, as on the motion graph',
  }
  const motionSummary = $derived(s.segments.map((g) => SHORT[g.kind]).join(', ') || 'none')
  const dotsSummary = $derived(
    [`every ${s.dt} s`, s.labels === 'none' ? '' : DOT_LABELS[s.labels].toLowerCase(), shown(s.object)].filter(Boolean).join(' · '),
  )
  const arrowsSummary = $derived(
    [s.dotsOnly ? 'dots only' : 'velocity', !s.dotsOnly && s.acceleration ? 'acceleration' : '', s.displacement ? `displacement ${shown(s.displacementLabel)}` : '']
      .filter(Boolean)
      .join(' · ')
      .replace(/  +/g, ' '),
  )
  const lineSummary = $derived([s.numbers ? 'numbered' : 'no numbers', s.origin ? 'origin' : ''].filter(Boolean).join(' · '))
  const textSummary = $derived([shown(s.title) || 'no title', s.answerKey ? 'answer key' : 'no answer key'].join(' · '))

  const times = (ts: number[]) => ts.map((t) => `${numberText(t)} s`).join(', ').replace(/, (?=[^,]*$)/, ' and ')
</script>

<GeneratorPage name="Motion Map Generator" filename="motion-map" {gen} {svg} settingsWidth={26} bind:labelSize={gen.s.labelSize}>
  {#snippet settings()}
    <Section title="Motion" icon={Route} summary={motionSummary}>
      <SegmentList bind:segments={gen.s.segments} bind:start={gen.s.start} clean={s.segments} {m} />
      <div class="link-row">
        <a class="btn-ghost small" href={graphLink(s)}><ChartLine size={16} aria-hidden="true" /> See it as a motion graph</a>
        <HelpTip id="motion-map-motion-tip" label="About the motion">
          Speeding up and slowing down carry on from the velocity before them. The Motion Graph Generator opens with the
          same segments and starting position, so its graphs and this map show the same motion.
        </HelpTip>
      </div>
    </Section>

    <Section title="Dots" icon={CircleDot} summary={dotsSummary}>
      <div class="field">
        <span class="head-row">
          Time between dots
          <HelpTip id="motion-map-dots-tip" label="How the dots are placed">
            A dot every Δt, where the object is at that moment. Dots at one spot while it’s at rest are drawn as one, with
            the times it’s there. Each time it turns back, the dots carry on above the ones before. At a segment end a dot
            takes the next segment’s velocity.
          </HelpTip>
        </span>
        <Choice name="Time between dots" options={STEPS.map((t) => [t, `${t} s`] as [Step, string])} bind:value={gen.s.dt} />
      </div>
      {#if f.offGrid.length}
        <p class="note warning" role="status">
          {f.offGrid.length === 1 ? 'The segment end at' : 'The segment ends at'}
          {times(f.offGrid)}
          {f.offGrid.length === 1 ? 'falls' : 'fall'} between dots, so no dot marks {f.offGrid.length === 1 ? 'it' : 'them'}.
        </p>
      {/if}
      {#if f.overlap}
        <p class="note warning" role="status">Some dots overlap. {s.dt === '2' ? 'Try fewer or longer segments.' : 'Try a longer time between dots.'}</p>
      {/if}
      <label class="field">
        On the dots
        <select bind:value={gen.s.labels}>
          {#each Object.keys(DOT_LABELS) as DotLabels[] as k}<option value={k}>{LABEL_NAMES[k]}</option>{/each}
        </select>
      </label>
      <div class="field">Object <LabelField name="Object label" placeholder="cart" bind:label={gen.s.object} /></div>
    </Section>

    <Section title="Arrows" icon={MoveRight} summary={arrowsSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.dotsOnly} /> Dots only, no arrows</label>
      {#if !s.dotsOnly}
        <label class="check"><input type="checkbox" bind:checked={gen.s.acceleration} /> Acceleration for each segment</label>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={gen.s.displacement} /> Total displacement</label>
      {#if s.displacement}
        <div class="field"><LabelField name="Displacement label" placeholder="Deltax" bind:label={gen.s.displacementLabel} /></div>
      {/if}
    </Section>

    <Section title="Number line" icon={Ruler} summary={lineSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.numbers} /> Numbers on the number line</label>
      <label class="check"><input type="checkbox" bind:checked={gen.s.origin} /> Mark the origin</label>
    </Section>

    <Section title="Title and answer key" icon={Heading} summary={textSummary}>
      <div class="field">Chart title <LabelField name="Chart title" placeholder="Motion of a cart" blank={false} bind:label={gen.s.title} /></div>
      <label class="check"><input type="checkbox" bind:checked={gen.s.answerKey} /> Answer key under the figure</label>
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={s.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <MotionMap settings={s} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .link-row { display: flex; align-items: center; gap: 0.4rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .small { padding: 0.4rem 0.75rem; font-size: 0.86rem; border-radius: 10px; }
  .warning { color: var(--ink); background: #fffbeb; border-left: 3px solid var(--amber); border-radius: 6px; padding: 0.5rem 0.7rem; }
</style>
