<script lang="ts">
  // AD–AS Model: aggregate demand, short-run aggregate supply and the
  // vertical long-run aggregate supply at full-employment output, starting
  // in long-run equilibrium or with a recessionary or inflationary gap
  // braced under the axis, with AD, SRAS and LRAS shifts (or a shift that
  // brings output to full employment) and a callout giving the equilibrium.
  // Schematic (no numbers, as AP graphs are drawn) with a straight or
  // three-range aggregate supply curve, or numbered from a schedule of price
  // levels and real GDP. Drawn by the econ graph library ($lib/graph).
  import { Braces, MoveRight, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import type { TitleMode } from '$shared/graph/axes'
  import AxesPicker from '$lib/graph/AxesPicker.svelte'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import NumberSettings from '$lib/graph/NumberSettings.svelte'
  import { rangesOf, typeRange } from '$lib/graph/fit'
  import { filenameOf } from '$lib/graph/settings'
  import { SHIFT_SIZES, SHIFT_SIZE_NAMES } from '$lib/graph/shifts'
  import AdAsFigure from './AdAsFigure.svelte'
  import { axesOf, buildAdAs, fitOf } from './figure'
  import {
    AS_SHAPES, AS_SHAPE_NAMES, LRAS_NAMES, LRAS_SHIFTS, SHIFTS, STARTS, START_NAMES, adAsSettings, rowsOf,
    type AdAsSettings, type Shift,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(adAsSettings, 'ad-as')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const numeric = $derived(clean.look === 'numeric')
  // Three-range aggregate supply turns vertical at full employment, drawn with no LRAS line of its own.
  const three = $derived(!numeric && clean.asShape === 'three')
  const built = $derived(buildAdAs(clean))

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, adAsSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof AdAsSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...adAsSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  // The schedule, row by row as typed (blank cells and all), for a numbered graph.
  const cells = $derived(s.schedule.split(';').map((row) => {
    const c = row.split(',')
    return [c[0] ?? '', c[1] ?? '', c[2] ?? '']
  }))
  const writeCells = (rows: string[][]) => (s.schedule = rows.map((r) => r.map((v) => v.trim()).join(',')).join(';'))
  function typeCell(i: number, j: number, v: string) {
    const rows = cells.map((r) => [...r])
    rows[i][j] = v.replace(/[,;]/g, '')
    writeCells(rows)
  }
  const addRow = () => writeCells([...cells, ['', '', '']])
  const removeRow = (i: number) => writeCells(cells.filter((_, k) => k !== i))
  const rowCount = $derived(rowsOf(clean.schedule).length)
  const COLUMNS = ['Price level', 'Real GDP demanded (AD)', 'Real GDP supplied (AS)']

  // While the axes are fitted, the range boxes show the fitted range; typing takes over.
  const fit = $derived(fitOf(clean))
  const shown = $derived(rangesOf(clean, fit))
  const read = $derived(axesOf(clean))
  const type = (key: Parameters<typeof typeRange>[0], v: string) => Object.assign(s, typeRange(key, v, s, fit))

  const SHIFT_NAMES: Record<Shift, string> = { none: 'None', left: 'Left', right: 'Right', full: 'To Yf' }
  const said = (curve: string, shift: Shift) => (shift === 'none' ? '' : shift === 'full' ? `${curve} to full employment` : `${curve} ${shift}`)
  const shiftSummary = $derived(
    [said('AD', clean.adShift), said('SRAS', clean.srasShift), said('LRAS', clean.lrasShift)].filter(Boolean).join(', ') || 'No shift',
  )
  const gapSummary = $derived([clean.brace ? 'Gap braced' : 'No brace', clean.callout ? 'callout' : ''].filter(Boolean).join(' · '))
  const labelSummary = $derived([clean.eqStyle === 'e' ? 'PLₑ, Yₑ' : 'PL*, Y*', clean.guides ? 'guides to the axes' : 'no guides'].join(' · '))
  const filename = $derived(filenameOf(clean, 'ad-as-model'))

  type LabelKey = 'adLabel' | 'asLabel' | 'lrasLabel' | 'eLabel' | 'plLabel' | 'gdpLabel' | 'yfLabel' | 'recessionLabel' | 'inflationLabel' | 'calloutLabel'
  /** The labels on the figure as it is, each with its name in the panel. */
  const labelList = $derived(
    [
      ['adLabel', 'Aggregate demand'],
      ['asLabel', 'Aggregate supply'],
      ...(clean.lras && !three ? [['lrasLabel', 'Long-run aggregate supply']] : []),
      ['eLabel', 'Equilibrium point'],
      ...(clean.guides ? [['plLabel', 'Price level at the axis'], ['gdpLabel', 'Real GDP at the axis']] : []),
      ...(clean.lras || three || (built.gap && clean.brace) ? [['yfLabel', 'Full-employment output']] : []),
      ...(built.gap && clean.brace ? [built.gap.kind === 'recession' ? ['recessionLabel', 'Recessionary gap'] : ['inflationLabel', 'Inflationary gap']] : []),
    ] as [LabelKey, string][],
  )
  const mode = (key: LabelKey) => `${key}Mode` as `${LabelKey}Mode`
  function allLabels(m: TitleMode) {
    for (const [key] of labelList) s[mode(key)] = m
    if (clean.callout) s.calloutLabelMode = m
  }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

{#snippet shiftField(curve: string, options: readonly Shift[], value: Shift, set: (v: Shift) => void)}
  <div class="segmented" role="radiogroup" aria-label="{curve} shift">
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>
        {#if v === 'full'}<span>To Y<sub>f</sub></span>{:else}{SHIFT_NAMES[v]}{/if}
      </button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="AD–AS Model" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="economy">
      <div class="head-row">
        <h2 class="card-head">Economy</h2>
        <HelpTip id="adas-tip" label="How the curves are drawn">
          Schematic graphs have no numbers, as AP graphs are drawn: AD and SRAS are straight lines (or aggregate supply
          is flat, then curving up, then vertical at full-employment output), and LRAS stands at full-employment output,
          Y<sub>f</sub>. A cost shock moves the three-range curve up or down.
          Numbered graphs go through the schedule's rows, with LRAS at potential GDP. A gap is braced under the axis
          from output to Y<sub>f</sub>. "To Y<sub>f</sub>" shifts a curve just far enough to bring output to full
          employment, as policy closing a gap or the economy adjusting in the long run would. In any label, _ lowers
          the next letter (Y_f is Y<sub>f</sub>) and _{'{…}'} lowers everything in the braces.
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

      {#if numeric}
        <div class="field">
          <span>Schedule</span>
          <table class="schedule">
            <thead><tr><th scope="col">Price level</th><th scope="col">AD</th><th scope="col">AS</th><th></th></tr></thead>
            <tbody>
              {#each cells as row, i}
                <tr>
                  {#each row as v, j}
                    <td><input type="text" inputmode="decimal" aria-label="{COLUMNS[j]}, row {i + 1}" value={v} oninput={(e) => typeCell(i, j, e.currentTarget.value)} /></td>
                  {/each}
                  <td><button type="button" class="remove" aria-label="Remove row {i + 1}" disabled={cells.length <= 2} onclick={() => removeRow(i)}>×</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <button type="button" class="add" disabled={cells.length >= 12} onclick={addRow}>Add a row</button>
        </div>
        <label class="field">
          <span>Potential GDP (LRAS)</span>
          <input type="number" step="any" bind:value={s.potential} />
        </label>
        <label class="check"><input type="checkbox" bind:checked={s.smooth} /> Smooth curves through the rows</label>
        <label class="check"><input type="checkbox" bind:checked={s.dots} /> A dot at each row</label>
        {#if rowCount < 2}<p class="problem">Type at least two rows with a price level and both amounts of real GDP.</p>{/if}
      {:else}
        <label class="field">
          <span>Aggregate supply</span>
          <select bind:value={s.asShape}>{#each AS_SHAPES as v}<option value={v}>{AS_SHAPE_NAMES[v]}</option>{/each}</select>
        </label>
        <div class="field">
          <span>Starting point</span>
          {@render segmented('Starting point', STARTS, { full: 'Long run', recession: 'Recession', inflation: 'Inflation' }, s.start, (v) => (s.start = v))}
        </div>
        {#if clean.start !== 'full'}
          <label class="field">
            <span>Size of the {START_NAMES[clean.start].toLowerCase()}</span>
            <select bind:value={s.gapSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
          </label>
        {/if}
      {/if}
      {#if !three}<label class="check"><input type="checkbox" bind:checked={s.lras} /> Long-run aggregate supply (LRAS)</label>{/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.readout.length}
        <ul class="readout">{#each built.readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Shifts" icon={MoveRight} summary={shiftSummary}>
      {#each [['ad', 'AD'], ['sras', 'SRAS']] as const as [key, curve]}
        {@const shift = key === 'ad' ? s.adShift : s.srasShift}
        <div class="field">
          <span>{curve === 'AD' ? 'Aggregate demand (AD)' : 'Short-run aggregate supply (SRAS)'}</span>
          {@render shiftField(curve, SHIFTS, shift, (v) => (key === 'ad' ? (s.adShift = v) : (s.srasShift = v)))}
        </div>
        {#if shift === 'left' || shift === 'right'}
          <label class="field">
            <span>How far {curve} shifts</span>
            {#if key === 'ad'}
              <select bind:value={s.adSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            {:else}
              <select bind:value={s.srasSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            {/if}
          </label>
        {/if}
      {/each}
      <div class="field">
        <span>Long-run aggregate supply (LRAS)</span>
        {@render shiftField('LRAS', LRAS_SHIFTS, s.lrasShift, (v) => (s.lrasShift = v as AdAsSettings['lrasShift']))}
      </div>
      {#if clean.lrasShift !== 'none'}
        <label class="field">
          <span>How far LRAS shifts</span>
          <select bind:value={s.lrasSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
        </label>
      {/if}
      {#if clean.adShift !== 'none' || clean.srasShift !== 'none' || clean.lrasShift !== 'none'}
        <label class="field">
          <span>Arrows</span>
          <select bind:value={s.arrows}>
            {#each [[0, 'None'], [1, 'One'], [2, 'Two'], [3, 'Three']] as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
        </label>
      {/if}
    </Section>

    <Section title="Gap and callout" icon={Braces} summary={gapSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.brace} /> Brace the output gap under the axis</label>
      <label class="check"><input type="checkbox" bind:checked={s.callout} /> Callout with an arrow to the equilibrium</label>
      {#if clean.callout}
        <div class="field">
          <span>Callout</span>
          <LabelField name="Callout" placeholder={built.callout.mode === 'text' && !clean.calloutLabel.trim() ? built.callout.text : 'Automatic'} bind:mode={s.calloutLabelMode} bind:text={s.calloutLabel} />
        </div>
      {/if}
    </Section>

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines to the axes, with price levels and real GDP</label>
      <div class="field">
        <span>Equilibrium values</span>
        {@render segmented('Equilibrium values', ['e', 'star'] as const, { e: 'PLₑ and Yₑ', star: 'PL* and Y*' }, s.eqStyle, (v) => (s.eqStyle = v))}
      </div>
      <div class="field">
        <span>Every label</span>
        <div class="segmented" role="group" aria-label="Every label">
          <button type="button" onclick={() => allLabels('text')}>Written</button>
          <button type="button" onclick={() => allLabels('blank')}>Blank lines</button>
          <button type="button" onclick={() => allLabels('none')}>None</button>
        </div>
      </div>
      {#each labelList as [key, name] (key)}
        <div class="field">
          <span>{name}</span>
          {#if key === 'lrasLabel'}
            <div class="segmented picks" role="radiogroup" aria-label="LRAS name">
              {#each LRAS_NAMES as v}
                <button type="button" role="radio" aria-checked={clean.lrasLabel === v} class:on={clean.lrasLabel === v} onclick={() => ((s.lrasLabel = v), (s.lrasLabelMode = 'text'))}>{v === 'Potential GDP/LRAS' ? 'Both' : v}</button>
              {/each}
            </div>
          {/if}
          <LabelField {name} placeholder={adAsSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'A recession', xTitle: 'Real GDP', yTitle: 'Price Level' }}
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
    <AdAsFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .economy { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .economy .field, .economy .check { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .schedule { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .schedule th { font-size: 0.75rem; font-weight: 700; color: var(--muted); text-align: left; padding: 0 0.2rem 0.25rem; }
  .schedule th:last-child { width: 1.8rem; }
  .schedule td { padding: 0.15rem; }
  .schedule input { padding: 0.35rem 0.4rem; font-size: 0.88rem; }
  .remove { width: 1.6rem; height: 1.6rem; border: 0; border-radius: 6px; background: none; color: var(--muted); font-size: 1.1rem; }
  .remove:hover:not(:disabled) { background: var(--blue-soft); color: var(--ink); }
  .remove:disabled { opacity: 0.35; }
  .add { align-self: flex-start; padding: 0.35rem 0.7rem; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; font-size: 0.85rem; font-weight: 600; }
  .add:hover:not(:disabled) { border-color: var(--blue-border); background: var(--blue-soft); }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .picks { margin-bottom: 0.4rem; }
</style>
