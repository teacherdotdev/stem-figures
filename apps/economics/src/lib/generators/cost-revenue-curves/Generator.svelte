<script lang="ts">
  // Cost and Revenue Curves: a firm's MC, ATC, AVC and AFC from one total
  // cost, so MC crosses AVC and ATC at their lowest points, and the firm in
  // each market structure: a perfectly competitive firm at a market price
  // (with the market beside it), a monopoly and where a regulator would put
  // it, and a monopolistically competitive firm in the short and long run,
  // with profit or loss, consumer surplus and deadweight loss shaded. Drawn
  // by the econ graph library ($lib/graph).
  import { Coins, PaintBucket, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import type { TitleMode } from '$shared/graph/axes'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import { filenameOf } from '$lib/graph/settings'
  import CostRevenueFigure from './CostRevenueFigure.svelte'
  import { buildCostRevenue, pricesOf } from './figure'
  import { costsOf } from './model'
  import {
    GRAPHS, GRAPH_NAMES, OUTCOMES, PRICES, PRICE_LINE_NAMES, PRICE_NAMES, REGULATIONS, REGULATION_NAMES, RUNS, costRevenueSettings,
    type CostRevenueSettings, type LabelKey, type Price,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(costRevenueSettings, 'cost-revenue-curves')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const built = $derived(buildCostRevenue(clean))
  const graph = $derived(clean.graph)
  const powered = $derived(graph === 'monopoly' || graph === 'monopolistic')

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, costRevenueSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof CostRevenueSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...costRevenueSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  /** Choosing "anywhere" starts the slider at the price the graph has now. */
  function choosePrice(p: Price) {
    if (p === 'custom' && clean.price !== 'custom') {
      const prices = pricesOf(costsOf({ q: clean.atcQ, cost: clean.atcCost, slope: clean.mcSlope, fixed: clean.fixed }).costs)
      s.priceAt = Math.round(prices[clean.price] * 100) / 100
    }
    s.price = p
  }

  const costSummary = $derived(
    [graph === 'costs' || graph === 'perfect' || clean.avc ? 'MC, ATC, AVC' : 'MC, ATC', clean.afc ? 'AFC' : ''].filter(Boolean).join(', '),
  )
  const shaded = $derived(
    [clean.profit && 'profit or loss', powered && clean.cs && 'CS', powered && clean.dwl && 'DWL'].filter(Boolean) as string[],
  )
  const shadeSummary = $derived(shaded.length ? shaded.join(', ').replace(/^./, (c) => c.toUpperCase()) : 'Nothing shaded')
  const labelSummary = $derived([clean.eqStyle === 'e' ? 'Pₑ, Qₑ' : 'P*, Q*', clean.guides ? 'guides to the axes' : 'no guides'].join(' · '))
  const filename = $derived(filenameOf(clean, 'cost-and-revenue-curves'))

  /** The labels on the figure as it is, each with its name in the panel. */
  const labelList = $derived.by(() => {
    const c = clean
    const list: [LabelKey, string][] = [['mcLabel', 'Marginal cost'], ['atcLabel', 'Average total cost']]
    const avcShown = graph === 'costs' || graph === 'perfect' || c.avc
    if (avcShown) list.push(['avcLabel', 'Average variable cost'])
    if (c.afc) list.push(['afcLabel', 'Average fixed cost'])
    if (graph === 'costs' || graph === 'perfect') {
      if (graph === 'perfect') list.push(['priceLineLabel', 'Price line'])
      if (graph === 'perfect' && c.minimums) list.push(['breakEvenLabel', 'Break-even point'], ['shutdownLabel', 'Shutdown point'])
    } else list.push(['dLabel', 'Demand'], ['mrLabel', 'Marginal revenue'])
    if (c.guides) {
      if (graph === 'perfect') list.push(['pLabel', 'Price'], ['qFirmLabel', "Firm's quantity"], ['costLabel', 'ATC at the axis'])
      if (graph === 'monopoly') {
        list.push(['pmLabel', 'Monopoly price'], ['qmLabel', 'Monopoly quantity'], ['costLabel', 'ATC at the axis'])
        if (c.regulation === 'optimal' || c.regulation === 'both') list.push(['psoLabel', 'Socially optimal price'], ['qsoLabel', 'Socially optimal quantity'])
        if (c.regulation === 'fair' || c.regulation === 'both') list.push(['pfrLabel', 'Fair-return price'], ['qfrLabel', 'Fair-return quantity'])
      }
      if (graph === 'monopolistic') {
        list.push(['pLabel', 'Price'], ['qFirmLabel', "Firm's quantity"])
        if (c.run === 'short') list.push(['costLabel', 'ATC at the axis'])
        else list.push(['qMinLabel', 'Quantity at lowest ATC'])
      }
    }
    if (graph === 'monopolistic' && c.run === 'long') list.push(['excessLabel', 'Excess capacity'])
    if (c.profit && graph !== 'costs') list.push(['profitLabel', 'Profit'], ['lossLabel', 'Loss'])
    if (powered && c.cs) list.push(['csLabel', 'Consumer surplus'])
    if (powered && c.dwl) list.push(['dwlLabel', 'Deadweight loss'])
    if (graph === 'perfect' && c.market) {
      list.push(['marketDLabel', 'Market demand'], ['marketSLabel', 'Market supply'])
      if (c.guides) list.push(['qLabel', 'Market quantity'])
      list.push(['marketYLabel', "Market's price axis"], ['marketLabel', 'Under the market'], ['firmLabel', 'Under the firm'])
    }
    return list
  })
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

{#snippet slider(name: string, min: number, max: number, step: number, value: number, set: (v: number) => void)}
  <label class="field">
    <span>{name}</span>
    <div class="slider"><input type="range" {min} {max} {step} {value} oninput={(e) => set(Number(e.currentTarget.value))} aria-label={name} /></div>
  </label>
{/snippet}

<GeneratorPage name="Cost and Revenue Curves" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="firm">
      <div class="head-row">
        <h2 class="card-head">Firm</h2>
        <HelpTip id="crc-tip" label="How the curves are drawn">
          Every cost curve comes from one total cost, TC = F + aq − bq² + cq³, so MC always crosses AVC and ATC at
          their lowest points and the gap between ATC and AVC is AFC. Set the costs by where ATC is lowest, how steeply
          MC rises and how much is fixed. The firm makes the quantity where MR = MC. In any label, _ lowers the next
          letter (Q_M is Q with M lowered) and _{'{…}'} lowers everything in the braces.
        </HelpTip>
      </div>
      <label class="field">
        <span>Common setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Graph</span>
        <select bind:value={s.graph}>{#each GRAPHS as v}<option value={v}>{GRAPH_NAMES[v]}</option>{/each}</select>
      </label>

      {#if graph === 'perfect'}
        <label class="field">
          <span>Market price</span>
          <select value={clean.price} onchange={(e) => choosePrice(e.currentTarget.value as Price)}>
            {#each PRICES as v}<option value={v}>{PRICE_NAMES[v]}</option>{/each}
          </select>
        </label>
        {#if clean.price === 'custom'}
          {@render slider('Price', 0.5, 9.5, 0.05, s.priceAt, (v) => (s.priceAt = v))}
        {/if}
        <label class="check"><input type="checkbox" bind:checked={s.market} /> The market beside the firm, setting the price</label>
      {:else if graph === 'monopoly'}
        {@render slider('Demand meets the price axis at', 5, 9.6, 0.05, s.demandTop, (v) => (s.demandTop = v))}
        {@render slider('Demand would meet the quantity axis at', 6, 25, 0.1, s.demandEnd, (v) => (s.demandEnd = v))}
        <label class="field">
          <span>Regulation</span>
          <select bind:value={s.regulation}>{#each REGULATIONS as v}<option value={v}>{REGULATION_NAMES[v]}</option>{/each}</select>
        </label>
      {:else if graph === 'monopolistic'}
        <div class="field">
          <span>Run</span>
          {@render segmented('Run', RUNS, { short: 'Short run', long: 'Long run' }, s.run, (v) => (s.run = v))}
        </div>
        {#if clean.run === 'short'}
          <div class="field">
            <span>Short run</span>
            {@render segmented('Short run', OUTCOMES, { profit: 'Profit', loss: 'Loss' }, s.shortRun, (v) => (s.shortRun = v))}
          </div>
        {/if}
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.readout.length}
        <ul class="readout">{#each built.readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Costs" icon={Coins} summary={costSummary}>
      {@render slider('Where ATC is lowest: quantity', 4, 7.5, 0.05, s.atcQ, (v) => (s.atcQ = v))}
      {@render slider('Where ATC is lowest: cost', 2.5, 6.5, 0.05, s.atcCost, (v) => (s.atcCost = v))}
      {@render slider('How steeply MC rises', 0.6, 2.5, 0.05, s.mcSlope, (v) => (s.mcSlope = v))}
      {@render slider('Fixed cost (the gap between ATC and AVC)', 0.2, 0.9, 0.01, s.fixed, (v) => (s.fixed = v))}
      {#if powered}
        <label class="check"><input type="checkbox" bind:checked={s.avc} /> Average variable cost (AVC)</label>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={s.afc} /> Average fixed cost (AFC)</label>
    </Section>

    {#if graph !== 'costs'}
      <Section title="Shading" icon={PaintBucket} summary={shadeSummary}>
        <label class="check"><input type="checkbox" bind:checked={s.profit} /> Profit or loss</label>
        {#if powered}
          <label class="check"><input type="checkbox" bind:checked={s.cs} /> Consumer surplus</label>
          <label class="check"><input type="checkbox" bind:checked={s.dwl} /> Deadweight loss</label>
        {/if}
      </Section>
    {/if}

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines to the axes, with prices and quantities</label>
      {#if graph === 'costs' || graph === 'perfect'}
        <label class="check"><input type="checkbox" bind:checked={s.minimums} /> Dots where MC crosses AVC and ATC</label>
      {/if}
      <div class="field">
        <span>Equilibrium values</span>
        {@render segmented('Equilibrium values', ['e', 'star'] as const, { e: 'Pₑ and Qₑ', star: 'P* and Q*' }, s.eqStyle, (v) => (s.eqStyle = v))}
      </div>
      {#if graph === 'perfect'}
        <div class="field">
          <span>Name the price line</span>
          <div class="segmented" role="radiogroup" aria-label="Name the price line">
            {#each PRICE_LINE_NAMES as v}
              <button type="button" role="radio" aria-checked={clean.priceLineLabel === v} class:on={clean.priceLineLabel === v} onclick={() => ((s.priceLineLabel = v), (s.priceLineLabelMode = 'text'))}>{v}</button>
            {/each}
          </div>
        </div>
      {/if}
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
          <LabelField {name} placeholder={costRevenueSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'A perfectly competitive firm', xTitle: 'Quantity', yTitle: 'Price and costs' }}
    />
    <LookSettings bind:look={s.look} bind:ink={s.ink} bind:xEndCap={s.xEndCap} bind:yEndCap={s.yEndCap} numeric={false} />
  {/snippet}

  {#snippet figure()}
    <CostRevenueFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .firm { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .firm .field, .firm .check { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
</style>
