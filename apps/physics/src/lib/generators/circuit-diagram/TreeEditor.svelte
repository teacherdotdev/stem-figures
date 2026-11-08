<script lang="ts">
  import { ChevronDown, Plus, Trash2 } from '@lucide/svelte'
  import { plainText } from './circuit'
  import TreeEditor from './TreeEditor.svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Item, PartKind } from './tree'
  import { cleanCells, MAX_DEPTH, MAX_PARTS, PART_KINDS, newGroup, newPart, partsOf, renumber } from './tree'

  let { items, rootItems = items, depth = 0, polarity = $bindable(false), removable = false, onremove }: { items: Item[]; rootItems?: Item[]; depth?: number; polarity?: boolean; removable?: boolean; onremove?: () => void } = $props()
  const count = $derived([...partsOf(rootItems)].length)
  const canAdd = $derived(count < MAX_PARTS)
  const kindNames: Record<PartKind, string> = { battery: 'Cell or battery', resistor: 'Resistor', bulb: 'Bulb', led: 'LED', diode: 'Diode', switch: 'Switch', ammeter: 'Ammeter' }
  function addPart(kind: PartKind) { if (canAdd) { items.push(newPart(kind)); renumber({ items: rootItems, current: null }) } }
  function addGroup(type: 'series' | 'parallel') { if (count + 2 <= MAX_PARTS && depth < MAX_DEPTH) { items.push(newGroup(type, [newPart('resistor'), newPart('resistor')])); renumber({ items: rootItems, current: null }) } }
  function removeAt(index: number) { items.splice(index, 1) }
</script>

