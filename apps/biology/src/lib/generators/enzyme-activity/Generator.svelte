<script lang="ts">
  // Enzyme Activity: graph how fast an enzyme works against temperature, pH
  // or substrate concentration, up to three curves at once: enzymes like
  // pepsin, amylase and trypsin, or unknown ones with an optimum of the
  // teacher's own, or an enzyme with a competitive and a non-competitive
  // inhibitor. Shape only, with no numbers on the axes; the optimum,
  // denaturation, Vmax and Km are marked if wanted. The grid and axes are
  // $shared/graph's, the same as Chemistry's titration curve.
  import { Axis3d, ChartLine, MapPin } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import CapPicker from '$shared/graph/CapPicker.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { CAPS } from '$shared/graph/caps'
  import { COLORS } from '$shared/graph/colors'
  import EnzymeFigure from './EnzymeFigure.svelte'
  import { ENZYMES, UNKNOWN } from './enzymes'
  import { DASHES, curveName, drawnOf, readoutOf, shapeOf } from './figure'
  import { INHIBITORS, type Inhibitor } from './model'
  import {
    CURVES, GRAPHS, GRAPH_NAMES, INHIBITOR_NAMES, autoTitles, curveOf, enzymeSettings, type CurveIndex, type Graph,
  } from './settings'

  const gen = generatorState(enzymeSettings, 'enzyme-activity')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const substrate = $derived(clean.graph === 'substrate')
  const drawn = $derived(drawnOf(clean))

  /** A new graph swaps the axis titles this page wrote for the new graph's, leaving ones the teacher typed. */
  function chooseGraph(graph: Graph) {
    const before = autoTitles(s.graph)
    const after = autoTitles(graph)
    if (s.xTitle.trim() === before.xTitle) s.xTitle = after.xTitle
    if (s.yTitle.trim() === before.yTitle) s.yTitle = after.yTitle
    s.graph = graph
  }

  const key = <K extends string>(name: K, i: CurveIndex) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`
  /** An unknown enzyme starts from the one picked before it. */
  function chooseEnzyme(i: CurveIndex, id: string) {
    if (id === UNKNOWN) {
      const t = shapeOf({ ...clean, graph: 'temperature' }, i)
      const p = shapeOf({ ...clean, graph: 'ph' }, i)
      Object.assign(s, { [key('tOpt', i)]: t.opt, [key('tWidth', i)]: t.width, [key('pOpt', i)]: p.opt, [key('pWidth', i)]: p.width })
    }
    s[key('enzyme', i)] = id
  }

  const ink = (i: CurveIndex) => (clean.color ? COLORS[(['blue', 'red', 'green'] as const)[i]] : COLORS.black)
  const readout = $derived(readoutOf(clean))
  const inhibited = $derived(substrate && drawn.some((i) => curveOf(clean, i).inhibitor !== 'none'))

  const marks = $derived(
    substrate
      ? [clean.markVmax ? 'Vmax' : '', clean.markKm ? '½Vmax and Km' : '']
      : [clean.markOpt ? 'Optimum' : '', clean.markDen ? 'denaturation' : ''],
  )
  const markSummary = $derived(marks.filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()) || 'Nothing marked')
  const lineSummary = $derived([clean.color ? 'Color' : 'Black and white', clean.gridlines ? 'gridlines' : 'no gridlines'].join(' · '))
  const axesSummary = $derived(
    clean.xEndCap === 'none' && clean.yEndCap === 'none' ? 'Plain ends' : `${CAPS[clean.xEndCap]} / ${CAPS[clean.yEndCap]}`.toLowerCase().replace(/^./, (c) => c.toUpperCase()),
  )
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `enzyme-activity-${clean.graph}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'enzyme-activity',
  )
</script>

