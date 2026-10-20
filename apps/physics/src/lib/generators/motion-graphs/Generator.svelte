<script lang="ts">
  // The Motion Graph Generator: the motion segment by segment (SegmentList,
  // shared with the Motion Map Generator), the graphs, marks, titles
  // and grid on the left, the figure on the right. Settings live in the page
  // address. The grids and axes are $shared/graph's, the same as Chemistry's
  // titration curve and Biology's population growth.
  import { ChartLine, Grid3x3, Heading, MapPin, Route, SlidersHorizontal } from '@lucide/svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import { buildMotion, fittedRanges } from './figure'
  import { motionOf, numberText, tangentAt, velocityAt } from './motion'
  import MotionGraphs from './MotionGraphs.svelte'
  import RangeFields from './RangeFields.svelte'
  import SegmentList from './SegmentList.svelte'
  import { GRAPHS, motionSettings, viewsOf, type Graphs, type Kind } from './settings'

  const gen = createGenerator(motionSettings, 'motion-graphs')
  const s = $derived(gen.snapshot())
  const m = $derived(motionOf(s.segments, s.start))
  const views = $derived(viewsOf(s))

  const shown = (l: Label) => (l.mode === 'text' ? `“${l.text}”` : l.mode === 'blank' ? 'blank' : '')
  const SHORT: Record<Kind, string> = { rest: 'rest', forward: 'forward', back: 'back', faster: 'speeding up', slower: 'slowing down' }
  const motionSummary = $derived(s.segments.map((g) => SHORT[g.kind]).join(', ') || 'none')
  const marksSummary = $derived(
    [s.letters ? 'letters' : '', s.styles ? 'segment styles' : '', s.tangent && views.includes('x') ? `tangent at ${numberText(tangentAt(m, s.tangentAt).t)} s` : '']
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const TITLE_FIELDS = [
    { key: 'title', name: 'Chart title', placeholder: 'Motion of a cart' },
    { key: 'timeTitle', name: 'Time axis', placeholder: 'Time (s)' },
    { key: 'xTitle', name: 'Position axis', placeholder: 'Position (m)', view: 'x' },
    { key: 'vTitle', name: 'Velocity axis', placeholder: 'Velocity (m/s)', view: 'v' },
    { key: 'aTitle', name: 'Acceleration axis', placeholder: 'Acceleration (m/s^2)', view: 'a' },
  ] as const
  const titleFields = $derived(TITLE_FIELDS.filter((f) => !('view' in f) || views.includes(f.view)))
  const titlesSummary = $derived(titleFields.map((f) => shown(s[f.key])).filter(Boolean).join(' · ') || 'none')
  const gridSummary = $derived(
    [s.ranges ? 'ranges set' : 'fitted to the motion', s.numbers ? 'numbered' : 'no numbers', s.gridlines ? 'gridlines' : 'no gridlines'].join(' · '),
  )

  // Setting the ranges starts from the ones fitted to the motion, so the
  // figure doesn't jump; going back to fitted ones forgets them, so the page
  // address is as it was.
  const problems = $derived(s.ranges ? buildMotion(s).problems : {})
  const RANGE_KEYS = Object.keys(fittedRanges(motionSettings.defaults)) as (keyof ReturnType<typeof fittedRanges>)[]
  function setRanges(on: boolean) {
    gen.s.ranges = on
    const next = on ? fittedRanges(s) : motionSettings.defaults
    for (const key of RANGE_KEYS) gen.s[key] = next[key]
  }
  const AXES = [
    { id: 'x', name: 'Position', unit: 'm' },
    { id: 'v', name: 'Velocity', unit: 'm/s' },
    { id: 'a', name: 'Acceleration', unit: 'm/s²' },
  ] as const

  const tangentNote = $derived.by(() => {
    const t = tangentAt(m, s.tangentAt)
    const piece = m.pieces.find((p) => t.t >= p.t0 && t.t <= p.t1)
    const straight = piece && piece.a === 0
    return `Its slope is the velocity there, ${numberText(velocityAt(m, t.t))} m/s.${straight ? ' The graph is straight there, so the tangent lies along it.' : ''}`
  })
</script>

<GeneratorPage name="Motion Graph Generator" filename="motion-graphs" {gen} settingsWidth={26} bind:labelSize={gen.s.labelSize}>
  {#snippet settings()}
    <Section title="Motion" icon={Route} summary={motionSummary}>
      <SegmentList bind:segments={gen.s.segments} bind:start={gen.s.start} clean={s.segments} {m} />
      <p class="note">Speeding up and slowing down carry on from the velocity before them.</p>
    </Section>

    <Section title="Graphs" icon={ChartLine} summary={GRAPHS[s.graphs].name}>
      <label class="field">
        Show
        <select bind:value={gen.s.graphs}>
          {#each Object.entries(GRAPHS) as [id, g]}<option value={id as Graphs}>{g.name}</option>{/each}
        </select>
      </label>
      {#if views.length > 1}<p class="note">Position, velocity and acceleration, stacked on the same time axis.</p>{/if}
    </Section>

    <Section title="Marks" icon={MapPin} summary={marksSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.letters} /> Letter the segment ends A, B, C…</label>
      <label class="check"><input type="checkbox" bind:checked={gen.s.styles} /> Each segment in its own line style</label>
      {#if views.includes('x')}
        <label class="check"><input type="checkbox" bind:checked={gen.s.tangent} /> Tangent to the position–time graph</label>
        {#if s.tangent}
          <label class="field">
            At
            <span class="slider">
              <input type="range" min="0" max={m.end} step="0.5" bind:value={gen.s.tangentAt} />
              <output>{numberText(tangentAt(m, s.tangentAt).t)} s</output>
            </span>
          </label>
          <p class="note">{tangentNote}</p>
        {/if}
      {/if}
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each titleFields as f (f.key)}
        <div class="field">{f.name} <LabelField name={f.name} placeholder={f.placeholder} bind:label={gen.s[f.key]} /></div>
      {/each}
      <p class="note">Type ^ for a superscript, as in m/s^2, and _ for a subscript.</p>
    </Section>

    <Section title="Axes and grid" icon={Grid3x3} summary={gridSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.numbers} /> Numbers on the axes</label>
      {#if !s.numbers}<p class="note">Just the shapes: straight, curving up or curving down.</p>{/if}
      <label class="check"><input type="checkbox" bind:checked={gen.s.gridlines} /> Gridlines</label>
      <label class="check">
        <input type="checkbox" checked={s.ranges} onchange={(e) => setRanges(e.currentTarget.checked)} /> Set the ranges myself
      </label>
      {#if s.ranges}
        <p class="note">To match graphs on a worksheet. {views.length > 1 ? 'The graphs share the time axis.' : ''}</p>
        <RangeFields name="Time" unit="s" id="t" {problems} bind:from={gen.s.tFrom} bind:to={gen.s.tTo} bind:step={gen.s.tStep} />
        {#each AXES.filter((a) => views.includes(a.id)) as a (a.id)}
          <RangeFields
            name={a.name} unit={a.unit} id={a.id} {problems}
            bind:from={gen.s[`${a.id}From`]} bind:to={gen.s[`${a.id}To`]} bind:step={gen.s[`${a.id}Step`]}
          />
        {/each}
        <button type="button" class="btn-ghost small" onclick={() => setRanges(true)}>Fit to the motion</button>
      {/if}
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={s.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <MotionGraphs settings={s} id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .small { padding: 0.4rem 0.75rem; font-size: 0.86rem; border-radius: 10px; }
</style>
