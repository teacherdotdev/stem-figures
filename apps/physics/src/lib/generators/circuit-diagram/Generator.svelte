<script lang="ts">
  // The Circuit Diagram Generator: the circuit, its meters and its symbols on
  // the left, the figure on the right. Settings live in the page address.
  import { BatteryFull, ChevronDown, CircuitBoard, Gauge, Heading, Palette, Plus, SlidersHorizontal, Trash2 } from '@lucide/svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import Choice from '$lib/shared/Choice.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import FigureOptions from '$lib/shared/FigureOptions.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import CircuitDiagram from './CircuitDiagram.svelte'
  import TreeEditor from './TreeEditor.svelte'
  import SelectedTileOptions from './SelectedTileOptions.svelte'
  import type { TileSelection } from './tileSelection'
  import GridWorkspace from './GridWorkspace.svelte'
  import { loadNames, plainText } from './circuit'
  import { circuitSettings, MAX_LOADS, newLoad, type Load, type VoltmeterPlace } from './settings'
  import { describeCircuit } from './tree'

  const gen = createGenerator(circuitSettings, 'circuit-diagram')
  let selectedTile = $state<TileSelection | null>(null)
  const s = $derived(gen.snapshot())

  const KINDS = { resistor: 'Resistor', bulb: 'Bulb', led: 'LED' }
  const shown = (l: Label) => (l.mode === 'text' ? plainText(l.text) : l.mode === 'blank' ? 'blank' : '')
  const names = $derived(loadNames(s).map(plainText))
  const rowSummary = (load: Load, i: number) =>
    [load.name.mode === 'text' ? names[i] : shown(load.name), shown(load.value)].filter(Boolean).join(' · ') || 'no labels'

  const circuitSummary = $derived(s.editor === 'grid' ? `${[...s.circuitTiles, ...s.returnTiles].filter(t => t.kind !== 'wire').length} symbols on tiles` : s.editor === 'custom' ? describeCircuit(s.customCircuit) : `${s.loads.length === 1 ? 'one part' : `${s.loads.length} in ${s.arrangement}`} · ${s.loads.map((l, i) => names[i] || KINDS[l.kind].toLowerCase()).join(', ')}`)
  const sourceSummary = $derived([s.source === 'cell' ? 'One cell' : 'Battery', shown(s.sourceValue), s.polarity ? '+ and −' : ''].filter(Boolean).join(' · '))
  const meterSummary = $derived(
    [s.switch === 'none' ? '' : `${s.switch} switch`, s.ammeter ? 'ammeter' : '', s.voltmeter === 'none' ? '' : 'voltmeter'].filter(Boolean).join(' · ') || 'none',
  )
  const titleSummary = $derived(s.title.mode === 'text' ? `“${s.title.text}”` : s.title.mode === 'blank' ? 'blank' : 'none')

  const full = $derived(s.loads.length >= MAX_LOADS)
  // Each part folds up to a one-line summary. They start folded, except one just added.
  const unfolded = new SvelteSet<unknown>()
  const add = () => {
    if (full) return
    gen.s.loads.push(newLoad(gen.s.loads.length))
    unfolded.add(gen.s.loads.at(-1))
  }
  const toggle = (e: Event, load: unknown) => {
    if ((e.currentTarget as HTMLDetailsElement).open) unfolded.add(load)
    else unfolded.delete(load)
  }
  // A voltmeter stays across the part it was across, or goes when that part does.
  const remove = (e: Event, i: number) => {
    e.preventDefault()
    gen.s.loads.splice(i, 1)
    const at = Number(gen.s.voltmeter)
    if (at === i + 1) gen.s.voltmeter = 'none'
    else if (at > i + 1) gen.s.voltmeter = String(at - 1) as VoltmeterPlace
  }

  const voltmeterPlaces = $derived<[VoltmeterPlace, string][]>([
    ['none', 'No voltmeter'],
    ['source', `Across the ${s.source === 'cell' ? 'cell' : 'battery'}`],
    ...s.loads.map((l, i): [VoltmeterPlace, string] => [String(i + 1) as VoltmeterPlace, `Across ${names[i] || `${KINDS[l.kind].toLowerCase()} ${i + 1}`}`]),
  ])
</script>

