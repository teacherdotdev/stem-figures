<script lang="ts">
  // The Bar Graph Generator: presets and the data table on the left, the
  // figure's settings under them, the figure card on the right. Settings are
  // mirrored into the page address so a bookmark or shared link brings back
  // exactly this bar graph, and the server renders that same figure on first load.
  import { ChartColumn, Diff, EyeOff, Heading, MoveUp, Palette } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { niceText } from '$shared/graph/numbering'
  import MathInput from '$lib/shared/MathInput.svelte'
  import { FILLS, LOOKS, fillOf } from '$lib/stats/fills'
  import TableInput from '$lib/stats/TableInput.svelte'
  import BarGraph from './BarGraph.svelte'
  import {
    BAR_WIDTHS, CROSSBARS, DIRECTIONS, KEY_PLACES, STACKINGS, VALUE_LABELS,
    cleanSettings, readGraph, settingsFromParams, settingsToQuery, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'bar-graph',
    { history: 'mathfigures.bar-graph.history', presets: 'mathfigures.bar-graph.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const graph = $derived(readGraph(clean))
  const several = $derived(clean.columns.length > 1)

  // Clicking values to leave them for students is a way of using the table, not a setting.
  let hiding = $state(false)

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }
  const RANGE_FIELDS = [
    ['from', 'From'],
    ['to', 'To'],
    ['step', 'Count by'],
  ] as const
  const EVERY_OPTIONS: [number, string][] = [
    [1, 'Every line'],
    [2, 'Every 2nd line'],
    [5, 'Every 5th line'],
    [10, 'Every 10th line'],
    [0, 'No numbers'],
  ]
  const TITLES = [
    { key: 'title', name: 'Chart title', placeholder: 'Favorite sports' },
    { key: 'categoryTitle', name: 'Category axis title', placeholder: 'Sport' },
    { key: 'valueTitle', name: 'Value axis title', placeholder: 'Number of students' },
  ] as const

  const seriesName = (j: number) => clean.columns[j]?.trim() || `Series ${j + 1}`
  function setFill(j: number, v: string) {
    while (s.fills.length < j) s.fills.push('')
    s.fills[j] = v
  }

  const barsSummary = $derived(
    [
      DIRECTIONS[clean.direction],
      several && STACKINGS[clean.stacking].toLowerCase(),
      `${BAR_WIDTHS[clean.barWidth].toLowerCase()} bars`,
      clean.values !== 'none' && `values ${VALUE_LABELS[clean.values].toLowerCase()}`,
    ].filter(Boolean).join(' · '),
  )
  const lookSummary = $derived([LOOKS[clean.look], several && `key ${KEY_PLACES[clean.keyAt].toLowerCase()}`].filter(Boolean).join(' · '))
  const errorSummary = $derived(
    [`${CROSSBARS[clean.crossbars]} crossbars`, clean.errorNote.trim() && `“${clean.errorNote.trim()}”`].filter(Boolean).join(' · '),
  )
  const titlesSummary = $derived.by(() => {
    const parts = TITLES.map(({ key, name }) =>
      clean[`${key}Mode`] === 'blank' ? `${name}: blank line` : clean[`${key}Mode`] === 'text' && clean[key].trim() ? `“${clean[key].trim()}”` : '',
    )
    return parts.filter(Boolean).join(' · ') || 'None'
  })
  const axisSummary = $derived.by(() => {
    const { from, to, step } = graph.range
    const n = (v: number) => niceText(v, graph.numbering)
    const fitted = !clean.from.trim() && !clean.to.trim() && !clean.step.trim()
    return [
      `${n(from)} to ${n(to)}`,
      `by ${n(step)}`,
      fitted && 'fits the data',
      clean.every ? (clean.every === 1 ? 'numbered' : `numbered every ${clean.every}`) : 'unnumbered',
    ].filter(Boolean).join(' · ')
  })

  let svg = $state<SVGSVGElement>()
  const filename = 'bar-graph'
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
<GeneratorPage name="Bar Graph Generator" {filename} {gen} {svg} settingsWidth="minmax(28rem, 40%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to fill in the table">
          Type in the table as in a spreadsheet, or paste one from Sheets or Excel. Each row is a category and each column a set of
          bars, named by its heading. Type a heading in the + column at the end for a double bar graph, or in the empty row for another
          category; empty a row or column to remove it. A pasted column headed SEM, SD or ± becomes the error bars of the one before
          it. Leave for students turns each value into a button: click one to leave its bar off, or a name to leave a blank line for it.
        </HelpTip>
      </div>
      <TableInput
        id="table" rowName="Category" columnName="Series" {hiding}
        bind:columns={s.columns} bind:rows={s.rows} bind:errors={s.errorBars}
        placeholders={{ column: 'Students' }} onremovecolumn={(j) => s.fills.splice(j, 1)}
      />
      {#if graph.problems.table}<p class="help problem">{graph.problems.table}</p>{/if}
      <div class="options">
        <label class="check">
          <input type="checkbox" bind:checked={s.errorBars} />
          <span>Error bars <Diff size={14} aria-hidden="true" /></span>
        </label>
        <button type="button" class="toggle" class:on={hiding} aria-pressed={hiding} onclick={() => (hiding = !hiding)}>
          <EyeOff size={15} aria-hidden="true" /> {hiding ? 'Done' : 'Leave for students'}
        </button>
      </div>
      {#if graph.problems.errors}<p class="help problem">{graph.problems.errors}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Bars" icon={ChartColumn} summary={barsSummary}>
      {@render choice({ key: 'direction', name: 'Direction', options: DIRECTIONS })}
      {#if several}{@render choice({ key: 'stacking', name: 'Several series', options: STACKINGS })}{/if}
      {@render choice({ key: 'barWidth', name: 'Width', options: BAR_WIDTHS })}
      {@render choice({ key: 'values', name: 'Values on the bars', options: VALUE_LABELS })}
    </Section>

    <Section title="Look" icon={Palette} summary={lookSummary}>
      {@render choice({ key: 'look', name: 'Fills', options: LOOKS })}
      {#each clean.columns as _, j}
        <label class="field">
          <span>{several ? seriesName(j) : 'Bars'}</span>
          <select value={clean.fills[j] ?? ''} onchange={(e) => setFill(j, e.currentTarget.value)}>
            <option value="">{FILLS[fillOf(clean.look, j)]} (in turn)</option>
            {#each Object.entries(FILLS) as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
        </label>
      {/each}
      {#if several}{@render choice({ key: 'keyAt', name: 'Key', options: KEY_PLACES })}{/if}
    </Section>

    {#if clean.errorBars}
      <Section title="Error bars" icon={Diff} summary={errorSummary}>
        {@render choice({ key: 'crossbars', name: 'Crossbars', options: CROSSBARS })}
        <label class="field">
          <span>Note under the graph</span>
          <input type="text" placeholder="Error bars show ±1 SEM" bind:value={s.errorNote} />
        </label>
      </Section>
    {/if}

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each TITLES as { key, name, placeholder }}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} {placeholder} bind:mode={s[`${key}Mode`]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <Section title="Value axis" icon={MoveUp} summary={axisSummary}>
      <div class="range-fields">
        {#each RANGE_FIELDS as [key, name]}
          <div class="range-field">
            <label for="range-{key}">{name}</label>
            <MathInput id="range-{key}" placeholder={niceText(graph.auto[key], 'decimal')} aria-invalid={!!graph.problems[key]} bind:value={s[key]} />
          </div>
        {/each}
      </div>
      {#each RANGE_FIELDS as [key]}
        {#if graph.problems[key]}<p class="help problem">{graph.problems[key]}</p>{/if}
      {/each}
      <label class="field">
        Numbers
        <select bind:value={s.every}>
          {#each EVERY_OPTIONS as [v, label]}<option value={v}>{label}</option>{/each}
        </select>
      </label>
    </Section>

    <GridlineSettings bind:minor={s.minor} bind:gridlines={s.gridlines} />
  {/snippet}

  {#snippet figure()}
    <BarGraph settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .options { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
  .check span { display: inline-flex; align-items: center; gap: 0.3rem; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .toggle {
    display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.7rem; border: 1.5px solid var(--border);
    border-radius: 999px; background: #fff; color: var(--blue-dark); font-weight: 700; font-size: 0.85rem; cursor: pointer;
  }
  .toggle:hover { background: var(--blue-soft); }
  .toggle.on { background: var(--blue); border-color: var(--blue); color: #fff; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }

  .range-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.75rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .range-fields ~ .help { margin: -0.3rem 0 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
</style>
