<script lang="ts">
  // Phase Diagram: pick a substance (or type your own triple point, critical
  // point and normal melting and boiling points) and get its pressure
  // against temperature diagram: the sublimation curve, fusion line and
  // vaporization curve meeting at the triple point, with the regions, the
  // points and the boundaries named, lettered, blank or bare. Real
  // substances are drawn not to scale, their values written at the axes;
  // your own can go on a numbered grid ($shared/graph's).
  import { Axis3d, Dices, Maximize, Spline, Tag } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import AxisSettings from '$shared/graph/AxisSettings.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { endsSummary, readAxes } from '$shared/graph/axes'
  import { CAPS } from '$shared/graph/caps'
  import { COLORS, type Color } from '$shared/graph/colors'
  import { P_UNITS, P_UNIT_TEXT, SUBSTANCES, T_UNITS, T_UNIT_TEXT, atmIn, fromKelvin, fromPascal, toKelvin, toPascal, type PUnit, type TUnit } from './phase'
  import { answerLines, buildDiagram, fittedAxes, lettersOf, valuesOf } from './figure'
  import {
    AXES, AXES_NAMES, AXIS_VALUES, AXIS_VALUE_NAMES, CURVE_LABELS, LABELS, LABEL_NAMES, NORMAL_POINTS, NORMAL_POINT_NAMES, PAGE_X_TITLES,
    PAGE_Y_TITLES, newSeed, onGrid, phaseSettings, substanceName, substanceOf, xTitleFor, yTitleFor, type Axes, type PhaseSettings,
  } from './settings'
  import PhaseFigure from './PhaseFigure.svelte'

  const gen = generatorState(phaseSettings, 'phase-diagram')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const g = $derived(buildDiagram(clean))
  const axes = $derived(readAxes(clean))
  const custom = $derived(clean.substance === 'custom')
  const numbered = $derived(onGrid(clean))
  const real = $derived(substanceOf(clean))
  const v = $derived(valuesOf(clean))
  const tu = $derived(T_UNIT_TEXT[clean.tUnit])
  const pu = $derived(P_UNIT_TEXT[clean.pUnit])
  let svg = $state<SVGSVGElement>()

  /** A value worked out, without the float noise of a conversion. */
  const tidy = (x: number) => Number(x.toPrecision(6))

  /**
   * Your own starts from the substance already there when that has all six
   * values (a liquid at 1 atm, with a melting point of its own), so the
   * diagram doesn't change until the teacher types something new.
   */
  function chooseSubstance(id: PhaseSettings['substance']) {
    if (id === clean.substance) return
    if (id !== 'custom') {
      Object.assign(s, { substance: id, axes: 'shape' })
      return
    }
    if (real && real.nmp !== undefined && real.nbp !== undefined) {
      const T = (k: number) => tidy(fromKelvin(k, clean.tUnit))
      const P = (pa: number) => tidy(fromPascal(pa, clean.pUnit))
      Object.assign(s, {
        name: real.name, tripleT: T(real.triple.T), tripleP: P(real.triple.P), critT: T(real.critical.T), critP: P(real.critical.P),
        nmp: Number(T(real.nmp).toFixed(2)), nbp: Number(T(real.nbp).toFixed(1)),
      })
    }
    s.substance = id
  }

  /** On a grid starts with axes fitted to the diagram. */
  function chooseAxes(a: Axes) {
    if (a === clean.axes) return
    if (a === 'numbered') Object.assign(s, fittedAxes(clean))
    s.axes = a
  }
  function fitAxes() {
    Object.assign(s, fittedAxes(clean))
  }

  /** A new unit keeps your own substance where it was: its values are converted, the axes refitted, and a title this page wrote follows. */
  function chooseTUnit(unit: TUnit) {
    if (unit === clean.tUnit) return
    const convert = (x: number) => tidy(fromKelvin(toKelvin(x, clean.tUnit), unit))
    const next = { tUnit: unit, tripleT: convert(clean.tripleT), critT: convert(clean.critT), nmp: convert(clean.nmp), nbp: convert(clean.nbp) }
    Object.assign(s, next)
    if (numbered) Object.assign(s, fittedAxes({ ...clean, ...next }))
    if (PAGE_X_TITLES.includes(s.xTitle)) s.xTitle = xTitleFor(unit)
  }
  function choosePUnit(unit: PUnit) {
    if (unit === clean.pUnit) return
    const convert = (x: number) => tidy(fromPascal(toPascal(x, clean.pUnit), unit))
    const next = { pUnit: unit, tripleP: convert(clean.tripleP), critP: convert(clean.critP) }
    Object.assign(s, next)
    if (numbered) Object.assign(s, fittedAxes({ ...clean, ...next }))
    if (PAGE_Y_TITLES.includes(s.yTitle)) s.yTitle = yTitleFor(unit)
  }

  const readout = $derived(answerLines(clean))
  const letters = $derived(lettersOf(clean))
  const valueProblems = $derived((['tripleT', 'tripleP', 'critT', 'critP', 'nmp', 'nbp'] as const).filter((key) => g.problems[key]))
  const oneAtm = $derived(v.text.atm)
  const labelSummary = $derived(
    [
      clean.regions === 'none' ? '' : `Regions: ${LABEL_NAMES[clean.regions].toLowerCase()}`,
      clean.points === 'none' ? '' : `points: ${LABEL_NAMES[clean.points].toLowerCase()}`,
      clean.curves === 'none' ? '' : `boundaries: ${LABEL_NAMES[clean.curves].toLowerCase()}`,
      clean.isobar ? `${oneAtm} line` : '',
    ].filter(Boolean).join(' · ') || 'None',
  )
  const capsSummary = $derived(endsSummary('none', clean.xEndCap === clean.yEndCap ? clean.xEndCap : 'none'))
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `phase-diagram-${substanceName(clean)}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'phase-diagram',
  )

  type NumberKey = 'tripleT' | 'tripleP' | 'critT' | 'critP' | 'nmp' | 'nbp'
  /** Each typed value's box, and its problem's id after it. */
  const FIELD_IDS: Record<NumberKey, string> = { tripleT: 'triple-t', tripleP: 'triple-p', critT: 'crit-t', critP: 'crit-p', nmp: 'nmp', nbp: 'nbp' }
</script>

{#snippet numberField(id: string, name: string, unit: string, key: NumberKey)}
  <label class="number-field" for={id}>
    <span>{name}&nbsp;<span class="unit">({unit})</span></span>
    <!-- An empty or half-typed box keeps the value before it, and shows it again once left. -->
    <input
      {id}
      type="number"
      step="any"
      aria-invalid={!!g.problems[key]}
      aria-describedby={g.problems[key] ? `${id}-problem` : undefined}
      bind:value={() => s[key], (v) => { if (typeof v === 'number' && Number.isFinite(v)) s[key] = v }}
      onchange={(e) => { if (!Number.isFinite(e.currentTarget.valueAsNumber)) e.currentTarget.value = String(clean[key]) }}
    />
  </label>
{/snippet}

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: (v: T) => string, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as o}
      <button type="button" role="radio" aria-checked={value === o} class:on={value === o} onclick={() => set(o)}>{names(o)}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Phase Diagram" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="phase-card">
      <h2 class="card-head">Substance</h2>
      <label class="field">
        <span>Substance</span>
        <select value={s.substance} onchange={(e) => chooseSubstance(e.currentTarget.value as PhaseSettings['substance'])}>
          {#each SUBSTANCES as sub}<option value={sub.id}>{sub.name}</option>{/each}
          <option value="custom">Your own</option>
        </select>
      </label>

      {#if custom}
        <label class="field">
          <span>Name</span>
          <input type="text" maxlength="40" placeholder="Substance X" bind:value={s.name} />
        </label>
        <div class="fields">
          {@render numberField(FIELD_IDS.tripleT, 'Triple point', tu, 'tripleT')}
          {@render numberField(FIELD_IDS.tripleP, 'Triple point', pu, 'tripleP')}
          {@render numberField(FIELD_IDS.critT, 'Critical point', tu, 'critT')}
          {@render numberField(FIELD_IDS.critP, 'Critical point', pu, 'critP')}
          {@render numberField(FIELD_IDS.nmp, 'Normal melting point', tu, 'nmp')}
          {@render numberField(FIELD_IDS.nbp, 'Normal boiling point', tu, 'nbp')}
        </div>
        {#each valueProblems as key}<p class="help problem" id="{FIELD_IDS[key]}-problem">{g.problems[key]}</p>{/each}
      {/if}

      <div class="pair">
        <div class="field">
          <span>Temperature in</span>
          {@render segmented('Temperature unit', T_UNITS, (u) => T_UNIT_TEXT[u], s.tUnit, chooseTUnit)}
        </div>
        <div class="field">
          <span>Pressure in</span>
          {@render segmented('Pressure unit', P_UNITS, (u) => P_UNIT_TEXT[u], s.pUnit, choosePUnit)}
        </div>
      </div>

      {#if custom}
        <div class="field">
          <span>Axes</span>
          {@render segmented('Axes', AXES, (a) => AXES_NAMES[a], s.axes, chooseAxes)}
        </div>
      {/if}

      {#if readout.length}
        <ul class="readout">{#each readout as line}<li>{line}</li>{/each}</ul>
      {/if}
      {#if numbered}
        {#if g.problems.fit}<p class="help problem">{g.problems.fit}</p>{/if}
      {/if}
      {#if g.problems.room}<p class="help problem">{g.problems.room}</p>{/if}
      {#if numbered}
        <button type="button" class="btn-ghost small fit" onclick={fitAxes} disabled={valueProblems.length > 0}>
          <Maximize size={16} aria-hidden="true" /> Fit the axes to the diagram
        </button>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Labels" icon={Tag} summary={labelSummary}>
      <div class="pair setting">
        <label class="field">
          <span>Regions</span>
          <select bind:value={s.regions}>{#each LABELS as m}<option value={m}>{m === 'names' ? 'Solid, Liquid, Gas' : LABEL_NAMES[m]}</option>{/each}</select>
        </label>
        <label class="field">
          <span>Triple and critical points</span>
          <select bind:value={s.points}>{#each LABELS as m}<option value={m}>{LABEL_NAMES[m]}</option>{/each}</select>
        </label>
      </div>
      <label class="field setting">
        <span>Phase boundaries</span>
        <select bind:value={s.curves}>
          {#each CURVE_LABELS as m}<option value={m}>{m === 'names' ? 'Names (Melting / freezing…)' : LABEL_NAMES[m]}</option>{/each}
        </select>
      </label>
      {#if !numbered}
        <label class="field setting">
          <span>Values at the axes</span>
          <select bind:value={s.axisValues}>{#each AXIS_VALUES as m}<option value={m}>{AXIS_VALUE_NAMES[m]}</option>{/each}</select>
        </label>
      {/if}
      <label class="check">
        <input type="checkbox" bind:checked={s.guides} />
        <span>
          <strong>Dashed lines from the triple and critical points</strong>
        </span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.isobar} />
        <span>
          <strong>{oneAtm} line</strong>
        </span>
      </label>
      {#if s.isobar}
        <label class="field setting indent">
          <span>Where it crosses a boundary</span>
          <select bind:value={s.normalPoints}>
            {#each NORMAL_POINTS as m}<option value={m}>{NORMAL_POINT_NAMES[m]}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="check">
        <input type="checkbox" bind:checked={s.supercritical} />
        <span>
          <strong>Supercritical fluid region</strong>
        </span>
      </label>
      {#if letters.length > 1}
        <div class="shuffle">
          <button type="button" class="btn-ghost small" onclick={() => (s.shuffle = newSeed())}><Dices size={17} aria-hidden="true" /> Shuffle the letters</button>
          {#if s.shuffle}<button type="button" class="btn-ghost small" onclick={() => (s.shuffle = 0)}>In order</button>{/if}
        </div>
      {/if}
    </Section>

    <Section title="Curve" icon={Spline} summary="{clean.color[0].toUpperCase()}{clean.color.slice(1)}">
      <div class="swatches" role="radiogroup" aria-label="Curve color">
        {#each Object.entries(COLORS) as [name, hex]}
          <button
            type="button" role="radio" aria-checked={s.color === name} aria-label={name} data-tip={name}
            class="swatch" class:on={s.color === name} style:--swatch={hex} onclick={() => (s.color = name as Color)}
          ></button>
        {/each}
      </div>
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: `Phase diagram of ${real ? real.name.toLowerCase() : substanceName(clean)}`, xTitle: xTitleFor(clean.tUnit), yTitle: yTitleFor(clean.pUnit) }}
    />
    {#if numbered}
      <AxisSettings
        axis="x" read={axes.x} problems={axes.problems}
        bind:from={s.xFrom} bind:to={s.xTo} bind:step={s.xStep} bind:every={s.xEvery}
        bind:labelMode={s.xLabelMode} bind:label={s.xLabel} bind:startCap={s.xStartCap} bind:endCap={s.xEndCap}
      />
      <AxisSettings
        axis="y" read={axes.y} problems={axes.problems}
        bind:from={s.yFrom} bind:to={s.yTo} bind:step={s.yStep} bind:every={s.yEvery}
        bind:labelMode={s.yLabelMode} bind:label={s.yLabel} bind:startCap={s.yStartCap} bind:endCap={s.yEndCap}
      />
      <GridlineSettings bind:minor={s.minor} />
    {:else}
      <Section title="Axes" icon={Axis3d} summary="Not to scale · {capsSummary}">
        <div class="pair">
          <div class="field">
            <span>Pressure axis top</span>
            <CapPicker options={CAPS} label="Pressure axis top end" direction="up" bind:value={s.yEndCap} />
          </div>
          <div class="field">
            <span>Temperature axis end</span>
            <CapPicker options={CAPS} label="Temperature axis right end" direction="right" bind:value={s.xEndCap} />
          </div>
        </div>
      </Section>
    {/if}
  {/snippet}

  {#snippet figure()}
    <PhaseFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .phase-card { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .fields, .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input { width: 100%; min-width: 0; }
  .unit { font-weight: 400; color: var(--muted); }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .fit { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.88rem; }
  .setting { margin-bottom: 0.75rem; }
  .setting.indent { margin: 0.6rem 0 0 1.7rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check strong { font-size: 0.9rem; }
  :global(.section) .check + .check, :global(.section) .indent + .check { margin-top: 0.75rem; }
  .shuffle { display: flex; gap: 0.5rem; margin-top: 0.85rem; }
  .shuffle button { display: inline-flex; align-items: center; gap: 0.4rem; }
  .swatches { display: flex; gap: 0.5rem; }
  .swatch {
    width: 2rem; height: 2rem; border-radius: 999px; border: 3px solid #fff; background: var(--swatch);
    box-shadow: 0 0 0 1.5px var(--border); cursor: pointer;
  }
  .swatch.on { box-shadow: 0 0 0 2.5px var(--ink); }
</style>
