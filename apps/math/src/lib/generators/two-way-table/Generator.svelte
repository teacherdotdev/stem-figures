<script lang="ts">
  // The Two-Way Table Generator: presets and the table on the left (counts or
  // relative frequencies at the top, the totals switches and the missing
  // values worked out under it), the figure's settings under them, the figure
  // card on the right. Settings are mirrored into the page address so a
  // bookmark or shared link brings back exactly this table, and the server
  // renders that same figure on first load.
  import { Heading, Palette, Percent, Sigma } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import TableInput from '$lib/stats/TableInput.svelte'
  import TwoWayTable from './TwoWayTable.svelte'
  import { buildTable } from './layout.js'
  import {
    CORNERS, FORMS, HEADERS, PLACES, RELATIVE_TO, RULES, SHOWS,
    cleanSettings, readTwoWay, settingsFromParams, settingsToQuery, workOutTotals, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'two-way-table',
    { history: 'mathfigures.two-way-table.history', presets: 'mathfigures.two-way-table.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readTwoWay(clean))
  const relative = $derived(clean.show === 'relative')
  // Printed at its own size (about an inch for every 96 units), so a small
  // table isn't blown up to the width of the page.
  const printWidth = $derived(Math.min(7.5, Math.max(2.5, buildTable(clean).width / 96)))

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }

  // The missing values: how many can be worked out, each one's value, and the rest.
  const found = $derived(read.missing.filter((m) => m.value !== null))
  const unfound = $derived(read.missing.filter((m) => m.value === null))
  const missingHead = $derived.by(() => {
    const n = read.missing.length
    if (!unfound.length) return n === 1 ? 'The missing value can be worked out.' : `All ${n} missing values can be worked out.`
    if (!found.length) return n === 1 ? 'The missing value can’t be worked out.' : `None of the ${n} missing values can be worked out.`
    return `${found.length} of the ${n} missing values can be worked out.`
  })

  function fillTotals() {
    Object.assign(s, workOutTotals(clean))
  }

  const placesText = (p: number) => (p === 0 ? 'Whole numbers' : `${p} decimal place${p === 1 ? '' : 's'}`)
  const relativeSummary = $derived(
    [`Of ${RELATIVE_TO[clean.relativeTo].toLowerCase()}`, FORMS[clean.form], clean.form !== 'fraction' && placesText(clean.places).toLowerCase()]
      .filter(Boolean).join(' · '),
  )
  const titlesSummary = $derived.by(() => {
    const parts = [
      clean.titleMode === 'blank' ? 'Title: blank line' : clean.titleMode === 'text' && clean.title.trim() ? `“${clean.title.trim()}”` : '',
      clean.columnTitle.trim() && `“${clean.columnTitle.trim()}” across`,
      clean.rowTitle.trim() && `“${clean.rowTitle.trim()}” down`,
      (clean.columnTitle.trim() || clean.rowTitle.trim()) && clean.corner === 'diagonal' && 'in the corner',
    ]
    return parts.filter(Boolean).join(' · ') || 'None'
  })
  const lookSummary = $derived(
    [`${HEADERS[clean.headers]} headings`, RULES[clean.rules].toLowerCase(), clean.totalsBold && 'bold totals'].filter(Boolean).join(' · '),
  )

  let svg = $state<SVGSVGElement>()
  const filename = 'two-way-table'
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

<!-- 40% of the window for the settings: the table needs the room. -->
<GeneratorPage name="Two-Way Table Generator" {filename} {gen} {svg} settingsWidth="minmax(28rem, 40%)" {printWidth} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to fill in the table">
          Type the counts in the table as in a spreadsheet, or paste one from Sheets or Excel, with its totals if it has them. Each row is
          one category, like Year 7, and each column another, like Bus. Type a heading in the + column for another column, or a name in
          the empty row for another row; empty a row or column to remove it. Leave any cell empty, totals too, for students to fill in,
          or type a letter like x. Work out totals fills each empty total the counts give; empty any that students should find.
        </HelpTip>
      </div>
      {@render choice({ key: 'show', name: 'In the cells', options: SHOWS })}
      <TableInput
        id="table" rowName="Row" columnName="Column" inputmode="text"
        bind:columns={s.columns} bind:rows={s.rows} bind:rowTotals={s.rowTotals} bind:columnTotals={s.columnTotals} bind:grand={s.grand}
        bind:totalColumn={s.totalColumn} bind:totalRow={s.totalRow}
        placeholders={{ column: 'Walk' }}
      />
      {#each [read.problems.sums, read.problems.relative, read.problems.fractions] as problem}
        {#if problem}<p class="help problem">{problem}</p>{/if}
      {/each}
      <div class="totals">
        <label class="check"><input type="checkbox" bind:checked={s.totalColumn} /> Total column</label>
        <label class="check"><input type="checkbox" bind:checked={s.totalRow} /> Total row</label>
        {#if clean.totalColumn || clean.totalRow}
          <button type="button" class="btn-ghost work-out" disabled={!read.fillable.length} onclick={fillTotals}>
            <Sigma size={15} aria-hidden="true" /> Work out totals
          </button>
        {/if}
      </div>
      {#if read.missing.length}
        <ul class="readout" aria-live="polite">
          <li>{missingHead}</li>
          {#each found as m}<li class="value">{m.name}: {m.typed ? `${m.typed} = ` : ''}{m.value}</li>{/each}
          {#if unfound.length && found.length}
            <li class="value">Can’t be worked out: {unfound.map((m) => (m.typed ? `${m.name} (${m.typed})` : m.name)).join('; ')}</li>
          {/if}
        </ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    {#if relative}
      <Section title="Relative frequencies" icon={Percent} summary={relativeSummary}>
        {@render choice({ key: 'relativeTo', name: 'Of', options: RELATIVE_TO })}
        {@render choice({ key: 'form', name: 'Written as', options: FORMS })}
        {#if clean.form !== 'fraction'}
          <label class="field">
            Round to
            <select bind:value={s.places}>
              {#each PLACES as p}<option value={p}>{placesText(p)}</option>{/each}
            </select>
          </label>
        {/if}
      </Section>
    {/if}

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      <div class="field">
        <span>Table title</span>
        <LabelField name="Table title" placeholder="How students travel to school" bind:mode={s.titleMode} bind:text={s.title} />
      </div>
      <label class="field">
        Across the top
        <input type="text" placeholder="Transport" bind:value={s.columnTitle} />
      </label>
      <label class="field">
        Down the side
        <input type="text" placeholder="Year" bind:value={s.rowTitle} />
      </label>
      {#if clean.columnTitle.trim() || clean.rowTitle.trim()}{@render choice({ key: 'corner', name: 'Corner', options: CORNERS })}{/if}
    </Section>

    <Section title="Look" icon={Palette} summary={lookSummary}>
      {@render choice({ key: 'headers', name: 'Headings', options: HEADERS })}
      {@render choice({ key: 'rules', name: 'Lines', options: RULES })}
      <label class="check"><input type="checkbox" bind:checked={s.totalsBold} /> Totals in bold</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <TwoWayTable settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .data .part { margin-bottom: 0.15rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .totals { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.1rem; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .work-out { margin-left: auto; padding: 0.4rem 0.75rem; border-radius: 10px; font-size: 0.86rem; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .readout .value { font-weight: 400; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
</style>