{#snippet check(label: string, value: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" checked={value} onchange={(e) => set(e.currentTarget.checked)} />
    <span><strong>{label}</strong></span>
  </label>
{/snippet}

{#snippet numberField(id: string, name: string, i: CurveIndex, field: 'tOpt' | 'tWidth' | 'pOpt' | 'pWidth', step: number, min: number, max: number)}
  <label class="number-field" for={id}>
    <span>{name}</span>
    <input {id} type="number" {step} {min} {max} bind:value={s[key(field, i)]} />
  </label>
{/snippet}

{#snippet sample(i: CurveIndex)}
  <svg class="sample" viewBox="0 0 30 10" width="30" height="10" aria-hidden="true">
    <line x1="0" y1="5" x2="30" y2="5" stroke={ink(i)} stroke-width="3" stroke-dasharray={DASHES[i]} />
  </svg>
{/snippet}

<GeneratorPage name="Enzyme Activity" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="enzymes">
      <div class="head-row">
        <h2 class="card-head">Enzymes</h2>
        <HelpTip id="enzyme-tip" label="Where the data comes from">
          Human enzymes work best at body temperature, about
          37 °C; pepsin at about pH 2, salivary amylase and catalase near pH 7, and trypsin at about pH 8. Taq
          polymerase works best at 75–80 °C (Chien, Edgar and Trela, J. Bacteriol., 1976), in a buffer of about pH
          8.3. Curve widths are estimated, not measured. Substrate curves follow Michaelis–Menten.
        </HelpTip>
      </div>
      <div class="field">
        <span>Rate against</span>
        <div class="segmented" role="radiogroup" aria-label="Rate against">
          {#each GRAPHS as graph}
            <button type="button" role="radio" aria-checked={s.graph === graph} class:on={s.graph === graph} onclick={() => chooseGraph(graph)}>
              {graph === 'substrate' ? 'Substrate' : GRAPH_NAMES[graph]}
            </button>
          {/each}
        </div>
      </div>

      {#each CURVES as i}
        {@const c = curveOf(clean, i)}
        <div class="curve" class:off={!c.show}>
          <label class="check curve-head">
            <input type="checkbox" checked={s[key('show', i)]} onchange={(e) => (s[key('show', i)] = e.currentTarget.checked)} />
            <span><strong>Curve {i + 1}</strong></span>
            {@render sample(i)}
          </label>
          {#if c.show}
            {#if substrate}
              <label class="field">
                <span>Inhibitor</span>
                <select value={c.inhibitor} onchange={(e) => (s[key('inhibitor', i)] = e.currentTarget.value as Inhibitor)}>
                  {#each INHIBITORS as v}<option value={v}>{INHIBITOR_NAMES[v]}</option>{/each}
                </select>
              </label>
            {:else}
              <label class="field">
                <span>Enzyme</span>
                <select value={c.enzyme} onchange={(e) => chooseEnzyme(i, e.currentTarget.value)}>
                  {#each ENZYMES as e}<option value={e.id}>{e.name}</option>{/each}
                  <option value={UNKNOWN}>Unknown enzyme</option>
                </select>
              </label>
              {#if c.enzyme === UNKNOWN}
                <div class="fields">
                  {#if clean.graph === 'ph'}
                    {@render numberField(`opt-${i}`, 'Optimum pH', i, 'pOpt', 0.1, 0, 14)}
                    {@render numberField(`width-${i}`, 'Works ± (pH)', i, 'pWidth', 0.1, 0.5, 7)}
                  {:else}
                    {@render numberField(`opt-${i}`, 'Optimum (°C)', i, 'tOpt', 1, 0, 110)}
                    {@render numberField(`width-${i}`, 'Width (°C)', i, 'tWidth', 1, 2, 40)}
                  {/if}
                </div>
              {/if}
            {/if}
            <label class="field">
              <span>Name</span>
              <input type="text" maxlength="40" placeholder={curveName({ ...clean, [key('name', i)]: '' }, i)} bind:value={s[key('name', i)]} />
            </label>
          {/if}
        </div>
      {/each}

      {#if substrate}
        <label class="range-field">
          <span>Km</span>
          <input type="range" min="0.2" max="5" step="0.1" bind:value={s.km} />
        </label>
        {#if inhibited}
          <label class="range-field">
            <span>Inhibitor strength <span class="hint">Km × {clean.strength} or Vmax ÷ {clean.strength}</span></span>
            <input type="range" min="1.2" max="10" step="0.1" bind:value={s.strength} />
          </label>
        {/if}
      {/if}
      {#if readout.length}
        <ul class="readout">{#each readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Marked" icon={MapPin} summary={markSummary}>
      {#if substrate}
        {@render check('Vmax', s.markVmax, (v) => (s.markVmax = v))}
        {#if s.markVmax}
          <div class="field setting">
            <LabelField name="Vmax label" placeholder="Vmax" bind:mode={s.vmaxLabelMode} bind:text={s.vmaxLabel} />
          </div>
        {/if}
        {@render check('½Vmax and Km', s.markKm, (v) => (s.markKm = v))}
        {#if s.markKm}
          <div class="field setting">
            <span>At the y-axis</span>
            <LabelField name="Half Vmax label" placeholder="½Vmax" bind:mode={s.halfLabelMode} bind:text={s.halfLabel} />
          </div>
          <div class="field setting">
            <span>At the x-axis</span>
            <LabelField name="Km label" placeholder="Km" bind:mode={s.kmLabelMode} bind:text={s.kmLabel} />
          </div>
        {/if}
      {:else}
        {@render check('Optimum', s.markOpt, (v) => (s.markOpt = v))}
        {#if s.markOpt}
          <div class="field setting">
            <LabelField name="Optimum label" placeholder="Optimum" bind:mode={s.optLabelMode} bind:text={s.optLabel} />
          </div>
        {/if}
        {@render check('Denaturation', s.markDen, (v) => (s.markDen = v))}
        {#if s.markDen}
          <div class="field setting">
            <LabelField name="Denaturation label" placeholder="Denatured" bind:mode={s.denLabelMode} bind:text={s.denLabel} />
          </div>
        {/if}
      {/if}
    </Section>

    <Section title="Lines" icon={ChartLine} summary={lineSummary}>
      <div class="segmented setting" role="radiogroup" aria-label="Lines">
        <button type="button" role="radio" aria-checked={s.color} class:on={s.color} onclick={() => (s.color = true)}>Color</button>
        <button type="button" role="radio" aria-checked={!s.color} class:on={!s.color} onclick={() => (s.color = false)}>Black and white</button>
      </div>
      {@render check('Gridlines', s.gridlines, (v) => (s.gridlines = v))}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'Effect of pH on enzyme activity', ...autoTitles(clean.graph) }}
    />

    <Section title="Axes" icon={Axis3d} summary={axesSummary}>
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
    </Section>
    {#if s.gridlines}<GridlineSettings bind:minor={s.minor} />{/if}
  {/snippet}

  {#snippet figure()}
    <EnzymeFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .enzymes { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .hint { font-weight: 400; color: var(--muted); }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .number-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input { width: 100%; min-width: 0; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; }
  .range-field input { width: 100%; accent-color: var(--blue); }
  .curve { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .curve.off { padding-block: 0.5rem; }
  .sample { margin-left: auto; flex: none; }
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
</style>
