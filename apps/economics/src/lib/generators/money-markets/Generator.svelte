<script lang="ts">
  // Money Markets: the money market (an upright money supply and downward
  // money demand), loanable funds, or the market for reserves (an upright
  // supply of reserves and demand flat at the top, sloping, then flat at the
  // administered rate), with ample or limited reserves. Either curve shifts,
  // with arrows, and the rates and quantities before and after are written at
  // the axes. Drawn by the econ graph library ($lib/graph).
  import { MoveRight, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import type { TitleMode } from '$shared/graph/axes'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import { filenameOf } from '$lib/graph/settings'
  import { SHIFT_SIZES, SHIFT_SIZE_NAMES } from '$lib/graph/shifts'
  import MoneyMarketsFigure from './MoneyMarketsFigure.svelte'
  import { buildMoneyMarkets, demandUpDown } from './figure'
  import { DIRECTIONS, GRAPHS, GRAPH_NAMES, KEYS, REGIMES, REGIME_NAMES, SHIFTS, moneyMarketsSettings, type MoneyMarketsSettings } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(moneyMarketsSettings, 'money-markets')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const built = $derived(buildMoneyMarkets(clean))
  const keys = $derived(KEYS[clean.graph])

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, moneyMarketsSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof MoneyMarketsSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...moneyMarketsSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  /** Each graph's curves, as the settings name them. */
  const CURVES = {
    money: { supply: 'Money supply', demand: 'Money demand', rate: 'Interest rate' },
    funds: { supply: 'Supply of loanable funds', demand: 'Demand for loanable funds', rate: 'Interest rate' },
    reserves: { supply: 'Supply of reserves', demand: 'Demand for reserves', rate: 'Policy rate' },
  } as const
  const names = $derived(CURVES[clean.graph])
  const moving = (kind: 'supply' | 'demand') => clean.shift === kind || clean.shift === 'both'
  /** The demand for reserves with ample reserves moves up and down with the administered rates; everything else right and left. */
  const upDown = (kind: 'supply' | 'demand') => kind === 'demand' && demandUpDown(clean)
  const dirNames = (kind: 'supply' | 'demand') => (upDown(kind) ? { increase: 'Shifts up', decrease: 'Shifts down' } : { increase: 'Increases', decrease: 'Decreases' })

  const dirWord = (kind: 'supply' | 'demand') => {
    const d = kind === 'supply' ? clean.supplyDir : clean.demandDir
    return upDown(kind) ? (d === 'increase' ? 'shifts up' : 'shifts down') : `${d}s`
  }
  const shiftSummary = $derived(
    clean.shift === 'none' ? 'No shift'
    : [moving('supply') ? `${names.supply} ${dirWord('supply')}` : '', moving('demand') ? `${names.demand.toLowerCase()} ${dirWord('demand')}` : '']
      .filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()),
  )
  const rateText = $derived(clean[keys.rate].trim() || 'i')
  const labelSummary = $derived([clean.eqStyle === 'e' ? `${rateText}ₑ, Qₑ` : `${rateText}*, Q*`, clean.guides ? 'guides to the axes' : 'no guides'].join(' · '))
  const filename = $derived(filenameOf(clean, clean.graph === 'money' ? 'money-market' : clean.graph === 'funds' ? 'loanable-funds' : 'market-for-reserves'))

  type LabelKey = 'msLabel' | 'mdLabel' | 'iLabel' | 'slfLabel' | 'dlfLabel' | 'rLabel' | 'srLabel' | 'drLabel' | 'prLabel' | 'qLabel' | 'eLabel'
  /** The labels on the figure as it is, each with its name in the panel. */
  const labelList = $derived(
    [
      [keys.supply, names.supply], [keys.demand, names.demand],
      ...(clean.guides ? [[keys.rate, `${names.rate} at the axis`], ['qLabel', 'Quantity at the axis']] : []),
      ...(clean.points ? [['eLabel', 'Where the curves cross']] : []),
    ] as [LabelKey, string][],
  )
  const mode = (key: LabelKey) => `${key}Mode` as `${LabelKey}Mode`
  function allLabels(m: TitleMode) {
    for (const [key] of labelList) s[mode(key)] = m
  }

  const PLACEHOLDERS = {
    money: { title: 'The money market', xTitle: 'Quantity of money', yTitle: 'Nominal interest rate' },
    funds: { title: 'Market for loanable funds', xTitle: 'Quantity of loanable funds', yTitle: 'Real interest rate' },
    reserves: { title: 'Market for reserves', xTitle: 'Quantity of reserves', yTitle: 'Policy rate' },
  }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Money Markets" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="market">
      <div class="head-row">
        <h2 class="card-head">Graph</h2>
        <HelpTip id="mm-tip" label="How the graphs are drawn">
          Money supply and the supply of reserves are upright: the central bank sets them. The demand for reserves is
          flat at the top (the discount rate), slopes, then is flat at the bottom (the interest paid on reserves). With
          ample reserves, supply crosses that flat bottom, so the Fed moves the policy rate by changing its administered
          rates, which shifts demand up or down. With limited reserves, supply crosses the slope, so buying and selling
          bonds moves the rate, and so does demand shifting right or left, as when reserve requirements change. In any label, _ lowers the next letter (MS_1 is MS₁) and _{'{…}'} lowers everything in
          the braces.
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
      {#if clean.graph === 'reserves'}
        <div class="field">
          <span>Reserves</span>
          {@render segmented('Reserves', REGIMES, REGIME_NAMES, s.regime, (v) => (s.regime = v))}
        </div>
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Shift" icon={MoveRight} summary={shiftSummary}>
      <div class="field">
        <span>What shifts</span>
        {@render segmented('What shifts', SHIFTS, { none: 'None', supply: 'Supply', demand: 'Demand', both: 'Both' }, s.shift, (v) => (s.shift = v))}
      </div>
      {#each ['supply', 'demand'] as const as kind}
        {#if moving(kind)}
          <div class="field">
            <span>{names[kind]}</span>
            {@render segmented(`${names[kind]} direction`, DIRECTIONS, dirNames(kind), kind === 'supply' ? s.supplyDir : s.demandDir, (v) => (kind === 'supply' ? (s.supplyDir = v) : (s.demandDir = v)))}
          </div>
          <label class="field">
            <span>How far</span>
            {#if kind === 'supply'}
              <select bind:value={s.supplySize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
            {:else}
              <select bind:value={s.demandSize}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
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

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines to the axes, with rates and quantities</label>
      <label class="check"><input type="checkbox" bind:checked={s.points} /> A dot where the curves cross</label>
      <div class="field">
        <span>Equilibrium values</span>
        {@render segmented('Equilibrium values', ['e', 'star'] as const, { e: `${rateText}ₑ and Qₑ`, star: `${rateText}* and Q*` }, s.eqStyle, (v) => (s.eqStyle = v))}
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
          <LabelField {name} placeholder={moneyMarketsSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s[keys.x]} bind:xTitleMode={s[`${keys.x}Mode`]}
      bind:yTitle={s[keys.y]} bind:yTitleMode={s[`${keys.y}Mode`]}
      placeholders={PLACEHOLDERS[clean.graph]}
    />
    <LookSettings bind:ink={s.ink} bind:xEndCap={s.xEndCap} bind:yEndCap={s.yEndCap} />
  {/snippet}

  {#snippet figure()}
    <MoneyMarketsFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .market { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .market .field { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
</style>
