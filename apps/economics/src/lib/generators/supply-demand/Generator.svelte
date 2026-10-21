<script lang="ts">
  // Supply and Demand: a market's supply and demand curves and where they
  // cross, with shifts and their arrows, a price ceiling or floor and the
  // shortage or surplus it makes, a per-unit tax or subsidy, and shaded
  // consumer and producer surplus, deadweight loss and tax revenue. Schematic
  // (no numbers, as AP graphs are drawn) or numbered from a schedule of
  // prices and quantities. Drawn by the econ graph library ($lib/graph).
  import { Landmark, MoveRight, PaintBucket, Receipt, Tags } from '@lucide/svelte'
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
  import SupplyDemandFigure from './SupplyDemandFigure.svelte'
  import { axesOf, buildSupplyDemand, fitOf } from './figure'
  import {
    CONTROLS, CONTROL_NAMES, DIRECTIONS, SHAPES, SHAPE_NAMES, SHIFTS, TAXES, TAX_NAMES, rowsOf, supplyDemandSettings,
    type Control, type SupplyDemandSettings, type Tax,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(supplyDemandSettings, 'supply-demand')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const numeric = $derived(clean.look === 'numeric')
  const built = $derived(buildSupplyDemand(clean))

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, supplyDemandSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof SupplyDemandSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...supplyDemandSettings.defaults, ...x.settings }
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

  // While the axes are fitted, the range boxes show the fitted range; typing takes over.
  const fit = $derived(fitOf(clean))
  const shown = $derived(rangesOf(clean, fit))
  const read = $derived(axesOf(clean))
  const type = (key: Parameters<typeof typeRange>[0], v: string) => Object.assign(s, typeRange(key, v, s, fit))

  /** A ceiling starts a step below equilibrium and a floor a step above; a tax and a control don't go together. */
  function chooseControl(c: Control) {
    s.control = c
    if (c === 'none') return
    s.tax = 'none'
    if (!numeric) s.controlAt = c === 'ceiling' ? 0.3 : 0.7
    else {
      const e = buildSupplyDemand({ ...clean, control: 'none' }).equilibrium
      const step = Number(shown.yStep) || 1
      if (e) s.controlPrice = Number((e.y + (c === 'ceiling' ? -step : step)).toPrecision(6))
    }
  }
  function chooseTax(t: Tax) {
    s.tax = t
    if (t !== 'none') s.control = 'none'
  }

  const moving = (kind: 'demand' | 'supply') => clean.shift === kind || clean.shift === 'both'

  const shiftSummary = $derived(
    clean.shift === 'none' ? 'No shift'
    : [moving('demand') ? `Demand ${clean.demandDir}s` : '', moving('supply') ? `supply ${clean.supplyDir}s` : ''].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()),
  )
  const controlSummary = $derived(clean.control === 'none' ? 'None' : CONTROL_NAMES[clean.control])
  const taxSummary = $derived(TAX_NAMES[clean.tax])
  const shaded = $derived([clean.cs && 'CS', clean.ps && 'PS', clean.dwl && 'DWL', clean.revenue && clean.tax !== 'none' && (clean.tax === 'tax' ? 'tax revenue' : 'subsidy cost')].filter(Boolean))
  const shadeSummary = $derived(shaded.length ? shaded.join(', ') : 'Nothing shaded')
  const labelSummary = $derived([clean.eqStyle === 'e' ? 'Pₑ, Qₑ' : 'P*, Q*', clean.guides ? 'guides to the axes' : 'no guides'].join(' · '))
  const filename = $derived(filenameOf(clean, 'supply-and-demand'))

  type LabelKey = 'dLabel' | 'sLabel' | 'eLabel' | 'pLabel' | 'qLabel' | 'ceilingLabel' | 'floorLabel' | 'shortageLabel' | 'surplusLabel'
    | 'qdLabel' | 'qsLabel' | 'taxLabel' | 'subsidyLabel' | 'buyerLabel' | 'sellerLabel' | 'qtLabel' | 'csLabel' | 'psLabel' | 'dwlLabel'
    | 'revenueLabel' | 'costLabel'
  /** The labels on the figure as it is, each with its name in the panel. */
  const labelList = $derived(
    [
      ['dLabel', 'Demand curve'], ['sLabel', 'Supply curve'], ['eLabel', 'Equilibrium point'],
      ...(clean.guides ? [['pLabel', 'Price at the axis'], ['qLabel', 'Quantity at the axis']] : []),
      ...(clean.control === 'ceiling' ? [['ceilingLabel', 'Price ceiling']] : clean.control === 'floor' ? [['floorLabel', 'Price floor']] : []),
      ...(clean.control !== 'none' && clean.brace ? [[clean.control === 'ceiling' ? 'shortageLabel' : 'surplusLabel', clean.control === 'ceiling' ? 'Shortage' : 'Surplus']] : []),
      ...(clean.control !== 'none' && clean.guides ? [['qdLabel', 'Quantity demanded'], ['qsLabel', 'Quantity supplied']] : []),
      ...(clean.tax !== 'none' ? [[clean.tax === 'tax' ? 'taxLabel' : 'subsidyLabel', clean.tax === 'tax' ? 'Supply with the tax' : 'Supply with the subsidy']] : []),
      ...(clean.tax !== 'none' && clean.guides ? [['buyerLabel', 'Price buyers pay'], ['sellerLabel', 'Price sellers keep'], ['qtLabel', 'Quantity sold']] : []),
      ...(clean.cs ? [['csLabel', 'Consumer surplus']] : []),
      ...(clean.ps ? [['psLabel', 'Producer surplus']] : []),
      ...(clean.dwl ? [['dwlLabel', 'Deadweight loss']] : []),
      ...(clean.revenue && clean.tax !== 'none' ? [[clean.tax === 'tax' ? 'revenueLabel' : 'costLabel', clean.tax === 'tax' ? 'Tax revenue' : 'Subsidy cost']] : []),
    ] as [LabelKey, string][],
  )
  const mode = (key: LabelKey) => `${key}Mode` as `${LabelKey}Mode`
  function allLabels(m: TitleMode) {
    for (const [key] of labelList) s[mode(key)] = m
  }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Supply and Demand" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="market">
      <div class="head-row">
        <h2 class="card-head">Market</h2>
        <HelpTip id="sd-tip" label="How the curves are drawn">
          Schematic graphs are straight lines with no numbers, as AP graphs are drawn. Numbered graphs go through the
          schedule's rows. In any label, _ lowers the next letter (S_1 is S₁) and _{'{…}'} lowers everything in the
          braces.
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
            <thead><tr><th scope="col">Price</th><th scope="col">Quantity demanded</th><th scope="col">Quantity supplied</th><th></th></tr></thead>
            <tbody>
              {#each cells as row, i}
                <tr>
                  {#each row as v, j}
                    <td><input type="text" inputmode="decimal" aria-label="{['Price', 'Quantity demanded', 'Quantity supplied'][j]}, row {i + 1}" value={v} oninput={(e) => typeCell(i, j, e.currentTarget.value)} /></td>
                  {/each}
                  <td><button type="button" class="remove" aria-label="Remove row {i + 1}" disabled={cells.length <= 2} onclick={() => removeRow(i)}>×</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
          <button type="button" class="add" disabled={cells.length >= 12} onclick={addRow}>Add a row</button>
        </div>
        <label class="check"><input type="checkbox" bind:checked={s.dots} /> A dot at each row</label>
        {#if rowCount < 2}<p class="problem">Type at least two rows with a price and both quantities.</p>{/if}
      {:else}
        <div class="field-row">
          <label class="field">
            <span>Demand</span>
            <select bind:value={s.demandShape}>{#each SHAPES as v}<option value={v}>{SHAPE_NAMES[v]}</option>{/each}</select>
          </label>
          <label class="field">
            <span>Supply</span>
            <select bind:value={s.supplyShape}>{#each SHAPES as v}<option value={v}>{SHAPE_NAMES[v]}</option>{/each}</select>
          </label>
        </div>
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.readout.length}
        <ul class="readout">{#each built.readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Shift" icon={MoveRight} summary={shiftSummary}>
      <div class="field">
        <span>What shifts</span>
        {@render segmented('What shifts', SHIFTS, { none: 'None', demand: 'Demand', supply: 'Supply', both: 'Both' }, s.shift, (v) => (s.shift = v))}
      </div>
      {#each ['demand', 'supply'] as const as kind}
        {#if moving(kind)}
          <div class="field-row">
            <div class="field">
              <span>{kind === 'demand' ? 'Demand' : 'Supply'}</span>
              {@render segmented(`${kind} direction`, DIRECTIONS, { increase: 'Increases', decrease: 'Decreases' }, kind === 'demand' ? s.demandDir : s.supplyDir, (v) => (kind === 'demand' ? (s.demandDir = v) : (s.supplyDir = v)))}
            </div>
          </div>
          <label class="field">
            <span>How far {kind} shifts</span>
            {#if kind === 'demand'}
              <select bind:value={s.demandSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            {:else}
              <select bind:value={s.supplySize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            {/if}
          </label>
        {/if}
      {/each}
      {#if clean.shift !== 'none'}
        <label class="field">
          <span>Arrows</span>
          <select bind:value={s.arrows}>
            {#each [[0, 'None'], [1, 'One'], [2, 'Two'], [3, 'Three']] as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
        </label>
      {/if}
    </Section>

    <Section title="Price control" icon={Landmark} summary={controlSummary}>
      <div class="field">
        <span>Control</span>
        {@render segmented('Price control', CONTROLS, { none: 'None', ceiling: 'Ceiling', floor: 'Floor' }, s.control, chooseControl)}
      </div>
      {#if clean.control !== 'none'}
        {#if numeric}
          <label class="field">
            <span>Price</span>
            <input type="number" step="any" bind:value={s.controlPrice} />
          </label>
        {:else}
          <label class="field">
            <span>Price</span>
            <div class="slider"><input type="range" min="0.05" max="0.95" step="0.01" bind:value={s.controlAt} aria-label="Controlled price" /></div>
          </label>
        {/if}
        <label class="check"><input type="checkbox" bind:checked={s.brace} /> Brace the {clean.control === 'ceiling' ? 'shortage' : 'surplus'}</label>
      {/if}
    </Section>

    <Section title="Tax or subsidy" icon={Receipt} summary={taxSummary}>
      <div class="field">
        <span>Per unit</span>
        {@render segmented('Tax or subsidy', TAXES, { none: 'None', tax: 'Tax', subsidy: 'Subsidy' }, s.tax, chooseTax)}
      </div>
      {#if clean.tax !== 'none'}
        {#if numeric}
          <label class="field">
            <span>Amount per unit</span>
            <input type="number" step="any" min="0" bind:value={s.taxAmount} />
          </label>
        {:else}
          <label class="field">
            <span>Size</span>
            <div class="slider"><input type="range" min="0.05" max="0.45" step="0.01" bind:value={s.taxSize} aria-label="Size of the {clean.tax}" /></div>
          </label>
        {/if}
      {/if}
    </Section>

    <Section title="Shading" icon={PaintBucket} summary={shadeSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.cs} /> Consumer surplus</label>
      <label class="check"><input type="checkbox" bind:checked={s.ps} /> Producer surplus</label>
      <label class="check"><input type="checkbox" bind:checked={s.dwl} /> Deadweight loss</label>
      {#if clean.tax !== 'none'}
        <label class="check"><input type="checkbox" bind:checked={s.revenue} /> {clean.tax === 'tax' ? 'Tax revenue' : 'Subsidy cost'}</label>
      {/if}
    </Section>

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines to the axes, with prices and quantities</label>
      <div class="field">
        <span>Equilibrium values</span>
        {@render segmented('Equilibrium values', ['e', 'star'] as const, { e: 'Pₑ and Qₑ', star: 'P* and Q*' }, s.eqStyle, (v) => (s.eqStyle = v))}
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
          <LabelField {name} placeholder={supplyDemandSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Market for coffee', xTitle: 'Quantity', yTitle: 'Price' }}
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
    <SupplyDemandFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .market { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .market .field, .market .check { margin-bottom: 0; }
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
</style>
