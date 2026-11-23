<script lang="ts">
  // The Segment Addition Generator: presets, the points, parts and spans, and
  // the figure's settings on the left, the figure card on the right. Settings
  // are mirrored into the page address so a bookmark or shared link brings
  // back exactly this figure, and the server renders that same figure on
  // first load.
  import { Circle, Move, Plus, RotateCw, Ruler, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import Section from '$shared/Section.svelte'
  import MathInput from '$lib/shared/MathInput.svelte'
  import { buildSegments } from './layout.js'
  import SegmentFigure from './SegmentFigure.svelte'
  import {
    ENDS, LABEL_MODES, MAX_CROSS_ANGLE, MAX_POINTS, MAX_SPANS, MIN_CROSS_ANGLE, MIN_POINTS,
    addPoint, cleanSettings, newSpan, partName, removePoint, settingsFromParams, settingsToQuery, spanName,
    type End, type LabelMode, type Part, type Point, type RawSettings, type Settings, type Span,
  } from './settings.js'
  import { show } from './solve.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'segment-addition',
    { history: 'mathfigures.segment-addition.history', presets: 'mathfigures.segment-addition.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const drawing = $derived(buildSegments(clean))
  const solved = $derived(drawing.solved)

  const change = (patch: Partial<Settings>) => Object.assign(s, cleanSettings({ ...clean, ...patch }))
  const setPoint = (k: number, patch: Partial<Point>) => change({ points: clean.points.map((p, j) => (j === k ? { ...p, ...patch } : p)) })
  const setPart = (k: number, patch: Partial<Part>) => change({ parts: clean.parts.map((p, j) => (j === k ? { ...p, ...patch } : p)) })
  const setSpan = (k: number, patch: Partial<Span>) => change({ spans: clean.spans.map((sp, j) => (j === k ? { ...sp, ...patch } : sp)) })
  const removeSpan = (k: number) => change({ spans: clean.spans.filter((_, j) => j !== k) })
  function addSpan() {
    // The whole line first, then the first two parts, then the last two.
    const n = clean.points.length - 1
    const tries = [newSpan(0, n), newSpan(0, Math.min(2, n)), newSpan(Math.max(0, n - 2), n), newSpan(0, 1)]
    const fresh = tries.find((t) => !clean.spans.some((sp) => sp.from === t.from && sp.to === t.to)) ?? tries[0]
    change({ spans: [...clean.spans, fresh] })
  }

  const pointName = (k: number) => clean.points[k]?.name.trim() || `Point ${k + 1}`
  const TICKS: [number, string][] = [[0, 'None'], [1, '|'], [2, '||'], [3, '|||']]

  const answer = $derived.by(() => {
    const bits: string[] = []
    if (solved.letter && solved.value !== null) bits.push(`${solved.letter} = ${show(solved.value)}`)
    clean.parts.forEach((_, k) => {
      const v = solved.parts[k]
      if (v !== null) bits.push(`${partName(clean, k)} = ${show(v)}`)
    })
    clean.spans.forEach((sp, k) => {
      const v = solved.spans[k]
      if (v !== null) bits.push(`${spanName(clean, sp)} = ${show(v)}`)
    })
    return bits.join(' · ')
  })

  const endsSummary = $derived(
    clean.start === 'none' && clean.end === 'none' ? 'Segment' : clean.start !== 'none' && clean.end !== 'none' ? 'Line' : 'Ray',
  )
  const crossSummary = $derived(
    clean.cross < 0 ? 'None' : `${clean.crossName.trim() ? `${clean.crossName.trim()} at` : 'At'} ${pointName(clean.cross)}, ${clean.crossAngle}°`,
  )
  const dotsSummary = $derived.by(() => {
    const off = clean.points.filter((p) => !p.dot).length
    return off ? `${clean.points.length - off} of ${clean.points.length} dotted` : 'Every point dotted'
  })
  const sizesSummary = $derived(clean.parts.some((p) => p.size.trim()) ? 'As typed' : 'Worked out')

  let svg = $state<SVGSVGElement>()
  const filename = 'segment-addition'
  const printWidth = $derived(Math.max(2.5, Math.min(7.5, drawing.frame.w / 96)))
</script>

<GeneratorPage name="Segment Addition Generator" {filename} {gen} {svg} {printWidth} settingsWidth="minmax(25rem, 34%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="card-body">
      <h2 class="card-head">Points</h2>
      <div class="points" role="group" aria-label="Points, in order along the line">
        {#each clean.points as p, k (k)}
          <span class="point">
            <input type="text" aria-label="Name of point {k + 1}" placeholder="?" maxlength="4" value={p.name} oninput={(e) => setPoint(k, { name: e.currentTarget.value })} />
            {#if clean.points.length > MIN_POINTS}
              <button type="button" class="btn-ghost icon corner" aria-label="Remove {pointName(k)}" onclick={() => change(removePoint(clean, k))}><X size={11} strokeWidth={2.5} aria-hidden="true" /></button>
            {/if}
          </span>
        {/each}
        <button type="button" class="btn-ghost small" disabled={clean.points.length >= MAX_POINTS} onclick={() => change(addPoint(clean))}>
          <Plus size={15} aria-hidden="true" /> Point
        </button>
      </div>

      <h2 class="card-head sub">Parts</h2>
      <div class="rows">
        {#each clean.parts as p, k (k)}
          <div class="row">
            <span class="row-name">{partName(clean, k)}</span>
            {#if p.mode === 'text'}
              <MathInput id="part-{k}" aria-label="Label of {partName(clean, k)}" placeholder="2x+3" bind:value={() => p.label, (v: string) => setPart(k, { label: v })} />
            {:else}
              <span class="mode-note">{p.mode === 'blank' ? 'Blank line' : 'No label'}</span>
            {/if}
            <select aria-label="How {partName(clean, k)} is labeled" value={p.mode} onchange={(e) => setPart(k, { mode: e.currentTarget.value as LabelMode })}>
              {#each Object.entries(LABEL_MODES) as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
            <select class="ticks" aria-label="Congruence ticks on {partName(clean, k)}" value={p.ticks} onchange={(e) => setPart(k, { ticks: Number(e.currentTarget.value) })}>
              {#each TICKS as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
          </div>
        {/each}
      </div>

      <h2 class="card-head sub">Spans</h2>
      {#if clean.spans.length}
        <div class="rows">
          {#each clean.spans as sp, k (k)}
            <div class="row span-row">
              <span class="range">
                <select aria-label="Span {k + 1} starts at" value={sp.from} onchange={(e) => setSpan(k, { from: Number(e.currentTarget.value) })}>
                  {#each clean.points.slice(0, -1) as _, j}<option value={j} disabled={j >= sp.to}>{pointName(j)}</option>{/each}
                </select>
                <select aria-label="Span {k + 1} ends at" value={sp.to} onchange={(e) => setSpan(k, { to: Number(e.currentTarget.value) })}>
                  {#each clean.points as _, j}{#if j > 0}<option value={j} disabled={j <= sp.from}>{pointName(j)}</option>{/if}{/each}
                </select>
              </span>
              {#if sp.mode === 'text'}
                <MathInput id="span-{k}" aria-label="Label of {spanName(clean, sp)}" placeholder="27" bind:value={() => sp.label, (v: string) => setSpan(k, { label: v })} />
              {:else}
                <span class="mode-note">{sp.mode === 'blank' ? 'Blank line' : 'No label'}</span>
              {/if}
              <select aria-label="How {spanName(clean, sp)} is labeled" value={sp.mode} onchange={(e) => setSpan(k, { mode: e.currentTarget.value as LabelMode })}>
                {#each Object.entries(LABEL_MODES) as [v, name]}<option value={v}>{name}</option>{/each}
              </select>
              <button type="button" class="btn-ghost icon remove" aria-label="Remove the span {spanName(clean, sp)}" onclick={() => removeSpan(k)}><X size={14} aria-hidden="true" /></button>
            </div>
          {/each}
        </div>
      {/if}
      <div>
        <button type="button" class="btn-ghost small" disabled={clean.spans.length >= MAX_SPANS} onclick={addSpan}><Plus size={15} aria-hidden="true" /> Span</button>
      </div>

      {#if solved.equations.length || answer}
        <div class="solved" aria-live="polite">
          {#if solved.equations.length}<p class="help">{solved.equations.join(' · ')}</p>{/if}
          {#if answer}<p class="help answer">{answer}</p>{/if}
        </div>
      {/if}
      {#if solved.problem}<p class="help problem">{solved.problem}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Ends" icon={Move} summary={endsSummary}>
      <div class="pair">
        {#each [['start', 'Left end'], ['end', 'Right end']] as const as [key, name]}
          <label class="field">
            {name}
            <select bind:value={s[key]}>
              {#each Object.entries(ENDS) as [v, title]}<option value={v as End}>{title}</option>{/each}
            </select>
          </label>
        {/each}
      </div>
    </Section>

    <Section title="Crossing line" icon={Plus} summary={crossSummary}>
      <label class="field">
        Crosses at
        <select value={clean.cross} onchange={(e) => change({ cross: Number(e.currentTarget.value) })}>
          <option value={-1}>No crossing line</option>
          {#each clean.points as _, j}<option value={j}>{pointName(j)}</option>{/each}
        </select>
      </label>
      {#if clean.cross >= 0}
        <div class="pair">
          <label class="field">
            Name
            <input type="text" placeholder="ℓ" maxlength="4" bind:value={s.crossName} />
          </label>
          <label class="field">
            Angle (°)
            <input type="number" min={MIN_CROSS_ANGLE} max={MAX_CROSS_ANGLE} step="5" value={clean.crossAngle} onchange={(e) => change({ crossAngle: Number(e.currentTarget.value) })} />
          </label>
        </div>
        {#if clean.crossAngle === 90}
          <label class="check"><input type="checkbox" bind:checked={s.crossSquare} /> Right-angle mark</label>
        {/if}
      {/if}
    </Section>

    <Section title="Dots" icon={Circle} summary={dotsSummary}>
      <div class="checks">
        {#each clean.points as p, k (k)}
          <label class="check"><input type="checkbox" checked={p.dot} onchange={(e) => setPoint(k, { dot: e.currentTarget.checked })} /> {pointName(k)}</label>
        {/each}
      </div>
    </Section>

    <Section title="Drawn lengths" icon={Ruler} summary={sizesSummary}>
      <p class="hint">Leave empty to draw to scale.</p>
      <div class="sizes">
        {#each clean.parts as p, k (k)}
          <label class="field">
            {partName(clean, k)}
            <input type="text" inputmode="decimal" placeholder="auto" value={p.size} oninput={(e) => setPart(k, { size: e.currentTarget.value })} />
          </label>
        {/each}
      </div>
    </Section>

    <Section title="Turn" icon={RotateCw} summary={clean.turn ? `${clean.turn}°` : 'Level'}>
      <label class="field">
        Turn the figure ({clean.turn}°)
        <input type="range" min="-90" max="90" step="5" bind:value={s.turn} />
      </label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <SegmentFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-head.sub { margin-top: 0.4rem; }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.answer { color: var(--ink); font-weight: 600; }
  .help.problem { color: var(--red); font-weight: 600; }
  .hint { font-weight: 400; color: var(--muted); font-size: 0.84rem; margin: 0 0 0.75rem; }
  .hint:last-child { margin-bottom: 0; }
  input, select { min-width: 0; }

  .points { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; padding-top: 0.4rem; }
  .point { position: relative; display: inline-flex; }
  .corner { position: absolute; top: -0.45rem; right: -0.45rem; width: 1.1rem; height: 1.1rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  .point input { width: 3.2rem; text-align: center; font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1.05rem; }

  .rows { display: flex; flex-direction: column; gap: 0.4rem; }
  .row { display: grid; grid-template-columns: 2.6rem minmax(0, 1fr) auto auto; gap: 0.4rem; align-items: center; }
  .span-row { grid-template-columns: auto minmax(0, 1fr) auto auto; }
  .row-name { font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1.05rem; font-weight: 600; }
  .range { display: inline-flex; gap: 0.2rem; }
  .mode-note { font-size: 0.85rem; color: var(--muted); padding: 0 0.3rem; }
  .ticks { width: 5rem; }
  .remove { width: 1.7rem; height: 1.7rem; display: inline-flex; align-items: center; justify-content: center; padding: 0; }
  .small { padding: 0.35rem 0.7rem; border-radius: 10px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.3rem; }
  .small:disabled { opacity: 0.45; cursor: default; }
  .solved { display: flex; flex-direction: column; gap: 0.2rem; border-top: 1px solid var(--border); padding-top: 0.6rem; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .pair .field { margin-bottom: 0.6rem; }
  .sizes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
  .sizes .field { margin-bottom: 0; }
  .checks { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
</style>
