<script lang="ts">
  // Potential Energy Diagram: type the energies of the reactants, each
  // transition state and intermediate, and the products (or type Ea and ΔH
  // and have the levels moved to match), for one, two or three steps, with a
  // catalysed path if wanted, and get the reaction energy profile with its
  // Ea and ΔH arrows, or a level diagram with ΔH alone. The grid is
  // $shared/graph's, its y-axis numbered or shape only, the reaction
  // coordinate never numbered.
  import { Axis3d, Maximize, MoveVertical, Spline, Tag } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { readAxes } from '$shared/graph/axes'
  import { CAPS } from '$shared/graph/caps'
  import { COLORS, type Color } from '$shared/graph/colors'
  import { GRIDLINES } from '$shared/graph/grid'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import { kindOf, stepsIn, stepsOf, STEP_COUNTS } from './profile'
  import { ARROW_KEYS, answerLines, buildDiagram, checkLevels, curveNames, fittedAxes, hasCatalyst, inSentence, levelText, type ArrowKey } from './figure'
  import {
    ARROW_LABELS, ARROW_LABEL_NAMES, LABEL_KEYS, LEVEL_WORDS, PAGE_Y_TITLES, STYLES, STYLE_NAMES, UNITS, UNIT_TEXT, energySettings, yTitleFor,
    type EnergySettings, type Unit,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'
  import EnergyFigure from './EnergyFigure.svelte'

  const gen = generatorState(energySettings, 'potential-energy-diagram')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const g = $derived(buildDiagram(clean))
  const axes = $derived(readAxes(g.gridSettings))
  const L = $derived(clean.levels)
  const steps = $derived(stepsOf(L))
  const curve = $derived(clean.style === 'curve')
  const numbered = $derived(clean.axes === 'numbered')
  const unit = $derived(UNIT_TEXT[clean.unit])
  let svg = $state<SVGSVGElement>()

  /** A value typed or worked out, without the float noise of a sum. */
  const tidy = (v: number) => Math.round(v * 1e6) / 1e6
  const ok = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v)

  function setLevel(i: number, v: number | null) {
    if (!ok(v)) return
    const next = [...gen.snapshot().levels]
    next[i] = tidy(v)
    s.levels = next
  }

  /**
   * A mechanism with more or fewer steps: the reactants and products stay;
   * the first transition state keeps its energy and each later one is a
   * little lower, with the intermediates in the dips between them.
   */
  function chooseSteps(n: number) {
    if (n === steps) return
    const [r, p] = [L[0], L[L.length - 1]]
    const top = Math.max(...stepsIn(L).map((st) => st.ts))
    const base = Math.max(r, p)
    const span = top > base ? top - base : Math.max(Math.abs(base) * 0.5, 50)
    const peak = base + span
    const nice = (v: number) => (span >= 10 ? Math.round(v) : tidy(v))
    const next = [r]
    for (let k = 0; k < n; k++) {
      next.push(nice(peak - 0.2 * span * k))
      if (k < n - 1) next.push(nice(base + 0.4 * span))
    }
    next.push(p)
    s.levels = next
  }

  /** A catalysed path, its transition state moved halfway down if it's no longer between the levels. */
  function chooseCatalyst(on: boolean) {
    s.catalyst = on
    if (!on || !checkLevels({ ...gen.snapshot(), catalyst: true }).catTs) return
    const top = Math.max(...stepsIn(L).map((st) => st.ts))
    const base = Math.max(L[0], L[L.length - 1])
    s.catTs = tidy((top + base) / 2)
  }

  /** The y-axis title, if it's still one this page wrote, follows the unit and the axes. */
  function retitle(unit: Unit, numbered: boolean) {
    if (PAGE_Y_TITLES.includes(s.yTitle)) s.yTitle = yTitleFor(unit, numbered)
  }
  function chooseUnit(u: Unit) {
    s.unit = u
    retitle(u, clean.axes === 'numbered')
  }
  /** Numbers come back fitted to the levels, so the diagram is on the grid. */
  function chooseAxes(a: EnergySettings['axes']) {
    if (a === clean.axes) return
    if (a === 'numbered') Object.assign(s, fittedAxes(clean))
    s.axes = a
    retitle(clean.unit, a === 'numbered')
  }
  function fitAxes() {
    Object.assign(s, fittedAxes(clean))
  }

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, energySettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the diagram still is: one whose
  // settings (any a setup sets) all match. Changing one leaves it blank.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof EnergySettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = settingsFor(x, energySettings.defaults, clean)
      return SETUP_KEYS.every((key) => JSON.stringify(m[key]) === JSON.stringify(clean[key]))
    })?.id ?? '',
  )

  /** What each level is called in the panel: Reactants, Transition state 2… */
  const levelName = (i: number) => {
    const kind = kindOf(i, L.length)
    const n = kind === 'ts' ? (i + 1) / 2 : i / 2
    return kind === 'ts' || kind === 'intermediate' ? `${LEVEL_WORDS[kind]}${steps > 1 && (kind === 'ts' || steps > 2) ? ` ${n}` : ''}` : LEVEL_WORDS[kind]
  }
  const shownLevels = $derived(curve ? [...L.keys()] : [0, L.length - 1])
  const readout = $derived(answerLines(clean))
  const levelProblems = $derived(Object.entries(g.problems).filter(([k, v]) => (k.startsWith('level') || k === 'catTs') && v))

  /** The arrows offered: the Ea of each step, the catalysed Ea, ΔH and the reverse Ea, or ΔH alone on a level diagram. */
  const arrowRows = $derived(
    (curve
      ? [
          ['ea', steps > 1 ? 'Eₐ of each step' : 'Eₐ (forward)'],
          ...(clean.catalyst ? [['catEa', `Eₐ (${inSentence(curveNames(clean)[1])})`]] : []),
          ['dh', 'ΔH'],
          ['revEa', steps > 1 ? `Eₐ (reverse) of step ${steps}` : 'Eₐ (reverse)'],
        ]
      : [['dh', 'ΔH']]) as [ArrowKey, string][],
  )
  const arrowSummary = $derived(
    arrowRows.filter(([key]) => clean[ARROW_KEYS[key][0]]).map(([, name]) => name.replace(' of each step', '').replace(/ of step \d/, '')).join(', ') || 'None',
  )
  const labelKinds = $derived(
    (curve ? ['reactants', 'products', 'ts', ...(steps > 1 ? ['intermediate'] : [])] : ['reactants', 'products']) as (keyof typeof LABEL_KEYS)[],
  )
  const labelSummary = $derived(
    labelKinds
      .map((kind) => {
        const [textKey, modeKey] = LABEL_KEYS[kind]
        return clean[modeKey] === 'none' ? '' : clean[modeKey] === 'blank' ? 'blank' : clean[textKey].trim() || LEVEL_WORDS[kind]
      })
      .filter(Boolean)
      .join(', ') || 'None',
  )
  const colorName = (c: Color) => c[0].toUpperCase() + c.slice(1)
  const lineSummary = $derived(hasCatalyst(clean) ? `${colorName(clean.color)} and ${colorName(clean.catColor)} dashed` : colorName(clean.color))
  const axesSummary = $derived(
    numbered ? `${axes.y.start} to ${axes.y.start + axes.y.blocks * axes.y.step} by ${axes.y.step} · ${GRIDLINES[clean.gridlines]} gridlines` : 'Shape only, no numbers',
  )
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : 'potential-energy-diagram')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'potential-energy-diagram',
  )
  const EVERY_OPTIONS: [number, string][] = [[1, 'Every line'], [2, 'Every 2nd line'], [5, 'Every 5th line'], [0, 'No numbers']]
  const MINOR_OPTIONS: [number, string][] = [[0, 'None'], [2, '2 per block'], [4, '4 per block'], [5, '5 per block']]
