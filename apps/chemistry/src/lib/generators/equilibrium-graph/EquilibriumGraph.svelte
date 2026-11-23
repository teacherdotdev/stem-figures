<script lang="ts">
  // Equilibrium Graph: pick a reaction setup, type where it starts and its
  // K, and get every species' concentration against time, settling to
  // equilibrium and then answering up to three stresses (a species added or
  // removed, the volume changed, the temperature raised or lowered). The
  // page solves every line from K; nothing is drawn from typed levels. The
  // grid and axes are $shared/graph's, the same as Half-Life Graph's.
  import { Maximize, Plus, Spline, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import AxisSettings from '$shared/graph/AxisSettings.svelte'
  import GridlineSettings from '$shared/graph/GridlineSettings.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import { readAxes } from '$shared/graph/axes'
  import { COLORS } from '$shared/graph/colors'
  import Section from '$shared/Section.svelte'
  import { SPECIES_DASHES, concentrationOf, concentrationTitle, formulaText, timeTitle } from '$lib/shared/concentration'
  import EquilibriumFigure from './EquilibriumFigure.svelte'
  import { answerLines, buildEquilibrium, fittedAxes } from './figure'
  import { MADE_UP, REACTIONS, equationText, reactionOf, type ReactionId } from './reactions'
  import {
    AMOUNT_DEFAULTS, HEATS, KINDS, KIND_NAMES, MAX_STRESSES, SLOTS, equilibriumSettings, heatOf, kFactorOf, setupFields, stressIn,
    type Kind, type Slot,
  } from './settings'

  const gen = generatorState(equilibriumSettings, 'equilibrium-graph')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const axes = $derived(readAxes(clean))
  const g = $derived(buildEquilibrium(clean))
  const reaction = $derived(reactionOf(clean.reaction))
  const heat = $derived(heatOf(clean))
  let svg = $state<SVGSVGElement>()

  const key = <K extends string>(name: K, i: Slot) => `s${i + 1}${name}` as `s${1 | 2 | 3}${K}`
  const starts = ['start1', 'start2', 'start3'] as const
  const ink = (i: number) => (clean.color ? COLORS[(['blue', 'red', 'green'] as const)[i]] : COLORS.black)

  /** Axes that just fit the graph, counting in tidy steps. */
  function fitAxes() {
    Object.assign(s, fittedAxes(gen.snapshot()))
  }

  /** The stresses' words, if they're still ones this page wrote, follow the stress. */
  function reword() {
    const now = gen.snapshot()
    for (const i of SLOTS) Object.assign(s, { [key('Text', i)]: now[key('Text', i)], [key('Species', i)]: now[key('Species', i)] })
  }

  // A volume stress's words follow its factor as it's typed ("Volume halved", "Volume doubled").
  $effect(() => {
    for (const i of SLOTS) if (s[key('Text', i)] !== clean[key('Text', i)]) s[key('Text', i)] = clean[key('Text', i)]
  })

  /** A setup brings its example starting concentrations and K, and the axes are fitted to it. */
  function chooseReaction(id: ReactionId) {
    if (id === clean.reaction) return
    Object.assign(s, setupFields(id))
    reword()
    fitAxes()
  }

  function chooseKind(i: Slot, kind: Kind) {
    if (kind === clean[key('Kind', i)]) return
    Object.assign(s, { [key('Kind', i)]: kind, [key('Amount', i)]: AMOUNT_DEFAULTS[kind] })
    reword()
  }

  /** A new stress comes after the one before it has had time to settle. */
  function addStress() {
    const i = clean.count as Slot
    const before = i ? clean[key('At', (i - 1) as Slot)] : 0
    if (clean[key('At', i)] <= before) Object.assign(s, { [key('At', i)]: before + 2 * clean.established })
    s.count = Math.min(MAX_STRESSES, clean.count + 1)
    reword()
    fitAxes()
  }

  /** The stresses after it move up a slot. */
  function removeStress(i: Slot) {
    for (let j = i; j < clean.count - 1; j++) {
      for (const f of ['Kind', 'At', 'Species', 'Amount', 'Text'] as const) Object.assign(s, { [key(f, j as Slot)]: clean[key(f, (j + 1) as Slot)] })
    }
    s.count = clean.count - 1
    fitAxes()
  }

  const answer = $derived(answerLines(clean))
  const lineSummary = $derived([clean.speciesLabels ? 'Formulas shown' : 'Formulas hidden', clean.color ? 'color' : 'black and white'].join(' · '))
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `equilibrium-graph-${reaction.id}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'equilibrium-graph',
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
    <line x1="0" y1="5" x2="30" y2="5" stroke={ink(i)} stroke-width="3" stroke-dasharray={SPECIES_DASHES[i]} />
  </svg>
{/snippet}

<GeneratorPage name="Equilibrium Graph" {filename} {gen} {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="reaction">
      <h2 class="card-head">Reaction</h2>

      <select aria-label="Reaction" value={s.reaction} onchange={(e) => chooseReaction(e.currentTarget.value as ReactionId)}>
        {#each REACTIONS as x}<option value={x.id}>{equationText(x)}{x.id === MADE_UP ? ' (made up)' : ''}</option>{/each}
      </select>

      <div class="starts">
        {#each reaction.species as sp, i (i)}
          <label class="number-field">
            <span class="start-name">{@render sample(i)} {concentrationOf(sp.formula)} at the start</span>
            <input type="number" step="any" min="0" bind:value={s[starts[i]]} aria-label="{concentrationOf(sp.formula)} at the start, in mol/L" />
          </label>
        {/each}
      </div>

      <div class="fields">
        <label class="number-field">
          <span>K</span>
          <input type="number" step="any" min="0" bind:value={s.k} aria-describedby="k-note" />
        </label>
        <label class="number-field">
          <span>Equilibrium established at time</span>
          <input type="number" step="any" min="0" bind:value={s.established} />
        </label>
      </div>
      <p class="note" id="k-note">
        {#if clean.reaction === MADE_UP}
          Any K: this reaction is made up.
        {:else}
          Example value, chosen to give a clear graph. It is not this reaction’s measured K.
        {/if}
      </p>

      {#if clean.reaction === MADE_UP}
        {@render segmented('The forward reaction is', HEATS, { exothermic: 'Exothermic', endothermic: 'Endothermic' }, s.heat, (v) => (s.heat = v))}
      {:else}
        <p class="note">The forward reaction is {heat}{reaction.evidence ? `: ${reaction.evidence}` : ''}.</p>
      {/if}

      {#each SLOTS.slice(0, clean.count) as i (i)}
        {@const kind = clean[key('Kind', i)]}
        {@const d = stressIn(clean, i)}
        <div class="stress">
          <div class="stress-head">
            <strong>Stress {i + 1}</strong>
            <button type="button" class="icon-btn" aria-label="Remove stress {i + 1}" onclick={() => removeStress(i)}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div class="fields wide">
            <label class="number-field">
              <span>What happens</span>
              <select aria-label="What happens in stress {i + 1}" value={kind} onchange={(e) => chooseKind(i, e.currentTarget.value as Kind)}>
                {#each KINDS as k}<option value={k}>{k === 'volume' && reaction.phase === 'aqueous' ? 'Add or evaporate water' : KIND_NAMES[k]}</option>{/each}
              </select>
            </label>
            <label class="number-field">
              <span>At time</span>
              <input type="number" step="any" min="0" bind:value={s[key('At', i)]} />
            </label>
          </div>
          <div class="fields">
            {#if kind === 'add' || kind === 'remove'}
              <label class="number-field">
                <span>Which one</span>
                <select value={clean[key('Species', i)]} onchange={(e) => { s[key('Species', i)] = Number(e.currentTarget.value); reword() }}>
                  {#each reaction.species as sp, j (j)}<option value={j + 1}>{formulaText(sp.formula)}</option>{/each}
                </select>
              </label>
              <label class="number-field">
                <span>mol/L {kind === 'add' ? 'added' : 'removed'}</span>
                <input type="number" step="any" min="0" bind:value={s[key('Amount', i)]} />
              </label>
            {:else if kind === 'volume'}
              <label class="number-field">
                <span>Volume × (0.5 halves it)</span>
                <input type="number" step="any" min="0.1" max="10" bind:value={s[key('Amount', i)]} />
              </label>
            {:else}
              <label class="number-field">
                <span>K is {kFactorOf(heat, d) >= 1 ? 'multiplied' : 'divided'} by</span>
                <input type="number" step="any" min="1" bind:value={s[key('Amount', i)]} />
              </label>
            {/if}
          </div>
          <label class="field">
            <span>Words on the graph</span>
            <input type="text" maxlength="40" placeholder="None: students say what happened" bind:value={s[key('Text', i)]} />
          </label>
        </div>
      {/each}
      {#if clean.count < MAX_STRESSES}
        <button type="button" class="btn-ghost small add" onclick={addStress}>
          <Plus size={16} aria-hidden="true" /> Add a stress
        </button>
      {/if}

      {#if answer.length}
        <ul class="readout">{#each answer as line}<li>{line}</li>{/each}</ul>
      {/if}
      {#each g.notes as note}<p class="problem">{note}</p>{/each}
      <button type="button" class="btn-ghost small fit" onclick={fitAxes}>
        <Maximize size={16} aria-hidden="true" /> Fit the axes to the graph
      </button>
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Lines" icon={Spline} summary={lineSummary}>
      {@render check('Each line’s formula beside it', s.speciesLabels, (v) => (s.speciesLabels = v))}
      <div class="setting">{@render segmented('Lines', ['color', 'bw'] as const, { color: 'Color', bw: 'Black and white' }, s.color ? 'color' : 'bw', (v) => (s.color = v === 'color'))}</div>
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: equationText(reaction), xTitle: timeTitle('min'), yTitle: concentrationTitle() }}
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
    <EquilibriumFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .reaction { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: end; }
  .fields.wide { grid-template-columns: 3fr 2fr; }
  .starts { display: flex; flex-direction: column; gap: 0.5rem; }
  .starts .number-field { flex-direction: row; align-items: center; justify-content: space-between; gap: 0.6rem; }
  .starts .number-field input { width: 7rem; flex: none; }
  .start-name { display: inline-flex; align-items: center; gap: 0.5rem; }
  .number-field { display: flex; flex-direction: column; justify-content: flex-end; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .number-field input, .number-field select { width: 100%; min-width: 0; }
  .note { margin: -0.3rem 0 0; color: var(--muted); font-size: 0.82rem; }
  .stress { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .stress-head { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; min-height: 1.75rem; }
  .stress-head strong { margin-right: auto; }
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
