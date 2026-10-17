<script lang="ts">
  // Nuclide Notation: an element, your own symbol or a nuclear particle,
  // with its mass number, atomic number and charge placed around it as
  // they're typeset, any of them blank for students, or hyphen notation
  // (carbon-14). Only the atomic number, mass number and charge are stored;
  // the protons, neutrons and electrons boxes set them too (CONTEXT.md
  // "Nuclide notation").
  import { LayoutGrid, PenLine, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import { ELEMENTS, MAX_Z, element } from '../bohr-model/elements'
  import { buildFigure } from './figure'
  import NuclideFigure from './NuclideFigure.svelte'
  import { PARTICLES, PARTICLE_INFO, SYMBOL_TEXT, type Particle } from './particles'
  import {
    BLANKS,
    FONTS,
    HYPHEN_NAMES,
    KINDS,
    MAX_CHARGE,
    MAX_MASS,
    MAX_SYMBOL,
    MIN_CHARGE,
    NOTATIONS,
    SHOWS,
    SIZES,
    countsOf,
    fileName,
    fromCounts,
    naturalIsotopes,
    notationOf,
    nuclideSettings,
    positionUsed,
    unnaturalNote,
    withElement,
    withNumbers,
    type Kind,
    type Show,
  } from './settings'

  const gen = generatorState(nuclideSettings, 'nuclide-notation')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const KIND_NAMES: Record<Kind, string> = { element: 'Element', custom: 'Own symbol', particle: 'Particle' }
  const SHOW_NAMES: Record<Show, string> = { shown: 'Shown', blank: 'Blank', off: 'Off' }
  const POSITIONS = [
    { key: 'massPart', position: 'mass', name: 'Mass number' },
    { key: 'zPart', position: 'z', name: 'Atomic number' },
    { key: 'symbolPart', position: 'symbol', name: 'Symbol' },
    { key: 'chargePart', position: 'charge', name: 'Charge' },
  ] as const
  const NOTATION_NAMES = { symbol: 'Symbol', hyphen: 'Hyphen', both: 'Both' }
  const BLANK_NAMES = { box: 'Box', line: 'Line' }
  const FONT_NAMES = { sans: 'Sans serif', serif: 'Serif' }
  const SIZE_NAMES = { small: 'Small', medium: 'Medium', large: 'Large' }

  const named = $derived(clean.kind === 'element' ? element(clean.z) : undefined)
  const counts = $derived(countsOf(clean))
  const natural = $derived(clean.kind === 'element' ? naturalIsotopes(clean.z) : undefined)
  const note = $derived(unnaturalNote(clean))
  const particle = $derived(PARTICLE_INFO[clean.particle])
  const notation = $derived(notationOf(clean))
  /** It prints at a point per pixel, so the text size sets how big it prints
   *  rather than every symbol filling the page (FigureFrame pads 16 a side). */
  const printWidth = $derived((buildFigure(clean).width + 32) / 72)

  /** Why the last number typed wasn't taken; it changed nothing. */
  let refused = $state('')

  /** Tries new numbers; only numbers a nuclide can have are taken. */
  function tryNumbers(change: Partial<{ z: number; mass: number; charge: number }>, explain: boolean) {
    const { settings, problem } = withNumbers(clean, change)
    if (problem) {
      if (explain) refused = problem
      return false
    }
    Object.assign(s, { z: settings.z, mass: settings.mass, charge: settings.charge })
    refused = ''
    return true
  }

  const whole = (input: HTMLInputElement) => (Number.isInteger(input.valueAsNumber) ? input.valueAsNumber : undefined)

  function chooseKind(kind: Kind) {
    s.kind = kind
    refused = ''
  }

  function chooseElement(z: number) {
    Object.assign(s, withElement(clean, z))
    refused = ''
  }

  function chooseParticle(p: Particle) {
    s.particle = p
    s.particleSymbol = PARTICLE_INFO[p].symbols[0]
  }

  const positionSummary = $derived(
    (() => {
      const used = POSITIONS.filter((p) => positionUsed(clean, p.position))
      const changed = used.filter((p) => clean[p.key] !== 'shown')
      if (!changed.length) return 'All shown'
      return changed.map((p) => `${p.name} ${SHOW_NAMES[clean[p.key]].toLowerCase()}`).join(', ')
    })(),
  )
  const styleSummary = $derived(
    [
      notation === 'both' ? 'Symbol and hyphen' : `${NOTATION_NAMES[notation]} notation`,
      FONT_NAMES[clean.font].toLowerCase(),
      `${SIZE_NAMES[clean.size].toLowerCase()} text`,
    ].join(', '),
  )
  const textSummary = $derived(
    [clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title', clean.answerKey ? 'answer key' : ''].filter(Boolean).join(', '),
  )
</script>

{#snippet segmented<T extends string>(label: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={label}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} onclick={() => set(option)}>{names[option]}</button>
    {/each}
  </div>
{/snippet}

{#snippet numberBox(label: string, value: number, min: number, max: number, change: (v: number) => Partial<{ z: number; mass: number; charge: number }>)}
  <label class="field">
    <span>{label}</span>
    <input
      type="number"
      {min}
      {max}
      step="1"
      {value}
      oninput={(e) => {
        const v = whole(e.currentTarget)
        if (v !== undefined) tryNumbers(change(v), false)
      }}
      onchange={(e) => {
        const v = whole(e.currentTarget)
        if (v === undefined || !tryNumbers(change(v), true)) e.currentTarget.value = String(value)
      }}
    />
  </label>
{/snippet}

{#snippet check(label: string, checked: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" {checked} onchange={(e) => set(e.currentTarget.checked)} />
    <span>{label}</span>
  </label>
{/snippet}

<GeneratorPage name="Nuclide Notation" filename={fileName(clean)} {gen} {svg} {printWidth} settingsWidth={26}>
  {#snippet inputs()}
    <section class="nuclide">
      <div class="head-row">
        <h2 class="card-head">Nuclide</h2>
        <HelpTip id="nuclide-tip" label="How the numbers fit together">
          The atomic number is the protons, the mass number is the protons plus the neutrons, and the charge is the protons
          minus the electrons, so the three particle boxes set the same numbers. A mass number below the atomic number isn’t
          taken. Your own symbol, such as X, is for “identify the element” questions. A particle’s bottom number is its charge,
          as in decay equations.
        </HelpTip>
      </div>
      {@render segmented('Draw', KINDS, KIND_NAMES, s.kind, chooseKind)}

      {#if clean.kind === 'element'}
        <label class="field">
          <span>Element</span>
          <select value={String(clean.z)} onchange={(e) => chooseElement(Number(e.currentTarget.value))}>
            {#each ELEMENTS as el (el.z)}
              <option value={String(el.z)}>{el.z} {el.symbol} – {el.name}</option>
            {/each}
          </select>
        </label>
        <div class="fields two">
          {@render numberBox('Mass number', clean.mass, clean.z, MAX_MASS, (mass) => ({ mass }))}
          {@render numberBox('Charge', clean.charge, MIN_CHARGE, Math.min(MAX_CHARGE, clean.z), (charge) => ({ charge }))}
        </div>
        {#if natural && named}
          <div class="chips" role="group" aria-label="Natural isotopes">
            {#each natural as mass (mass)}
              <button type="button" class="chip" class:on={clean.mass === mass} aria-pressed={clean.mass === mass} onclick={() => tryNumbers({ mass }, true)}>
                {named.symbol}-{mass}
              </button>
            {/each}
          </div>
        {/if}
      {:else if clean.kind === 'custom'}
        <div class="fields three">
          <label class="field">
            <span>Symbol</span>
            <input type="text" maxlength={MAX_SYMBOL} placeholder="X" bind:value={s.symbol} />
          </label>
          {@render numberBox('Atomic number', clean.z, 0, Math.min(MAX_MASS, clean.mass), (z) => ({ z }))}
          {@render numberBox('Mass number', clean.mass, clean.z, MAX_MASS, (mass) => ({ mass }))}
        </div>
        <div class="fields two">
          {@render numberBox('Charge', clean.charge, MIN_CHARGE, Math.min(MAX_CHARGE, clean.z), (charge) => ({ charge }))}
        </div>
      {:else}
        <label class="field">
          <span>Particle</span>
          <select value={clean.particle} onchange={(e) => chooseParticle(e.currentTarget.value as Particle)}>
            {#each PARTICLES as p (p)}
              <option value={p}>{PARTICLE_INFO[p].name}</option>
            {/each}
          </select>
        </label>
        {#if particle.symbols.length > 1}
          <div class="field">
            <span>Written as</span>
            {@render segmented('Written as', particle.symbols, SYMBOL_TEXT, clean.particleSymbol, (v) => (s.particleSymbol = v))}
          </div>
        {/if}
      {/if}

      {#if clean.kind !== 'particle'}
        <div class="fields three counts">
          {@render numberBox('Protons', counts.protons, clean.kind === 'element' ? 1 : 0, clean.kind === 'element' ? MAX_Z : MAX_MASS, (protons) => fromCounts({ ...counts, protons }))}
          {@render numberBox('Neutrons', counts.neutrons, 0, MAX_MASS - clean.z, (neutrons) => fromCounts({ ...counts, neutrons }))}
          {@render numberBox('Electrons', counts.electrons, Math.max(0, clean.z - MAX_CHARGE), clean.z - MIN_CHARGE, (electrons) => fromCounts({ ...counts, electrons }))}
        </div>
      {/if}
      {#if refused}
        <p class="problem" role="status">{refused}</p>
      {:else if note}
        <p class="note" role="status">{note}</p>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Positions" icon={LayoutGrid} summary={positionSummary} open>
      {#each POSITIONS as p (p.key)}
        {#if positionUsed(clean, p.position)}
          <div class="row">
            <span>{p.name}</span>
            {@render segmented(`Show the ${p.name.toLowerCase()}`, SHOWS, SHOW_NAMES, s[p.key], (v) => (s[p.key] = v))}
          </div>
        {/if}
      {/each}
      <div class="row">
        <span>Blanks</span>
        {@render segmented('Draw blanks as', BLANKS, BLANK_NAMES, s.blank, (v) => (s.blank = v))}
      </div>
    </Section>

    <Section title="Style" icon={PenLine} summary={styleSummary}>
      {#if clean.kind !== 'particle'}
        <div class="field setting">
          <span>Notation</span>
          {@render segmented('Notation', NOTATIONS, NOTATION_NAMES, s.notation, (v) => (s.notation = v))}
        </div>
      {/if}
      {#if clean.kind === 'element' && notation !== 'symbol'}
        <div class="field setting">
          <span>Hyphen notation</span>
          {@render segmented('Hyphen notation', HYPHEN_NAMES, { name: `${named?.name.toLowerCase()}-${clean.mass}`, symbol: `${named?.symbol}-${clean.mass}` }, s.hyphenName, (v) => (s.hyphenName = v))}
        </div>
      {/if}
      <div class="field setting">
        <span>Font</span>
        <div class="segmented fonts" role="radiogroup" aria-label="Font">
          {#each FONTS as font (font)}
            <button type="button" role="radio" class={font} aria-checked={s.font === font} class:on={s.font === font} onclick={() => (s.font = font)}>{FONT_NAMES[font]}</button>
          {/each}
        </div>
      </div>
      <div class="field setting">
        <span>Text size</span>
        {@render segmented('Text size', SIZES, SIZE_NAMES, s.size, (v) => (s.size = v))}
      </div>
    </Section>

    <Section title="Chart title and answer key" icon={Type} summary={textSummary}>
      <div class="field setting">
        <span>Chart title</span>
        <LabelField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. Name this isotope" blank={false} />
      </div>
      {@render check('Answer key', s.answerKey, (v) => (s.answerKey = v))}
    </Section>
  {/snippet}

  {#snippet figure()}
    <NuclideFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { margin: 0; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .nuclide { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .field input, .field select { font-weight: 400; }
  .field input[type='number'] { width: 100%; min-width: 0; font-variant-numeric: tabular-nums; }
  .fields { display: grid; gap: 0.6rem; align-items: end; }
  .fields.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fields.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .counts { padding-top: 0.75rem; border-top: 1px solid var(--border); }
  .problem { margin: 0; font-size: 0.84rem; color: var(--red); font-weight: 600; }
  .note { margin: 0; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--blue-soft); font-size: 0.84rem; }
  .row { display: grid; grid-template-columns: 7.9rem minmax(0, 1fr); align-items: center; gap: 0.6rem; margin-bottom: 0.6rem; font-weight: 600; font-size: 0.88rem; }
  .row:last-child { margin-bottom: 0; }
  .row:first-child { margin-top: 0.2rem; }
  .setting { margin-bottom: 0.75rem; }
  .setting:first-child { margin-top: 0.2rem; }
  .fonts .sans { font-family: Arial, Helvetica, sans-serif; }
  .fonts .serif { font-family: 'Times New Roman', Times, serif; font-size: 1.02em; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin: 0.25rem 0 0; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
</style>