</script>

{#snippet energy(id: string, name: string, get: () => number, set: (v: number | null) => void, problem?: string | null)}
  <label class="number-field" for={id}>
    <span>{name}</span>
    <input {id} type="number" step="any" aria-invalid={!!problem} bind:value={get, set} />
  </label>
{/snippet}

{#snippet segmented<T extends string | number>(name: string, options: readonly T[], names: (v: T) => string, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names(v)}</button>
    {/each}
  </div>
{/snippet}

{#snippet swatches(name: string, value: Color, set: (c: Color) => void)}
  <div class="swatches" role="radiogroup" aria-label={name}>
    {#each Object.entries(COLORS) as [c, hex]}
      <button
        type="button" role="radio" aria-checked={value === c} aria-label={c} data-tip={c}
        class="swatch" class:on={value === c} style:--swatch={hex} onclick={() => set(c as Color)}
      ></button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Potential Energy Diagram" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="energy-card">
      <div class="head-row">
        <h2 class="card-head">Reaction</h2>
        <HelpTip id="energy-tip" label="How the diagram is worked out">
          ΔH is the products’ energy less the reactants’, negative for an exothermic reaction. Each step’s Eₐ runs
          from the level before it up to its transition state, and the reverse Eₐ from the level after it. Type Eₐ to
          move the transition state, or ΔH to move the products. A catalyst lowers the transition state but leaves the
          reactants and products where they are, so ΔH doesn’t change and both activation energies drop by the same
          amount. With more than one step, the answer key names the rate-determining step only when the step with the
          highest Eₐ is also the one whose transition state is highest above the lowest point before it. The reaction
          coordinate isn’t to scale, so it has no numbers.
        </HelpTip>
      </div>
      <label class="field">
        <span>Common setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      {@render segmented('Style', STYLES, (v) => STYLE_NAMES[v], s.style, (v) => (s.style = v))}
      {#if curve}
        <div class="field">
          <span>Steps</span>
          {@render segmented('Steps', STEP_COUNTS, (n) => String(n), steps as 1 | 2 | 3, chooseSteps)}
        </div>
      {/if}

      <div class="energies">
        {#each shownLevels as i (i)}
          {@const kind = kindOf(i, L.length)}
          {@render energy(`level-${i}`, `${levelName(i)} (${unit})`, () => L[i], (v) => setLevel(i, v), g.problems[`level${i}`])}
          {#if kind === 'ts'}
            {@render energy(`ea-${i}`, `Eₐ${steps > 1 ? ` ${(i + 1) / 2}` : ''}`, () => tidy(L[i] - L[i - 1]), (v) => ok(v) && setLevel(i, L[i - 1] + v))}
          {:else if kind === 'products'}
            {@render energy('dh', 'ΔH', () => tidy(L[i] - L[0]), (v) => ok(v) && setLevel(i, L[0] + v))}
          {:else}
            <span></span>
          {/if}
        {/each}
      </div>

      {#if curve}
        <label class="check">
          <input type="checkbox" checked={s.catalyst} onchange={(e) => chooseCatalyst(e.currentTarget.checked)} />
          <span><strong>Catalysed path</strong></span>
        </label>
        {#if s.catalyst}
          <div class="energies">
            {@render energy('cat-ts', `Catalysed transition state (${unit})`, () => clean.catTs, (v) => ok(v) && (s.catTs = tidy(v)), g.problems.catTs)}
            {@render energy('cat-ea', 'Eₐ (catalysed)', () => tidy(clean.catTs - L[0]), (v) => ok(v) && (s.catTs = tidy(L[0] + v)))}
            <label class="number-field">
              <span>Key: solid line</span>
              <input type="text" maxlength="40" placeholder="Uncatalysed" bind:value={s.uncatName} />
            </label>
            <label class="number-field">
              <span>Key: dashed line</span>
              <input type="text" maxlength="40" placeholder="Catalysed" bind:value={s.catName} />
            </label>
          </div>
        {/if}
      {/if}
      {#each levelProblems as [, message]}<p class="problem">{message}</p>{/each}

      <div class="field">
        <span>Unit</span>
        {@render segmented('Unit', UNITS, (u) => UNIT_TEXT[u], s.unit, chooseUnit)}
      </div>
      {#if readout.length}
        <ul class="readout">{#each readout as line}<li>{line}</li>{/each}</ul>
      {/if}
      {#if numbered}
        {#if g.problems.fit}<p class="problem">{g.problems.fit}</p>{/if}
        <button type="button" class="btn-ghost small fit" onclick={fitAxes}>
          <Maximize size={16} aria-hidden="true" /> Fit the axis to the levels
        </button>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Arrows" icon={MoveVertical} summary={arrowSummary}>
      {#each arrowRows as [key, name] (key)}
        {@const [show, label] = ARROW_KEYS[key]}
        <div class="arrow-row">
          <label class="check">
            <input type="checkbox" bind:checked={s[show]} />
            <span><strong>{name}</strong></span>
          </label>
          {#if s[show]}
            <select aria-label="{name} label" bind:value={s[label]}>
              {#each ARROW_LABELS as m}<option value={m}>{m === 'value' ? `Value (${key === 'dh' ? 'ΔH' : 'Eₐ'} = … ${unit})` : ARROW_LABEL_NAMES[m]}</option>{/each}
            </select>
          {/if}
        </div>
      {/each}
      {#if arrowRows.some(([key]) => clean[ARROW_KEYS[key][0]] && clean[ARROW_KEYS[key][1]] === 'mark')}
        <div class="field setting">
          <span>Mark arrows with</span>
          {@render segmented('Mark arrows with', ['letters', 'numbers'] as const, (v) => (v === 'letters' ? 'A, B, C' : '1, 2, 3'), s.marks, (v) => (s.marks = v))}
        </div>
      {/if}
      <label class="check">
        <input type="checkbox" bind:checked={s.bothHeads} />
        <span><strong>Arrowheads at both ends</strong></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.guides} />
        <span><strong>Dashed lines from the levels</strong></span>
      </label>
    </Section>

    <Section title="Level labels" icon={Tag} summary={labelSummary}>
      {#each labelKinds as kind (kind)}
        {@const [textKey, modeKey] = LABEL_KEYS[kind]}
        {@const count = kind === 'ts' ? steps : kind === 'intermediate' ? steps - 1 : 1}
        <div class="field setting">
          <span>{kind === 'ts' ? (count > 1 ? 'Transition states' : 'Transition state') : kind === 'intermediate' ? (count > 1 ? 'Intermediates' : 'Intermediate') : LEVEL_WORDS[kind]}</span>
          <LabelField
            name="{LEVEL_WORDS[kind]} label"
            placeholder={levelText({ ...clean, [textKey]: '' }, kind, 1, curve ? count : 1)}
            bind:mode={s[modeKey]} bind:text={s[textKey]}
          />
        </div>
      {/each}
    </Section>

    <Section title="Lines" icon={Spline} summary={lineSummary}>
      {#if hasCatalyst(clean)}<div class="field"><span>{curveNames(clean)[0]}</span></div>{/if}
      {@render swatches(curve ? 'Curve color' : 'Line color', s.color, (c) => (s.color = c))}
      {#if hasCatalyst(clean)}
        <div class="field cat-color"><span>{curveNames(clean)[1]}</span></div>
        {@render swatches('Catalysed path color', s.catColor, (c) => (s.catColor = c))}
      {/if}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Potential energy diagram', xTitle: 'Reaction coordinate', yTitle: yTitleFor(clean.unit, numbered) }}
    />

    <Section title="Axes" icon={Axis3d} summary={axesSummary}>
      <div class="setting">
        {@render segmented('Energy axis', ['numbered', 'shape'] as const, (v) => (v === 'numbered' ? 'Numbered' : 'Shape only'), s.axes, chooseAxes)}
      </div>
      {#if numbered}
        <div class="range setting">
          <label class="number-field"><span>From</span><input type="text" inputmode="decimal" aria-invalid={!!g.problems.yFrom} bind:value={s.yFrom} /></label>
          <label class="number-field"><span>To</span><input type="text" inputmode="decimal" aria-invalid={!!g.problems.yTo} bind:value={s.yTo} /></label>
          <label class="number-field"><span>Count by</span><input type="text" inputmode="decimal" aria-invalid={!!g.problems.yStep} bind:value={s.yStep} /></label>
        </div>
        {#each ['yFrom', 'yTo', 'yStep'] as key}
          {#if g.problems[key]}<p class="problem setting">{g.problems[key]}</p>{/if}
        {/each}
        <div class="pair setting">
          <label class="field">
            <span>Numbers</span>
            <select bind:value={s.yEvery}>{#each EVERY_OPTIONS as [v, name]}<option value={v}>{name}</option>{/each}</select>
          </label>
          <label class="field">
            <span>Gridlines</span>
            <select bind:value={s.gridlines}>{#each Object.entries(GRIDLINES) as [v, name]}<option value={v}>{name}</option>{/each}</select>
          </label>
        </div>
        {#if s.gridlines !== 'none'}
          <label class="field setting">
            <span>Minor gridlines</span>
            <select bind:value={s.minor}>{#each MINOR_OPTIONS as [v, name]}<option value={v}>{name}</option>{/each}</select>
          </label>
        {/if}
      {/if}
      <div class="pair">
        <div class="field">
          <span>Energy axis top</span>
          <CapPicker options={CAPS} label="Energy axis top end" direction="up" bind:value={s.yEndCap} />
        </div>
        <div class="field">
          <span>Reaction coordinate end</span>
          <CapPicker options={CAPS} label="Reaction coordinate right end" direction="right" bind:value={s.xEndCap} />
        </div>
      </div>
    </Section>
  {/snippet}

  {#snippet figure()}
    <EnergyFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .energy-card { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .energies { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input { width: 100%; min-width: 0; }
  .problem { margin: 0; font-size: 0.84rem; color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .fit { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.88rem; }
  .setting { margin-bottom: 0.75rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; font-size: 0.9rem; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .arrow-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 0.6rem; align-items: center; margin-bottom: 0.75rem; }
  .arrow-row .check:only-child { grid-column: 1 / -1; }
  :global(.section) .check + .check { margin-top: 0.75rem; }
  .range { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .cat-color { margin-top: 0.75rem; }
  .field + .swatches { margin-top: 0.35rem; }
  .swatches { display: flex; gap: 0.5rem; }
  .swatch {
    width: 2rem; height: 2rem; border-radius: 999px; border: 3px solid #fff; background: var(--swatch);
    box-shadow: 0 0 0 1.5px var(--border); cursor: pointer;
  }
  .swatch.on { box-shadow: 0 0 0 2.5px var(--ink); }
</style>
