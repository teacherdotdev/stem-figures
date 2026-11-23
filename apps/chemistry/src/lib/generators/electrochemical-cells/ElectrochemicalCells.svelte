<script lang="ts">
  // Electrochemical Cells: pick two metals and get a galvanic cell, each
  // metal in a solution of its own ion, joined by a salt bridge and wired to
  // a digital voltmeter, a dial voltmeter or a coil of wire.
  import { FlaskConical, Gauge, Tags, Type } from '@lucide/svelte'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import ReadingField from '$lib/shared/ReadingField.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import CellFigure from './CellFigure.svelte'
  import { METALS, METAL_INFO, cellOf, voltageText, type Metal, type Side } from './cell'
  import { MAX_VOLTAGE, METERS, READINGS, answerLines, cellSettings, cellVoltage, tidyVoltage, type Meter, type Reading } from './settings'

  const gen = generatorState(cellSettings, 'electrochemical-cells')
  const s = gen.s
  // The settings as kept: what the figure, the summaries and the answer key show, as the page address does.
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const METER_NAMES: Record<Meter, string> = { digital: 'Digital voltmeter', dial: 'Dial voltmeter', coil: 'Coil of wire' }
  const SIDE_NAMES: Record<Side, string> = { left: 'Left electrode', right: 'Right electrode' }
  const cell = $derived(cellOf(clean.left, clean.right))
  const READING_NAMES: Record<Reading, string> = { table: 'From the table', typed: 'Your own' }

  /** Your own starts from the table's value, so the figure doesn't change until you type. */
  function chooseReading(r: Reading) {
    if (r === s.reading) return
    if (r === 'typed') s.voltage = cell.voltage
    s.reading = r
  }

  /** Picking the other side's metal swaps the two sides. */
  function pick(side: Side, metal: Metal) {
    const other: Side = side === 'left' ? 'right' : 'left'
    if (s[other] === metal) s[other] = s[side]
    s[side] = metal
  }

  const cellSummary = $derived(`${clean.left} and ${clean.right}, ${voltageText(cellVoltage(clean))} V`)
  const labelSummary = $derived(
    [s.labels && 'names', s.electrodes && 'anode and cathode', s.electronFlow && 'electron flow'].filter(Boolean).join(', ') || 'None',
  )
  const textSummary = $derived(
    [s.titleMode === 'text' && s.title ? `“${s.title}”` : 'No title', s.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
</script>

<GeneratorPage name="Electrochemical Cells" filename="electrochemical-cell" settingsWidth={25} {gen} {svg}>
  {#snippet settings()}
    <Section title="Cell" summary={cellSummary} icon={FlaskConical} open>
      {#each ['left', 'right'] as const as side (side)}
        <p class="field-label">{SIDE_NAMES[side]}</p>
        <div class="chips" role="radiogroup" aria-label={SIDE_NAMES[side]}>
          {#each METALS as metal (metal)}
            <button
              type="button"
              role="radio"
              aria-checked={s[side] === metal}
              class="chip"
              class:on={s[side] === metal}
              onclick={() => pick(side, metal)}>{metal}</button
            >
          {/each}
        </div>
      {/each}
      <p class="note">
        {s[cell.anode]} is the anode and {s[cell.cathode]} the cathode: E°cell = {METAL_INFO[s[cell.cathode]].potential.toFixed(2)} − ({METAL_INFO[s[cell.anode]].potential.toFixed(2)}) = {voltageText(cell.voltage)} V.
      </p>
      <p class="field-label">E°cell</p>
      <div class="segmented" role="radiogroup" aria-label="E°cell">
        {#each READINGS as r (r)}
          <button type="button" role="radio" aria-checked={s.reading === r} class:on={s.reading === r} onclick={() => chooseReading(r)}>
            {READING_NAMES[r]}
          </button>
        {/each}
      </div>
      {#if s.reading === 'typed'}
        <div class="voltage">
          <ReadingField label="Your E°cell" value={clean.voltage} decimals={2} min={0} max={MAX_VOLTAGE} unit="V" onchange={(v) => (s.voltage = tidyVoltage(v))} />
        </div>
      {/if}
    </Section>

    <Section title="Meter" summary={METER_NAMES[s.meter]} icon={Gauge} open>
      <div class="segmented" role="radiogroup" aria-label="Between the electrodes">
        {#each METERS as meter (meter)}
          <button type="button" role="radio" aria-checked={s.meter === meter} class:on={s.meter === meter} onclick={() => (s.meter = meter)}>
            {METER_NAMES[meter]}
          </button>
        {/each}
      </div>
    </Section>

    <Section title="Labels" summary={labelSummary} icon={Tags}>
      <label class="check first">
        <input type="checkbox" bind:checked={s.labels} />
        <span><strong>Part names</strong></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.electrodes} />
        <span><strong>Anode and cathode</strong></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.electronFlow} />
        <span><strong>Electron flow</strong></span>
      </label>
    </Section>

    <Section title="Title and answer key" summary={textSummary} icon={Type}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answerLines(clean).join(' · ')} />
    </Section>
  {/snippet}
  {#snippet figure()}
    <CellFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .field-label { margin: 0.9rem 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
  .field-label:first-child { margin-top: 0; }
  .note { margin: 0.6rem 0 0; color: var(--muted); font-size: 0.82rem; }
  .voltage { margin-top: 0.6rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 1rem; cursor: pointer; }
  .check.first { margin-top: 0; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check strong { font-size: 0.9rem; }
</style>
