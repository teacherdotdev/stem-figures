<script lang="ts">
  // Osmosis and Tonicity: a red blood cell or a plant cell in a solution, a
  // beaker split by a membrane, a U-tube or a dialysis bag in a beaker, with
  // up to three solutes drawn as particles in proportion to their
  // concentrations, water as small discs, and arrows for where water and any
  // solute that can cross move. Tonicity is worked out, never typed. Shows
  // the start, the result, both, or a cell in three solutions side by side.
  import { Atom, Dices, MoveRight, Palette, Shuffle, Tag, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import LookSettings from '$shared/particles/LookSettings.svelte'
  import { plainText } from '$shared/particles/keyText'
  import type { Look } from '$shared/particles/particles'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import OsmosisFigure from './OsmosisFigure.svelte'
  import { answerLines, buildOsmosis, soluteName } from './figure'
  import { amount, panelsOf } from './model'
  import {
    ARROW_MODES, LABEL_MODES, MAX_CONCENTRATION, MAX_NAME, ORDERS, SCENES, SCENE_NAMES, SOLUTE_SLOTS, THREE_SHOWS, UNITS, VIEWS,
    isCell, membraneName, newSeed, osmosisSettings, soluteOf, twoSided, type SoluteIndex,
  } from './settings'

  const gen = generatorState(osmosisSettings, 'osmosis')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const cell = $derived(isCell(clean.scene))
  const three = $derived(clean.view === 'three')
  const fig = $derived(buildOsmosis(clean))
  const answers = $derived(answerLines(clean))

  const VIEW_NAMES = { start: 'Start', result: 'Result', both: 'Both', three: 'Three-up' }
  const THREE_NAMES = { result: 'Results', start: 'Starts' }
  const ORDER_NAMES = { 'in-order': 'In order', shuffled: 'Shuffled' }
  const LABEL_NAMES = { text: 'Text', blank: 'Blank', none: 'None' }
  const ARROW_NAMES = { show: 'Arrows', blank: 'Blank boxes', none: 'None' }

  /** What the two concentration boxes are called for the scene. */
  const sides = $derived(
    twoSided(clean.scene) ? ['Side A', 'Side B'] : clean.scene === 'bag' ? ['In the bag', 'In the beaker'] : ['Inside', 'Outside'],
  )

  const key = <K extends string>(name: K, i: SoluteIndex) => `${name}${i + 1}` as `${K}${1 | 2 | 3}`
  /** A solute's look as one object for the look pickers, which set its size, shade and charge in place. */
  const lookOf = (i: SoluteIndex): Look => ({
    get size() { return s[key('size', i)] },
    set size(v) { s[key('size', i)] = v },
    get shade() { return s[key('shade', i)] },
    set shade(v) { s[key('shade', i)] = v },
    get charge() { return s[key('charge', i)] },
    set charge(v) { s[key('charge', i)] = v },
  })
  const on = $derived(SOLUTE_SLOTS.filter((i) => s[key('on', i)]))

  /** One solute particle stands for this much, in a space the size of the inside. */
  const scaleText = $derived(amount(fig.scale, clean.unit))
  const readout = $derived(three ? answers : answers.slice(0, -1))

  const particleSummary = $derived(
    [clean.water ? 'Water shown' : 'No water', ...on.map((i) => plainText(soluteName(soluteOf(clean, i))))].join(', '),
  )
  const labelSummary = $derived(
    [
      clean.concMode !== 'none' && 'concentrations',
      clean.tonicityMode !== 'none' && 'tonicity',
      clean.membraneMode !== 'none' && 'membrane',
      clean.scene === 'plant' && clean.partsMode !== 'none' && 'cell parts',
      clean.stateMode !== 'none' && 'result',
    ]
      .filter(Boolean)
      .join(', ')
      .replace(/^./, (c) => c.toUpperCase()) || 'No labels',
  )
  const arrowSummary = $derived(`Water ${ARROW_NAMES[clean.waterArrows].toLowerCase()}, solutes ${ARROW_NAMES[clean.soluteArrows].toLowerCase()}`)
  const lookSummary = $derived([clean.color ? 'Color' : 'Black and white', clean.key ? 'key' : 'no key'].join(', '))
  const textSummary = $derived(
    [clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title', clean.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : `osmosis-${clean.scene}`)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'osmosis',
  )
  /** The three-up's concentrations outside, from the inside's. */
  const threeOutside = $derived(panelsOf({ ...clean, order: 'in-order' }))
</script>

{#snippet segmented(name: string, options: readonly string[], names: Record<string, string>, value: string, set: (v: any) => void, off?: (v: string) => boolean)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} disabled={off?.(option)} onclick={() => set(option)}>
        {names[option]}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet check(label: string, value: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" checked={value} onchange={(e) => set(e.currentTarget.checked)} />
    <span>{label}</span>
  </label>
{/snippet}

{#snippet modes(name: string, value: string, set: (v: any) => void)}
  <div class="field setting">
    <span>{name}</span>
    {@render segmented(name, LABEL_MODES, LABEL_NAMES, value, set)}
  </div>
{/snippet}

<GeneratorPage name="Osmosis and Tonicity" {filename} {gen} {svg} settingsWidth={26}>
  {#snippet inputs()}
    <section class="scene">
      <div class="head-row">
        <h2 class="card-head">Scene</h2>
        <HelpTip id="osmosis-tip" label="How the figure is worked out">
          Tonicity is worked out from the concentrations, counting only solutes that can’t cross the membrane. Water moves
          from the hypotonic side to the hypertonic side; a solute that can cross moves from higher to lower until it’s the
          same on both sides. Particles are drawn as crowded as their concentration. A three-up puts the same cell in half,
          the same and double its inside’s concentrations.
        </HelpTip>
      </div>
      <label class="field">
        <span>Scene</span>
        <select bind:value={s.scene}>
          {#each SCENES as scene (scene)}<option value={scene}>{SCENE_NAMES[scene]}</option>{/each}
        </select>
      </label>
      <div class="field">
        <span>Show</span>
        {@render segmented('Show', VIEWS, VIEW_NAMES, clean.view, (v) => (s.view = v), (v) => v === 'three' && !cell)}
      </div>
      {#if three}
        <div class="fields">
          {@render segmented('Each cell shows', THREE_SHOWS, THREE_NAMES, s.threeShows, (v) => (s.threeShows = v))}
          <div class="order">
            {@render segmented('Order', ORDERS, ORDER_NAMES, s.order, (v) => (s.order = v))}
            {#if s.order === 'shuffled'}
              <button type="button" class="icon-btn" aria-label="Shuffle the order" data-tip="Shuffle the order" onclick={() => (s.orderSeed = newSeed())}>
                <Shuffle size={17} />
              </button>
            {/if}
          </div>
        </div>
      {/if}
      <div class="field">
        <span>Concentrations in</span>
        {@render segmented('Unit', UNITS, { '%': '%', M: 'M', mM: 'mM' }, s.unit, (v) => (s.unit = v))}
      </div>

      {#each SOLUTE_SLOTS as i (i)}
        {@const x = soluteOf(clean, i)}
        <div class="solute" class:off={!x.on}>
          <label class="check head">
            <input type="checkbox" checked={s[key('on', i)]} onchange={(e) => (s[key('on', i)] = e.currentTarget.checked)} />
            <span><strong>Solute {i + 1}</strong></span>
          </label>
          {#if x.on}
            <label class="field">
              <span>Name</span>
              <input type="text" maxlength={MAX_NAME} placeholder="e.g. C_6H_12O_6" bind:value={s[key('name', i)]} />
            </label>
            <div class="fields">
              <label class="field">
                <span>{sides[0]} ({clean.unit})</span>
                <input type="number" min="0" max={MAX_CONCENTRATION} step="any" bind:value={s[key('in', i)]} />
              </label>
              {#if three}
                <div class="field">
                  <span>{sides[1]} ({clean.unit})</span>
                  <p class="worked">{threeOutside.map((p) => amount(p.solutes.find((y) => y.index === i)?.outside ?? 0, clean.unit)).join(', ')}</p>
                </div>
              {:else}
                <label class="field">
                  <span>{sides[1]} ({clean.unit})</span>
                  <input type="number" min="0" max={MAX_CONCENTRATION} step="any" bind:value={s[key('out', i)]} />
                </label>
              {/if}
            </div>
            {@render check('Can cross the membrane', s[key('cross', i)], (v) => (s[key('cross', i)] = v))}
          {/if}
        </div>
      {/each}

      <button type="button" class="btn-ghost shuffle" onclick={() => (s.seed = newSeed())}>
        <Dices size={18} aria-hidden="true" />Shuffle particles
      </button>
      {#if fig.missing}
        <p class="problem">{fig.missing} solute particle{fig.missing === 1 ? '' : 's'} didn’t fit. Try smaller particles or lower concentrations.</p>
      {/if}
      <ul class="readout">
        {#each readout as line (line)}<li>{line}</li>{/each}
        {#if on.length}<li class="scale">1 particle ≈ {scaleText}</li>{/if}
      </ul>
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Particles" icon={Atom} summary={particleSummary}>
      {@render check('Water particles', s.water, (v) => (s.water = v))}
      {#each on as i (i)}
        <div class="look">
          <p class="field-label">{plainText(soluteName(soluteOf(clean, i)))}</p>
          <LookSettings name={plainText(soluteName(soluteOf(clean, i)))} look={lookOf(i)} />
        </div>
      {/each}
    </Section>

    <Section title="Labels" icon={Tag} summary={labelSummary}>
      {@render modes('Concentrations', s.concMode, (v) => (s.concMode = v))}
      {@render modes('Tonicity', s.tonicityMode, (v) => (s.tonicityMode = v))}
      <div class="field setting">
        <span>Membrane</span>
        <LabelField name="Membrane label" placeholder={membraneName({ ...clean, membrane: '' })} bind:mode={s.membraneMode} bind:text={s.membrane} />
      </div>
      {#if clean.scene === 'plant'}
        {@render modes('Cell wall and vacuole', s.partsMode, (v) => (s.partsMode = v))}
      {/if}
      {@render modes('Result', s.stateMode, (v) => (s.stateMode = v))}
    </Section>

    <Section title="Arrows" icon={MoveRight} summary={arrowSummary}>
      <div class="field setting">
        <span>Water</span>
        {@render segmented('Water arrows', ARROW_MODES, ARROW_NAMES, s.waterArrows, (v) => (s.waterArrows = v))}
      </div>
      <div class="field setting">
        <span>Solutes that cross</span>
        {@render segmented('Solute arrows', ARROW_MODES, ARROW_NAMES, s.soluteArrows, (v) => (s.soluteArrows = v))}
      </div>
    </Section>

    <Section title="Look" icon={Palette} summary={lookSummary}>
      <div class="segmented setting" role="radiogroup" aria-label="Look">
        <button type="button" role="radio" aria-checked={s.color} class:on={s.color} onclick={() => (s.color = true)}>Color</button>
        <button type="button" role="radio" aria-checked={!s.color} class:on={!s.color} onclick={() => (s.color = false)}>Black and white</button>
      </div>
      {@render check('Key', s.key, (v) => (s.key = v))}
      {#if clean.scene === 'blood'}
        {@render check('A red blood cell bursts in a hypotonic solution', s.burst, (v) => (s.burst = v))}
      {/if}
    </Section>

    <Section title="Chart title and answer key" icon={Type} summary={textSummary}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answers.join(' · ')} />
    </Section>
  {/snippet}

  {#snippet figure()}
    <OsmosisFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .scene { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .field input, .field select { font-weight: 400; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; align-items: start; }
  .order { display: flex; align-items: center; gap: 0.3rem; }
  .order :global(.segmented) { flex: 1; }
  .solute { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.7rem 0.75rem; border: 1px solid var(--border); border-radius: 10px; }
  .solute.off { padding-block: 0.5rem; }
  .worked { margin: 0; padding: 0.5rem 0; font-weight: 400; font-size: 0.85rem; }
  .shuffle { width: 100%; padding: 0.55rem 1rem; font-size: 0.92rem; }
  .problem { margin: 0; font-size: 0.84rem; color: #b45309; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .readout .scale { font-weight: 400; }
  .setting { margin-bottom: 0.75rem; }
  .field-label { margin: 0.6rem 0 0; font-weight: 700; font-size: 0.88rem; }
  .look + .look { margin-top: 0.4rem; padding-top: 0.6rem; border-top: 1px solid var(--border); }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .solute .check { margin: 0; }
  .check.head { align-items: center; }
  .check.head input { margin: 0; }
</style>
