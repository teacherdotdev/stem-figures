<script lang="ts">
  // The Scatter Plot Generator: presets, the data and the figure's settings
  // on the left, the figure card on the right. Settings are mirrored into the
  // page address so a bookmark or shared link brings back exactly this
  // scatter plot, and the server renders that same figure on first load.
  //
  // The data is a table of x and y values or a list of pairs. Switching to
  // the other one when it's empty fills it from the one in use.
  import { CircleDot, MoveHorizontal, MoveVertical, TrendingUp } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import Section from '$shared/Section.svelte'
  import { niceText } from '$shared/graph/numbering'
  import MathInput from '$lib/shared/MathInput.svelte'
  import TableInput from '$lib/stats/TableInput.svelte'
  import { describeCorrelation } from '$lib/stats/regression'
  import { MAX_ROWS, filledRows } from '$lib/stats/table'
  import ScatterPlot from './ScatterPlot.svelte'
  import {
    CORRELATIONS, EQUATION_MODES, FITS, INPUTS, MARKS, PLACES, cleanSettings, equationText, fmt, listOf, readScatter,
    rounded, settingsFromParams, settingsToQuery, tableOf,
    type Correlation, type EquationMode, type Fit, type Input, type Mark, type RangeKey, type RawSettings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'scatter-plot',
    { history: 'mathfigures.scatter-plot.history', presets: 'mathfigures.scatter-plot.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readScatter(clean))

  /** Switch inputs, filling the other one from this one if it's empty. */
  function setInput(to: Input) {
    if (to === clean.input) return
    const ok = read.all.length && !read.problems.data && !read.problems.table
    if (to === 'table' && !filledRows(clean.rows).length && ok && read.all.length <= MAX_ROWS) s.rows = tableOf(read.all)
    if (to === 'list' && !clean.data.trim() && ok) s.data = listOf(read.all)
    s.input = to
  }

  const Y_COLUMN = ['y']
  const EVERY_OPTIONS: [number, string][] = [
    [1, 'Every line'],
    [2, 'Every 2nd line'],
    [5, 'Every 5th line'],
    [10, 'Every 10th line'],
    [0, 'No numbers'],
  ]
  const AXES = [
    { axis: 'x', name: 'x-axis', icon: MoveHorizontal },
    { axis: 'y', name: 'y-axis', icon: MoveVertical },
  ] as const
  const RANGE_FIELDS = [
    ['From', 'From'],
    ['To', 'To'],
    ['Step', 'Count by'],
  ] as const

  const dataSummary = $derived.by(() => {
    const n = read.all.length
    if (!n) return ''
    const parts = [`${n} ${n === 1 ? 'point' : 'points'}`]
    if (read.r !== null && n > 2) parts.push(`r = ${rounded(read.r, 2)}, ${describeCorrelation(read.r)}`)
    return parts.join(' · ')
  })
  const markSummary = $derived(MARKS[clean.mark])
  const lineSummary = $derived.by(() => {
    if (clean.fit === 'none') return clean.r === 'none' ? 'None' : `No line · ${CORRELATIONS[clean.r]}`
    const eq = read.line ? (clean.equation === 'text' ? equationText(read.line, clean.places) : `equation ${EQUATION_MODES[clean.equation].toLowerCase()}`) : ''
    return [FITS[clean.fit], eq, clean.r !== 'none' && CORRELATIONS[clean.r]].filter(Boolean).join(' · ')
  })
  const axisSummary = (axis: 'x' | 'y') => {
    const a = read[axis]
    const n = (v: number) => niceText(v, a.numbering)
    const fitted = !clean[`${axis}From`].trim() && !clean[`${axis}To`].trim() && !clean[`${axis}Step`].trim() && read.all.length > 0
    const every = clean[`${axis}Every`]
    return [
      `${n(a.start)} to ${n(a.end)}`,
      `by ${n(a.step)}`,
      a.broken && 'break',
      fitted && 'fits the data',
      every ? (every === 1 ? 'numbered' : `numbered every ${every}`) : 'unnumbered',
    ].filter(Boolean).join(' · ')
  }
  const autoText = (axis: 'x' | 'y', k: 'From' | 'To' | 'Step') => {
    const a = read.auto[axis]
    return fmt(k === 'From' ? a.from : k === 'To' ? a.to : a.step)
  }

  let svg = $state<SVGSVGElement>()
  const filename = 'scatter-plot'
</script>

<GeneratorPage name="Scatter Plot Generator" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <h2 class="card-head">Data</h2>
      <div class="segmented" role="radiogroup" aria-label="Data">
        {#each Object.entries(INPUTS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.input === value} class:on={clean.input === value} onclick={() => setInput(value as Input)}>{title}</button>
        {/each}
      </div>

      {#if clean.input === 'list'}
        <textarea
          rows="5" aria-label="Points, one x, y pair a line" placeholder={'1, 52\n2, 60\n3, 65\n4, 71'}
          aria-invalid={!!read.problems.data} aria-describedby={read.problems.data ? 'data-problem' : undefined} bind:value={s.data}
        ></textarea>
        {#if read.problems.data}<p id="data-problem" class="help problem">{read.problems.data}</p>{/if}
      {:else}
        <TableInput id="table" rowName="x" columnName="y" columns={Y_COLUMN} fixed numberNames addRow="Add a point" bind:rows={s.rows} />
        {#if read.problems.table}<p class="help problem">{read.problems.table}</p>{/if}
      {/if}
      {#if read.problems.past}<p class="help problem">{read.problems.past}</p>{/if}
      {#if dataSummary}<p class="help">{dataSummary}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Points" icon={CircleDot} summary={markSummary}>
      <div class="segmented" role="radiogroup" aria-label="Points">
        {#each Object.entries(MARKS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.mark === value} class:on={clean.mark === value} onclick={() => (s.mark = value as Mark)}>{title}</button>
        {/each}
      </div>
    </Section>

    <Section title="Line of best fit" icon={TrendingUp} summary={lineSummary}>
      <div class="segmented" role="radiogroup" aria-label="Line of best fit">
        {#each Object.entries(FITS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.fit === value} class:on={clean.fit === value} onclick={() => (s.fit = value as Fit)}>{title}</button>
        {/each}
      </div>
      {#if clean.fit === 'own'}
        <label class="field">
          Line
          <input type="text" placeholder="y = 2x + 1" aria-invalid={!!read.problems.line} bind:value={s.line} />
        </label>
        {#if read.problems.line}<p class="help problem">{read.problems.line}</p>{/if}
      {/if}
      {#if read.problems.fit}<p class="help problem">{read.problems.fit}</p>{/if}
      {#if clean.fit !== 'none'}
        <label class="field">
          Equation on the graph
          <select bind:value={s.equation}>
            {#each Object.entries(EQUATION_MODES) as [v, name]}<option value={v as EquationMode}>{name}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="field">
        Correlation coefficient
        <select bind:value={s.r}>
          {#each Object.entries(CORRELATIONS) as [v, name]}<option value={v as Correlation}>{name}</option>{/each}
        </select>
      </label>
      {#if (clean.fit !== 'none' && clean.equation === 'text') || clean.r === 'r' || clean.r === 'r2'}
        <label class="field">
          Round to
          <select bind:value={s.places}>
            {#each PLACES as p}<option value={p}>{p === 0 ? 'Whole numbers' : `${p} decimal place${p === 1 ? '' : 's'}`}</option>{/each}
          </select>
        </label>
      {/if}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Study time and test scores', xTitle: 'Hours studied', yTitle: 'Test score' }}
    />

    {#each AXES as { axis, name, icon }}
      <Section title={name} {icon} summary={axisSummary(axis)}>
        <div class="range-fields">
          {#each RANGE_FIELDS as [k, label]}
            {@const key = `${axis}${k}` as RangeKey}
            <div class="range-field">
              <label for="range-{key}">{label}</label>
              <MathInput id="range-{key}" placeholder={autoText(axis, k)} aria-invalid={!!read.problems[key]} bind:value={s[key]} />
            </div>
          {/each}
        </div>
        {#each RANGE_FIELDS as [k]}
          {@const key = `${axis}${k}` as RangeKey}
          {#if read.problems[key]}<p class="help problem">{read.problems[key]}</p>{/if}
        {/each}
        <label class="field">
          Numbers
          {#if axis === 'x'}
            <select bind:value={s.xEvery}>
              {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
            </select>
          {:else}
            <select bind:value={s.yEvery}>
              {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
            </select>
          {/if}
        </label>
      </Section>
    {/each}

    <GridlineSettings bind:minor={s.minor} bind:gridlines={s.gridlines} />
  {/snippet}

  {#snippet figure()}
    <ScatterPlot settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .segmented button { flex: 1; }
  textarea {
    width: 100%; padding: 0.5rem 0.6rem; border: 1.5px solid var(--border); border-radius: 10px;
    font: inherit; font-size: 0.95rem; font-weight: 400; background: #fff; color: var(--ink); resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  textarea[aria-invalid='true'] { border-color: var(--red); }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }

  .range-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.5rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .range-fields ~ .help { margin: -0.1rem 0 0.5rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin: 0.75rem 0 0; }
  .field:first-child { margin-top: 0; }
  .field input { width: 100%; }
</style>
