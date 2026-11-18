<script lang="ts">
  // The Table of Values Generator: presets and the values on the left (a rule
  // and its x-values, or typed pairs, with the pattern and the missing values
  // worked out under them), the figure's settings under them, the figure card
  // on the right, where clicking any value makes it a blank for students.
  // Settings are mirrored into the page address so a bookmark or shared link
  // brings back exactly this table, and the server renders that same figure
  // on first load.
  //
  // Switching to Typed when its table is empty fills it from the rule.
  import { Hash, Heading, Table } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import MathInput from '$lib/shared/MathInput.svelte'
  import TableInput from '$lib/stats/TableInput.svelte'
  import { filledRows } from '$lib/stats/table'
  import TableOfValues from './TableOfValues.svelte'
  import { buildTable } from './layout.js'
  import {
    DIRECTIONS, FORMS, HEADERS, HEADING_PAIRS, PLACES, RULE_SHOWS, SOURCES, X_FROM,
    cleanSettings, readTable, rowsOf, settingsFromParams, settingsToQuery, type RawSettings, type Settings, type Source,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'table-of-values',
    { history: 'mathfigures.table-of-values.history', presets: 'mathfigures.table-of-values.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const drawing = $derived(buildTable(clean))
  const read = $derived(drawing.read)
  // Printed at its own size (about an inch for every 96 units), so a small
  // table isn't blown up to the width of the page.
  const printWidth = $derived(Math.min(7.5, Math.max(2.5, drawing.width / 96)))

  /** Switch where the values come from, filling the typed table from the rule if it's empty. */
  function setSource(to: Source) {
    if (to === clean.source) return
    // Filled from the rule, the cells are where they were, so the blanks stay; otherwise they'd land on other values.
    if (to === 'typed' && !filledRows(clean.rows).length && read.n && !read.problems.rule && !read.problems.x) s.rows = rowsOf(read)
    else s.blanks = []
    s.source = to
  }

  // Clicking a value on the figure makes it a blank, or gives it back.
  function toggle(part: Part) {
    s.blanks = clean.blanks.includes(part.key) ? clean.blanks.filter((k) => k !== part.key) : [...clean.blanks, part.key]
  }
  const pickable = $derived({
    frame: { x: 0, y: 0, w: drawing.width, h: drawing.height },
    segments: [],
    angles: [],
    spots: [],
    labels: [],
    areas: drawing.cells.map((c) => ({
      key: c.key,
      d: `M${c.x} ${c.y}h${c.w}v${c.h}h${-c.w}Z`,
      anchor: [c.x + c.w / 2, c.y + c.h / 2] as [number, number],
      name: `${c.name}: ${clean.blanks.includes(c.key) ? 'blank, click to show' : 'click to make a blank'}`,
    })),
  })
  /** Every y (or x) value a blank, keeping any blanks on the other side. */
  function blankAll(side: 'x' | 'y') {
    const keys = Array.from({ length: read.n }, (_, k) => `${side}${k}`)
    s.blanks = [...clean.blanks.filter((k) => !keys.includes(k)), ...keys]
  }

  // The missing values: how many can be worked out, each one's value, and the rest.
  const found = $derived(read.missing.filter((m) => m.value !== null))
  const unfound = $derived(read.missing.filter((m) => m.value === null))
  const missingHead = $derived.by(() => {
    const n = read.missing.length
    if (!unfound.length) return n === 1 ? 'The missing value:' : `The ${n} missing values:`
    if (!found.length) return n === 1 ? 'The missing value can’t be worked out from the table.' : `None of the ${n} missing values can be worked out from the table.`
    return `${found.length} of the ${n} missing values can be worked out:`
  })

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string>; hidden?: string[] }
  const placesText = (p: number) => (p === 0 ? 'Whole numbers' : `${p} decimal place${p === 1 ? '' : 's'}`)
  const RANGE_FIELDS = [
    ['from', 'From'],
    ['to', 'To'],
    ['step', 'Step'],
  ] as const

  const headingsSummary = $derived(
    [
      `${clean.xHeading.trim() || 'blank'} and ${clean.yHeading.trim() || 'blank'}`,
      clean.titleMode === 'blank' ? 'title: blank line' : clean.titleMode === 'text' && clean.title.trim() && `“${clean.title.trim()}”`,
      clean.showRule === 'text' && clean.source === 'rule' ? 'rule written' : clean.showRule === 'blank' && 'rule: blank line',
    ].filter(Boolean).join(' · '),
  )
  const numbersSummary = $derived(clean.form === 'exact' ? `Fractions, else ${placesText(clean.places).toLowerCase()}` : `Decimals, ${placesText(clean.places).toLowerCase()}`)
  const lookSummary = $derived(`${DIRECTIONS[clean.direction]} · ${HEADERS[clean.headers].toLowerCase()} headings`)

  let svg = $state<SVGSVGElement>()
  const filename = 'table-of-values'
</script>

{#snippet choice({ key, name, options, hidden = [] }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options).filter(([v]) => !hidden.includes(v)) as [value, title]}
        <button type="button" role="radio" aria-checked={clean[key] === value} class:on={clean[key] === value} onclick={() => ((s as any)[key] = value)}>{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

<GeneratorPage name="Table of Values Generator" {filename} {gen} {svg} {printWidth} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Values</h2>
        <HelpTip id="values-tip" label="How to fill in the table">
          Type a rule like y = 2x + 1 or y = x^2 − 3, and the x-values as a range (From, To and Step) or a list like −2, 0, 1/2, 3; each y is
          worked out for you, as a fraction or a decimal. Type the range in fractions, π or degrees (0, 30°, 90°) and the x-values are written
          that way. Or pick Typed and type or paste the pairs yourself, words too, leaving any cell empty. Click any value on the figure to
          make it a blank for students.
        </HelpTip>
      </div>
      <div class="segmented" role="radiogroup" aria-label="Values">
        {#each Object.entries(SOURCES) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.source === value} class:on={clean.source === value} onclick={() => setSource(value as Source)}>{title}</button>
        {/each}
      </div>

      {#if clean.source === 'rule'}
        <label class="field" for="rule">Rule</label>
        <MathInput kind="equation" id="rule" placeholder="y = 2x + 1" aria-invalid={!!read.problems.rule} bind:value={s.rule} />
        {#if read.problems.rule}<p class="help problem">{read.problems.rule}</p>{/if}

        {@render choice({ key: 'xFrom', name: 'x-values from', options: X_FROM })}
        {#if clean.xFrom === 'range'}
          <div class="range-fields">
            {#each RANGE_FIELDS as [key, name]}
              <div class="range-field">
                <label for="range-{key}">{name}</label>
                <MathInput id="range-{key}" aria-invalid={!!read.problems.x} bind:value={s[key]} />
              </div>
            {/each}
          </div>
        {:else}
          <input type="text" aria-label="x-values" placeholder="−2, 0, 1/2, 3" aria-invalid={!!read.problems.x} bind:value={s.list} />
        {/if}
        {#if read.problems.x}<p class="help problem">{read.problems.x}</p>{/if}
      {:else}
        <TableInput id="pairs" rowName="x" columnName="y" columns={['y']} fixed inputmode="text" addRow="Add a pair" bind:rows={s.rows} />
        {#if read.problems.typed}<p class="help problem">{read.problems.typed}</p>{/if}
      {/if}

      {#each read.notes as note}<p class="help">{note}</p>{/each}
      <!-- A rule already says its pattern; only a typed table needs it worked out. -->
      {#if read.pattern && clean.source !== 'rule'}<p class="help pattern">{read.pattern}</p>{/if}

      {#if read.n}
        <div class="blank-bar">
          <span>{clean.blanks.length ? `${clean.blanks.length} clicked blank${clean.blanks.length === 1 ? '' : 's'}` : 'Click a value on the figure to make it a blank.'}</span>
          <span class="blank-buttons">
            <button type="button" class="btn-ghost small" onclick={() => blankAll('y')}>Blank every y</button>
            {#if clean.blanks.length}<button type="button" class="btn-ghost small" onclick={() => (s.blanks = [])}>Clear blanks</button>{/if}
          </span>
        </div>
      {/if}
      {#if read.missing.length}
        <ul class="readout" aria-live="polite">
          <li>{missingHead}</li>
          {#each found as m}<li class="value">{m.name}: {m.value}</li>{/each}
          {#if unfound.length && found.length}<li class="value">Can’t be worked out: {unfound.map((m) => m.name).join('; ')}</li>{/if}
        </ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Headings and titles" icon={Heading} summary={headingsSummary}>
      <div class="pairs" role="group" aria-label="Heading pairs">
        {#each HEADING_PAIRS as [x, y]}
          <button
            type="button" class="chip" class:on={clean.xHeading === x && clean.yHeading === y}
            onclick={() => { s.xHeading = x; s.yHeading = y }}
          >{x} / {y}</button>
        {/each}
      </div>
      <div class="two">
        <label class="field">First heading<input type="text" placeholder="Leave empty for a blank" bind:value={s.xHeading} /></label>
        <label class="field">Second heading<input type="text" placeholder="Leave empty for a blank" bind:value={s.yHeading} /></label>
      </div>
      <div class="field">
        <span>Table title</span>
        <LabelField name="Table title" placeholder="Cost of renting a bike" bind:mode={s.titleMode} bind:text={s.title} />
      </div>
      {@render choice({ key: 'showRule', name: 'The rule, above the table', options: RULE_SHOWS, hidden: clean.source === 'typed' ? ['text'] : [] })}
    </Section>

    <Section title="Numbers" icon={Hash} summary={numbersSummary}>
      {@render choice({ key: 'form', name: 'Worked-out values as', options: FORMS })}
      <label class="field">
        {clean.form === 'exact' ? 'Round the rest to' : 'Round to'}
        <select bind:value={s.places}>
          {#each PLACES as p}<option value={p}>{placesText(p)}</option>{/each}
        </select>
      </label>
    </Section>

    <Section title="Layout" icon={Table} summary={lookSummary}>
      {@render choice({ key: 'direction', name: 'The table runs', options: DIRECTIONS })}
      {@render choice({ key: 'headers', name: 'Headings', options: HEADERS })}
    </Section>
  {/snippet}

  {#snippet figure()}
    <div class="stage-figure">
      <TableOfValues settings={clean} layout={drawing} bind:svg />
      <PickLayer figure={pickable} onpick={toggle} />
    </div>
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.55rem; }
  .data .part { margin-bottom: 0.15rem; }
  .data .field { margin-bottom: -0.2rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .help.pattern { color: var(--ink); font-weight: 600; }
  .blank-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .blank-buttons { display: flex; gap: 0.4rem; }
  .small { padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.82rem; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .readout .value { font-weight: 400; }

  .range-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .pairs { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }

  .stage-figure { position: relative; }
</style>