<GeneratorPage name="Circuit Diagram Generator" filename="circuit-diagram" {gen}>
  {#snippet settings()}
    <Section title="Circuit" icon={CircuitBoard} summary={circuitSummary}>
      <div class="field">
        Editor
        <Choice name="Circuit editor" options={[["quick", "Quick setup"], ["custom", "Open circuit"], ["grid", "Grid workspace"]]} bind:value={gen.s.editor} />
      </div>
      {#if s.editor === 'grid'}
        <p class="note">Select a tile to edit its component. Use Shift+h/j/k/l to add tiles and Shift+X to remove them.</p>
      {:else if s.editor === 'custom'}
        <p class="note">Build an open circuit between X and Y. Add components in series, or group components in parallel. You can add a group inside another group.</p>
        <TreeEditor items={gen.s.customCircuit.items} bind:polarity={gen.s.polarity} />
      {:else}
      {#if s.loads.length > 1}
        <div class="field">
          Resistors and bulbs
          <Choice name="Arrangement" options={[['series', 'In series'], ['parallel', 'In parallel']]} bind:value={gen.s.arrangement} />
        </div>
      {/if}
      {#each gen.s.loads as load, i (load)}
        <details class="row" open={unfolded.has(load)} ontoggle={(e) => toggle(e, load)}>
          <summary class="row-head">
            <span class="chevron"><ChevronDown size={16} aria-hidden="true" /></span>
            <span class="row-text">
              <span class="row-title">{KINDS[load.kind]} {i + 1}</span>
              {#if s.loads[i]}<span class="row-summary">{rowSummary(s.loads[i], i)}</span>{/if}
            </span>
            {#if gen.s.loads.length > 1}
              <button type="button" class="icon-btn" aria-label="Remove part {i + 1}" data-tip="Remove" onclick={(e) => remove(e, i)}>
                <Trash2 size={17} />
              </button>
            {/if}
          </summary>
          <div class="field"><Choice name="Part {i + 1}" options={[['resistor', 'Resistor'], ['bulb', 'Bulb']]} bind:value={load.kind} /></div>
          <div class="field">
            Name
            <LabelField name="Part {i + 1} name" placeholder="{names[i]} (automatic)" bind:label={load.name} />
          </div>
          <div class="field">
            Value
            <LabelField name="Part {i + 1} value" placeholder="4 ohm, or x for students to find" bind:label={load.value} />
          </div>
        </details>
      {/each}
      <button type="button" class="btn-ghost add" disabled={full} onclick={add}>
        <Plus size={15} aria-hidden="true" />
        {full ? `A circuit holds up to ${MAX_LOADS} resistors and bulbs` : 'Add a resistor or bulb'}
      </button>
      <p class="note">Leave a name empty to number it automatically.</p>
      {/if}
    </Section>

    {#if s.editor === 'quick'}
    <Section title="Cell or battery" icon={BatteryFull} summary={sourceSummary}>
      <div class="field">
        <Choice name="Cell or battery" options={[['cell', 'One cell'], ['battery', 'Battery of two cells']]} bind:value={gen.s.source} />
      </div>
      <div class="field">Name <LabelField name="Battery name" bind:label={gen.s.sourceName} /></div>
      <div class="field">Value <LabelField name="Battery value" bind:label={gen.s.sourceValue} /></div>
      <label class="check"><input type="checkbox" bind:checked={gen.s.polarity} /> + and − beside it</label>
    </Section>

    <Section title="Switch and meters" icon={Gauge} summary={meterSummary}>
      <div class="field">
        Switch
        <Choice name="Switch" options={[['none', 'None'], ['closed', 'Closed'], ['open', 'Open']]} bind:value={gen.s.switch} />
      </div>
      <label class="check"><input type="checkbox" bind:checked={gen.s.ammeter} /> Ammeter in the main line</label>
      {#if s.ammeter}
        <div class="field">Ammeter reading <LabelField name="Ammeter reading" bind:label={gen.s.ammeterLabel} /></div>
      {/if}
      <label class="field">
        Voltmeter
        <select bind:value={gen.s.voltmeter}>
          {#each voltmeterPlaces as [value, text] (value)}<option {value}>{text}</option>{/each}
        </select>
      </label>
      {#if s.voltmeter !== 'none'}
        <div class="field">Voltmeter reading <LabelField name="Voltmeter reading" bind:label={gen.s.voltmeterLabel} /></div>
      {/if}
    </Section>
    {/if}

    {#if s.editor === 'grid'}
      <SelectedTileOptions selection={selectedTile} settings={gen.s} />
    {/if}

    <Section title="Symbols" icon={Palette} summary={s.symbols === 'us' ? 'US symbols' : 'IEC (UK) symbols'}>
      <div class="field">
        Symbol style
        <Choice name="Symbol style" options={[['us', 'US (zigzag resistor)'], ['iec', 'IEC, UK GCSE (box resistor)']]} bind:value={gen.s.symbols} />
      </div>
    </Section>

    {#if s.editor !== 'grid'}
    <Section title="Chart title" icon={Heading} summary={titleSummary}>
      <div class="field"><LabelField name="Chart title" placeholder="Title" bind:label={gen.s.title} /></div>
    </Section>
    <FigureOptions bind:mirror={gen.s.mirror} bind:color={gen.s.color} />
    {:else}
      <Section title="Figure" icon={SlidersHorizontal} summary={[s.color ? 'color' : 'black and white', s.compactGrid ? 'compact' : ''].filter(Boolean).join(' · ')}>
        <label class="check"><input type="checkbox" bind:checked={gen.s.color} /> Color (for slides)</label>
        <label class="check"><input type="checkbox" bind:checked={gen.s.compactGrid} /> Compact layout</label>
        <p class="note">Shorten empty wire sections in the diagram and exports.</p>
      </Section>
    {/if}
  {/snippet}

  {#snippet figure()}
    {#if s.editor === 'grid'}
      <GridWorkspace compact={s.compactGrid} bind:selection={selectedTile} bind:sideRows={gen.s.sideRows} bind:details={gen.s.gridDetails} bind:tiles={gen.s.circuitTiles} bind:returnTiles={gen.s.returnTiles} bind:columns={gen.s.tileColumns} symbols={s.symbols} color={s.color} />
    {:else}
      <CircuitDiagram settings={s} customCircuit={s.editor === 'custom' ? s.customCircuit : undefined} id="f" />
    {/if}
  {/snippet}
</GeneratorPage>

<style>
  .row { border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
  .row[open] { padding-bottom: 0.75rem; }
  .row-head { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; list-style: none; padding: 0.15rem 0; }
  .row-head::-webkit-details-marker { display: none; }
  .row[open] > .row-head { margin-bottom: 0.25rem; }
  .row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .row-title { font-weight: 800; }
  .row-summary { font-size: 0.8rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row[open] .row-summary { display: none; }
  .chevron { display: inline-flex; color: var(--muted); transform: rotate(-90deg); transition: transform 0.15s; }
  .row[open] .chevron { transform: none; }
  .add { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 9px; }
</style>
