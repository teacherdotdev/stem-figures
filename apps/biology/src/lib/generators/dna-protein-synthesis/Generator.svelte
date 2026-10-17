<script lang="ts">
  // DNA and Protein Synthesis: type one strand, the DNA template or coding
  // strand or the mRNA, and the figure works out the rest base under base:
  // both DNA strands, the mRNA, the tRNA anticodons and the amino acids,
  // read in codons from the first AUG. Any row can be blank, partly blank or
  // off for students to fill in, and one row can hold deliberate wrong
  // pairings for multiple choice. The codon chart can go beside it or alone.
  import { Dna, Grid3x3, Pill, Rows3, Shuffle, TriangleAlert, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import { aminoName, STOP, type AminoAcid } from './code'
  import DnaFigure from './DnaFigure.svelte'
  import { buildDna } from './figure'
  import { answerLines, mistakeText } from './rows'
  import { MAX_BASES, TYPED, TYPED_NAMES, type Typed } from './sequence'
  import {
    BASE_ROWS, MAX_MISTAKES, ROW_NAMES, ROWS, dnaSettings, newSeed, rowName,
    type BaseRowId, type DnaSettings, type RowId, type RowMode,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(dnaSettings, 'dna-protein-synthesis')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const d = $derived(buildDna(clean))
  const w = $derived(d.worksheet)
  let svg = $state<SVGSVGElement>()

  // The setup picker shows the setup the figure still is: one whose
  // settings all match. Changing one of them leaves it blank again.
  const made = (setup: (typeof SETUPS)[number], current: DnaSettings) => dnaSettings.tidy(settingsFor(setup, dnaSettings.defaults, current))
  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) gen.apply(made(setup, clean))
  }
  const setupId = $derived(SETUPS.find((x) => dnaSettings.keyOf(made(x, clean)) === dnaSettings.keyOf(clean))?.id ?? '')

  const MODE_NAMES: Record<RowMode, string> = { shown: 'Shown', blank: 'Blank', some: 'Some', off: 'Off' }
  const SBO_NAMES = { shown: 'Shown', blank: 'Blank', off: 'Off' }
  const TYPED_BUTTONS: Record<Typed, string> = { template: 'Template', coding: 'Coding', mrna: 'mRNA' }

  const bases = $derived(w.reading.bases.length)
  const noStart = $derived(clean.frame === 'aug' && bases > 0 && w.translation.start === null)
  const protein = $derived.by(() => {
    const coded = w.translation.codons.filter((c) => c.code !== null)
    const names = coded.filter((c) => c.code !== STOP).map((c) => aminoName(c.code as AminoAcid, 'three'))
    return names.length ? `${names.join('–')}${w.translation.stopped ? ', then Stop' : ''}` : ''
  })
  const answers = $derived(answerLines(clean, w))
  const answerPreview = $derived.by(() => {
    const all = answers.join(' · ')
    return all.length > 140 ? `${all.slice(0, 139)}…` : all || 'nothing yet'
  })

  const some = $derived(ROWS.some((r) => clean[r] === 'some'))
  const rowsSummary = $derived(
    ROWS.filter((r) => clean[r] !== 'off')
      .map((r) => `${r === 'amino' ? 'amino acids' : r === 'mrna' ? 'mRNA' : r === 'trna' ? 'tRNA' : r}${clean[r] === 'blank' ? ' (blank)' : clean[r] === 'some' ? ' (some blank)' : ''}`)
      .join(', ')
      .replace(/^./, (c) => c.toUpperCase()) || 'No rows',
  )
  const aminoSummary = $derived(
    `${clean.aminoNames === 'three' ? 'Three-letter' : clean.aminoNames === 'one' ? 'One-letter' : 'Full'} names, ${clean.aminoStyle === 'beads' ? 'as a chain of beads' : 'as words'}`,
  )
  const strandSummary = $derived(
    [
      clean.ends === 'shown' ? '5′ and 3′ ends' : clean.ends === 'blank' ? 'ends blank' : 'no ends',
      clean.gaps && 'codon gaps', clean.brackets && 'brackets', clean.bonds && 'hydrogen bonds', clean.color && 'colored bases',
    ].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()),
  )
  const mistakeSummary = $derived(clean.mistakes ? `${w.mistakes.length} in the ${rowName(clean, clean.mistakeRow)}` : 'None')
  const chartSummary = $derived(clean.show === 'strands' ? 'Off' : clean.show === 'chart' ? 'The chart alone' : `Beside the strands, ${clean.chartAt === 'right' ? 'on the right' : 'below'}`)
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim().length > 2 ? clean.title.trim() : 'dna-protein-synthesis')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dna-protein-synthesis',
  )
</script>

