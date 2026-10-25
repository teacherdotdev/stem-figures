<script lang="ts">
  // The Histogram Generator: presets and the data on the left (a data set or
  // a frequency table), the figure's settings under them, the figure card on
  // the right. Settings are mirrored into the page address so a bookmark or
  // shared link brings back exactly this histogram, and the server renders
  // that same figure on first load.
  import { ChartColumn, Heading, MoveRight, MoveUp } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { niceText } from '$shared/graph/numbering'
  import MathInput from '$lib/shared/MathInput.svelte'
  import { FILLS } from '$lib/stats/fills'
  import { filledRows } from '$lib/stats/table'
  import TableInput from '$lib/stats/TableInput.svelte'
  import Histogram from './Histogram.svelte'
  import {
    MEASURES, POLYGONS, SOURCES, X_NUMBERS,
    cleanSettings, fmt, heightOf, readHistogram, settingsFromParams, settingsToQuery, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'histogram',
    { history: 'mathfigures.histogram.history', presets: 'mathfigures.histogram.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readHistogram(clean))
  const fromData = $derived(clean.source === 'data')

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }
  const Y_FIELDS = [
    ['yTo', 'To'],
    ['yStep', 'Count by'],
  ] as const
  const X_FIELDS = [
    ['xFrom', 'From'],
    ['xTo', 'To'],
    ['xStep', 'Count by'],
  ] as const
  const EVERY_OPTIONS: [number, string][] = [
    [1, 'Every line'],
    [2, 'Every 2nd line'],
    [5, 'Every 5th line'],
    [10, 'Every 10th line'],
    [0, 'No numbers'],
  ]
  const TITLES = $derived([
    { key: 'title', name: 'Chart title', placeholder: 'Heights of students' },
    { key: 'xTitle', name: 'Horizontal axis title', placeholder: 'Height (cm)' },
    { key: 'yTitle', name: 'Vertical axis title', placeholder: MEASURES[read.measure] },
  ] as const)

  // Switching to a frequency table with nothing in it starts it from the data
  // set's bins, so a bar can be left for students by emptying its frequency.
  function setSource(v: string) {
    if (v === 'table' && !filledRows(s.rows).length && read.bins.length) {
      s.rows = read.bins.map((b) => ({ name: fmt(b.hi), cells: [{ value: fmt(b.frequency ?? 0), error: '' }] }))
      s.lowest = fmt(read.bins[0].lo)
    }
    s.source = v as Settings['source']
  }
  /** Whole-number bins typed with gaps between them, retyped as the edges they stand for. */
  function useWholeNumberEdges() {
    const fix = read.fix
    if (!fix) return
    let k = 0
    for (const r of s.rows) if (r.name.trim() && k < fix.ups.length) r.name = fix.ups[k++]
    s.lowest = fix.lowest
  }

  // The edge choice, written with the first bin's own numbers.
  const firstBin = $derived(read.bins[0] ?? { lo: 10, hi: 20 })
  const EDGE_OPTIONS = $derived({
    left: `${fmt(firstBin.lo)} ≤ x < ${fmt(firstBin.hi)}`,
    right: `${fmt(firstBin.lo)} < x ≤ ${fmt(firstBin.hi)}`,
  })

  // The readout: the frequency table as drawn, numbers only.
  const PLACES = { frequency: 6, relative: 3, percent: 1, density: 3 }
  const short = (v: number | null) => (v === null ? '' : fmt(Number(v.toFixed(PLACES[read.measure]))))
  const measured = $derived(read.measure !== 'frequency')
  const readoutRows = $derived(read.bins.map((b) => ({ bin: b.name, frequency: b.frequency === null ? '' : fmt(b.frequency), value: short(heightOf(b, read.measure, read.n)) })))
  const READOUT_HEAD = { frequency: 'Frequency', relative: 'Relative', percent: '%', density: 'Density' }

  const barsSummary = $derived(
    [
      clean.polygon !== 'alone' && FILLS[clean.fill],
      clean.polygon !== 'none' && `polygon ${POLYGONS[clean.polygon].toLowerCase()}`,
      clean.values && 'frequencies above',
    ].filter(Boolean).join(' · '),
  )
  const titlesSummary = $derived.by(() => {
    const parts = TITLES.map(({ key, name }) =>
      clean[`${key}Mode`] === 'blank'
        ? `${name}: blank line`
        : clean[`${key}Mode`] === 'text' && (clean[key].trim() || key === 'yTitle') ? `“${clean[key].trim() || MEASURES[read.measure]}”` : '',
    )
    return parts.filter(Boolean).join(' · ') || 'None'
  })
  const yAxisSummary = $derived.by(() => {
    const { to, step } = read.y
    const n = (v: number) => niceText(v, read.yNumbering)
    const fitted = !clean.yTo.trim() && !clean.yStep.trim()
    return [
      MEASURES[read.measure],
      `0 to ${n(to)}`,
      `by ${n(step)}`,
      fitted && 'fits the data',
      clean.every ? (clean.every === 1 ? 'numbered' : `numbered every ${clean.every}`) : 'unnumbered',
    ].filter(Boolean).join(' · ')
  })
  const xAxisSummary = $derived.by(() => {
    if (clean.xNumbers === 'edges') return 'Numbered at the bin edges'
    const { from, to, step } = read.x ?? read.xAuto
    const n = (v: number) => niceText(v, read.xNumbering)
    const fitted = !clean.xFrom.trim() && !clean.xTo.trim() && !clean.xStep.trim()
    return [`${n(from)} to ${n(to)}`, `by ${n(step)}`, fitted && 'fits the bins'].filter(Boolean).join(' · ')
  })

  let svg = $state<SVGSVGElement>()
  const filename = 'histogram'
</script>

{#snippet choice({ key, name, options }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options) as [value, title]}
        <button type="button" role="radio" aria-checked={clean[key] === value} class:on={clean[key] === value} onclick={() => ((s as any)[key] = value)}>{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

<!-- 40% of the window for the settings: the frequency table needs the room. -->
<GeneratorPage name="Histogram Generator" {filename} {gen} {svg} settingsWidth="minmax(28rem, 40%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to type the data">
          Type or paste a data set, separated by commas or spaces, and it's sorted into bins (also called classes or class
          intervals) of the width you give, or a width that fits the data. Or type a frequency table: where the first bin starts,
          then each bin’s upper end (Up to) and its frequency, in order. Bins can have different class widths. Left empty, the
          first bin is as wide as the next. A bin like 140 &lt; h ≤ 150 pasted from a worksheet is read as up to 150. Leave a frequency empty for no bar, such as a bar
          for students to draw; a frequency table started from a data set has its bins filled in.
        </HelpTip>
      </div>
      <div class="segmented" role="radiogroup" aria-label="Data">
        {#each Object.entries(SOURCES) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.source === value} class:on={clean.source === value} onclick={() => setSource(value)}>{title}</button>
        {/each}
      </div>

      {#if fromData}
        <textarea
          rows="3" aria-label="Data set" placeholder="12, 15, 15, 18, 22, 27, 31, 34, 38" inputmode="decimal"
          aria-invalid={!!read.problems.data} bind:value={s.data}
        ></textarea>
        {#if read.problems.data}<p class="help problem">{read.problems.data}</p>{/if}
        <div class="two">
          <div class="range-field">
            <label for="bin-start">Bins start at</label>
            <MathInput id="bin-start" placeholder={fmt(read.binAuto?.binStart ?? 0)} aria-invalid={!!read.problems.binStart} bind:value={s.binStart} />
          </div>
          <div class="range-field">
            <label for="bin-width">Bin width</label>
            <MathInput id="bin-width" placeholder={fmt(read.binAuto?.binWidth ?? 1)} aria-invalid={!!read.problems.binWidth} bind:value={s.binWidth} />
          </div>
        </div>
        {#if read.problems.binStart}<p class="help problem">{read.problems.binStart}</p>{/if}
        {#if read.problems.binWidth}<p class="help problem">{read.problems.binWidth}</p>{/if}
        {@render choice({ key: 'edges', name: 'A value on an edge goes in', options: EDGE_OPTIONS })}
      {:else}
        <label class="starts">
          <span>First bin starts at</span>
          <input type="text" inputmode="decimal" placeholder={read.lowestGuess !== null ? fmt(read.lowestGuess) : '0'} bind:value={s.lowest} />
        </label>
        <TableInput
          id="table" rowName="Up to" columnName="Frequency" maxColumns={1} numberNames addRow="Add a bin"
          bind:columns={s.columns} bind:rows={s.rows} placeholders={{ column: 'Frequency' }}
        />
        {#if read.problems.table}<p class="help problem">{read.problems.table}</p>{/if}
        {#if read.problems.bins}
          <p class="help problem">
            {read.problems.bins}
            {#if read.fix}<button type="button" class="link" onclick={useWholeNumberEdges}>Use these bins</button>{/if}
          </p>
        {/if}
      {/if}

      {#if read.bins.length && (fromData || measured)}
        <table class="readout" aria-label="Frequency table">
          <thead>
            <tr><th scope="col">Bin</th><th scope="col">Frequency</th>{#if measured}<th scope="col">{READOUT_HEAD[read.measure]}</th>{/if}</tr>
          </thead>
          <tbody>
            {#each readoutRows as r}
              <tr><th scope="row">{r.bin}</th><td>{r.frequency}</td>{#if measured}<td>{r.value}</td>{/if}</tr>
            {/each}
          </tbody>
          <tfoot>
            <tr><th scope="row">n</th><td>{fmt(read.n)}</td>{#if measured}<td></td>{/if}</tr>
          </tfoot>
        </table>
      {:else if read.bins.length}
        <p class="readout line">n = {fmt(read.n)}</p>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Bars" icon={ChartColumn} summary={barsSummary}>
      {#if clean.polygon !== 'alone'}
        <label class="field">
          <span>Fill</span>
          <select bind:value={s.fill}>
            {#each Object.entries(FILLS) as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
        </label>
      {/if}
      {@render choice({ key: 'polygon', name: 'Frequency polygon', options: POLYGONS })}
      {#if clean.polygon !== 'none'}
        <label class="check">
          <input type="checkbox" bind:checked={s.closePolygon} />
          <span>Close the polygon down to the axis</span>
        </label>
      {/if}
      <label class="check">
        <input type="checkbox" bind:checked={s.values} />
        <span>Frequencies above the bars</span>
      </label>
    </Section>

    <Section title="Vertical axis" icon={MoveUp} summary={yAxisSummary}>
      <label class="field">
        <span>Measure</span>
        <select bind:value={s.measure}>
          <option value="auto">{MEASURES[read.auto]} (fits the bins)</option>
          {#each Object.entries(MEASURES) as [v, name]}<option value={v}>{name}</option>{/each}
        </select>
      </label>
      {#if read.problems.measure}<p class="help problem measure">{read.problems.measure}</p>{/if}
      <div class="range-fields">
        {#each Y_FIELDS as [key, name]}
          <div class="range-field">
            <label for="range-{key}">{name}</label>
            <MathInput id="range-{key}" placeholder={niceText(read.yAuto[key === 'yTo' ? 'to' : 'step'], 'decimal')} aria-invalid={!!read.problems[key]} bind:value={s[key]} />
          </div>
        {/each}
      </div>
      {#each Y_FIELDS as [key]}
        {#if read.problems[key]}<p class="help problem">{read.problems[key]}</p>{/if}
      {/each}
      <label class="field">
        Numbers
        <select bind:value={s.every}>
          {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
        </select>
      </label>
    </Section>

    <Section title="Horizontal axis" icon={MoveRight} summary={xAxisSummary}>
      {@render choice({ key: 'xNumbers', name: 'Numbers', options: X_NUMBERS })}
      {#if clean.xNumbers === 'steps'}
        <div class="range-fields three">
          {#each X_FIELDS as [key, name]}
            <div class="range-field">
              <label for="range-{key}">{name}</label>
              <MathInput
                id="range-{key}" placeholder={niceText(read.xAuto[key === 'xFrom' ? 'from' : key === 'xTo' ? 'to' : 'step'], 'decimal')}
                aria-invalid={!!read.problems[key]} bind:value={s[key]}
              />
            </div>
          {/each}
        </div>
        {#each X_FIELDS as [key]}
          {#if read.problems[key]}<p class="help problem">{read.problems[key]}</p>{/if}
        {/each}
      {/if}
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each TITLES as { key, name, placeholder }}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} {placeholder} bind:mode={s[`${key}Mode`]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <GridlineSettings bind:minor={s.minor} bind:gridlines={s.gridlines} />
  {/snippet}

  {#snippet figure()}
    <Histogram settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .starts { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; font-size: 0.88rem; }
  .starts input { width: 6rem; text-align: right; }
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .data .segmented button { flex: 1; }
  textarea {
    width: 100%; padding: 0.5rem 0.6rem; border: 1.5px solid var(--border); border-radius: 10px;
    font: inherit; font-size: 0.95rem; font-weight: 400; background: #fff; color: var(--ink); resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  textarea[aria-invalid='true'] { border-color: var(--red); }
  .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .data .part { margin-bottom: 0; }
  .check { align-self: flex-start; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0 0 0.75rem; cursor: pointer; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .help.measure { margin: -0.3rem 0 0.75rem; }
  .link { border: 0; padding: 0; background: none; color: var(--blue-dark); font-weight: 700; font-size: inherit; text-decoration: underline; cursor: pointer; }

  /* The frequency table as drawn: numbers only. */
  .readout { margin: 0; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  table.readout { display: block; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .readout th, .readout td { padding: 0.12rem 1.1rem 0.12rem 0; text-align: right; }
  .readout th[scope='row'], .readout thead th:first-child { text-align: left; }
  .readout thead th { color: var(--muted); font-weight: 700; font-size: 0.78rem; }
  .readout tfoot th, .readout tfoot td { border-top: 1px solid rgba(0, 0, 0, 0.12); padding-top: 0.25rem; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }

  .range-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.75rem; }
  .range-fields.three { grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0.75rem 0 0; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .range-fields ~ .help { margin: -0.3rem 0 0.75rem; }
  .range-fields.three ~ .help { margin: 0.45rem 0 0; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
</style>