<div class="tree" class:branch={depth > 0}>
  {#each items as item, i (item)}
    <details class="node">
      <summary class="row-head">
        <span class="chevron"><ChevronDown size={16} aria-hidden="true" /></span>
        <span class="row-text">
          <span class="row-title">{item.type === 'part' ? `${kindNames[item.kind]} ${i + 1}` : item.type === 'series' ? 'Series group' : 'Parallel group'}</span>
          <span class="row-summary">{item.type === 'part' ? [item.name, item.value].filter((l) => l.mode === 'text' && l.text.trim()).map((l) => plainText(l.text)).join(' · ') || 'No labels' : `${item.items.length} ${item.type === 'parallel' ? 'branches' : 'items'}`}</span>
        </span>
        {#if items.length > 1 || item.type !== 'part'}
          <button type="button" class="icon-btn" aria-label="Remove component or group" onclick={(e) => { e.preventDefault(); removeAt(i) }}><Trash2 size={17} /></button>
        {/if}
      </summary>
      <div class="node-body">
      {#if item.type === 'part'}
        <div class="line">
          <div class="field">
            <select aria-label="Component" bind:value={item.kind}>
              {#each PART_KINDS as kind}<option value={kind}>{kindNames[kind]}</option>{/each}
            </select>
          </div>

        </div>
        {#if item.kind === 'switch'}
          <label class="check"><input type="checkbox" bind:checked={item.open} /> Open switch</label>
        {/if}
        {#if item.kind === 'battery'}
          <div class="battery-options">
            <label class="field">Cells<input type="number" min="1" max="10" step="1" value={item.cells} onchange={(e) => { item.cells = cleanCells(e.currentTarget.valueAsNumber); e.currentTarget.value = String(item.cells) }} /></label>
            <label class="check battery-check"><input type="checkbox" bind:checked={item.flip} /> Flip battery</label>
            <label class="check battery-check"><input type="checkbox" bind:checked={polarity} /> + and − beside it</label>
          </div>
        {/if}
        <div class="line">
          <div class="field">Label <LabelField name="Component label" placeholder={item.kind === 'resistor' ? 'R_1' : (item.kind === 'led' || item.kind === 'diode') ? 'D_1' : 'Name'} bind:label={item.name} /></div>
          {#if ['resistor', 'bulb', 'led', 'diode', 'battery', 'ammeter'].includes(item.kind)}
            <div class="field">Value <LabelField name="Component value" placeholder="Value or blank" bind:label={item.value} /></div>
          {/if}
        </div>
      {:else}
        <div class="line">
          <Choice name="Group" options={[["series", "Series group"], ["parallel", "Parallel group"]]} bind:value={item.type} />
          {#if item.items.length > 2 && canAdd === false}<span class="muted">Part limit reached</span>{/if}

        </div>
        <TreeEditor items={item.items} {rootItems} depth={depth + 1} bind:polarity />
      {/if}
      </div>
    </details>
  {/each}
  <div class="add-row">
    <label class="field add-select">Add component
      <select onchange={(e) => { const el = e.currentTarget as HTMLSelectElement; const v = (el.value || 'resistor') as PartKind; addPart(v); el.value = '' }} disabled={!canAdd}>
        <option value="">Choose…</option>{#each PART_KINDS as kind}<option value={kind}>{kindNames[kind]}</option>{/each}
      </select>
    </label>
    {#if depth < MAX_DEPTH}
      <button type="button" class="btn-ghost add-group" disabled={count + 2 > MAX_PARTS} onclick={() => addGroup('series')}><Plus size={15} aria-hidden="true" /> Add series group</button>
      <button type="button" class="btn-ghost add-group" disabled={count + 2 > MAX_PARTS} onclick={() => addGroup('parallel')}><Plus size={15} aria-hidden="true" /> Add parallel group</button>
    {/if}
    <span class="muted">{count}/{MAX_PARTS} parts</span>
  </div>
  {#if removable}<button type="button" class="remove-branch" onclick={onremove}>Remove branch</button>{/if}
</div>

<style>
  .tree { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; gap: .55rem; }
  .branch { margin: .35rem 0; padding: 0 0 0 .35rem; border-left: 2px solid var(--border); }
  .node { min-width: 0; padding-bottom: .5rem; border-bottom: 1px solid var(--border); }
  .node-body { display: grid; grid-template-columns: minmax(0, 1fr); gap: .65rem; padding-top: .65rem; }
  .row-head { display: flex; align-items: center; gap: .4rem; cursor: pointer; list-style: none; padding: .15rem 0; }
  .row-head::-webkit-details-marker { display: none; }
  .row-text { display: flex; flex: 1; min-width: 0; flex-direction: column; }
  .row-title { font-weight: 800; }
  .row-summary { font-size: .8rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chevron { display: inline-flex; color: var(--muted); transform: rotate(-90deg); transition: transform .15s; }
  .node[open] > .row-head .chevron { transform: none; }
  .line { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: .55rem; min-width: 0; }
  .field { display: grid; grid-template-columns: minmax(0, 1fr); gap: .25rem; min-width: 0; }
  .check { display: flex; align-items: center; gap: .4rem; font-size: .9rem; flex-wrap: wrap; }
  .tree :global(select), .tree :global(input:not([type="checkbox"])), .tree :global(.label-field) { min-width: 0; max-width: 100%; width: 100%; box-sizing: border-box; }
  .battery-options { display: grid; gap: .25rem; min-width: 0; }
  .battery-check { justify-self: start; flex-wrap: nowrap; }
  .check input[type="checkbox"] { width: auto; flex: 0 0 auto; }
  .tree :global(.segmented) { min-width: 0; display: flex; flex-wrap: wrap; }
  .tree :global(.segmented button) { min-width: 0; flex: 1 1 3rem; white-space: normal; }
  .remove-branch { border: 1px solid var(--border); background: transparent; border-radius: 8px; padding: .38rem .55rem; cursor: pointer; }
  .add-row { display: grid; grid-template-columns: minmax(0, 1fr); gap: .6rem; min-width: 0; padding: .75rem; margin: .25rem 0; border: 1px solid var(--border); border-radius: 10px; }
  .add-select { margin-bottom: .2rem; }
  .add-group { display: flex; align-items: center; justify-content: center; gap: .35rem; padding: .35rem .65rem; border-radius: 9px; white-space: normal; }
  .muted { color: var(--muted); font-size: .8rem; }
  .remove-branch { justify-self: start; }
</style>
