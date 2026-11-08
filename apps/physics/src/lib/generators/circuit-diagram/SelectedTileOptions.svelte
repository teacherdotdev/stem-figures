<script lang="ts">
  import { CircuitBoard } from '@lucide/svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { downloadSymbol, importCustomSymbol } from './customSymbol'
  import type { CircuitSettings } from './settings'
  import type { TileSelection } from './tileSelection'
  let { selection, settings }: { selection: TileSelection | null; settings: CircuitSettings } = $props()
  let inspectorOpen = $state(true)
  $effect(() => { if (selection) inspectorOpen = true })
  const names = { wire: 'Wire', resistor: 'Resistor', bulb: 'Bulb', led: 'LED', diode: 'Diode', battery: 'Battery', cell: 'Cell', switch: 'Switch', ammeter: 'Ammeter', voltmeter: 'Voltmeter', custom: 'Custom SVG' }
  const tile = $derived(selection?.region === 'main' ? settings.circuitTiles.find(t => t.column === selection?.column && t.branch === selection?.branch) : settings.returnTiles.find(t => t.side === selection?.region && t.index === selection?.column && t.branch === selection?.branch))
  const kind = $derived(tile?.kind ?? 'wire')
  const detail = $derived(settings.gridDetails.find(d => d.region === selection?.region && d.column === selection?.column && d.branch === selection?.branch))
  const placeholders = {
    wire: ['', ''],
    custom: ['U₁', 'e.g. a rating or x for students to find'],
    resistor: ['R₁', '4 ohm, or x for students to find'],
    bulb: ['L₁', '6 V, or x for students to find'],
    led: ['D₁', '2 V, or x for students to find'],
    diode: ['D₁', '0.7 V, or x for students to find'],
    battery: ['ε', '12 V, or x for students to find'],
    cell: ['ε', '1.5 V, or x for students to find'],
    switch: ['S₁', 'e.g. closed or open'],
    ammeter: ['A₁', '0.5 A, or x for students to find'],
    voltmeter: ['V₁', '6 V, or x for students to find'],
  }
  $effect(() => {
    if (selection && kind !== 'wire' && !detail) update({ name: { mode: 'text', text: '' }, value: { mode: 'text', text: '' } })
  })
  function changeKind(value: string) {
    if (!selection) return
    const kind = value as keyof typeof names
    if (tile) tile.kind = kind
    else if (selection.region === 'main') settings.circuitTiles.push({ column: selection.column, branch: selection.branch, kind })
    else settings.returnTiles.push({ side: selection.region, index: selection.column, branch: selection.branch, kind })
  }
  function update(patch: Partial<CircuitSettings['gridDetails'][number]>) {
    if (!selection) return
    if (detail) Object.assign(detail, patch)
    else settings.gridDetails.push({ ...selection, name: { mode: 'none', text: '' }, value: { mode: 'none', text: '' }, cells: 2, open: false, flip: false, customSvg: '', ...patch })
  }
  const savedSymbols = $derived(settings.gridDetails.filter((d, i, all) => d.customSvg && all.findIndex(other => other.customSvg === d.customSvg) === i))
  let importError = $state('')
  $effect(() => {
    JSON.stringify(selection)
    importError = ''
  })
  async function upload(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const target = selection ? { ...selection } : null
    importError = ''
    try {
      if (file.size > 64 * 1024) throw new Error('Choose an SVG smaller than 64 KB.')
      const svg = importCustomSymbol(await file.text())
      if (!target || target.region !== selection?.region || target.column !== selection?.column || target.branch !== selection?.branch) return
      update({ customSvg: svg })
    } catch (error) { importError = error instanceof Error ? error.message : 'Could not read this SVG.' }
    input.value = ''
  }
</script>

<Section bind:open={inspectorOpen} title="Selected component" icon={CircuitBoard} summary={selection ? names[kind] : 'Select a tile'}>
  {#if selection}
    <label class="field">Component<select value={kind} onchange={e => changeKind(e.currentTarget.value)}>{#each Object.entries(names) as [value, name]}<option {value}>{name}</option>{/each}</select></label>
    {#if kind === 'custom'}
      <div class="custom-symbol">
        <p class="note">Download the template, edit it in your SVG editor, then import it here. Keep its size and terminal wires unchanged. Red guides are removed on import.</p>
        <button type="button" class="btn-ghost" onclick={() => downloadSymbol()}>Download SVG template</button>
        {#if savedSymbols.length}
          <label class="field">Reuse a symbol<select value="" onchange={e => { if (e.currentTarget.value) update({ customSvg: e.currentTarget.value }) }}><option value="">Choose an imported symbol…</option>{#each savedSymbols as symbol, i}<option value={symbol.customSvg}>{symbol.name.text || `Custom symbol ${i + 1}`}</option>{/each}</select></label>
        {/if}
        <label class="field">{detail?.customSvg ? 'Replace SVG' : 'Import SVG'}<input type="file" accept=".svg,image/svg+xml" onchange={upload} /></label>
        {#if detail?.customSvg}<button type="button" class="btn-ghost" onclick={() => downloadSymbol(importCustomSymbol(detail.customSvg), 'custom-circuit-symbol.svg')}>Export this symbol</button>{/if}
        {#if importError}<p class="import-error" role="alert">{importError}</p>{/if}
        <p class="note">Two terminals: left (−30, 0), right (30, 0). Draw inside the red box. Use paths and basic shapes; convert text to paths for consistent exports.</p>
      </div>
    {/if}
    {#if kind !== 'wire' && detail}
      {#key `${selection.region}:${selection.column}:${selection.branch}`}
        <div class="field">Name
          <LabelField name="Component name" placeholder={placeholders[kind][0]} bind:label={detail.name} />
        </div>
        <div class="field">Value
          <LabelField name="Component value" placeholder={placeholders[kind][1]} bind:label={detail.value} />
        </div>
      {/key}
    {/if}
    {#if kind === 'battery'}<label class="field">Cells<input type="number" min="1" max="3" value={detail?.cells ?? 2} onchange={e => update({ cells: Math.max(1, Math.min(3, e.currentTarget.valueAsNumber || 2)) })} /></label>{/if}
    {#if kind === 'battery' || kind === 'cell'}<label class="check"><input type="checkbox" checked={detail?.flip ?? false} onchange={e => update({ flip: e.currentTarget.checked })} /> Flip polarity</label>{/if}
    {#if kind === 'switch'}<label class="check"><input type="checkbox" checked={detail?.open ?? false} onchange={e => update({ open: e.currentTarget.checked })} /> Open switch</label>{/if}
  {:else}<p class="note">Select a tile in the diagram to edit it.</p>{/if}
</Section>


<style>
  .custom-symbol { display: grid; gap: .75rem; margin-bottom: 1rem; }
  .custom-symbol .note, .custom-symbol .field { margin: 0; }
  .custom-symbol .btn-ghost { padding: .55rem .75rem; }
  .import-error { color: #b91c1c; font-size: .85rem; margin: 0; }
</style>
