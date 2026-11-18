<script lang="ts">
  // The Dot Plot Generator: presets, the data and the figure's settings on the
  // left, the figure card on the right. Settings are mirrored into the page
  // address so a bookmark or shared link brings back exactly this dot plot,
  // and the server renders that same figure on first load.
  //
  // The data is a list of values or a table of values and counts. Switching
  // to the other one when it's empty fills it from the one in use.
  import { CircleDot, Heading, Ruler } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { niceText } from '$shared/graph/numbering'
  import MathInput from '$lib/shared/MathInput.svelte'
  import TableInput from '$lib/stats/TableInput.svelte'
  import { filledRows } from '$lib/stats/table'
  import DotPlot from './DotPlot.svelte'
  import {
    CAPS, INPUTS, MARKS, cleanSettings, listOf, readPlot, settingsFromParams, settingsToQuery, tableOf,
    type Input, type Mark, type RawSettings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'dot-plot',
    { history: 'mathfigures.dot-plot.history', presets: 'mathfigures.dot-plot.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const plot = $derived(readPlot(clean))

  /** Switch inputs, filling the other one from this one if it's empty. */
  function setInput(to: Input) {
    if (to === clean.input) return
    const counted = plot.stacks.length && !plot.problems.data && !plot.problems.table && !plot.problems.past
    if (to === 'table' && !filledRows(clean.rows).length && counted) s.rows = tableOf(plot.stacks, plot.numbering)
    if (to === 'list' && !clean.data.trim() && counted) s.data = listOf(plot.stacks, plot.numbering)
    s.input = to
  }

  const COUNT_COLUMN = ['Count']
  const EVERY_OPTIONS: [number, string][] = [
    [1, 'Every tick'],
    [2, 'Every 2nd tick'],
    [4, 'Every 4th tick'],
    [5, 'Every 5th tick'],
    [10, 'Every 10th tick'],
    [0, 'No numbers'],
  ]
  const RANGE_FIELDS = [
    ['from', 'From'],
    ['to', 'To'],
    ['step', 'Count by'],
  ] as const
  const ENDS = [
    ['startCap', 'Left end', 'left'],
    ['endCap', 'Right end', 'right'],
  ] as const
  const TITLES = [
    { key: 'title', name: 'Chart title', placeholder: 'Hours of sleep last night' },
    { key: 'axisTitle', name: 'Axis title', placeholder: 'Hours' },
  ] as const

  const dataSummary = $derived.by(() => {
    if (!plot.total) return ''
    const n = (v: number) => niceText(v, plot.numbering)
    const most = Math.max(...plot.stacks.map((st) => st.count))
    const modes = plot.stacks.filter((st) => st.count === most).map((st) => n(st.value))
    const lo = plot.stacks.find((st) => st.count)!.value
    const hi = plot.stacks.findLast((st) => st.count)!.value
    return `${plot.total} ${plot.total === 1 ? 'value' : 'values'} · from ${n(lo)} to ${n(hi)} · most often ${modes.join(', ')} (${most})`
  })
  const markSummary = $derived(MARKS[clean.mark])
  const titlesSummary = $derived.by(() => {
    const parts = TITLES.map(({ key, name }) =>
      clean[`${key}Mode`] === 'blank' ? `${name}: blank line` : clean[`${key}Mode`] === 'text' && clean[key].trim() ? `“${clean[key].trim()}”` : '',
    )
    return parts.filter(Boolean).join(' · ') || 'None'
  })
  const lineSummary = $derived.by(() => {
    const { from, to, step } = plot.range
    const n = (v: number) => niceText(v, plot.numbering)
    const fitted = !clean.from.trim() && !clean.to.trim() && !clean.step.trim() && plot.stacks.length > 0
    return [
      `${n(from)} to ${n(to)}`,
      `by ${n(step)}`,
      fitted && 'fits the data',
      clean.every ? (clean.every === 1 ? 'numbered' : `numbered every ${clean.every}`) : 'unnumbered',
    ].filter(Boolean).join(' · ')
  })

  let svg = $state<SVGSVGElement>()
  const filename = 'dot-plot'
</script>

<GeneratorPage name="Dot Plot Generator" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to type the data">
          Type or paste the values, separated by commas or spaces, like 3, 4, 4, 5, 7. Each value gets one dot, and equal values
          stack up. Fractions like 3/4 and 1 1/2 work too, and number the line in fractions. Or type each value once with how many
          of it there are, as a frequency table. Leave it empty for a blank number line.
        </HelpTip>
      </div>
      <div class="segmented" role="radiogroup" aria-label="Data">
        {#each Object.entries(INPUTS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.input === value} class:on={clean.input === value} onclick={() => setInput(value as Input)}>{title}</button>
        {/each}
      </div>

      {#if clean.input === 'list'}
        <textarea
          rows="3" aria-label="Values" placeholder="3, 4, 4, 5, 5, 5, 6, 7, 7, 9" inputmode="decimal"
          aria-invalid={!!plot.problems.data} aria-describedby={plot.problems.data ? 'data-problem' : undefined} bind:value={s.data}
        ></textarea>
        {#if plot.problems.data}<p id="data-problem" class="help problem">{plot.problems.data}</p>{/if}
      {:else}
        <TableInput id="table" rowName="Value" columnName="Count" columns={COUNT_COLUMN} fixed numberNames addRow="Add a value" bind:rows={s.rows} />
        {#if plot.problems.table}<p class="help problem">{plot.problems.table}</p>{/if}
      {/if}
      {#if plot.problems.past}<p class="help problem">{plot.problems.past}</p>{/if}
      {#if dataSummary}<p class="help">{dataSummary}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Marks" icon={CircleDot} summary={markSummary}>
      <div class="segmented" role="radiogroup" aria-label="Marks">
        {#each Object.entries(MARKS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.mark === value} class:on={clean.mark === value} onclick={() => (s.mark = value as Mark)}>{title}</button>
        {/each}
      </div>
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each TITLES as { key, name, placeholder }}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} {placeholder} bind:mode={s[`${key}Mode`]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <Section title="Number line" icon={Ruler} summary={lineSummary}>
      <div class="range-fields">
        {#each RANGE_FIELDS as [key, name]}
          <div class="range-field">
            <label for="range-{key}">{name}</label>
            <MathInput id="range-{key}" placeholder={niceText(plot.auto[key], plot.numbering)} aria-invalid={!!plot.problems[key]} bind:value={s[key]} />
          </div>
        {/each}
      </div>
      {#each RANGE_FIELDS as [key]}
        {#if plot.problems[key]}<p class="help problem">{plot.problems[key]}</p>{/if}
      {/each}
      <p class="hint range-hint">Leave these empty to fit the data.</p>
      <label class="field">
        Numbers
        <select bind:value={s.every}>
          {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
        </select>
      </label>
      <div class="ends">
        {#each ENDS as [key, name, direction]}
          <div class="field">
            <span>{name}</span>
            <CapPicker options={CAPS} label="Number line {name.toLowerCase()}" {direction} bind:value={s[key]} />
          </div>
        {/each}
      </div>
    </Section>
  {/snippet}

  {#snippet figure()}
    <DotPlot settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .segmented button { flex: 1; }
  textarea {
    width: 100%; padding: 0.5rem 0.6rem; border: 1.5px solid var(--border); border-radius: 10px;
    font: inherit; font-size: 0.95rem; font-weight: 400; background: #fff; color: var(--ink); resize: vertical;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  textarea[aria-invalid='true'] { border-color: var(--red); }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .hint { font-weight: 400; color: var(--muted); font-size: 0.84rem; margin: 0; }

  .range-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.5rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .range-fields ~ .help { margin: -0.1rem 0 0.5rem; }
  .range-hint { margin-bottom: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .ends { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .ends .field { margin-bottom: 0; }
</style>
