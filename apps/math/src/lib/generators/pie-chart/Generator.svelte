<script lang="ts">
  // The Pie Chart Generator: presets and the data table on the left, with
  // each category's angle, percent and fraction under it, the figure's
  // settings under them, the figure card on the right. Settings are mirrored
  // into the page address so a bookmark or shared link brings back exactly
  // this pie chart, and the server renders that same figure on first load.
  import { ChartPie, Heading, Palette, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { FILLS, LOOKS } from '$lib/stats/fills'
  import TableInput from '$lib/stats/TableInput.svelte'
  import PieChart from './PieChart.svelte'
  import { buildPieChart } from './layout.js'
  import {
    ANGLE_MARKS, KEY_PLACES, LABEL_MODES, ORDERS, SECTOR_LABELS, VALUE_KINDS,
    cleanSettings, filledAt, fmt, nice, settingsFromParams, settingsToQuery, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'pie-chart',
    { history: 'mathfigures.pie-chart.history', presets: 'mathfigures.pie-chart.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const built = $derived(buildPieChart(clean))
  const read = $derived(built.read)
  // The table's one column of values; its heading follows what they are.
  let columns = $state([''])
  const HEADINGS = { count: 'Count', percent: 'Percent', degrees: 'Degrees' }

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }

  // The categories with something typed, by their place in the table, for
  // the lists of each one's own label and fill.
  const rowsAt = $derived(filledAt(clean.rows).slice(0, 12))
  const rowName = (i: number, k: number) => clean.rows[i].name.trim() || `Category ${k + 1}`
  function setAt(list: string[], i: number, v: string) {
    while (list.length < i) list.push('')
    list[i] = v
  }
  // A row emptied out of the table takes its own label and fill with it.
  function removeRow(i: number) {
    s.sectorLabels.splice(i, 1)
    s.fills.splice(i, 1)
  }

  // The readout: each category's share, then the empty part and the total.
  const unit = $derived(clean.values === 'percent' ? '%' : clean.values === 'degrees' ? '°' : '')
  const share = (angle: number | null, percent: number | null, fraction: { n: number; d: number } | null) =>
    angle === null ? ['—', '—', '—'] : [`${nice(angle)}°`, `${nice(percent!)}%`, fraction ? `${fraction.n}/${fraction.d}` : '—']
  const readout = $derived([
    ...read.parts.map((p) => ({ name: p.name || `Category ${p.row + 1}`, value: p.typed ? `${p.typed}${unit}` : '—', cells: share(p.angle, p.percent, p.fraction), empty: false })),
    ...(read.gap > 0 && read.parts.some((p) => p.angle)
      ? [{ name: 'Left empty', value: read.whole > 0 ? `${fmt(Number(((read.gap / 360) * read.whole).toPrecision(10)))}${unit}` : '—', cells: share(read.gap, (read.gap / 360) * 100, null), empty: true }]
      : []),
  ])

  const sectorsSummary = $derived(
    [
      ORDERS[clean.order],
      clean.angleMarks !== 'none' && ANGLE_MARKS[clean.angleMarks].toLowerCase(),
      built.centerDot && 'center dot',
    ].filter(Boolean).join(' · '),
  )
  const labelsSummary = $derived.by(() => {
    const own = rowsAt.filter((i) => clean.sectorLabels[i]).length
    return [LABEL_MODES[clean.labels], own && `${own} sector${own === 1 ? '' : 's'} with ${own === 1 ? 'its' : 'their'} own`].filter(Boolean).join(' · ')
  })
  const lookSummary = $derived([LOOKS[clean.look], clean.keyAt !== 'none' && `key ${KEY_PLACES[clean.keyAt].toLowerCase()}`].filter(Boolean).join(' · '))
  const titleSummary = $derived(
    clean.titleMode === 'blank' ? 'Blank line' : clean.titleMode === 'text' && clean.title.trim() ? `“${clean.title.trim()}”` : 'None',
  )

  let svg = $state<SVGSVGElement>()
  const filename = 'pie-chart'
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
<GeneratorPage name="Pie Chart Generator" {filename} {gen} {svg} settingsWidth="minmax(28rem, 40%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to fill in the table">
          Type in the table as in a spreadsheet, or paste one from Sheets or Excel: a category on each row and its value. Type in the
          empty row for another category; empty a row to remove it. Sectors run clockwise from 12 o’clock. Leave a value empty and its
          share of the circle is left as one empty sector, for students to draw. With counts, type the total so there’s room for it.
          Leave every value empty for a blank circle.
        </HelpTip>
      </div>
      {@render choice({ key: 'values', name: 'Values are', options: VALUE_KINDS })}
      <TableInput
        id="table" rowName="Category" columnName="Value" valueHeading={HEADINGS[clean.values]}
        bind:columns bind:rows={s.rows} onremoverow={removeRow} onreplace={() => ((s.sectorLabels = []), (s.fills = []))}
      />
      {#if read.problems.table}<p class="help problem">{read.problems.table}</p>{/if}
      {#if read.offer}
        <p class="offer">
          These add up to {read.offer === 'degrees' ? 360 : 100}.
          <button type="button" class="link" onclick={() => (s.values = read.offer!)}>Use them as {VALUE_KINDS[read.offer].toLowerCase()}</button>
        </p>
      {/if}
      {#if clean.values === 'count'}
        <label class="total">
          <span>Total</span>
          <input type="text" inputmode="decimal" placeholder={read.sum > 0 ? fmt(read.sum) : ''} aria-invalid={!!read.problems.total} bind:value={s.total} />
        </label>
        {#if read.problems.total}<p class="help problem">{read.problems.total}</p>{/if}
      {/if}
      {#if read.problems.sum}<p class="help problem">{read.problems.sum}</p>{/if}
      {#if readout.some((r) => r.cells[0] !== '—')}
        <table class="readout" aria-label="Each category's share">
          <thead><tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Angle</th><th scope="col">Percent</th><th scope="col">Fraction</th></tr></thead>
          <tbody>
            {#each readout as r}
              <tr class:empty={r.empty}><th scope="row">{r.name}</th><td>{r.value}</td>{#each r.cells as c}<td>{c}</td>{/each}</tr>
            {/each}
          </tbody>
          <tfoot><tr><th scope="row">Total</th><td>{fmt(read.whole)}{unit}</td><td>360°</td><td>100%</td><td>1</td></tr></tfoot>
        </table>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Sectors" icon={ChartPie} summary={sectorsSummary}>
      {@render choice({ key: 'order', name: 'Order', options: ORDERS })}
      {@render choice({ key: 'angleMarks', name: 'Angle marks at the center', options: ANGLE_MARKS })}
      <label class="check">
        <input type="checkbox" checked={built.centerDot} onchange={(e) => (s.centerDot = e.currentTarget.checked ? 'on' : 'off')} />
        <span>Center dot</span>
      </label>
    </Section>

    <Section title="Labels" icon={Tags} summary={labelsSummary}>
      <label class="field">
        <span>Sector labels</span>
        <select bind:value={s.labels}>
          {#each Object.entries(LABEL_MODES) as [v, name]}<option value={v}>{name}</option>{/each}
        </select>
      </label>
      {#if rowsAt.length}
        <div class="per-sector" role="group" aria-label="Each sector's own label">
          {#each rowsAt as i, k (i)}
            <label class="row">
              <span>{rowName(i, k)}</span>
              <select value={clean.sectorLabels[i] ?? ''} onchange={(e) => setAt(s.sectorLabels, i, e.currentTarget.value)}>
                <option value="">As the chart</option>
                {#each Object.entries(SECTOR_LABELS) as [v, name]}<option value={v}>{name}</option>{/each}
              </select>
            </label>
          {/each}
        </div>
      {/if}
    </Section>

    <Section title="Look" icon={Palette} summary={lookSummary}>
      {@render choice({ key: 'look', name: 'Fills', options: LOOKS })}
      {#if rowsAt.length}
        <div class="per-sector" role="group" aria-label="Each sector's fill">
          {#each rowsAt as i, k (i)}
            {@const turn = built.partFills[k]}
            <label class="row">
              <span>{rowName(i, k)}</span>
              <select value={clean.fills[i] ?? ''} onchange={(e) => setAt(s.fills, i, e.currentTarget.value)}>
                <option value="">{turn.tint ? `Light ${FILLS[turn.fill].toLowerCase()}` : FILLS[turn.fill]} (in turn)</option>
                {#each Object.entries(FILLS) as [v, name]}<option value={v}>{name}</option>{/each}
              </select>
            </label>
          {/each}
        </div>
      {/if}
      {@render choice({ key: 'keyAt', name: 'Key', options: KEY_PLACES })}
    </Section>

    <Section title="Title" icon={Heading} summary={titleSummary}>
      <div class="field">
        <span>Chart title</span>
        <LabelField name="Chart title" placeholder="Favorite fruit" bind:mode={s.titleMode} bind:text={s.title} />
      </div>
    </Section>
  {/snippet}

  {#snippet figure()}
    <PieChart settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .data .part { margin-bottom: 0.1rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .offer { margin: 0; font-size: 0.88rem; }
  .link { padding: 0; border: 0; background: none; color: var(--blue-dark); font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }
  .total { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; font-size: 0.88rem; margin: 0; }
  .total input { width: 8rem; }

  .readout { width: 100%; border-collapse: collapse; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
  .readout th, .readout td { padding: 0.28rem 0.6rem; text-align: right; }
  .readout th[scope='row'], .readout thead th:first-child { text-align: left; }
  .readout thead th { font-weight: 700; color: var(--muted); font-size: 0.78rem; }
  .readout tbody th, .readout td { font-weight: 600; }
  .readout tr.empty th { font-style: italic; }
  .readout tfoot { border-top: 1px solid var(--border); }
  .readout tfoot th, .readout tfoot td { font-weight: 700; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }

  .per-sector { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .per-sector .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); align-items: center; gap: 0.6rem; font-size: 0.88rem; font-weight: 600; }
  .per-sector .row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