{#snippet segmented(name: string, options: readonly string[], names: Record<string, string>, value: string, set: (v: any) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} onclick={() => set(option)}>{names[option]}</button>
    {/each}
  </div>
{/snippet}

{#snippet check(label: string, hint: string, value: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" checked={value} onchange={(e) => set(e.currentTarget.checked)} />
    <span><strong>{label}</strong>{#if hint}<small>{hint}</small>{/if}</span>
  </label>
{/snippet}

<GeneratorPage
  name="DNA and Protein Synthesis" {filename} {gen} {svg} settingsWidth={27}
  printWidth={Math.min(7.5, Math.max(3, d.width / 150))} bind:labelSize={s.labelSize}
>
  {#snippet inputs()}
    <section class="sequence">
      <div class="head-row">
        <h2 class="card-head">Sequence</h2>
        <HelpTip id="dna-tip" label="How the rows are worked out">
          A pairs with T in DNA and with U in RNA, and G pairs with C. The template strand is written 3′→5′, so it lines up
          under the coding strand; the mRNA is the coding strand with U for T. Each anticodon pairs with its codon, and the
          codons are read with the standard genetic code until a stop codon.
        </HelpTip>
      </div>
      <label class="field">
        <span>Classic setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup (setup.id)}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      <div class="field">
        <span>You’re typing the</span>
        {@render segmented('Strand typed', TYPED, TYPED_BUTTONS, s.typed, (v: Typed) => (s.typed = v))}
      </div>
      <label class="field">
        <span>{TYPED_NAMES[clean.typed]} <span class="hint">{clean.typed === 'template' ? '3′→5′, usually starting TAC' : '5′→3′'}</span></span>
        <input
          class="bases" type="text" maxlength="120" spellcheck="false" autocomplete="off" aria-invalid={w.reading.problems.length > 0}
          placeholder={clean.typed === 'mrna' ? 'AUGCCUAAG…' : clean.typed === 'coding' ? 'ATGCCTAAG…' : 'TACGGATTC…'}
          bind:value={s.seq}
        />
      </label>
      {#each w.reading.problems as problem (problem)}<p class="help problem">{problem}</p>{/each}
      <p class="help">{bases} of {MAX_BASES} bases{bases ? `, ${w.translation.codons.filter((c) => c.code !== null).length} codons read` : ''}. Spaces, hyphens and 5′ 3′ ends are fine.</p>

      <div class="field">
        <span>Reading frame</span>
        {@render segmented('Reading frame', ['aug', 'first'], { aug: 'From the first AUG', first: 'From the first base' }, s.frame, (v) => (s.frame = v))}
      </div>
      {#if noStart}
        <p class="help problem">There’s no AUG in the mRNA, so nothing is translated. Read it from the first base instead, or add a start codon.</p>
      {:else if w.translation.start && clean.frame === 'aug'}
        <p class="help">The first AUG is at base {w.translation.start + 1}; the {w.translation.start === 1 ? 'base' : `${w.translation.start} bases`} before it {w.translation.start === 1 ? 'isn’t' : 'aren’t'} translated.</p>
      {/if}
      {#if protein}<p class="readout">{protein}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Rows" icon={Rows3} summary={rowsSummary} open>
      <div class="rows">
        {#each ROWS as r (r)}
          <div class="row-setting">
            <span class="row-name">{ROW_NAMES[r]}</span>
            {@render segmented(ROW_NAMES[r], ['shown', 'blank', 'some', 'off'], MODE_NAMES, s[r], (v: RowMode) => (s[r] = v))}
          </div>
        {/each}
      </div>
      <p class="help setting">Blank leaves every box empty for students; Some blanks a share of them, picked at random.</p>
      {#if some}
        <label class="range-field setting">
          <span>Blank in a Some row <span class="hint">{clean.share}% of its boxes</span></span>
          <input type="range" min="10" max="90" step="5" bind:value={s.share} />
        </label>
        <button type="button" class="btn-ghost shuffle setting" onclick={() => (s.seed = newSeed(s.seed))}><Shuffle size={16} aria-hidden="true" /> Shuffle the blanks</button>
      {/if}
      <div class="field setting">
        <span>Row names</span>
        {@render segmented('Row names', ['shown', 'blank', 'off'], SBO_NAMES, s.rowNames, (v) => (s.rowNames = v))}
      </div>
      {#if s.rowNames === 'shown'}
        <div class="names">
          {#each ROWS.filter((r) => clean[r] !== 'off') as r (r)}
            <input type="text" maxlength="40" aria-label="{ROW_NAMES[r]} row name" placeholder={ROW_NAMES[r]} bind:value={s[`${r}Name`]} />
          {/each}
        </div>
      {:else if s.rowNames === 'blank'}
        <p class="help">A line on the left of each row for students to name it.</p>
      {/if}
    </Section>

    <Section title="Amino acids" icon={Pill} summary={aminoSummary}>
      <div class="field setting">
        <span>Names</span>
        {@render segmented('Amino acid names', ['three', 'one', 'full'], { three: 'Met', one: 'M', full: 'Methionine' }, s.aminoNames, (v) => (s.aminoNames = v))}
      </div>
      <div class="field setting">
        <span>Drawn as</span>
        {@render segmented('Amino acids drawn as', ['beads', 'text'], { beads: 'Chain of beads', text: 'Words' }, s.aminoStyle, (v) => (s.aminoStyle = v))}
      </div>
      <p class="help">Each sits under its codon. A stop codon reads Stop, with no amino acid, and no tRNA brings one.</p>
    </Section>

    <Section title="Strands" icon={Dna} summary={strandSummary}>
      <div class="field setting">
        <span>5′ and 3′ ends</span>
        {@render segmented('Strand ends', ['shown', 'blank', 'off'], SBO_NAMES, s.ends, (v) => (s.ends = v))}
      </div>
      {@render check('Gaps between codons', 'on every row, so the bases still line up', s.gaps, (v) => (s.gaps = v))}
      {@render check('Bracket under each codon', 'under the mRNA, for each codon that’s read', s.brackets, (v) => (s.brackets = v))}
      {@render check('Hydrogen bonds', 'between the DNA strands: 2 for A–T, 3 for G–C', s.bonds, (v) => (s.bonds = v))}
      {@render check('Color the bases', 'A, T or U, G and C tinted to read apart in grayscale too, with the letter always printed', s.color, (v) => (s.color = v))}
    </Section>

    <Section title="Mistakes" icon={TriangleAlert} summary={mistakeSummary}>
      <p class="help first">Wrong pairings for multiple choice: make choice A with none, then B to D with mistakes, shuffled.</p>
      <div class="field setting">
        <span>How many</span>
        {@render segmented(
          'How many mistakes',
          Array.from({ length: MAX_MISTAKES + 1 }, (_, i) => String(i)),
          Object.fromEntries(Array.from({ length: MAX_MISTAKES + 1 }, (_, i) => [String(i), i ? String(i) : 'None'])),
          String(s.mistakes),
          (v: string) => (s.mistakes = Number(v)),
        )}
      </div>
      {#if s.mistakes}
        <label class="field setting">
          <span>In the row</span>
          <select value={s.mistakeRow} onchange={(e) => (s.mistakeRow = e.currentTarget.value as BaseRowId)}>
            {#each BASE_ROWS as r (r)}<option value={r}>{ROW_NAMES[r]}</option>{/each}
          </select>
        </label>
        <button type="button" class="btn-ghost shuffle setting" onclick={() => (s.mistakeSeed = newSeed(s.mistakeSeed))}><Shuffle size={16} aria-hidden="true" /> Shuffle the mistakes</button>
        {#if w.mistakeNote}<p class="help problem">{w.mistakeNote}</p>{/if}
        {#if w.mistakes.length}
          <ul class="readout">{#each w.mistakes as m (m.col)}<li>{mistakeText(clean, m, w)}</li>{/each}</ul>
        {/if}
      {/if}
    </Section>

    <Section title="Codon chart" icon={Grid3x3} summary={chartSummary}>
      <div class="field setting">
        <span>Show</span>
        {@render segmented('Show', ['strands', 'both', 'chart'], { strands: 'Strands', both: 'Both', chart: 'Chart only' }, s.show, (v) => (s.show = v))}
      </div>
      {#if s.show === 'both'}
        <div class="field setting">
          <span>Chart</span>
          {@render segmented('Chart beside the strands', ['right', 'below'], { right: 'On the right', below: 'Below' }, s.chartAt, (v) => (s.chartAt = v))}
        </div>
      {/if}
      <p class="help">The standard genetic code: first base down the left, second across the top, third down the right. The start codon and the stop codons are in bold.</p>
    </Section>

    <Section title="Chart title" icon={Type} summary={clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title'}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answerPreview} />
    </Section>
  {/snippet}

  {#snippet figure()}
    <DnaFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .sequence { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .field select, .field input { font-weight: 400; }
  .hint { font-weight: 400; color: var(--muted); }
  .bases { font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace; letter-spacing: 0.08em; text-transform: uppercase; }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.first { margin-bottom: 0.75rem; }
  .problem { color: #b45309; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
  .setting { margin-bottom: 0.75rem; }
  .rows { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.6rem; }
  .row-setting { display: flex; flex-direction: column; gap: 0.25rem; }
  .row-name { font-weight: 600; font-size: 0.86rem; }
  .row-setting .segmented button { padding-inline: 0.4rem; }
  .names { display: flex; flex-direction: column; gap: 0.4rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; }
  .range-field input { width: 100%; accent-color: var(--blue); }
  .shuffle { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.8rem; font-size: 0.88rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check small { color: var(--muted); font-size: 0.82rem; }
</style>
