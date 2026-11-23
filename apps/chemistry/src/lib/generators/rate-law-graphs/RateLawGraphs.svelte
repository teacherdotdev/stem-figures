<script lang="ts">
  // Rate Law Graphs: set the order of A → products, [A]₀ and k, and get [A],
  // ln[A] and 1/[A] against time, side by side or one alone, for students to
  // find the order from which graph is straight. With data points (scattered
  // if wanted), a data table, and guide lines at the half-lives. The axes
  // are always fitted to the reaction. The grids are $shared/graph's, the
  // same as Half-Life Graph's.
  import { Check, Copy, Dices, FlaskConical, Grid3x3, Heading, Ruler, Spline } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import { titlesSummary } from '$shared/graph/axes'
  import Section from '$shared/Section.svelte'
  import { CONC_UNITS, TIME_UNITS, TIME_UNIT_NAMES, concentrationOf, timeTitle } from '$lib/shared/concentration'
  import { answerLines, buildRateLaw, dataText } from './figure'
  import { kUnit, type Order } from './kinetics'
  import RateLawFigure from './RateLawFigure.svelte'
  import {
    GRAPHS, GUIDE_LABELS, GUIDE_LABEL_NAMES, NOISES, ORDERS, ORDER_NAMES, TABLES, autoTitle, kForOrder, newSeed, orderOf, plotsOf, quantityOf,
    rateLawSettings, speciesOf, type Graphs,
  } from './settings'

  const gen = generatorState(rateLawSettings, 'rate-law-graphs')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const g = $derived(buildRateLaw(clean))
  const plots = $derived(plotsOf(clean))
  const conc = $derived(concentrationOf(speciesOf(clean)))
  let svg = $state<SVGSVGElement>()

  /** Where changing the order couldn't keep the first half-life: shown while that order and k stand. */
  let unkept = $state<{ order: string; k: number } | null>(null)

  /** Changing the order keeps the first half-life, by setting k to match (to three significant figures). */
  function chooseOrder(next: (typeof ORDERS)[number]) {
    if (next === clean.order) return
    const { k, kept } = kForOrder(clean, Number(next) as Order)
    s.k = k
    s.order = next
    unkept = kept ? null : { order: next, k }
  }
  const orderNote = $derived(
    unkept && unkept.order === clean.order && unkept.k === clean.k
      ? 'The first half-life couldn’t be kept: the k it needs is outside 10⁻⁶ to 10⁶.'
      : null,
  )

  const graphName = (v: Graphs) => (v === 'all' ? 'All three, side by side' : `${quantityOf(clean, v)} against time`)
  const tableNames = $derived({
    none: 'None',
    conc: `Time and ${conc}`,
    all: `Time, ${conc}, ${quantityOf(clean, 'ln')} and ${quantityOf(clean, 'inv')}`,
  })
  const timeName = (u: (typeof TIME_UNITS)[number]) => TIME_UNIT_NAMES[u].many.replace(/^./, (c) => c.toUpperCase())

  let copied = $state(false)
  async function copyData() {
    await navigator.clipboard.writeText(dataText(clean))
    copied = true
    setTimeout(() => (copied = false), 1500)
  }

  const answer = $derived(answerLines(clean))
  const showsConc = $derived(plots.includes('conc'))
  const dataSummary = $derived(
    [
      clean.curve ? 'Curve' : 'No curve',
      clean.points ? `${clean.count} points` : '',
      (clean.points || clean.table !== 'none') && clean.noise !== '0' ? `${clean.noise}% scatter` : '',
      clean.table === 'none' ? '' : 'table',
      clean.color ? '' : 'black and white',
    ].filter(Boolean).join(' · '),
  )
  const guideSummary = $derived(
    clean.guides ? `${clean.guides} half-li${clean.guides === 1 ? 'fe' : 'ves'}${clean.guideLabels === 'none' ? '' : `, ${GUIDE_LABEL_NAMES[clean.guideLabels].toLowerCase()}`}` : 'None',
  )
  const unitSummary = $derived(`${conc} in ${clean.concUnit} · time in ${TIME_UNIT_NAMES[clean.timeUnit].many}`)
  const TITLE_FIELDS = [
    { key: 'time', name: 'Time axis title' },
    { key: 'conc', name: 'Concentration axis title', plot: 'conc' },
    { key: 'ln', name: 'ln axis title', plot: 'ln' },
    { key: 'inv', name: '1/concentration axis title', plot: 'inv' },
  ] as const
  const titleFields = $derived(TITLE_FIELDS.filter((f) => !('plot' in f) || plots.includes(f.plot)))
  const placeholderOf = (key: (typeof TITLE_FIELDS)[number]['key']) => (key === 'time' ? timeTitle(clean.timeUnit) : autoTitle(clean, key))
  const titleSummary = $derived(
    [
      titlesSummary({ title: clean.title, titleMode: clean.titleMode, xTitle: '', xTitleMode: 'none', yTitle: '', yTitleMode: 'none' }),
      ...titleFields.map((f) => {
        const mode = clean[`${f.key}TitleMode`]
        return mode === 'blank' ? `${f.name}: blank line` : mode === 'none' ? `no ${f.name.toLowerCase()}` : clean[`${f.key}Title`].trim() ? `“${clean[`${f.key}Title`].trim()}”` : ''
      }),
    ].filter((part) => part && part !== 'None').join(' · ') || 'Axis titles follow the species and units',
  )
  const gridSummary = $derived([clean.numbers ? 'Numbered' : 'No numbers (sketch graphs)', clean.gridlines ? 'gridlines' : 'no gridlines'].join(' · '))
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : 'rate-law-graphs')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rate-law-graphs',
  )
