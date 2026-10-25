<script lang="ts">
  // The Cumulative Frequency Graph Generator: presets and the data on the
  // left, the figure's settings under them, the figure card on the right.
  // Settings are mirrored into the page address so a bookmark or shared link
  // brings back exactly this graph, and the server renders that same figure on
  // first load.
  import { Crosshair, Heading, MoveRight, MoveUp, Plus, Spline, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { niceText } from '$shared/graph/numbering'
  import MathInput from '$lib/shared/MathInput.svelte'
  import TableInput from '$lib/stats/TableInput.svelte'
  import CumulativeFrequency from './CumulativeFrequency.svelte'
  import { QUARTILE_NAMES, buildCumulative } from './layout.js'
  import {
    EDGES, JOINS, KINDS, LOOKS, MARKS, MAX_READINGS, MODES, QUARTILES, SCALES, SCALE_TITLES, SHOWS,
    cleanSettings, fmt, settingsFromParams, settingsToQuery, type RawSettings, type Scale, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'cumulative-frequency',
    { history: 'mathfigures.cumulative-frequency.history', presets: 'mathfigures.cumulative-frequency.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const built = $derived(buildCumulative(clean))
  const graph = $derived(built.read)

  // The tables' one column of numbers each, headed by what it holds.
  const FREQUENCY = ['Frequency']
  const CUMULATIVE = ['Cumulative frequency']

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }
  const RANGE_FIELDS = [
    ['From', 'From'],
    ['To', 'To'],
    ['Step', 'Count by'],
  ] as const
  const AXES = [
    { axis: 'x', title: 'Horizontal axis', icon: MoveRight },
    { axis: 'y', title: 'Vertical axis', icon: MoveUp },
  ] as const
  const EVERY_OPTIONS: [number, string][] = [
    [1, 'Every line'],
    [2, 'Every 2nd line'],
    [5, 'Every 5th line'],
    [10, 'Every 10th line'],
    [0, 'No numbers'],
  ]
  const TITLES = [
    { key: 'title', name: 'Chart title', placeholder: 'Heights of 50 students' },
    { key: 'xTitle', name: 'Horizontal axis title', placeholder: 'Height (cm)' },
    { key: 'yTitle', name: 'Vertical axis title', placeholder: 'Cumulative frequency' },
  ] as const

  // Switching the vertical axis swaps its title for the other one, unless the teacher wrote their own.
  function setScale(scale: Scale) {
    const other = scale === 'count' ? 'percent' : 'count'
    if (s.yTitle.trim() === SCALE_TITLES[other]) s.yTitle = SCALE_TITLES[scale]
    s.scale = scale
  }

  function addReading() {
    s.readings.push({ kind: 'percentile', at: '', show: 'value' })
    const i = s.readings.length - 1
    requestAnimationFrame(() => document.getElementById(`reading-${i}`)?.focus())
  }

  const n = (v: number) => fmt(v)
  const pointsSummary = $derived(
    [MARKS[clean.mark], clean.join === 'none' ? 'not joined' : JOINS[clean.join].toLowerCase(), clean.start && 'from 0', LOOKS[clean.look]].filter(Boolean).join(' · '),
  )
  const readingsSummary = $derived.by(() => {
    const parts = [
      ...QUARTILES.filter((q) => clean[q] !== 'off').map((q) => QUARTILE_NAMES[q].replace(' quartile', ' Q')),
      ...built.readings.filter((r) => r !== null).map((r) => r!.name),
    ]
    return parts.join(' · ') || 'None'
  })
  const titlesSummary = $derived.by(() => {
    const parts = TITLES.map(({ key, name }) =>
      clean[`${key}Mode`] === 'blank' ? `${name}: blank line` : clean[`${key}Mode`] === 'text' && clean[key].trim() ? `“${clean[key].trim()}”` : '',
    )
    return parts.filter(Boolean).join(' · ') || 'None'
  })
  const axisSummary = (axis: 'x' | 'y') => {
    const a = graph[axis]
    const t = (v: number) => niceText(v, a.numbering)
    const fitted = !clean[`${axis}From`].trim() && !clean[`${axis}To`].trim() && !clean[`${axis}Step`].trim()
    const every = clean[`${axis}Every`]
    return [
      axis === 'y' && SCALES[clean.scale],
      `${t(a.range.from)} to ${t(a.range.to)}`,
      `by ${t(a.range.step)}`,
      fitted && 'fits the data',
      every ? (every === 1 ? 'numbered' : `numbered every ${every}`) : 'unnumbered',
    ].filter(Boolean).join(' · ')
  }
  const auto = (axis: 'x' | 'y', key: 'From' | 'To' | 'Step') => {
    const r = graph[axis].auto
    return niceText(key === 'From' ? r.from : key === 'To' ? r.to : r.step, 'decimal')
  }

  // The readout: the running totals and what's read off the join.
  const quartiles = $derived(built.quartiles)
  const iqr = $derived(quartiles.upper && quartiles.lower ? fmt(Number((quartiles.upper.value - quartiles.lower.value).toPrecision(12))) : null)
  const percentOf = (cf: number) => (graph.n > 0 ? fmt(Math.round((cf / graph.n) * 1000) / 10) : '0')

  let svg = $state<SVGSVGElement>()
  const filename = 'cumulative-frequency-graph'
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

<!-- 40% of the window for the settings: the data table needs the room. -->
{#snippet startsAt()}
  <label class="starts">
    <span>First bin starts at</span>
    <input type="text" inputmode="decimal" placeholder={graph.lowestGuess !== null ? n(graph.lowestGuess) : '0'} bind:value={s.lowest} />
  </label>
{/snippet}

<GeneratorPage name="Cumulative Frequency Graph Generator" {filename} {gen} {svg} settingsWidth="minmax(28rem, 40%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to fill in the data">
          {#if clean.mode === 'frequency'}
            Type where the first bin starts, then each bin’s upper end (Up to) and its frequency, in order, or paste the table from
            Sheets or Excel. A bin like 140 &lt; h ≤ 150 pasted from a worksheet is read as up to 150. Each point is plotted at a bin’s
            upper end. Left empty, the first bin starts as far below its upper end as the next bin is wide.
          {:else if clean.mode === 'cumulative'}
            Type where the first bin starts, then each upper bound (Up to) and the cumulative frequency up to it, in order, or paste
            the table. The curve starts from 0 where the first bin starts; left empty, that’s as far below the first upper bound as
            the next one is above it.
          {:else}
            Type or paste the numbers, separated by commas or spaces. They’re sorted into bins from the start, each as wide as
            the bin width, both fitted to the data unless you type them.
          {/if}
          Leave the data empty and type the axes’ ranges for a blank graph.
        </HelpTip>
      </div>
      <div class="segmented" role="radiogroup" aria-label="Data from">
        {#each Object.entries(MODES) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.mode === value} class:on={clean.mode === value} onclick={() => (s.mode = value as Settings['mode'])}>{title}</button>
        {/each}
      </div>

      {#if clean.mode === 'frequency'}
        {@render startsAt()}
        <TableInput id="table" rowName="Up to" columnName="Frequency" columns={FREQUENCY} fixed numberNames addRow="Add a bin" bind:rows={s.rows} />
      {:else if clean.mode === 'cumulative'}
        {@render startsAt()}
        <TableInput id="totals" rowName="Up to" columnName="Cumulative frequency" columns={CUMULATIVE} fixed numberNames addRow="Add an upper bound" bind:rows={s.totals} />
      {:else}
        <textarea
          id="data-set" rows="3" aria-label="Data set" placeholder="152, 158, 161, 163, 170, 174" inputmode="decimal"
          aria-invalid={!!graph.problems.data} bind:value={s.data}
        ></textarea>
        {#if graph.problems.data}<p class="help problem">{graph.problems.data}</p>{/if}
        <div class="bin-fields">
          <div class="range-field">
            <label for="bin-start">Bin start</label>
            <MathInput id="bin-start" placeholder={graph.binAuto ? n(graph.binAuto.start) : ''} aria-invalid={!!graph.problems.binStart} bind:value={s.binStart} />
          </div>
          <div class="range-field">
            <label for="bin-width">Bin width</label>
            <MathInput id="bin-width" placeholder={graph.binAuto ? n(graph.binAuto.width) : ''} aria-invalid={!!graph.problems.binWidth} bind:value={s.binWidth} />
          </div>
        </div>
        {#if graph.problems.binStart}<p class="help problem">{graph.problems.binStart}</p>{/if}
        {#if graph.problems.binWidth}<p class="help problem">{graph.problems.binWidth}</p>{/if}
        {@render choice({ key: 'edges', name: 'Bins', options: EDGES })}
      {/if}
      {#if graph.problems.table}<p class="help problem">{graph.problems.table}</p>{/if}

      {#if graph.totals.length}
        <div class="readout">
          {#if clean.mode !== 'cumulative' || graph.percent}
            <table>
              <thead>
                <tr><th scope="col">Upper bound</th><th scope="col">Cumulative frequency</th>{#if graph.percent}<th scope="col">Percent</th>{/if}</tr>
              </thead>
              <tbody>
                {#each graph.totals as t}
                  <tr><td>{n(t.x)}</td><td>{n(t.cf)}</td>{#if graph.percent}<td>{percentOf(t.cf)}%</td>{/if}</tr>
                {/each}
              </tbody>
            </table>
          {/if}
          <ul>
            <li>n = {n(graph.n)}</li>
            {#if QUARTILES.some((q) => quartiles[q])}
              <li>{[...QUARTILES.map((q) => quartiles[q] && `${QUARTILE_NAMES[q]} ${quartiles[q].text}`), iqr && `IQR ${iqr}`].filter(Boolean).join(' · ')}</li>
            {/if}
            {#each built.readings as r}
              {#if r}<li>{`${r.name}: ${r.text}${r.axis === 'y' && !graph.percent ? ` (${percentOf(r.value)}%)` : ''}`}</li>{/if}
            {/each}
          </ul>
        </div>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Points and curve" icon={Spline} summary={pointsSummary}>
      {@render choice({ key: 'mark', name: 'Points', options: MARKS })}
      {@render choice({ key: 'join', name: 'Join', options: JOINS })}
      <label class="check">
        <input type="checkbox" bind:checked={s.start} />
        <span>Start from 0 at the lowest bound</span>
      </label>
      {#if graph.problems.start}<p class="help problem">{graph.problems.start}</p>{/if}
      {@render choice({ key: 'look', name: 'Look', options: LOOKS })}
    </Section>

    <Section title="Readings" icon={Crosshair} summary={readingsSummary}>
      {#each QUARTILES as q}{@render choice({ key: q, name: QUARTILE_NAMES[q], options: SHOWS })}{/each}
      <div class="part">
        <span class="part-name">Other readings</span>
        {#each s.readings as r, i}
          <div class="reading">
            <select aria-label="Reading {i + 1}: kind" bind:value={r.kind}>
              {#each Object.entries(KINDS) as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
            <input
              type="text" id="reading-{i}" inputmode="decimal" aria-label="Reading {i + 1}: {KINDS[r.kind].toLowerCase()}"
              placeholder={r.kind === 'percentile' ? '90' : r.kind === 'across' ? '45' : '60'}
              aria-invalid={!!built.problems.readings[i]} bind:value={r.at}
            />
            <select aria-label="Reading {i + 1}: drawn with" bind:value={r.show}>
              <option value="lines">{SHOWS.lines}</option>
              <option value="value">{SHOWS.value}</option>
              <option value="blank">{SHOWS.blank}</option>
            </select>
            <button type="button" class="icon-btn" aria-label="Remove reading {i + 1}" title="Remove" onclick={() => s.readings.splice(i, 1)}><X size={17} /></button>
          </div>
          {#if built.problems.readings[i]}<p class="help problem">{built.problems.readings[i]}</p>{/if}
        {/each}
        {#if s.readings.length < MAX_READINGS}
          <button type="button" class="add" onclick={addReading}><Plus size={16} aria-hidden="true" /> Add a reading</button>
        {/if}
      </div>
      {#if built.problems.join}<p class="help problem">{built.problems.join}</p>{/if}
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each TITLES as { key, name, placeholder }}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} {placeholder} bind:mode={s[`${key}Mode`]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    {#each AXES as { axis, title, icon }}
      <Section {title} {icon} summary={axisSummary(axis)}>
        {#if axis === 'y'}
          <div class="part">
            <span class="part-name" id="scale-label">Shows</span>
            <div class="segmented" role="radiogroup" aria-labelledby="scale-label">
              {#each Object.entries(SCALES) as [value, name]}
                <button type="button" role="radio" aria-checked={clean.scale === value} class:on={clean.scale === value} onclick={() => setScale(value as Scale)}>{name}</button>
              {/each}
            </div>
          </div>
        {/if}
        <div class="range-fields">
          {#each RANGE_FIELDS as [key, name]}
            <div class="range-field">
              <label for="{axis}-{key}">{name}</label>
              <MathInput id="{axis}-{key}" placeholder={auto(axis, key)} aria-invalid={!!graph.problems[`${axis}${key}`]} bind:value={s[`${axis}${key}`]} />
            </div>
          {/each}
        </div>
        {#each RANGE_FIELDS as [key]}
          {#if graph.problems[`${axis}${key}`]}<p class="help problem">{graph.problems[`${axis}${key}`]}</p>{/if}
        {/each}
        <label class="field">
          Numbers
          <select bind:value={s[`${axis}Every`]}>
            {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
          </select>
        </label>
      </Section>
    {/each}

    <GridlineSettings bind:minor={s.minor} bind:gridlines={s.gridlines} />
  {/snippet}

  {#snippet figure()}
    <CumulativeFrequency settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  textarea {
    width: 100%; min-height: 4.5rem; padding: 0.5rem 0.6rem; border: 1.5px solid var(--border); border-radius: 10px;
    font: inherit; font-size: 0.95rem; background: #fff; color: var(--ink); resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  .starts { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; font-size: 0.88rem; }
  .starts input { width: 6rem; text-align: right; }
  .bin-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .data .part { margin-bottom: 0; }
  .check { align-self: flex-start; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0 0 0.75rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .check + .help { margin: -0.4rem 0 0.75rem; }

  .readout { padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout table { border-collapse: collapse; margin-bottom: 0.4rem; font-variant-numeric: tabular-nums; }
  .readout th { padding: 0 1rem 0.15rem 0; font-size: 0.78rem; font-weight: 700; color: var(--muted); text-align: right; }
  .readout td { padding: 0.05rem 1rem 0.05rem 0; text-align: right; }
  .readout ul { margin: 0; padding: 0; list-style: none; }
  .readout li + li { margin-top: 0.2rem; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }
  .reading { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.7fr) minmax(0, 1.2fr) auto; gap: 0.35rem; align-items: center; }
  .add {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.6rem;
    border: 1.5px dashed var(--border); border-radius: 999px; background: none; color: var(--blue-dark); font-weight: 700; font-size: 0.85rem;
  }
  .add:hover { background: var(--blue-soft); }

  .range-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.75rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .range-fields ~ .help { margin: -0.3rem 0 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
</style>
