<script lang="ts">
  // Production Possibilities Curve: a curve between two goods (the axis
  // titles), bowed out, straight or bowed in, with named points on, inside
  // and outside it and their captions, a shift out or in or a pivot with its
  // arrows, the opportunity cost steps between points on the curve, and two
  // countries' curves for comparative advantage, on one graph or side by
  // side. Schematic (no numbers, as AP graphs are drawn) or numbered. Drawn
  // by the econ graph library ($lib/graph).
  import { CircleDot, Footprints, MoveUpRight, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { TITLE_MODES, type TitleMode } from '$shared/graph/axes'
  import AxesPicker from '$lib/graph/AxesPicker.svelte'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import NumberSettings from '$lib/graph/NumberSettings.svelte'
  import { rangesOf, typeRange } from '$lib/graph/fit'
  import { NUMBER_FROMS, NUMBER_FROM_NAMES, filenameOf } from '$lib/graph/settings'
  import { SHIFT_SIZES, SHIFT_SIZE_NAMES } from '$lib/graph/shifts'
  import PpcFigure from './PpcFigure.svelte'
  import { axesOf, buildPpc, fitOf, placesOf } from './figure'
  import {
    CAPTIONS, CAPTION_OF, COUNTRIES, COUNTRIES_NAMES, MODE_KEYS, PLACES, PLACE_NAMES, SHAPES, SHAPE_NAMES, pointsOf, pointsText, ppcSettings,
    type Place, type PointRow, type PpcSettings, type Shift,
  } from './settings'
  import { KEPT, SETUPS, settingsFor } from './setups'

  const gen = generatorState(ppcSettings, 'production-possibilities')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const numeric = $derived(clean.look === 'numeric')
  const one = $derived(clean.countries === 'one')
  const built = $derived(buildPpc(clean))

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, ppcSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets, besides the goods) all match.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))].filter((k) => !(KEPT as readonly string[]).includes(k)) as (keyof PpcSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...ppcSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  // The points, row by row.
  const rows = $derived(pointsOf(s.points))
  const shifted = $derived(clean.shift !== 'none')
  const writeRows = (next: PointRow[]) => (s.points = pointsText(next))
  function change(i: number, part: Partial<PointRow>) {
    writeRows(rows.map((r, k) => (k === i ? { ...r, ...part } : r)))
  }
  /** A point moved to a new place: a typed point starts where it was, and a caption that went with the old place goes with the new one. */
  function place(i: number, to: Place) {
    const r = rows[i]
    const part: Partial<PointRow> = { place: to }
    if (to === 'at') {
      const p = placesOf({ ...clean, look: 'numeric' }, rows, true)[i]
      part.a = Number(p.x.toPrecision(3))
      part.b = Number(p.y.toPrecision(3))
    } else if (r.place === 'at') part.a = 0.5
    if ((CAPTIONS as readonly string[]).includes(r.caption)) part.caption = CAPTION_OF[to] || r.caption
    change(i, part)
  }
  const nextName = $derived('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !rows.some((r) => r.name === l)) ?? '')
  const addPoint = () => writeRows([...rows, { name: nextName, place: 'inside', a: 0.5, b: 0, caption: '' }])
  const removePoint = (i: number) => writeRows(rows.filter((_, k) => k !== i))
  // Captions in the teacher's own words get a box to type them in.
  let ownWords = $state<number[]>([])
  const captionChoice = (i: number, caption: string) => ((CAPTIONS as readonly string[]).includes(caption) ? caption : caption || ownWords.includes(i) ? 'own' : '')
  function chooseCaption(i: number, v: string) {
    if (v === 'own') {
      ownWords = [...ownWords, i]
      change(i, { caption: (CAPTIONS as readonly string[]).includes(rows[i].caption) ? '' : rows[i].caption })
    } else {
      ownWords = ownWords.filter((k) => k !== i)
      change(i, { caption: v })
    }
  }
  const clip = (v: string) => v.replace(/[,;]/g, '')

  // While the axes are fitted, the range boxes show the fitted range; typing takes over.
  const fit = $derived(fitOf(clean))
  const shown = $derived(rangesOf(clean, fit))
  const read = $derived(axesOf(clean))
  const type = (key: Parameters<typeof typeRange>[0], v: string) => Object.assign(s, typeRange(key, v, s, fit))

  // The goods' names in the middle of a field's name: "Most consumer goods".
  const lower = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t)
  const goodX = $derived(lower(clean.xTitle.trim()) || 'x-axis good')
  const goodY = $derived(lower(clean.yTitle.trim()) || 'y-axis good')
  const SHIFT_NAMES = $derived<Record<Shift, string>>({ none: 'None', both: 'The whole curve', x: `Only ${goodX} (a pivot)`, y: `Only ${goodY} (a pivot)` })

  const pointSummary = $derived(rows.length ? `${rows.length} point${rows.length > 1 ? 's' : ''}${rows.some((r) => r.caption) ? ', captioned' : ''}` : 'No points')
  const shiftSummary = $derived(
    clean.shift === 'none' ? 'No shift'
    : numeric ? SHIFT_NAMES[clean.shift]
    : `${clean.shift === 'both' ? 'Shifts' : 'Pivots'} ${clean.shiftDir === 'out' ? 'out' : 'in'}`,
  )
  const stepSummary = $derived(clean.steps ? 'Steps between the points' : 'No steps')
  const labelSummary = $derived([clean.guides ? 'guides to the axes' : 'no guides', `captions ${clean.captionMode === 'text' ? 'written' : clean.captionMode === 'blank' ? 'blank' : 'off'}`].join(' · ').replace(/^./, (c) => c.toUpperCase()))
  const filename = $derived(filenameOf(clean, 'production-possibilities-curve'))

  function allLabels(m: TitleMode) {
    for (const key of MODE_KEYS) s[key] = m
  }
  const MODE_NAMES: Record<TitleMode, string> = { text: 'Written', blank: 'Blank lines', none: 'None' }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

{#snippet amount(name: string, value: number, set: (v: number) => void)}
  <label class="field">
    <span>{name}</span>
    <input type="number" step="any" min="0" {value} oninput={(e) => set(Number(e.currentTarget.value) || 0)} />
  </label>
{/snippet}

<GeneratorPage name="Production Possibilities Curve" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="curve">
      <div class="head-row">
        <h2 class="card-head">Curve</h2>
        <HelpTip id="ppc-tip" label="How the curve is drawn">
          The goods' names are the axis titles. A bowed-out curve shows increasing opportunity cost, a straight one
          constant opportunity cost. Points along the curve go by how much of the x-axis good is made. For
          comparative advantage, each country's curve is straight, and where it meets the axes is written there.
          In any label, _ lowers the next letter (PPC_1 is PPC₁) and _{'{…}'} lowers everything in the braces.
        </HelpTip>
      </div>
      <label class="field">
        <span>Common setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      <AxesPicker bind:look={s.look} />
      <div class="field-row">
        <label class="field">
          <span>Good on the x-axis</span>
          <input type="text" bind:value={s.xTitle} placeholder="Consumer goods" />
        </label>
        <label class="field">
          <span>Good on the y-axis</span>
          <input type="text" bind:value={s.yTitle} placeholder="Capital goods" />
        </label>
      </div>
      <div class="field">
        <span>Countries</span>
        {@render segmented('Countries', COUNTRIES, COUNTRIES_NAMES, s.countries, (v) => (s.countries = v))}
      </div>

      {#if one}
        <div class="field">
          <span>Shape</span>
          {@render segmented('Shape', SHAPES, SHAPE_NAMES, s.shape, (v) => (s.shape = v))}
        </div>
        {#if clean.shape !== 'straight'}
          <label class="field">
            <span>How far it bows</span>
            <div class="slider"><input type="range" min="1.2" max="4" step="0.1" bind:value={s.bow} aria-label="How far the curve bows" /></div>
          </label>
        {/if}
        {#if numeric}
          <div class="field-row">
            {@render amount(`Most ${goodX}`, s.xMax, (v) => (s.xMax = v))}
            {@render amount(`Most ${goodY}`, s.yMax, (v) => (s.yMax = v))}
          </div>
        {/if}
      {:else}
        {#each [['a', 'First country'], ['b', 'Second country']] as const as [k, name]}
          <div class="country">
            <div class="field">
              <span>{name}</span>
              {#if k === 'a'}
                <LabelField {name} placeholder="Country A" bind:mode={s.aNameMode} bind:text={s.aName} />
              {:else}
                <LabelField {name} placeholder="Country B" bind:mode={s.bNameMode} bind:text={s.bName} />
              {/if}
            </div>
            <div class="field-row">
              {#if k === 'a'}
                {@render amount(`Most ${goodX}`, s.aX, (v) => (s.aX = v))}
                {@render amount(`Most ${goodY}`, s.aY, (v) => (s.aY = v))}
              {:else}
                {@render amount(`Most ${goodX}`, s.bX, (v) => (s.bX = v))}
                {@render amount(`Most ${goodY}`, s.bY, (v) => (s.bY = v))}
              {/if}
            </div>
          </div>
        {/each}
        {#if !numeric}
          <label class="check"><input type="checkbox" bind:checked={s.intercepts} /> Write where each curve meets the axes</label>
        {/if}
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.readout.length}
        <ul class="readout">{#each built.readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    {#if one}
      <Section title="Points" icon={CircleDot} summary={pointSummary}>
        {#each rows as row, i}
          <div class="point">
            <div class="point-head">
              <input class="name" type="text" aria-label="Point {i + 1}'s name" value={row.name} oninput={(e) => change(i, { name: clip(e.currentTarget.value) })} />
              <select aria-label="Where point {i + 1} is" value={row.place} onchange={(e) => place(i, e.currentTarget.value as Place)}>
                {#each PLACES.filter((v) => (v !== 'on2' || shifted || row.place === 'on2') && (v !== 'at' || numeric || row.place === 'at')) as v}
                  <option value={v}>{PLACE_NAMES[v]}</option>
                {/each}
              </select>
              <button type="button" class="remove" aria-label="Remove point {i + 1}" onclick={() => removePoint(i)}>×</button>
            </div>
            {#if row.place === 'at'}
              <div class="field-row">
                {@render amount(clean.xTitle.trim() || 'x-axis good', row.a, (v) => change(i, { a: v }))}
                {@render amount(clean.yTitle.trim() || 'y-axis good', row.b, (v) => change(i, { b: v }))}
              </div>
            {:else if numeric}
              {@render amount(`How much ${goodX}`, Number((row.a * (row.place === 'on2' && shifted && clean.shift !== 'y' ? clean.xMax2 : clean.xMax)).toPrecision(4)), (v) => {
                const X = row.place === 'on2' && shifted && clean.shift !== 'y' ? clean.xMax2 : clean.xMax
                change(i, { a: X > 0 ? Math.min(1, v / X) : 0 })
              })}
            {:else}
              <div class="slider"><input type="range" min="0" max="1" step="0.01" value={row.a} aria-label="How far along the curve point {i + 1} is" oninput={(e) => change(i, { a: Number(e.currentTarget.value) })} /></div>
            {/if}
            <div class="caption-row">
              <select aria-label="Point {i + 1}'s caption" value={captionChoice(i, row.caption)} onchange={(e) => chooseCaption(i, e.currentTarget.value)}>
                <option value="">No caption</option>
                {#each CAPTIONS as c}<option value={c}>{c}</option>{/each}
                <option value="own">Own words…</option>
              </select>
              {#if captionChoice(i, row.caption) === 'own'}
                <input type="text" aria-label="Point {i + 1}'s caption" value={row.caption} oninput={(e) => change(i, { caption: clip(e.currentTarget.value) })} />
              {/if}
            </div>
          </div>
        {/each}
        <button type="button" class="add" disabled={rows.length >= 8} onclick={addPoint}>Add a point</button>
      </Section>

      <Section title="Shift" icon={MoveUpRight} summary={shiftSummary}>
        <label class="field">
          <span>What shifts</span>
          <select bind:value={s.shift}>{#each Object.entries(SHIFT_NAMES) as [v, name]}<option value={v}>{name}</option>{/each}</select>
        </label>
        {#if clean.shift !== 'none'}
          {#if numeric}
            <div class="field-row">
              {#if clean.shift !== 'y'}{@render amount(`New most ${goodX}`, s.xMax2, (v) => (s.xMax2 = v))}{/if}
              {#if clean.shift !== 'x'}{@render amount(`New most ${goodY}`, s.yMax2, (v) => (s.yMax2 = v))}{/if}
            </div>
          {:else}
            <div class="field">
              <span>Direction</span>
              {@render segmented('Direction', ['out', 'in'] as const, { out: 'Outward (growth)', in: 'Inward' }, s.shiftDir, (v) => (s.shiftDir = v))}
            </div>
            <label class="field">
              <span>How far</span>
              <select bind:value={s.shiftSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            </label>
          {/if}
          <label class="field">
            <span>Arrows</span>
            <select bind:value={s.arrows}>
              {#each [[0, 'None'], [1, 'One'], [2, 'Two'], [3, 'Three']] as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
          </label>
        {/if}
      </Section>

      <Section title="Opportunity cost" icon={Footprints} summary={stepSummary}>
        <label class="check"><input type="checkbox" bind:checked={s.steps} /> Steps between the points on the curve</label>
        {#if clean.steps && numeric}
          <label class="check"><input type="checkbox" bind:checked={s.deltas} /> Write how much of each good each step gives up and gains</label>
        {/if}
      </Section>
    {/if}

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      {#if one}
        <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines from the points to the axes</label>
      {/if}
      <div class="field">
        <span>Before and after</span>
        {@render segmented('Before and after', NUMBER_FROMS, NUMBER_FROM_NAMES, s.numberFrom, (v) => (s.numberFrom = v))}
      </div>
      <div class="field">
        <span>Every label</span>
        <div class="segmented" role="group" aria-label="Every label">
          <button type="button" onclick={() => allLabels('text')}>Written</button>
          <button type="button" onclick={() => allLabels('blank')}>Blank lines</button>
          <button type="button" onclick={() => allLabels('none')}>None</button>
        </div>
      </div>
      {#if clean.countries !== 'together'}
        <div class="field">
          <span>Curve</span>
          <LabelField name="Curve" placeholder="PPC" bind:mode={s.curveLabelMode} bind:text={s.curveLabel} />
        </div>
      {/if}
      {#if one}
        <div class="field">
          <span>Point names</span>
          {@render segmented('Point names', TITLE_MODES, MODE_NAMES, s.pointMode, (v) => (s.pointMode = v))}
        </div>
        <div class="field">
          <span>Captions</span>
          {@render segmented('Captions', TITLE_MODES, MODE_NAMES, s.captionMode, (v) => (s.captionMode = v))}
        </div>
      {/if}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Production possibilities', xTitle: 'Consumer goods', yTitle: 'Capital goods' }}
    />
    <LookSettings bind:ink={s.ink} bind:xEndCap={s.xEndCap} bind:yEndCap={s.yEndCap} />
    {#if numeric}
      <NumberSettings
        {shown} read={read} problems={read.problems} {type}
        bind:xEvery={s.xEvery} bind:yEvery={s.yEvery} bind:gridlines={s.gridlines} bind:minor={s.minor} bind:fit={s.fit}
      />
    {/if}
  {/snippet}

  {#snippet figure()}
    <PpcFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .curve { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .curve .field, .curve .check { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .country { display: flex; flex-direction: column; gap: 0.5rem; }
  .country .field-row .field { margin-bottom: 0; }
  .point { display: flex; flex-direction: column; gap: 0.45rem; padding: 0.6rem 0 0.7rem; border-bottom: 1px solid var(--border); margin-bottom: 0.6rem; }
  .point .field-row .field, .point .field { margin-bottom: 0; }
  .point-head { display: flex; gap: 0.4rem; align-items: center; }
  .point-head .name { width: 3.6rem; flex: none; }
  .point-head select { flex: 1; min-width: 0; }
  .caption-row { display: flex; gap: 0.4rem; }
  .caption-row select { flex: none; width: 9.5rem; }
  .caption-row input { flex: 1; min-width: 0; }
  .remove { width: 1.6rem; height: 1.6rem; flex: none; border: 0; border-radius: 6px; background: none; color: var(--muted); font-size: 1.1rem; }
  .remove:hover { background: var(--blue-soft); color: var(--ink); }
  .add { align-self: flex-start; padding: 0.35rem 0.7rem; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; font-size: 0.85rem; font-weight: 600; }
  .add:hover:not(:disabled) { border-color: var(--blue-border); background: var(--blue-soft); }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
</style>
