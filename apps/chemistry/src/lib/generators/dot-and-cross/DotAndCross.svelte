<script lang="ts">
  // Dot-and-Cross Diagram: type a molecule, an ionic compound or one element
  // and get its UK-style bonding diagram, each atom's shell a circle around
  // its symbol with its electrons as dots or crosses (CONTEXT.md "Dot-and-
  // cross diagrams"). The electrons can be left off for students to draw.
  import { ArrowLeftRight, Atom, KeyRound, Shapes, SquareDashed, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import { openRequest } from '$shared/request.svelte'
  import DotCrossFigure from './DotCrossFigure.svelte'
  import { chargeText, ionCharge, ionName } from './ionic'
  import { CHARGE_MODES, MAX_FORMULA, SHELLS, allShells, dotCrossSettings, layoutOf, readOnce, type ChargeMode, type Shells } from './settings'

  const gen = generatorState(dotCrossSettings, 'dot-and-cross')
  const s = gen.s
  let svg = $state<SVGSVGElement>()

  const SHELL_NAMES: Record<Shells, string> = { outer: 'Outer shell', all: 'All shells' }
  const CHARGE_NAMES: Record<ChargeMode, string> = { show: 'Shown', blank: 'Blank', none: 'Left off' }
  const KIND_NAMES = { atom: 'atom', ionic: 'ionic compound', covalent: 'molecule' }

  /** Built-in starting points, by what's typed. */
  const SETUPS: { group: string; items: [string, string][] }[] = [
    {
      group: 'Molecules',
      items: [
        ['H2', 'H₂, hydrogen'],
        ['Cl2', 'Cl₂, chlorine'],
        ['HCl', 'HCl, hydrogen chloride'],
        ['H2O', 'H₂O, water'],
        ['CH4', 'CH₄, methane'],
        ['NH3', 'NH₃, ammonia'],
        ['O2', 'O₂, oxygen'],
        ['N2', 'N₂, nitrogen'],
        ['CO2', 'CO₂, carbon dioxide'],
        ['C2H4', 'C₂H₄, ethene'],
        ['CH3OH', 'CH₃OH, methanol'],
      ],
    },
    {
      group: 'Ionic compounds',
      items: [
        ['NaCl', 'NaCl, sodium chloride'],
        ['MgO', 'MgO, magnesium oxide'],
        ['CaF2', 'CaF₂, calcium fluoride'],
        ['MgCl2', 'MgCl₂, magnesium chloride'],
        ['Na2O', 'Na₂O, sodium oxide'],
        ['Li2O', 'Li₂O, lithium oxide'],
        ['K2S', 'K₂S, potassium sulfide'],
        ['Al2O3', 'Al₂O₃, aluminum oxide'],
        ['AlF3', 'AlF₃, aluminum fluoride'],
      ],
    },
    {
      group: 'Atoms and ions',
      items: [
        ['Na', 'Na, sodium atom'],
        ['Cl', 'Cl, chlorine atom'],
        ['Ca', 'Ca, calcium atom'],
        ['Na+', 'Na⁺, sodium ion'],
        ['Mg 2+', 'Mg²⁺, magnesium ion'],
        ['Cl-', 'Cl⁻, chloride ion'],
        ['O 2-', 'O²⁻, oxide ion'],
      ],
    },
  ]

  const r = $derived(readOnce(s.formula, s.which))
  const species = $derived(r.ok ? r.species : undefined)
  const atom = $derived(species?.kind === 'atom' ? species.atom : undefined)
  const molecule = $derived(species?.kind === 'covalent' ? species.molecule : undefined)
  const all = $derived(allShells(s, r))
  const layout = $derived(layoutOf(s, r))
  const hasIons = $derived(species?.kind === 'ionic' || !!atom?.charge)
  const setup = $derived(SETUPS.flatMap((g) => g.items).find(([formula]) => formula === s.formula.trim())?.[0] ?? '')
  const usualIon = $derived(atom ? ionCharge(atom.symbol) : undefined)

  /** What to type for an element's usual ion: "Na+", "Mg 2+". */
  const ionTyped = (symbol: string, charge: number) => `${symbol}${Math.abs(charge) > 1 ? ' ' : ''}${chargeText(charge).replace('−', '-')}`

  function setFormula(formula: string) {
    s.formula = formula
    s.which = ''
  }

  function setShells(v: Shells) {
    if (atom) s.atomShells = v
    else s.shells = v
  }

  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

  const whatSummary = $derived(
    !r.ok ? 'Nothing to draw' : atom ? `${r.name}, ${atom.element} ${atom.charge ? 'ion' : 'atom'}` : `${r.name}, ${KIND_NAMES[species!.kind]}`,
  )
  const drawingSummary = $derived(
    [
      SHELL_NAMES[all ? 'all' : 'outer'],
      species?.kind === 'ionic' ? (layout === 'every' ? 'every ion' : 'numbered ions') : '',
      s.swap ? 'swapped' : '',
      s.color ? 'color' : '',
    ]
      .filter(Boolean)
      .join(', '),
  )
  const questionSummary = $derived(
    [s.blank ? 'Electrons blank' : 'Electrons drawn', hasIons && s.charges !== 'show' ? `charges ${CHARGE_NAMES[s.charges].toLowerCase()}` : ''].filter(Boolean).join(', '),
  )
  const keySummary = $derived([s.titleMode === 'text' && s.title ? `“${s.title}”` : 'No title', s.answerKey ? 'answer key' : 'no answer key'].join(', '))
  const filename = $derived(`dot-and-cross-${(r.ok ? s.formula : 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram'}`)
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], value: T, names: Record<T, string>, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} onclick={() => set(option)}>
        {names[option]}
      </button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Dot-and-Cross Diagram" {filename} settingsWidth={26} {gen} {svg}>
  {#snippet settings()}
    <Section title="Molecule, compound or atom" summary={whatSummary} icon={Atom} open>
      <label class="field">
        <span class="field-head">
          Formula or name
          <HelpTip id="dot-cross-formula-tip" label="What you can type">
            A molecule like H2O, CH4 or ethene; an ionic compound like NaCl or magnesium chloride, a metal (Li, Na, K, Rb, Mg, Ca, Sr or Al) with N, O,
            F, S, Cl, Br or I; or one element from H to Ca, like Na, or its ion, like Na+ or Mg 2+. Put a space or ^ before a charge of 2 or more.
            Molecules that need a dative bond, like CO and SO₂, aren’t drawn yet.
          </HelpTip>
        </span>
        <input type="text" maxlength={MAX_FORMULA} value={s.formula} oninput={(e) => setFormula(e.currentTarget.value)} spellcheck="false" autocomplete="off" />
      </label>
      {#if !r.ok}
        <p class="warning" role="status">{r.message}</p>
        {#if r.request}
          <button type="button" class="btn-ghost small request" onclick={() => openRequest(`Dot-and-cross diagram of ${s.formula}`)}>Request it</button>
        {/if}
      {:else if molecule?.choices.length}
        <p class="field-label">Which one?</p>
        <div class="chips" role="radiogroup" aria-label="Which one">
          {#each molecule.choices as l (l.id)}
            <button
              type="button"
              role="radio"
              aria-checked={molecule.listed?.id === l.id}
              class="chip small"
              class:on={molecule.listed?.id === l.id}
              onclick={() => (s.which = l.id)}
            >
              {l.names[0]}
            </button>
          {/each}
        </div>
      {:else if atom}
        <div class="spaced segmented" role="radiogroup" aria-label="Atom or ion">
          <button type="button" role="radio" aria-checked={!atom.charge} class:on={!atom.charge} onclick={() => setFormula(atom.symbol)}>Atom</button>
          <button
            type="button"
            role="radio"
            aria-checked={!!atom.charge}
            class:on={!!atom.charge}
            disabled={!usualIon}
            onclick={() => usualIon && setFormula(ionTyped(atom.symbol, usualIon))}
          >
            {usualIon ? `Ion, ${ionName(atom.symbol, usualIon)}` : 'No ion'}
          </button>
        </div>
      {/if}
      <label class="field">
        <span class="field-head">Or pick one</span>
        <select value={setup} onchange={(e) => e.currentTarget.value && setFormula(e.currentTarget.value)}>
          <option value="">Molecules, compounds and atoms…</option>
          {#each SETUPS as g (g.group)}
            <optgroup label={g.group}>
              {#each g.items as [formula, label] (formula)}<option value={formula}>{label}</option>{/each}
            </optgroup>
          {/each}
        </select>
      </label>
    </Section>

    <Section title="Drawing" summary={drawingSummary} icon={Shapes}>
      <p class="field-label">
        Shells
        <HelpTip id="dot-cross-shells-tip" label="About the shells">
          Outer shell draws each atom’s outer shell only, as most mark schemes do; all shells adds the inner ones. A metal ion shows the full shell
          it’s left with. With all shells, a molecule’s circles grow so the inner rings stay clear of the overlaps.
        </HelpTip>
      </p>
      {@render segmented('Shells', SHELLS, all ? 'all' : 'outer', SHELL_NAMES, setShells)}
      {#if species?.kind === 'ionic'}
        <p class="field-label spaced">
          Ions
          <HelpTip id="dot-cross-ions-tip" label="About the ions">
            Every ion draws them all, the single ion in the middle (Cl⁻ Mg²⁺ Cl⁻). Numbered draws one of each with how many in front, as 2[Cl]⁻.
            Compounds of up to three ions start with every ion, bigger ones numbered.
          </HelpTip>
        </p>
        {@render segmented('Ions', ['every', 'numbered'] as const, layout, { every: 'Every ion', numbered: 'Numbered' }, (v) => (s.layout = v))}
      {/if}
      <p class="field-label spaced">
        Marks
        <HelpTip id="dot-cross-marks-tip" label="Who gets dots and who gets crosses">
          In a molecule the central atom’s electrons are dots and the outer atoms’ crosses, and a third kind of atom gets open circles. In an ionic
          compound the metal’s are crosses and the non-metal’s dots, so the electrons a non-metal gains are crosses. Swap trades dots and crosses.
        </HelpTip>
      </p>
      <div class="marks">
        <button type="button" class="btn-ghost small" aria-pressed={s.swap} onclick={() => (s.swap = !s.swap)}>
          <ArrowLeftRight size={17} aria-hidden="true" /> Swap dots and crosses
        </button>
      </div>
      <label class="check">
        <input type="checkbox" bind:checked={s.color} />
        <span><strong>Color each kind of mark</strong></span>
      </label>
    </Section>

    <Section title="Question" summary={questionSummary} icon={SquareDashed}>
      <p class="field-label">Electrons</p>
      {@render segmented('Electrons', ['drawn', 'blank'] as const, s.blank ? 'blank' : 'drawn', { drawn: 'Drawn', blank: 'Blank' }, (v) => (s.blank = v === 'blank'))}
      {#if hasIons}
        <p class="field-label spaced">Charges</p>
        {@render segmented('Charges', CHARGE_MODES, s.charges, CHARGE_NAMES, (v) => (s.charges = v))}
      {/if}
    </Section>

    <Section title="Title and answer key" summary={keySummary} icon={Type}>
      <p class="field-label">Chart title</p>
      <LabelField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. Draw the dot-and-cross diagram" blank={false} />
      <label class="check">
        <input type="checkbox" bind:checked={s.answerKey} />
        <span><strong><KeyRound size={15} aria-hidden="true" /> Answer key</strong></span>
      </label>
    </Section>
  {/snippet}
  {#snippet figure()}
    <DotCrossFigure settings={s} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; font-size: 0.9rem; font-weight: 700; }
  .field + .field, .warning + .field, .request + .field, .chips + .field, .segmented + .field { margin-top: 1rem; }
  .field input, .field select { font-weight: 400; }
  .field-head, .field-label { display: flex; align-items: center; gap: 0.25rem; }
  .field-label { margin: 0.9rem 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
  .field-label:first-child { margin-top: 0.35rem; }
  .field-label.spaced { margin-top: 1.1rem; }
  .segmented.spaced { margin-top: 0.75rem; }
  .warning { margin: 0.75rem 0 0; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--red-soft); color: #991b1b; font-size: 0.85rem; }
  .request { margin-top: 0.6rem; }
  .small { padding: 0.5rem 0.85rem; font-size: 0.9rem; }
  .chip.small { padding: 0.35rem 0.75rem; font-size: 0.86rem; }
  .marks { display: flex; }
  .marks .btn-ghost { display: inline-flex; align-items: center; gap: 0.4rem; }
  .marks .btn-ghost[aria-pressed='true'] { background: var(--blue-soft); }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 1rem; cursor: pointer; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; accent-color: var(--blue); }
  .check strong { display: flex; align-items: center; gap: 0.3rem; font-size: 0.9rem; }
</style>
