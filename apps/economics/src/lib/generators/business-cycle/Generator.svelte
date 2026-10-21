<script lang="ts">
  // Business Cycle: real GDP rising and falling around a dashed long-run
  // trend, its peaks and troughs named, the phases (expansion, contraction,
  // recession, recovery) pointed out with arrows, in words or as letters for
  // a quiz, and recessions shaded. Cycles even or irregular, from a seed so
  // a link draws the same wave. Drawn by the econ graph library ($lib/graph).
  import { Dices, PaintBucket, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import type { TitleMode } from '$shared/graph/axes'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import { filenameOf } from '$lib/graph/settings'
  import BusinessCycleFigure from './BusinessCycleFigure.svelte'
  import { buildBusinessCycle } from './figure'
  import { STARTS, START_NAMES } from './model'
  import { CYCLES, LABEL_KEYS, LABEL_NAMES, STYLES, STYLE_NAMES, businessCycleSettings, newSeed, type BusinessCycleSettings, type LabelKey } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(businessCycleSettings, 'business-cycle')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const built = $derived(buildBusinessCycle(clean))

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, businessCycleSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof BusinessCycleSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...businessCycleSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  const cyclesName = (n: number) => `${Math.floor(n)}${n % 1 ? '½' : ''}`
  const terms = $derived(LABEL_KEYS.filter((k) => clean[mode(k)] !== 'none').map((k) => LABEL_NAMES[k].toLowerCase()))
  const labelSummary = $derived(terms.length ? `${STYLE_NAMES[clean.style].replace(/ A, B, C…/, '')}: ${terms.join(', ')}` : 'No labels')
  const shadeSummary = $derived([clean.shade ? 'Recessions shaded' : 'No shading', clean.dots ? 'dots' : ''].filter(Boolean).join(' · '))
  const filename = $derived(filenameOf(clean, 'business-cycle'))

  const mode = (key: LabelKey) => `${key}Mode` as `${LabelKey}Mode`
  function allLabels(m: TitleMode) {
    for (const key of LABEL_KEYS) s[mode(key)] = m
  }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Business Cycle" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="cycle">
      <div class="head-row">
        <h2 class="card-head">Cycle</h2>
        <HelpTip id="bc-tip" label="How the wave is drawn">
          Real GDP swings above and below a dashed long-run trend. A cycle runs from one peak to the next. Irregular
          cycles vary each swing's height and length; New shape draws another irregular wave, and a link keeps the one
          you have. With a steep trend and small swings, real GDP never falls, so there are no peaks or troughs. In any
          label, _ lowers the next letter and _{'{…}'} lowers everything in the braces.
        </HelpTip>
      </div>
      <label class="field">
        <span>Common setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>

      <div class="field-row">
        <label class="field">
          <span>Cycles</span>
          <select bind:value={s.cycles}>{#each CYCLES as v}<option value={v}>{cyclesName(v)}</option>{/each}</select>
        </label>
        <label class="field">
          <span>Starts</span>
          <select bind:value={s.start}>{#each STARTS as v}<option value={v}>{START_NAMES[v]}</option>{/each}</select>
        </label>
      </div>
      <label class="field">
        <span>Swings</span>
        <div class="slider"><input type="range" min="0.5" max="2.5" step="0.1" bind:value={s.amplitude} aria-label="How big the swings are" /></div>
      </label>
      <label class="field">
        <span>Trend</span>
        <div class="slider"><input type="range" min="0" max="0.6" step="0.02" bind:value={s.trend} aria-label="How steeply the trend rises" /></div>
      </label>
      <label class="field">
        <span>Irregularity</span>
        <div class="slider"><input type="range" min="0" max="1" step="0.05" bind:value={s.irregularity} aria-label="How irregular the cycles are" /></div>
      </label>
      {#if clean.irregularity > 0}
        <button type="button" class="btn-ghost shuffle" onclick={() => (s.seed = newSeed(s.seed))}>
          <Dices size={16} aria-hidden="true" /> New shape
        </button>
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.answers.length}
        <ul class="readout answers">
          {#each built.answers as a}<li>{a.letter}: {clean[a.key] || LABEL_NAMES[a.key]}</li>{/each}
        </ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <div class="field">
        <span>Written as</span>
        {@render segmented('Written as', STYLES, STYLE_NAMES, s.style, (v) => (s.style = v))}
      </div>
      <label class="check"><input type="checkbox" bind:checked={s.every} /> Name the phases in every cycle</label>
      <div class="field">
        <span>Every label</span>
        <div class="segmented" role="group" aria-label="Every label">
          <button type="button" onclick={() => allLabels('text')}>Written</button>
          <button type="button" onclick={() => allLabels('blank')}>Blank lines</button>
          <button type="button" onclick={() => allLabels('none')}>None</button>
        </div>
      </div>
      {#each LABEL_KEYS as key (key)}
        <div class="field">
          <span>{LABEL_NAMES[key]}</span>
          <LabelField name={LABEL_NAMES[key]} placeholder={businessCycleSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <Section title="Shading" icon={PaintBucket} summary={shadeSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.shade} /> Shade recessions, peak to trough</label>
      <label class="check"><input type="checkbox" bind:checked={s.dots} /> A dot at each peak and trough</label>
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'The business cycle', xTitle: 'Time', yTitle: 'Real GDP' }}
    />
    <LookSettings bind:ink={s.ink} bind:xEndCap={s.xEndCap} bind:yEndCap={s.yEndCap} />
  {/snippet}

  {#snippet figure()}
    <BusinessCycleFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .cycle { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .cycle .field { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .shuffle { align-self: flex-start; padding: 0.45rem 0.8rem; font-size: 0.88rem; }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .answers { columns: 2; }
  .answers li { break-inside: avoid; }
</style>
