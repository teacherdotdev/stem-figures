<script lang="ts">
  // Half-Life Graph: pick up to three isotopes (setups, or your own name and
  // half-life), what's up the side and the time unit along the bottom, and
  // get their decay curves on a graph, with guide lines at the first one's
  // half-lives, dots at each half-life and its stable daughter if wanted.
  // The grid and axes are $shared/graph's, the same as Heating and Cooling
  // Curve's.
  import { Maximize, Plus, Ruler, Spline, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import AxisSettings from '$shared/graph/AxisSettings.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { readAxes } from '$shared/graph/axes'
  import { COLORS } from '$shared/graph/colors'
  import { DASHES } from '$shared/graph/labels'
  import Section from '$shared/Section.svelte'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import { answerLines, buildHalfLife, fittedAxes } from './figure'
  import HalfLifeFigure from './HalfLifeFigure.svelte'
  import { ISOTOPES, UNITS, UNIT_NAMES, timeText, type Unit } from './isotopes'
  import {
    ACTIVITY_UNITS, GUIDE_LABELS, GUIDE_LABEL_NAMES, MAX_ISOTOPES, QUANTITIES, QUANTITY_NAMES, SLOTS, START_DEFAULTS,
    daughterAllowed, drawnIsotopes, halfLifeSettings, hasStart, isotopeIn, type HalfLifeSettings, type IsotopeChoice, type Quantity,
    type Slot,
  } from './settings'

  const gen = generatorState(halfLifeSettings, 'half-life-graph')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const axes = $derived(readAxes(clean))
  const g = $derived(buildHalfLife(clean))
  const isotopes = $derived(drawnIsotopes(clean))
  const canDaughter = $derived(daughterAllowed(clean))
  let svg = $state<SVGSVGElement>()

  const key = <K extends string>(name: K, i: Slot) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`
  const ink = (i: number) => (clean.color ? COLORS[(['blue', 'red', 'green'] as const)[i]] : COLORS.black)
  const many = (u: Unit) => UNIT_NAMES[u].many.replace(/^./, (c) => c.toUpperCase())

  /** The axis titles, if they're still ones this page wrote, follow the unit and what's up the side. */
  function retitle() {
    const now = gen.snapshot()
    Object.assign(s, { xTitle: now.xTitle, yTitle: now.yTitle })
  }

  /** The x-axis fitted to the isotopes drawn: 0 to 5 half-lives of the longest. */
  function fitX() {
    const { xFrom, xTo, xStep, xEvery } = fittedAxes(gen.snapshot())
    Object.assign(s, { xFrom, xTo, xStep, xEvery })
  }

  /** Axes that just fit the curves, counting in tidy steps. */
  function fitAxes() {
    Object.assign(s, fittedAxes(clean))
  }

  /**
   * A setup in the first slot brings its own time unit; any change of
   * isotope fits the x-axis to them. Custom starts from the isotope already
   * there, so the curve doesn't change until the teacher types.
   */
  function chooseIsotope(i: Slot, id: IsotopeChoice) {
    if (id === clean[key('iso', i)]) return
    if (id === 'custom') {
      const was = isotopeIn(clean, i)
      Object.assign(s, { [key('iso', i)]: id, [key('name', i)]: was.name, [key('half', i)]: was.half, [key('unit', i)]: was.unit })
      return
    }
    s[key('iso', i)] = id
    if (i === 0) s.xUnit = ISOTOPES.find((x) => x.id === id)!.unit
    retitle()
    fitX()
  }

  function addIsotope() {
    s.count = Math.min(MAX_ISOTOPES, clean.count + 1)
    retitle()
    fitX()
  }

  /** The isotopes after it move up a slot. */
  function removeIsotope(i: Slot) {
    for (let j = i; j < clean.count - 1; j++) {
      const next = (j + 1) as Slot
      for (const f of ['iso', 'name', 'half', 'unit'] as const) Object.assign(s, { [key(f, j as Slot)]: clean[key(f, next)] })
    }
    s.count = clean.count - 1
    retitle()
    fitX()
  }

  function chooseQuantity(q: Quantity) {
    if (q === clean.quantity) return
    s.quantity = q
    if (hasStart(q)) s.start = START_DEFAULTS[q]
    retitle()
    const { yFrom, yTo, yStep, yEvery } = fittedAxes(gen.snapshot())
    Object.assign(s, { yFrom, yTo, yStep, yEvery })
  }

  function chooseUnit(u: Unit) {
    s.xUnit = u
    retitle()
    fitX()
  }

  const answer = $derived(answerLines(clean))
  const guideSummary = $derived(
    clean.guides ? `${clean.guides} half-li${clean.guides === 1 ? 'fe' : 'ves'}${clean.guideLabels === 'none' ? '' : `, ${GUIDE_LABEL_NAMES[clean.guideLabels].toLowerCase()}`}` : 'None',
  )
  const curveSummary = $derived(
    [
      clean.curve ? 'Curves' : 'No curves',
      clean.dots ? 'dots' : '',
      canDaughter && clean.daughter ? 'daughter' : '',
      clean.names ? '' : 'names hidden',
      clean.color ? '' : 'black and white',
    ].filter(Boolean).join(' · '),
  )
  const startName = $derived(
    clean.quantity === 'mass' ? 'Starting mass (g)'
    : clean.quantity === 'nuclei' ? 'Starting number of nuclei'
    : `Starting ${clean.activityUnit === 'Bq' ? 'activity (Bq)' : 'count rate (counts/min)'}`,
  )
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `half-life-graph-${isotopes.map((iso) => iso.name).join('-')}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'half-life-graph',
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

<GeneratorPage name="Half-Life Graph" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="isotopes">
      <div class="head-row">
        <h2 class="card-head">Isotopes</h2>
        <HelpTip id="half-life-tip" label="How the curves are worked out">
          Each curve is N = N₀ · (½)^(t / T½): half is left after one half-life, a quarter after two, and it never
          reaches zero. Mass and activity fall along the same curve. Half-lives are from NuDat 3, rounded as textbooks
          give them; carbon-14 uses the textbook 5,730 years (NuDat 3 now gives 5,700 ± 30). The daughter curve, N₀ − N,
          is offered for one isotope whose daughter is stable, as a percent, fraction or number of nuclei. Hide the
          names and the key says Isotope A, B and C, for students to tell apart by the half-lives they read off.
        </HelpTip>
      </div>

      {#each SLOTS.slice(0, clean.count) as i (i)}
        {@const id = s[key('iso', i)]}
        <div class="isotope">
          <div class="isotope-head">
            <strong>Isotope {i + 1}</strong>
            {#if clean.count > 1 || (canDaughter && clean.daughter)}{@render sample(i)}{/if}
            {#if clean.count > 1}
              <button type="button" class="icon-btn" aria-label="Remove isotope {i + 1}" onclick={() => removeIsotope(i)}>
                <X size={16} aria-hidden="true" />
              </button>
            {/if}
          </div>
          <select aria-label="Isotope {i + 1}" value={id} onchange={(e) => chooseIsotope(i, e.currentTarget.value as IsotopeChoice)}>
            {#each ISOTOPES as x}<option value={x.id}>{x.name} ({timeText(x.half, x.unit)})</option>{/each}
            <option value="custom">Custom</option>
          </select>
          {#if id === 'custom'}
            <label class="field">
              <span>Name</span>
              <input type="text" maxlength="40" placeholder="Isotope {i + 1}" bind:value={s[key('name', i)]} />
            </label>
            <div class="fields">
              <label class="number-field">
                <span>Half-life</span>
                <input type="number" step="any" min="0" bind:value={s[key('half', i)]} />
              </label>
              <label class="number-field">
                <span>Unit</span>
                <select bind:value={s[key('unit', i)]}>
                  {#each UNITS as u}<option value={u}>{many(u)}</option>{/each}
                </select>
              </label>
            </div>
          {/if}
        </div>
      {/each}
      {#if clean.count < MAX_ISOTOPES}
        <button type="button" class="btn-ghost small add" onclick={addIsotope}>
          <Plus size={16} aria-hidden="true" /> Add an isotope
        </button>
      {/if}

      <div class="fields wide">
        <label class="field">
          <span>Up the side</span>
          <select value={s.quantity} onchange={(e) => chooseQuantity(e.currentTarget.value as Quantity)}>
            {#each QUANTITIES as q}<option value={q}>{QUANTITY_NAMES[q]}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Time in</span>
          <select value={s.xUnit} onchange={(e) => chooseUnit(e.currentTarget.value as Unit)}>
            {#each UNITS as u}<option value={u}>{many(u)}</option>{/each}
          </select>
        </label>
      </div>
      {#if clean.quantity === 'activity'}
        {@render segmented('Activity in', ACTIVITY_UNITS, { Bq: 'Becquerels', cpm: 'Counts per minute' }, s.activityUnit, (v) => { s.activityUnit = v; retitle() })}
      {/if}
      {#if hasStart(clean.quantity)}
        <label class="number-field">
          <span>{startName}</span>
          <input type="number" step="any" min="0" bind:value={s.start} />
        </label>
      {/if}

      {#if answer.length}
        <ul class="readout">{#each answer as line}<li>{line}</li>{/each}</ul>
      {/if}
      {#if g.problems.fit}<p class="problem">{g.problems.fit}</p>{/if}
      <button type="button" class="btn-ghost small fit" onclick={fitAxes}>
        <Maximize size={16} aria-hidden="true" /> Fit the axes to the curves
      </button>
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Guide lines" icon={Ruler} summary={guideSummary}>
      <label class="field setting">
        <span>Dashed lines at</span>
        <select bind:value={s.guides}>
          <option value={0}>None</option>
          {#each [1, 2, 3, 4] as n}<option value={n}>The first {n === 1 ? 'half-life' : `${n} half-lives`}</option>{/each}
        </select>
      </label>
      {#if clean.guides}
        <label class="field setting">
          <span>Labeled with</span>
          <select bind:value={s.guideLabels}>
            {#each GUIDE_LABELS as m}<option value={m}>{GUIDE_LABEL_NAMES[m]}</option>{/each}
          </select>
        </label>
      {/if}
      {#if g.problems.guides}<p class="problem">{g.problems.guides}</p>{/if}
    </Section>

    <Section title="Curves" icon={Spline} summary={curveSummary}>
      {@render check('Draw the curves', s.curve, (v) => (s.curve = v))}
      {@render check('Dots at each half-life', s.dots, (v) => (s.dots = v))}
      {#if canDaughter}
        {@render check(`Daughter curve (${isotopeIn(clean, 0).daughter})`, s.daughter, (v) => { s.daughter = v; retitle() })}
        {#if clean.iso1 === 'custom' && clean.daughter}
          <label class="field setting">
            <span>Daughter’s name</span>
            <input type="text" maxlength="40" placeholder="Daughter" bind:value={s.daughterName} />
          </label>
        {/if}
      {/if}
      {@render check('Hide the names', !s.names, (v) => (s.names = !v))}
      <div class="setting">{@render segmented('Lines', ['color', 'bw'] as const, { color: 'Color', bw: 'Black and white' }, s.color ? 'color' : 'bw', (v) => (s.color = v === 'color'))}</div>
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: `Decay of ${isotopes[0].name.toLowerCase()}`, xTitle: `Time (${UNIT_NAMES[clean.xUnit].many})`, yTitle: g.yTitle }}
    />
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
  {/snippet}

  {#snippet figure()}
    <HalfLifeFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .isotopes { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .fields.wide { grid-template-columns: 3fr 2fr; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input, .number-field select { width: 100%; min-width: 0; }
  .isotope { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .isotope-head { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; min-height: 1.75rem; }
  .isotope-head strong { margin-right: auto; }
  .sample { flex: none; }
  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; padding: 0;
    border: 1px solid var(--border); border-radius: 8px; background: none; color: var(--muted); cursor: pointer;
  }
  .icon-btn:hover { color: var(--ink); border-color: var(--ink); }
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
