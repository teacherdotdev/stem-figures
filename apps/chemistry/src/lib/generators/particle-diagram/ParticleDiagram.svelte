<script lang="ts">
  // Particle Diagram: list the kinds of atoms, ions, molecules and ion
  // clusters, say how many of each, and get a box of them as a gas, liquid
  // or solid; or pick one or two atoms or ions and get them packed in a
  // lattice.
  import { Atom, Dices, Grid3x3, LayoutGrid, List, Plus, Square, Trash2, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import LookSettings from '$shared/particles/LookSettings.svelte'
  import ParticleFigure from './ParticleFigure.svelte'
  import ShapePicker from './ShapePicker.svelte'
  import { LATTICE_PATTERNS, LATTICE_SPACINGS, latticeRoom, type LatticePattern, type LatticeSpacing } from './lattice'
  import { STATES, type State } from '$shared/particles/layout'
  import {
    DEFAULT_OUTER,
    MAX_COUNT,
    MAX_KINDS,
    MAX_NAME,
    afterCount,
    atomKinds,
    describeKind,
    describeLook,
    kindName,
    sameLook,
    type Look,
    type ParticleKind,
  } from '$shared/particles/particles'
  import {
    BORDERS,
    BOXES,
    KEY_LISTS,
    LAYOUTS,
    MAX_ARROW_LABEL,
    MAX_LATTICE,
    MAX_NOTE,
    SHOWS,
    boxContents,
    newSeed,
    particleSettings,
    type Border,
    type Boxes,
    type KeyList,
    type Layout,
    type Show,
  } from './settings'

  const gen = generatorState(particleSettings, 'particle-diagram')
  const s = gen.s
  let svg = $state<SVGSVGElement>()

  const LAYOUT_NAMES: Record<Layout, string> = { scattered: 'In a box', lattice: 'Lattice' }
  const BOXES_NAMES: Record<Boxes, string> = { one: 'One box', two: 'Before and after' }
  const STATE_NAMES: Record<State, string> = { gas: 'Gas', liquid: 'Liquid', solid: 'Solid' }
  const STATE_NOTES: Record<State, string> = {
    gas: 'Spread out at random, for a gas or the particles in a solution.',
    liquid: 'Close together but jumbled, settled at the bottom.',
    solid: 'Packed in rows at the bottom, all turned the same way.',
  }
  const BORDER_NAMES: Record<Border, string> = { single: 'Single', double: 'Double', none: 'None' }
  const SHOW_NAMES: Record<Show, string> = { box: 'Box only', both: 'Box and key', key: 'Key only' }
  const KEY_LIST_NAMES: Record<KeyList, string> = { particles: 'Each particle', atoms: 'Each atom' }
  const PATTERN_NAMES: Record<LatticePattern, string> = {
    pure: 'One kind',
    alternate: 'Alternating',
    substitute: 'Substitutional',
    interstitial: 'Interstitial',
  }
  const PATTERN_NOTES: Record<LatticePattern, string> = {
    pure: 'Every site the same atom, like a pure metal.',
    alternate: 'Two kinds in a checkerboard, like an ionic solid.',
    substitute: 'Some sites swapped for a second kind, like brass.',
    interstitial: 'Small atoms in some of the gaps, like steel.',
  }
  /** What the second part of each pattern is called in the settings. */
  const SECOND_NAMES: Record<LatticePattern, string> = { pure: '', alternate: 'Second', substitute: 'Swapped in', interstitial: 'In the gaps' }
  const SPACING_NAMES: Record<LatticeSpacing, string> = { touching: 'Touching', spaced: 'Spaced' }
  const KEY_EXAMPLES: Record<ReturnType<typeof kindName>, string> = {
    Atom: 'e.g. Ne atom',
    Ion: 'e.g. Any positive ion',
    Molecule: 'e.g. CCl_4 molecule',
    'Ion cluster': 'e.g. NaCl ion pair',
  }

  const box = $derived(boxContents(s))
  const lattice = $derived(s.layout === 'lattice')
  const two = $derived(s.boxes === 'two')
  const stateWord = (st: State) => STATE_NAMES[st].toLowerCase()
  const layoutSummary = $derived(
    lattice ? LAYOUT_NAMES[s.layout] : two ? `Before and after, ${stateWord(s.state)} to ${stateWord(s.afterState)}` : `${LAYOUT_NAMES[s.layout]}, ${stateWord(s.state)}`,
  )
  const counted = $derived(s.pattern === 'substitute' || s.pattern === 'interstitial')
  const particlesSummary = $derived(s.particles.map(describeKind).join(', '))
  const atoms = $derived(atomKinds(s.particles, s.atomNames))
  const keySummary = $derived(SHOW_NAMES[s.show] + (!lattice && s.keyList === 'atoms' ? ', each atom' : ''))
  const latticeSummary = $derived(
    `${PATTERN_NAMES[s.pattern]}, ${s.rows} × ${s.columns}, ${[s.main, ...(s.pattern === 'pure' ? [] : [s.second])].map(describeLook).join(' and ')}`,
  )

  const whole = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

  function setCount(kind: ParticleKind, value: number) {
    if (Number.isFinite(value)) kind.count = whole(value, 0, MAX_COUNT)
  }

  /** An empty name is left out, so the kind is stored as it was before. */
  function setName(kind: ParticleKind, value: string) {
    if (value.trim()) kind.name = value.slice(0, MAX_NAME)
    else delete kind.name
  }

  /** e.g. "Large light gray − ion", for an atom's name field. */
  function atomLabel(atom: ParticleKind) {
    const words = `${describeLook(atom.look)} ${kindName(atom).toLowerCase()}`
    return words[0].toUpperCase() + words.slice(1)
  }

  /** Names are kept only for the atoms the kinds have now, so none linger
   *  in the address. */
  function setAtomName(look: Look, value: string) {
    s.atomNames = atoms.flatMap((atom) => {
      const name = sameLook(atom.look, look) ? value.slice(0, MAX_NAME) : (atom.name ?? '')
      return name.trim() ? [{ look: { ...atom.look }, name }] : []
    })
  }

  function addKind() {
    s.particles.push({ count: 4, shape: 'single', look: { size: 'm', shade: 'white', charge: '' }, outer: { ...DEFAULT_OUTER } })
  }
</script>

{#snippet numberField(label: string, value: number, min: number, max: number, set: (v: number) => void)}
  <label class="number">
    <span>{label}</span>
    <input
      type="number"
      {min}
      {max}
      {value}
      oninput={(e) => Number.isFinite(e.currentTarget.valueAsNumber) && set(whole(e.currentTarget.valueAsNumber, min, max))}
      onchange={(e) => (e.currentTarget.value = String(value))}
    />
  </label>
{/snippet}

{#snippet shuffle()}
  <button type="button" class="btn-ghost small" onclick={() => (s.seed = newSeed())}><Dices size={17} aria-hidden="true" /> Shuffle</button>
{/snippet}

{#snippet stateChoice(label: string, value: State, set: (st: State) => void)}
  <div class="segmented" role="radiogroup" aria-label={label}>
    {#each STATES as st (st)}
      <button type="button" role="radio" aria-checked={value === st} class:on={value === st} onclick={() => set(st)}>
        {STATE_NAMES[st]}
      </button>
    {/each}
  </div>
{/snippet}

{#snippet missing(n: number, where: string)}
  <p class="warning" role="status">
    {n} particle{n === 1 ? ' doesn’t' : 's don’t'} fit in {where}. Try smaller atoms or fewer particles.
  </p>
{/snippet}

<GeneratorPage name="Particle Diagram" filename="particle-diagram" settingsWidth={27} {gen} {svg}>
  {#snippet settings()}
    <Section title="Layout" summary={layoutSummary} icon={LayoutGrid} open>
      <div class="segmented" role="radiogroup" aria-label="Layout">
        {#each LAYOUTS as layout (layout)}
          <button type="button" role="radio" aria-checked={s.layout === layout} class:on={s.layout === layout} onclick={() => (s.layout = layout)}>
            {LAYOUT_NAMES[layout]}
          </button>
        {/each}
      </div>
      {#if lattice}
        <p class="note">Atoms or ions packed in a grid, for a solid.</p>
      {:else}
        <p class="field-label spaced">Boxes</p>
        <div class="segmented" role="radiogroup" aria-label="Boxes">
          {#each BOXES as boxes (boxes)}
            <button type="button" role="radio" aria-checked={s.boxes === boxes} class:on={s.boxes === boxes} onclick={() => (s.boxes = boxes)}>
              {BOXES_NAMES[boxes]}
            </button>
          {/each}
        </div>
        {#if two}
          <p class="note">The same kinds of particle in both, each with a count before and after, for a reaction or a change of state.</p>
          <p class="field-label spaced">Before</p>
          {@render stateChoice('Before state', s.state, (st) => (s.state = st))}
          <p class="field-label spaced">After</p>
          {@render stateChoice('After state', s.afterState, (st) => (s.afterState = st))}
          <label class="key-field">
            <span>Over the arrow</span>
            <input type="text" maxlength={MAX_ARROW_LABEL} placeholder="e.g. heat" bind:value={s.arrowLabel} />
          </label>
        {:else}
          <p class="field-label spaced">State</p>
          {@render stateChoice('State', s.state, (st) => (s.state = st))}
          <p class="note">{STATE_NOTES[s.state]}</p>
        {/if}
      {/if}
    </Section>
    {#if lattice}
      <Section title="Lattice" summary={latticeSummary} icon={Grid3x3} open>
        <p class="field-label">Pattern</p>
        <div class="chips" role="radiogroup" aria-label="Pattern">
          {#each LATTICE_PATTERNS as pattern (pattern)}
            <button type="button" role="radio" aria-checked={s.pattern === pattern} class="chip small" class:on={s.pattern === pattern} onclick={() => (s.pattern = pattern)}>
              {PATTERN_NAMES[pattern]}
            </button>
          {/each}
        </div>
        <p class="note">{PATTERN_NOTES[s.pattern]}</p>
        <div class="numbers">
          {@render numberField('Rows', s.rows, 1, MAX_LATTICE, (v) => (s.rows = v))}
          {@render numberField('Columns', s.columns, 1, MAX_LATTICE, (v) => (s.columns = v))}
          {#if counted}
            {@render numberField(`How many ${SECOND_NAMES[s.pattern].toLowerCase()}`, s.secondCount, 0, latticeRoom(s), (v) => (s.secondCount = v))}
          {/if}
        </div>
        <div class="spacing">
          <div class="segmented" role="radiogroup" aria-label="Spacing">
            {#each LATTICE_SPACINGS as spacing (spacing)}
              <button type="button" role="radio" aria-checked={s.spacing === spacing} class:on={s.spacing === spacing} onclick={() => (s.spacing = spacing)}>
                {SPACING_NAMES[spacing]}
              </button>
            {/each}
          </div>
          {#if counted}{@render shuffle()}{/if}
        </div>
        {#if box.missing && s.show !== 'key'}
          <p class="warning" role="status">There’s only room for {latticeRoom(s)} in this lattice. Add rows or columns, or place fewer.</p>
        {/if}
        <p class="part">{s.pattern === 'pure' ? 'Atom or ion' : 'Main'}</p>
        <LookSettings bind:look={s.main} name="Main" />
        {#if s.pattern !== 'pure'}
          <p class="part">{SECOND_NAMES[s.pattern]}</p>
          <LookSettings bind:look={s.second} name={SECOND_NAMES[s.pattern]} />
        {/if}
      </Section>
    {:else}
      <Section title="Particles" summary={particlesSummary} icon={Atom} open>
        {#each s.particles as kind, i (i)}
          {@const name = `${kindName(kind)} ${i + 1}`}
          <div class="kind">
            <div class="kind-head">
              <strong>{name}</strong>
              {#if !two}
                <label class="number">
                  <span>How many</span>
                  <input
                    type="number"
                    min="0"
                    max={MAX_COUNT}
                    value={kind.count}
                    oninput={(e) => setCount(kind, e.currentTarget.valueAsNumber)}
                    onchange={(e) => (e.currentTarget.value = String(kind.count))}
                  />
                </label>
              {/if}
              {#if s.particles.length > 1}
                <button type="button" class="icon-btn" aria-label="Remove {name}" data-tip="Remove" onclick={() => s.particles.splice(i, 1)}>
                  <Trash2 size={17} />
                </button>
              {/if}
            </div>
            {#if two}
              <div class="numbers counts">
                {@render numberField('Before', kind.count, 0, MAX_COUNT, (v) => (kind.count = v))}
                {@render numberField('After', afterCount(kind), 0, MAX_COUNT, (v) => (kind.after = v))}
              </div>
            {/if}
            <ShapePicker bind:shape={kind.shape} {name} />
            {#if kind.shape === 'single'}
              <LookSettings bind:look={kind.look} {name} />
            {:else}
              <p class="part">Center</p>
              <LookSettings bind:look={kind.look} name="{name} center" />
              <p class="part">Outer</p>
              <LookSettings bind:look={kind.outer} name="{name} outer" />
            {/if}
          </div>
        {/each}
        <div class="actions">
          {#if s.particles.length < MAX_KINDS}
            <button type="button" class="btn-ghost small" onclick={addKind}><Plus size={17} aria-hidden="true" /> Add a kind</button>
          {/if}
          {@render shuffle()}
        </div>
        {#if s.show !== 'key'}
          {#if box.missing}{@render missing(box.missing, box.after ? 'the before box' : 'the box')}{/if}
          {#if box.after?.missing}{@render missing(box.after.missing, 'the after box')}{/if}
        {/if}
      </Section>
    {/if}
    <Section title="Key" summary={keySummary} icon={List}>
      <p class="field-label">Show</p>
      <div class="segmented" role="radiogroup" aria-label="Show">
        {#each SHOWS as show (show)}
          <button type="button" role="radio" aria-checked={s.show === show} class:on={s.show === show} onclick={() => (s.show = show)}>
            {SHOW_NAMES[show]}
          </button>
        {/each}
      </div>
      {#if lattice}
        <label class="key-field">
          <span>{s.pattern === 'pure' ? 'Name' : 'Main name'}</span>
          <input type="text" maxlength={MAX_NAME} placeholder={s.main.charge ? 'e.g. Cl^- ion' : 'e.g. Cu atom'} bind:value={s.mainName} />
        </label>
        {#if s.pattern !== 'pure'}
          <label class="key-field">
            <span>{SECOND_NAMES[s.pattern]} name</span>
            <input type="text" maxlength={MAX_NAME} placeholder={s.second.charge ? 'e.g. Na^+ ion' : 'e.g. Zn atom'} bind:value={s.secondName} />
          </label>
        {/if}
      {:else}
        <p class="field-label spaced">List</p>
        <div class="segmented" role="radiogroup" aria-label="List">
          {#each KEY_LISTS as list (list)}
            <button type="button" role="radio" aria-checked={s.keyList === list} class:on={s.keyList === list} onclick={() => (s.keyList = list)}>
              {KEY_LIST_NAMES[list]}
            </button>
          {/each}
        </div>
        {#if s.keyList === 'atoms'}
          <p class="note">Each different atom once, for students to write formulas from.</p>
          {#each atoms as atom, i (i)}
            <label class="key-field">
              <span>{atomLabel(atom)} name</span>
              <input
                type="text"
                maxlength={MAX_NAME}
                placeholder={atom.look.charge ? 'e.g. Na^+ ion' : 'e.g. H atom'}
                value={atom.name ?? ''}
                oninput={(e) => setAtomName(atom.look, e.currentTarget.value)}
              />
            </label>
          {/each}
        {:else}
          {#each s.particles as kind, i (i)}
            <label class="key-field">
              <span>{kindName(kind)} {i + 1} name</span>
              <input type="text" maxlength={MAX_NAME} placeholder={KEY_EXAMPLES[kindName(kind)]} value={kind.name ?? ''} oninput={(e) => setName(kind, e.currentTarget.value)} />
            </label>
          {/each}
        {/if}
      {/if}
      <label class="key-field">
        <span>Note</span>
        <input type="text" maxlength={MAX_NOTE} placeholder="e.g. H_2O molecules are not shown" bind:value={s.keyNote} />
      </label>
      <p class="note">Type _ for a subscript and ^ for a superscript: H_2O, SO_4^{'{'}2-{'}'}.</p>
    </Section>
    <Section title="Box" summary="{BORDER_NAMES[box.border]} border" icon={Square}>
      <p class="field-label">Border</p>
      <div class="segmented" role="radiogroup" aria-label="Border">
        {#each BORDERS as border (border)}
          <button
            type="button"
            role="radio"
            aria-checked={box.border === border}
            class:on={box.border === border}
            onclick={() => (lattice ? (s.latticeBorder = border) : (s.border = border))}
          >
            {BORDER_NAMES[border]}
          </button>
        {/each}
      </div>
      <p class="note">{lattice ? 'The box fits the lattice.' : 'The box is always the same size, so answer choices line up.'}</p>
    </Section>
    <Section title="Chart title" summary={s.titleMode === 'text' && s.title ? `“${s.title}”` : 'No title'} icon={Type}>
      <LabelField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. Which shows NaCl(aq)?" blank={false} />
    </Section>
  {/snippet}
  {#snippet figure()}
    <ParticleFigure settings={s} {box} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .kind { padding: 0.8rem 0; border-bottom: 1px solid var(--border); }
  .kind:first-child { padding-top: 0.35rem; }
  .kind-head { display: flex; align-items: center; gap: 0.75rem; }
  .kind-head strong { flex: 1; font-size: 0.92rem; white-space: nowrap; }
  .part { margin: 0.9rem 0 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
  .number { display: flex; align-items: center; gap: 0.45rem; font-size: 0.84rem; color: var(--muted); }
  .number input { width: 4.2rem; font-variant-numeric: tabular-nums; }
  .numbers { display: flex; flex-wrap: wrap; gap: 0.6rem 1.1rem; margin-top: 0.8rem; }
  .numbers.counts { margin-top: 0.55rem; }
  .spacing { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.8rem; }
  .spacing .segmented { flex: 1; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
  .small { padding: 0.5rem 0.85rem; font-size: 0.9rem; }
  .chip.small { padding: 0.35rem 0.75rem; font-size: 0.86rem; }
  .note { margin: 0.5rem 0 0; color: var(--muted); font-size: 0.82rem; }
  .warning { margin: 0.75rem 0 0; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--red-soft); color: #991b1b; font-size: 0.85rem; }
  .field-label { margin: 0 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
  .field-label.spaced { margin-top: 0.9rem; }
  .key-field { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.85rem; font-size: 0.9rem; font-weight: 700; }
  .key-field input { font-weight: 400; }
</style>
