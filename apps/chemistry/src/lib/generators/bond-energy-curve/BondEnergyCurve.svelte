<script lang="ts">
  // Bond Energy Curve: type up to three bonds, each a name, a bond length and
  // a bond energy, and get their curves of potential energy against
  // internuclear distance on one graph, each with its lowest point at its
  // bond length and minus its bond energy. Marked if wanted: guide lines
  // from each minimum to both axes, a dot on it, and "Repulsion" and
  // "Attraction" either side of one curve's. The grid and axes are
  // $shared/graph's, the same as Half-Life Graph's.
  import { Axis3d, Maximize, Plus, Ruler, Spline, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import AxisSettings from '$shared/graph/AxisSettings.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { PLAIN_NUMBERS, readAxes } from '$shared/graph/axes'
  import { CAPS } from '$shared/graph/caps'
  import { COLORS } from '$shared/graph/colors'
  import { DASHES } from '$shared/graph/labels'
  import Section from '$shared/Section.svelte'
  import BondEnergyFigure from './BondEnergyFigure.svelte'
  import { answerLines, buildCurve, fittedAxes } from './figure'
  import { LENGTH_UNITS, LENGTH_UNIT_TEXT, fromPm, toPm, type LengthUnit } from './morse'
  import {
    AXES, BOND_NAMES, GUIDE_LABELS, GUIDE_LABEL_NAMES, MAX_BONDS, REGIONS, REGION_NAMES, SLOTS, UNITS, UNIT_TEXT, bondSettings, drawnBonds,
    field, namesHidden, shownName, xTitleFor, yTitleFor, type AxesMode, type Slot, type Unit,
  } from './settings'

  const gen = generatorState(bondSettings, 'bond-energy-curve')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const axes = $derived(readAxes(clean))
  const g = $derived(buildCurve(clean))
  const bonds = $derived(drawnBonds(clean))
  const numbered = $derived(clean.axes === 'numbered')
  let svg = $state<SVGSVGElement>()

  const ink = (i: number) => (clean.color ? COLORS[(['blue', 'red', 'green'] as const)[i]] : COLORS.black)

  /** The axis titles, if they're still ones this page wrote, follow the units and the axes. */
  function retitle() {
    const now = gen.snapshot()
    Object.assign(s, { xTitle: now.xTitle, yTitle: now.yTitle })
  }

  /** Axes that just fit the curves, counting in tidy steps. */
  function fitAxes() {
    Object.assign(s, fittedAxes(clean))
  }

  /**
   * A new bond starts on the one before it, so it is on the grid whatever
   * the axes are, under the next made-up name. Nothing moves the axes but Fit.
   */
  function addBond() {
    const i = clean.count as Slot
    const before = (i - 1) as Slot
    Object.assign(s, {
      [field('name', i)]: BOND_NAMES[i],
      [field('length', i)]: clean[field('length', before)],
      [field('energy', i)]: clean[field('energy', before)],
      count: i + 1,
    })
  }

  /** The bonds after it move up a slot. */
  function removeBond(i: Slot) {
    for (let j = i; j < clean.count - 1; j++) {
      const next = (j + 1) as Slot
      for (const f of ['name', 'length', 'energy'] as const) Object.assign(s, { [field(f, j as Slot)]: clean[field(f, next)] })
    }
    s.count = clean.count - 1
  }

  /** A bond's length as typed, in the unit shown; it is kept in pm. */
  const lengthOf = (i: Slot) => {
    const pm = s[field('length', i)] as number | null
    return typeof pm === 'number' ? fromPm(pm, clean.lengthUnit) : pm
  }
  function setLength(i: Slot, typed: number | null) {
    s[field('length', i)] = (typeof typed === 'number' ? toPm(typed, clean.lengthUnit) : typed) as number
  }

  /** The distance axis keeps its place on the curves: its range is rewritten in the new unit. */
  function chooseLengthUnit(u: LengthUnit) {
    if (u === clean.lengthUnit) return
    for (const key of ['xFrom', 'xTo', 'xStep'] as const) {
      const v = PLAIN_NUMBERS.parse(s[key])
      if (v !== null) s[key] = String(fromPm(toPm(v, clean.lengthUnit), u))
    }
    s.lengthUnit = u
    retitle()
  }
  function chooseUnit(u: Unit) {
    s.unit = u
    retitle()
  }
  function chooseAxes(a: AxesMode) {
    s.axes = a
    retitle()
  }

  const answer = $derived(answerLines(clean))
  const untouched = $derived(
    clean.name1 === bondSettings.defaults.name1 && clean.length1 === bondSettings.defaults.length1 && clean.energy1 === bondSettings.defaults.energy1,
  )
  const guideSummary = $derived(
    clean.guides ? (clean.guideLabels === 'none' ? 'To both axes, no labels' : `To both axes, ${GUIDE_LABEL_NAMES[clean.guideLabels].toLowerCase()}`) : 'None',
  )
  const curveSummary = $derived(
    [
      clean.dots ? 'Dots on the minimums' : '',
      clean.count === 1 && clean.regions !== 'none' ? (clean.regions === 'words' ? 'Repulsion and attraction' : 'Blank region labels') : '',
      namesHidden(clean) ? 'Names hidden' : '',
      clean.color ? 'Color' : 'Black and white',
    ].filter(Boolean).join(' · '),
  )
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `bond-energy-curve-${bonds.map((b) => shownName(clean, b.slot)).join('-')}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'bond-energy-curve',
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

{#snippet sample(i: number)}
  <svg class="sample" viewBox="0 0 30 10" width="30" height="10" aria-hidden="true">
    <line x1="0" y1="5" x2="30" y2="5" stroke={ink(i)} stroke-width="3" stroke-dasharray={DASHES[i]} />
  </svg>
{/snippet}

<GeneratorPage name="Bond Energy Curve" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="bonds">
      <h2 class="card-head">Bonds</h2>

      {#each SLOTS.slice(0, clean.count) as i (i)}
        <div class="bond">
          <div class="bond-head">
            <strong>Bond {i + 1}</strong>
            {#if clean.count > 1}
              {@render sample(i)}
              <button type="button" class="icon-btn" aria-label="Remove bond {i + 1}" onclick={() => removeBond(i)}>
                <X size={16} aria-hidden="true" />
              </button>
            {/if}
          </div>
          <label class="field">
            <span>Name</span>
            <input type="text" maxlength="40" placeholder="Bond {i + 1}" bind:value={s[field('name', i)]} />
          </label>
          <div class="fields">
            <label class="number-field">
              <span>Bond length ({LENGTH_UNIT_TEXT[clean.lengthUnit]})</span>
              <input type="number" step="any" min="0" bind:value={() => lengthOf(i), (v) => setLength(i, v)} />
            </label>
            <label class="number-field">
              <span>Bond energy ({UNIT_TEXT[clean.unit]})</span>
              <input type="number" step="any" min="0" bind:value={s[field('energy', i)]} />
            </label>
          </div>
        </div>
      {/each}
      {#if untouched}<p class="note">Bond X is made up.</p>{/if}
      {#if clean.count < MAX_BONDS}
        <button type="button" class="btn-ghost small add" onclick={addBond}>
          <Plus size={16} aria-hidden="true" /> Add a bond
        </button>
      {/if}

      <div class="field">
        <span>Lengths in</span>
        {@render segmented('Lengths in', LENGTH_UNITS, LENGTH_UNIT_TEXT, s.lengthUnit, chooseLengthUnit)}
      </div>
      <div class="field">
        <span>Energies in</span>
        {@render segmented('Energies in', UNITS, UNIT_TEXT, s.unit, chooseUnit)}
      </div>

      {#if answer.length}
        <ul class="readout">{#each answer as line}<li>{line}</li>{/each}</ul>
      {/if}
      {#if g.problems.crowded}<p class="problem">{g.problems.crowded}</p>{/if}
      {#if numbered}
        {#if g.problems.fit}<p class="problem">{g.problems.fit}</p>{/if}
        {#if g.problems.shallow}<p class="problem">{g.problems.shallow}</p>{/if}
        <button type="button" class="btn-ghost small fit" onclick={fitAxes}>
          <Maximize size={16} aria-hidden="true" /> Fit the axes to the curves
        </button>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Guide lines" icon={Ruler} summary={guideSummary}>
      {@render check('Dashed lines from each minimum to the axes', s.guides, (v) => (s.guides = v))}
      {#if clean.guides}
        <label class="field setting">
          <span>Labeled with</span>
          <select bind:value={s.guideLabels}>
            {#each GUIDE_LABELS as m}<option value={m}>{GUIDE_LABEL_NAMES[m]}</option>{/each}
          </select>
        </label>
      {/if}
    </Section>

    <Section title="Curves" icon={Spline} summary={curveSummary}>
      {@render check(clean.count > 1 ? 'A dot on each minimum' : 'A dot on the minimum', s.dots, (v) => (s.dots = v))}
      {#if clean.count === 1}
        <label class="field setting">
          <span>Repulsion and attraction</span>
          <select bind:value={s.regions}>
            {#each REGIONS as m}<option value={m}>{REGION_NAMES[m]}</option>{/each}
          </select>
        </label>
      {:else}
        {@render check('Hide the names', !s.names, (v) => (s.names = !v))}
      {/if}
      <div class="setting">{@render segmented('Lines', ['color', 'bw'] as const, { color: 'Color', bw: 'Black and white' }, s.color ? 'color' : 'bw', (v) => (s.color = v === 'color'))}</div>
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Bond energy curve', xTitle: xTitleFor(clean.lengthUnit, numbered), yTitle: yTitleFor(clean.unit, numbered) }}
    />

    <Section title="Axes" icon={Axis3d} summary={numbered ? 'Numbered' : 'Shape only, no numbers'}>
      <div class:setting={!numbered}>
        {@render segmented('Axes', AXES, { numbered: 'Numbered', shape: 'Shape only' }, s.axes, chooseAxes)}
      </div>
      {#if !numbered}
        <div class="fields">
          <div class="field">
            <span>Energy axis top</span>
            <CapPicker options={CAPS} label="Energy axis top end" direction="up" bind:value={s.yEndCap} />
          </div>
          <div class="field">
            <span>Distance axis end</span>
            <CapPicker options={CAPS} label="Distance axis right end" direction="right" bind:value={s.xEndCap} />
          </div>
        </div>
      {/if}
    </Section>
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
      <GridlineSettings bind:minor={s.minor} bind:gridlines={s.gridlines} />
    {/if}
  {/snippet}

  {#snippet figure()}
    <BondEnergyFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .bonds { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input { width: 100%; min-width: 0; }
  .bond { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .bond-head { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; min-height: 1.75rem; }
  .bond-head strong { margin-right: auto; }
  .sample { flex: none; }
  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; padding: 0;
    border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--muted); cursor: pointer;
  }
  .icon-btn:hover { color: var(--ink); border-color: var(--ink); }
  .note { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .problem { margin: 0; font-size: 0.84rem; color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .add, .fit { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.4rem; }
  .setting { margin-bottom: 0.75rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.88rem; }
</style>
