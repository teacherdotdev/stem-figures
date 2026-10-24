<script lang="ts">
  // The Stem-and-Leaf Plot Generator: presets and the data sets on the left,
  // the figure's settings under them, the figure card on the right. Settings
  // are mirrored into the page address so a bookmark or shared link brings
  // back exactly this plot, and the server renders that same figure on first load.
  import { Grid3x3, Heading, KeyRound, Sprout } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import StemAndLeaf from './StemAndLeaf.svelte'
  import {
    KEY_WORDS, LAYOUTS, ORDERS, SPLIT_NAMES, UNITS,
    cleanSettings, fmt, keyText, readPlot, readoutParts, settingsFromParams, settingsToQuery, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'stem-and-leaf',
    { history: 'mathfigures.stem-and-leaf.history', presets: 'mathfigures.stem-and-leaf.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const plot = $derived(readPlot(clean))
  const back = $derived(clean.layout === 'back')

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }
  const SETS = [
    { data: 'data', name: 'name', side: 'Left leaves', placeholder: 'Class A' },
    { data: 'data2', name: 'name2', side: 'Right leaves', placeholder: 'Class B' },
  ] as const
  const KEY_MODES = { text: 'Written', blank: 'Blank line', none: 'None' }
  const ENDS = [
    ['from', 'First stem'],
    ['to', 'Last stem'],
  ] as const

  const names = $derived(plot.sets.map((t) => t.name))
  /** The key's wording, with this plot's own example. */
  const wording = $derived(
    Object.fromEntries(Object.keys(KEY_WORDS).map((w) => [w, keyText({ ...clean, keyWords: w as Settings['keyWords'], keyUnit: '' }, plot.key, false, [])])),
  )
  const keyPlaceholder = $derived(plot.key.values.join(', '))
  /** Values cut to the leaf unit, for the readout: 23.47 → 23.4. */
  const cutText = (i: number) => {
    const cut = plot.sets[i].cut
    const shown = cut.slice(0, 6).map((c) => `${fmt(c.typed)} → ${fmt(c.value)}`)
    return [...shown, ...(cut.length > 6 ? [`${cut.length - 6} more`] : [])].join(', ')
  }

  const stemsSummary = $derived(
    [
      `Leaf unit ${fmt(plot.unit)}`,
      clean.split > 1 && `stems ${SPLIT_NAMES[clean.split].toLowerCase()}`,
      plot.rows[0]?.stem && `${plot.rows[0].stem} to ${plot.rows.at(-1)!.stem}`,
      `leaves ${ORDERS[clean.order].toLowerCase()}`,
    ].filter(Boolean).join(' · '),
  )
  const lookSummary = $derived(
    [
      clean.headings ? 'Headings' : 'No headings',
      clean.boxes && (plot.boxes ? `${plot.boxes} boxes a row` : 'leaves in boxes'),
    ].filter(Boolean).join(' · '),
  )
  const keySummary = $derived(
    clean.keyMode === 'text' ? keyText(clean, plot.key, back, names) : clean.keyMode === 'blank' ? 'Blank line' : 'None',
  )
  const titlesSummary = $derived(
    clean.titleMode === 'blank' ? 'Chart title: blank line' : clean.titleMode === 'text' && clean.title.trim() ? `“${clean.title.trim()}”` : 'None',
  )

  let svg = $state<SVGSVGElement>()
  const filename = 'stem-and-leaf-plot'
</script>

{#snippet choice({ key, name, options }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options) as [value, title]}
        <button type="button" role="radio" aria-checked={String(clean[key]) === value} class:on={String(clean[key]) === value} onclick={() => ((s as any)[key] = value)}>{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

<GeneratorPage name="Stem-and-Leaf Plot Generator" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <div class="head-row">
        <h2 class="card-head">Data</h2>
        <HelpTip id="data-tip" label="How to type data">
          Type or paste numbers separated by commas or spaces, like 12, 15, 15, 18, 22. Back-to-back plots take two data sets:
          the first set's leaves run left from the stems and the second set's run right. Leave the data empty for a plot to fill
          in: type the first and last stems for empty rows, or turn on boxes for empty boxes.
        </HelpTip>
      </div>
      <div class="segmented" role="radiogroup" aria-label="Plot">
        {#each Object.entries(LAYOUTS) as [value, title]}
          <button type="button" role="radio" aria-checked={clean.layout === value} class:on={clean.layout === value} onclick={() => (s.layout = value as Settings['layout'])}>{title}</button>
        {/each}
      </div>
      {#each back ? SETS : SETS.slice(0, 1) as set, i}
        <div class="set">
          {#if back}
            <label class="set-name">
              <span>{set.side}</span>
              <input type="text" placeholder={set.placeholder} aria-label="Name of the {set.side.toLowerCase()}" bind:value={s[set.name]} />
            </label>
          {/if}
          <textarea
            id="data-{i}"
            rows="2"
            aria-label={back ? `Data for the ${set.side.toLowerCase()}` : 'Data'}
            placeholder={i ? '18, 25, 31, 33, 40, 47' : '12, 15, 15, 18, 22, 27, 34, 36, 41'}
            inputmode="decimal"
            aria-invalid={!!plot.sets[i]?.problem}
            aria-describedby={plot.sets[i]?.problem ? `data-${i}-problem` : undefined}
            bind:value={s[set.data]}
          ></textarea>
          {#if plot.sets[i]?.problem}<p id="data-{i}-problem" class="help problem">{plot.sets[i].problem}</p>{/if}
        </div>
      {/each}
      {#if plot.sets.some((t) => t.summary)}
        <ul class="readout">
          {#each plot.sets as set, i}
            {#if set.summary}
              <li>
                {#if back}<strong class="set-label">{set.name || SETS[i].side}</strong>{/if}
                {#each readoutParts(set) as part, j}{#if j}{' · '}{/if}<span class="stat">{part}</span>{/each}
              </li>
              {#if set.cut.length}<li>Cut to the leaf unit: {cutText(i)}</li>{/if}
            {/if}
          {/each}
        </ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Stems and leaves" icon={Sprout} summary={stemsSummary}>
      <label class="field">
        Leaf unit
        <select bind:value={s.unit}>
          <option value="auto">The last digit ({fmt(plot.auto)})</option>
          {#each UNITS as u}<option value={String(u)}>{fmt(u)}</option>{/each}
        </select>
      </label>
      {#if plot.problems.unit}<p class="help problem field-problem">{plot.problems.unit}</p>{/if}
      <div class="part">
        <span class="part-name" id="split-label">Rows for each stem</span>
        <div class="segmented" role="radiogroup" aria-labelledby="split-label">
          {#each Object.entries(SPLIT_NAMES) as [value, title]}
            <button type="button" role="radio" aria-checked={clean.split === Number(value)} class:on={clean.split === Number(value)} onclick={() => (s.split = Number(value) as Settings['split'])}>{title}</button>
          {/each}
        </div>
      </div>
      <div class="ends">
        {#each ENDS as [key, name]}
          <label class="end">
            {name}
            <input type="text" inputmode="decimal" placeholder={plot.fitted[key]} aria-invalid={!!plot.problems[key]} bind:value={s[key]} />
          </label>
        {/each}
      </div>
      {#each ENDS as [key]}
        {#if plot.problems[key]}<p class="help problem field-problem">{plot.problems[key]}</p>{/if}
      {/each}
      {@render choice({ key: 'order', name: 'Leaves', options: ORDERS })}
    </Section>

    <Section title="Look" icon={Grid3x3} summary={lookSummary}>
      <label class="check">
        <input type="checkbox" bind:checked={s.headings} />
        <span>Headings</span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.boxes} />
        <span>Leaves in boxes</span>
      </label>
      {#if clean.boxes}
        <label class="field boxes">
          Boxes in each row, at least
          <input type="text" inputmode="numeric" placeholder="One for each leaf" aria-invalid={!!plot.problems.boxCount} bind:value={s.boxCount} />
        </label>
        {#if plot.problems.boxCount}<p class="help problem field-problem">{plot.problems.boxCount}</p>{/if}
      {/if}
    </Section>

    <Section title="Key" icon={KeyRound} summary={keySummary}>
      {@render choice({ key: 'keyMode', name: 'Key', options: KEY_MODES })}
      {#if clean.keyMode === 'text'}
        {@render choice({ key: 'keyWords', name: 'Wording', options: wording })}
        <div class="ends">
          <label class="end">
            Example
            <input type="text" inputmode="decimal" placeholder={keyPlaceholder} aria-invalid={!!plot.problems.key} bind:value={s.keyValue} />
          </label>
          <label class="end">
            Unit
            <input type="text" placeholder="cm" bind:value={s.keyUnit} />
          </label>
        </div>
        {#if plot.problems.key}<p class="help problem field-problem">{plot.problems.key}</p>{/if}
      {/if}
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      <div class="field">
        <span>Chart title</span>
        <LabelField name="Chart title" placeholder="Test scores" bind:mode={s.titleMode} bind:text={s.title} />
      </div>
    </Section>
  {/snippet}

  {#snippet figure()}
    <StemAndLeaf settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .set { display: flex; flex-direction: column; gap: 0.35rem; }
  .set-name { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; }
  .set-name span { flex: none; width: 6.2rem; }
  .set-name input { flex: 1; min-width: 0; }
  textarea {
    display: block; width: 100%; min-height: 4.4rem; padding: 0.5rem 0.6rem; border: 1.5px solid var(--border); border-radius: 10px;
    font: inherit; font-size: 0.95rem; font-weight: 400; line-height: 1.4; background: #fff; color: var(--ink); resize: vertical;
    field-sizing: content;
  }
  textarea:focus { outline: none; border-color: var(--blue); }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.35rem; }
  .set-label { display: block; }
  .stat { white-space: nowrap; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .field-problem { margin: -0.4rem 0 0.75rem; }
  .ends { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.75rem; }
  .ends:last-child { margin-bottom: 0; }
  .end { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0 0 0.75rem; cursor: pointer; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .boxes { margin-bottom: 0.75rem; }
</style>
