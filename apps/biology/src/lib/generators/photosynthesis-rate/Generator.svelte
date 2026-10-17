<script lang="ts">
  // Photosynthesis Rate: graph how fast a plant photosynthesizes against
  // light intensity (or its distance from the lamp), CO₂ concentration or
  // temperature, up to three curves at once, each at its own CO₂,
  // temperature or light; or the CO₂ in a closed chamber over time, or the
  // CO₂ and O₂ around one plant. Shape only by default, or numbered axes;
  // where the curves level off, what limits them, lettered points, the
  // optimum and the compensation point marked if wanted. The grid and axes
  // are $shared/graph's, the same as Enzyme Activity's.
  import { Axis3d, ChartLine, Dices, MapPin, MoveUp } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import AxisSettings from '$shared/graph/AxisSettings.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { readAxes } from '$shared/graph/axes'
  import { CAPS } from '$shared/graph/caps'
  import { COLORS } from '$shared/graph/colors'
  import { DASHES } from '$shared/graph/labels'
  import { buildPhotosynthesis, curveName, limitWords, rangesOf, readoutOf } from './figure'
  import PhotosynthesisFigure from './PhotosynthesisFigure.svelte'
  import {
    CO2_UNIT_TEXT, CURVES, GRAPHS, GRAPH_NAMES, POINTS, POINT_NAMES, autoTitles, co2In, curveOf, isRate, photosynthesisSettings, retitled,
    type CurveIndex, type PhotosynthesisSettings,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(photosynthesisSettings, 'photosynthesis-rate')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const g = $derived(buildPhotosynthesis(clean))
  let svg = $state<SVGSVGElement>()

  const rate = $derived(isRate(clean.graph))
  const gases = $derived(clean.graph === 'gases')
  const overTime = $derived(clean.graph === 'chamber' || gases)
  const numbered = $derived(clean.axes === 'numbered')
  const twoAxes = $derived(gases && clean.view === 'time')

  /** A change that keeps the axis titles this page wrote in step with it, leaving ones the teacher typed. */
  function retitle(change: () => void) {
    const before = gen.snapshot()
    change()
    Object.assign(s, retitled(before, s))
  }

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, photosynthesisSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof PhotosynthesisSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = settingsFor(x, photosynthesisSettings.defaults, clean)
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  /** Numbers come with graph paper; shape only goes back to plain axes. */
  function chooseAxes(axes: 'shape' | 'numbered') {
    if (axes === s.axes) return
    s.gridlines = axes === 'numbered'
    s.axes = axes
  }

  // While an axis is fitted, its boxes show the fitted range; typing in one
  // takes over for that axis. The right y-axis goes with the left.
  const shown = $derived(rangesOf(clean, g.fitted))
  const shownAxes = $derived(readAxes(shown))
  type RangeKey = 'xFrom' | 'xTo' | 'xStep' | 'yFrom' | 'yTo' | 'yStep' | 'y2From' | 'y2Step'
  function typeRange(key: RangeKey, v: string) {
    const f = g.fitted
    if (key.startsWith('x') && s.xFit) Object.assign(s, { xFrom: f.xFrom, xTo: f.xTo, xStep: f.xStep, xFit: false })
    if (key.startsWith('y') && s.yFit) Object.assign(s, { yFrom: f.yFrom, yTo: f.yTo, yStep: f.yStep, y2From: f.y2From, y2Step: f.y2Step, yFit: false })
    s[key] = v
  }

  const key = <K extends string>(name: K, i: CurveIndex) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`
  const ink = (i: number) => (clean.color ? COLORS[(['blue', 'red', 'green'] as const)[i]] : COLORS.black)
  /** The fields a curve is drawn at on this graph: the factors it isn't against. */
  const fieldsOf = $derived(
    clean.graph === 'light' ? (['co2', 'temp'] as const)
    : clean.graph === 'co2' ? (['light', 'temp'] as const)
    : clean.graph === 'temperature' ? (['light', 'co2'] as const)
    : (['light', 'temp'] as const),
  )
  const co2Unit = $derived(CO2_UNIT_TEXT[clean.co2Unit])
  /** A CO₂ concentration typed in the unit shown, kept in %. */
  const setCo2 = (k: `co2${1 | 2 | 3}` | 'co2Start', v: number) => {
    if (Number.isFinite(v)) s[k] = clean.co2Unit === 'ppm' ? v / 10_000 : v
  }

  const readout = $derived(readoutOf(clean))
  const words = $derived(limitWords(clean))
  const marks = $derived(
    clean.graph === 'temperature'
      ? [clean.markOpt ? 'optimum' : '', clean.letters ? 'lettered points' : '']
      : clean.graph === 'light' || clean.graph === 'co2'
        ? [clean.markSat ? 'saturation point' : '', clean.markLimit ? 'limiting factors' : '', clean.letters ? 'lettered points' : '', clean.rate === 'net' && clean.markComp ? 'compensation point' : '']
        : [],
  )
  const markSummary = $derived(marks.filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()) || 'Nothing marked')
  const pointSummary = $derived(clean.points === 'none' ? 'No points' : `${POINT_NAMES[clean.points]}${clean.noise ? `, ±${clean.noise}%` : ''}`)
  const lineSummary = $derived([clean.color ? 'Color' : 'Black and white', clean.gridlines ? 'gridlines' : 'no gridlines'].join(' · '))
  const axesSummary = $derived(numbered ? 'Numbered' : 'Shape only, no numbers')
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `photosynthesis-rate-${clean.graph}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photosynthesis-rate',
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

{#snippet curveField(i: CurveIndex, field: 'light' | 'co2' | 'temp')}
  {#if field === 'co2'}
    <label class="number-field">
      <span>CO₂ ({co2Unit})</span>
      <input type="number" step="any" min="0" value={co2In(curveOf(clean, i).co2, clean.co2Unit)} onchange={(e) => setCo2(key('co2', i), e.currentTarget.valueAsNumber)} />
    </label>
  {:else if field === 'temp'}
    <label class="number-field">
      <span>Temperature (°C)</span>
      <input type="number" step="any" min="0" max="60" bind:value={s[key('temp', i)]} />
    </label>
  {:else}
    <label class="number-field">
      <span>Light intensity</span>
      <input type="number" step="any" min="0" max="1000" bind:value={s[key('light', i)]} />
    </label>
  {/if}
{/snippet}

<GeneratorPage name="Photosynthesis Rate" {filename} {gen} {svg} settingsWidth={27} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="plants">
      <div class="head-row">
        <h2 class="card-head">Graph</h2>
        <HelpTip id="photosynthesis-tip" label="How the curves are worked out">
          Made to look like textbook graphs, not measured. The rate rises in a straight line while light is limiting,
          the same slope whatever the CO₂ or temperature, then levels off where the plant’s enzymes can fix CO₂ no
          faster: higher with more CO₂, and fastest at 30 °C (Enzyme Activity’s temperature curve). Light intensity
          falls as 1/d² from the lamp. Net rate takes off respiration, which doubles every 10 °C. In a closed chamber
          the CO₂ changes by respiration less photosynthesis, and the O₂ by the same the other way. With no curves you
          get blank axes to sketch on; with points only, students draw the line of best fit.
        </HelpTip>
      </div>
      <label class="field">
        <span>Setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Graph</span>
        <select value={s.graph} onchange={(e) => { const v = e.currentTarget.value as PhotosynthesisSettings['graph']; retitle(() => (s.graph = v)) }}>
          {#each GRAPHS as graph}<option value={graph}>{GRAPH_NAMES[graph]}</option>{/each}
        </select>
      </label>

      {#if clean.graph === 'light'}
        <div class="field">
          <span>Along the x-axis</span>
          {@render segmented('Along the x-axis', ['intensity', 'distance'] as const, { intensity: 'Light intensity', distance: 'Distance from lamp' }, s.lightAxis, (v) => retitle(() => (s.lightAxis = v)))}
        </div>
      {/if}
      {#if gases}
        <div class="field">
          <span>Show</span>
          {@render segmented('Show', ['time', 'against'] as const, { time: 'Over time', against: 'CO₂ against O₂' }, s.view, (v) => retitle(() => (s.view = v)))}
        </div>
      {/if}
      {#if rate}
        <div class="fields">
          <div class="field">
            <span>Rate</span>
            {@render segmented('Rate', ['gross', 'net'] as const, { gross: 'Gross', net: 'Net' }, s.rate, (v) => retitle(() => (s.rate = v)))}
          </div>
          <label class="field">
            <span>Measured in</span>
            <select value={s.rateUnit} onchange={(e) => { const v = e.currentTarget.value as 'au' | 'bubbles'; retitle(() => (s.rateUnit = v)) }}>
              <option value="au">Arbitrary units</option>
              <option value="bubbles">Bubbles a minute</option>
            </select>
          </label>
        </div>
      {/if}

      {#if gases}
        <div class="curve" class:off={!s.show1}>
          <label class="check curve-head">
            <input type="checkbox" bind:checked={s.show1} />
            <span><strong>The plant</strong></span>
          </label>
          {#if clean.show1}
            <div class="fields">{@render curveField(0, 'light')}{@render curveField(0, 'temp')}</div>
          {/if}
        </div>
      {:else}
        {#each CURVES as i}
          {@const c = curveOf(clean, i)}
          <div class="curve" class:off={!c.show}>
            <label class="check curve-head">
              <input type="checkbox" checked={s[key('show', i)]} onchange={(e) => (s[key('show', i)] = e.currentTarget.checked)} />
              <span><strong>Curve {i + 1}</strong></span>
              {@render sample(i)}
            </label>
            {#if c.show}
              <div class="fields">{#each fieldsOf as f}{@render curveField(i, f)}{/each}</div>
              <label class="field">
                <span>Name</span>
                <input type="text" maxlength="40" placeholder={curveName({ ...clean, [key('name', i)]: '' }, i)} bind:value={s[key('name', i)]} />
              </label>
            {/if}
          </div>
        {/each}
      {/if}

      {#if overTime}
        <div class="fields">
          <label class="number-field">
            <span>Starting CO₂ ({co2Unit})</span>
            <input type="number" step="any" min="0" value={co2In(clean.co2Start, clean.co2Unit)} onchange={(e) => setCo2('co2Start', e.currentTarget.valueAsNumber)} />
          </label>
          <label class="number-field">
            <span>Time shown (minutes)</span>
            <input type="number" step="any" min="1" max="600" bind:value={s.minutes} />
          </label>
        </div>
        {@render check('The light goes off', s.lightsOff, (v) => (s.lightsOff = v))}
        {#if s.lightsOff}
          <label class="number-field">
            <span>Off after (minutes)</span>
            <input type="number" step="any" min="0" max="600" bind:value={s.offAt} />
          </label>
        {/if}
      {/if}
      <div class="field">
        <span>CO₂ in</span>
        {@render segmented('CO₂ in', ['percent', 'ppm'] as const, { percent: '%', ppm: 'ppm' }, s.co2Unit, (v) => retitle(() => (s.co2Unit = v)))}
      </div>
      {#if readout.length}
        <ul class="readout">{#each readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    {#if rate}
      <Section title="Marked" icon={MapPin} summary={markSummary}>
        {#if clean.graph === 'temperature'}
          {@render check('Optimum', s.markOpt, (v) => (s.markOpt = v))}
          {#if s.markOpt}
            <div class="field setting"><LabelField name="Optimum label" placeholder="Optimum" bind:mode={s.optLabelMode} bind:text={s.optLabel} /></div>
          {/if}
          {@render check('Lettered points', s.letters, (v) => (s.letters = v))}
        {:else}
          {@render check('Saturation point', s.markSat, (v) => (s.markSat = v))}
          {#if s.markSat}
            <div class="field setting"><LabelField name="Saturation point label" placeholder="Saturation point" bind:mode={s.satLabelMode} bind:text={s.satLabel} /></div>
          {/if}
          {@render check('Limiting factors', s.markLimit, (v) => (s.markLimit = v))}
          {#if s.markLimit}
            <div class="field setting">
              <span>On the rise</span>
              <LabelField name="Rise label" placeholder={words.low} bind:mode={s.lowLabelMode} bind:text={s.lowLabel} />
            </div>
            <div class="field setting">
              <span>On the plateau</span>
              <LabelField name="Plateau label" placeholder={words.high} bind:mode={s.highLabelMode} bind:text={s.highLabel} />
            </div>
          {/if}
          {@render check('Lettered points', s.letters, (v) => (s.letters = v))}
          {#if clean.rate === 'net'}
            {@render check('Compensation point', s.markComp, (v) => (s.markComp = v))}
            {#if s.markComp}
              <div class="field setting"><LabelField name="Compensation point label" placeholder="Compensation point" bind:mode={s.compLabelMode} bind:text={s.compLabel} /></div>
            {/if}
          {/if}
        {/if}
      </Section>
    {/if}

    <Section title="Data points" icon={Dices} summary={pointSummary}>
      <div class="setting">{@render segmented('Data points', POINTS, POINT_NAMES, s.points, (v) => (s.points = v))}</div>
      {#if s.points !== 'none'}
        <label class="number-field setting">
          <span>Points off by about (%)</span>
          <input type="number" step="1" min="0" max="30" bind:value={s.noise} />
        </label>
        {#if clean.noise}
          <button type="button" class="btn-ghost small" onclick={() => (s.seed = Math.floor(Math.random() * 999_998) + 1)}>
            <Dices size={16} aria-hidden="true" /> Shuffle
          </button>
        {/if}
      {/if}
    </Section>

    <Section title="Lines" icon={ChartLine} summary={lineSummary}>
      <div class="setting">{@render segmented('Lines', ['color', 'bw'] as const, { color: 'Color', bw: 'Black and white' }, s.color ? 'color' : 'bw', (v) => (s.color = v === 'color'))}</div>
      {@render check('Gridlines', s.gridlines, (v) => (s.gridlines = v))}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Limiting factors in photosynthesis', ...autoTitles(clean) }}
    />

    <Section title="Axes" icon={Axis3d} summary={axesSummary}>
      <div class="setting">{@render segmented('Axes', ['shape', 'numbered'] as const, { shape: 'Shape only', numbered: 'Numbered' }, s.axes, chooseAxes)}</div>
      {#if !numbered}
        <div class="ends">
          <div class="field">
            <span>x-axis right end</span>
            <CapPicker options={CAPS} label="x-axis right end" direction="right" bind:value={s.xEndCap} />
          </div>
          <div class="field">
            <span>y-axis top end</span>
            <CapPicker options={CAPS} label="y-axis top end" direction="up" bind:value={s.yEndCap} />
          </div>
        </div>
      {/if}
    </Section>
    {#if numbered}
      <AxisSettings
        axis="x" read={shownAxes.x} problems={g.problems}
        bind:from={() => shown.xFrom, (v) => typeRange('xFrom', v)}
        bind:to={() => shown.xTo, (v) => typeRange('xTo', v)}
        bind:step={() => shown.xStep, (v) => typeRange('xStep', v)}
        bind:every={s.xEvery} bind:labelMode={s.xLabelMode} bind:label={s.xLabel} bind:startCap={s.xStartCap} bind:endCap={s.xEndCap}
        extras={[clean.xFit ? 'fitted' : '']}
      >
        {@render check('Fit to the curves', s.xFit, (v) => (s.xFit = v))}
      </AxisSettings>
      <AxisSettings
        axis="y" read={shownAxes.y} problems={g.problems}
        bind:from={() => shown.yFrom, (v) => typeRange('yFrom', v)}
        bind:to={() => shown.yTo, (v) => typeRange('yTo', v)}
        bind:step={() => shown.yStep, (v) => typeRange('yStep', v)}
        bind:every={s.yEvery} bind:labelMode={s.yLabelMode} bind:label={s.yLabel} bind:startCap={s.yStartCap} bind:endCap={s.yEndCap}
        extras={[clean.yFit ? 'fitted' : '']}
      >
        {@render check('Fit to the curves', s.yFit, (v) => (s.yFit = v))}
      </AxisSettings>
    {/if}
    {#if twoAxes}
      <Section title="Right y-axis" icon={MoveUp} summary={numbered ? `From ${shown.y2From} by ${shown.y2Step}` : 'O₂'}>
        {#if numbered}
          <div class="fields setting">
            <label class="number-field">
              <span>From</span>
              <input type="text" inputmode="decimal" aria-invalid={!!g.problems.y2From} value={shown.y2From} oninput={(e) => typeRange('y2From', e.currentTarget.value)} />
            </label>
            <label class="number-field">
              <span>Count by</span>
              <input type="text" inputmode="decimal" aria-invalid={!!g.problems.y2Step} value={shown.y2Step} oninput={(e) => typeRange('y2Step', e.currentTarget.value)} />
            </label>
          </div>
          {#each ['y2From', 'y2Step'] as k}
            {#if g.problems[k]}<p class="problem setting">{g.problems[k]}</p>{/if}
          {/each}
        {/if}
        <div class="field">
          <span>Its title</span>
          <LabelField name="Right y-axis title" placeholder="O₂ concentration (%)" bind:mode={s.y2TitleMode} bind:text={s.y2Title} />
        </div>
      </Section>
    {/if}
    {#if s.gridlines}<GridlineSettings bind:minor={s.minor} />{/if}
  {/snippet}

  {#snippet figure()}
    <PhotosynthesisFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .plants { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input { width: 100%; min-width: 0; }
  .curve { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .curve.off { padding-block: 0.5rem; }
  .sample { margin-left: auto; flex: none; }
  .problem { margin: 0; font-size: 0.84rem; color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .setting { margin-bottom: 0.75rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check.curve-head { align-items: center; margin: 0; }
  .check.curve-head input { margin: 0; }
  .ends { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.88rem; }
</style>