</script>

{#snippet check(label: string, value: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" checked={value} onchange={(e) => set(e.currentTarget.checked)} />
    <span><strong>{label}</strong></span>
  </label>
{/snippet}

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Rate Law Graphs" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="reaction">
      <h2 class="card-head">Reaction: {speciesOf(clean)} → products</h2>

      <div class="field">
        <span>Order</span>
        {@render segmented('Order', ORDERS, ORDER_NAMES, s.order, chooseOrder)}
      </div>
      <div class="fields">
        <label class="number-field">
          <span>{conc}₀ ({clean.concUnit})</span>
          <input type="number" step="any" min="0" bind:value={s.a0} />
        </label>
        <label class="number-field">
          <span>k ({kUnit(orderOf(clean), clean.concUnit, clean.timeUnit)})</span>
          <input type="number" step="any" min="0" bind:value={s.k} />
        </label>
      </div>
      <label class="field">
        <span>Graphs</span>
        <select bind:value={s.graphs}>
          {#each GRAPHS as v}<option value={v}>{graphName(v)}</option>{/each}
        </select>
      </label>

      {#if orderNote}<p class="problem">{orderNote}</p>{/if}
      {#if g.problems.time}<p class="problem">{g.problems.time}</p>{/if}

      <ul class="readout">{#each answer as line}<li>{line}</li>{/each}</ul>
      {#if g.problems.scatter}<p class="problem">{g.problems.scatter}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Curve and data" icon={Spline} summary={dataSummary}>
      {@render check('Draw the curve', s.curve, (v) => (s.curve = v))}
      {@render check('Data points', s.points, (v) => (s.points = v))}
      <label class="field setting">
        <span>Data table under the graphs</span>
        <select bind:value={s.table}>
          {#each TABLES as v}<option value={v}>{tableNames[v]}</option>{/each}
        </select>
      </label>
      <div class="fields setting">
        <label class="number-field">
          <span>Number of points</span>
          <select bind:value={s.count}>
            {#each [5, 6, 7, 8, 9, 10] as n}<option value={n}>{n}</option>{/each}
          </select>
        </label>
        <label class="number-field">
          <span>Scatter</span>
          <select bind:value={s.noise}>
            {#each NOISES as v}<option value={v}>{v === '0' ? 'None' : `About ${v}%`}</option>{/each}
          </select>
        </label>
      </div>
      <div class="buttons setting">
        {#if clean.noise !== '0'}
          <button type="button" class="btn-ghost small" onclick={() => (s.seed = newSeed())}><Dices size={16} aria-hidden="true" /> New data</button>
        {/if}
        <button type="button" class="btn-ghost small" onclick={copyData}>
          {#if copied}<Check size={16} aria-hidden="true" /> Copied{:else}<Copy size={16} aria-hidden="true" /> Copy data{/if}
        </button>
      </div>
      <div class="setting">{@render segmented('Lines', ['color', 'bw'] as const, { color: 'Color', bw: 'Black and white' }, s.color ? 'color' : 'bw', (v) => (s.color = v === 'color'))}</div>
    </Section>

    <Section title="Guide lines" icon={Ruler} summary={guideSummary}>
      <label class="field setting">
        <span>Dashed lines at</span>
        <select bind:value={s.guides}>
          <option value={0}>None</option>
          {#each [1, 2, 3] as n}<option value={n}>The first {n === 1 ? 'half-life' : `${n} half-lives`}</option>{/each}
        </select>
      </label>
      {#if clean.guides}
        <label class="field setting">
          <span>Labeled with</span>
          <select bind:value={s.guideLabels}>
            {#each GUIDE_LABELS as m}<option value={m}>{GUIDE_LABEL_NAMES[m]}</option>{/each}
          </select>
        </label>
        {#if !showsConc}<p class="note">Guide lines are drawn on the {conc} graph, which isn’t shown.</p>{/if}
      {/if}
      {#if g.problems.guides}<p class="problem">{g.problems.guides}</p>{/if}
      {#if g.problems.labels}<p class="problem">{g.problems.labels}</p>{/if}
    </Section>

    <Section title="Species and units" icon={FlaskConical} summary={unitSummary}>
      <label class="field setting">
        <span>Reactant</span>
        <input type="text" maxlength="20" placeholder="A" bind:value={s.species} />
      </label>
      <div class="fields">
        <label class="number-field">
          <span>Concentration in</span>
          <select bind:value={s.concUnit}>
            {#each CONC_UNITS as u}<option value={u}>{u}</option>{/each}
          </select>
        </label>
        <label class="number-field">
          <span>Time in</span>
          <select bind:value={s.timeUnit}>
            {#each TIME_UNITS as u}<option value={u}>{timeName(u)}</option>{/each}
          </select>
        </label>
      </div>
    </Section>

    <Section title="Titles" icon={Heading} summary={titleSummary}>
      <div class="field setting">
        <span>Chart title</span>
        <LabelField name="Chart title" placeholder="Decomposition of N₂O₅" bind:mode={s.titleMode} bind:text={s.title} />
      </div>
      {#each titleFields as f (f.key)}
        <div class="field setting">
          <span>{f.name}</span>
          <LabelField name={f.name} placeholder={placeholderOf(f.key)} bind:mode={s[`${f.key}TitleMode`]} bind:text={s[`${f.key}Title`]} />
        </div>
      {/each}
    </Section>

    <Section title="Axes and grid" icon={Grid3x3} summary={gridSummary}>
      {@render check('Numbers on the axes', s.numbers, (v) => (s.numbers = v))}
      {@render check('Gridlines', s.gridlines, (v) => (s.gridlines = v))}
    </Section>
  {/snippet}

  {#snippet figure()}
    <RateLawFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .reaction { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input, .number-field select { width: 100%; min-width: 0; }
  .problem { margin: 0 0 0.75rem; font-size: 0.84rem; color: var(--red); font-weight: 600; }
  .reaction .problem { margin: 0; }
  .note { margin: 0 0 0.75rem; font-size: 0.84rem; color: var(--muted); }
  .note:last-child { margin-bottom: 0; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .buttons button { display: inline-flex; align-items: center; gap: 0.4rem; }
  .setting { margin-bottom: 0.75rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.88rem; }
</style>
