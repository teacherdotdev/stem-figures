<script lang="ts">
  // The Grid settings group: minor gridlines inside each block, and, for a
  // graph that offers it, how the gridlines are drawn (bind `gridlines`).
  import { Grid3x3 } from '@lucide/svelte'
  import Section from '../Section.svelte'
  import { minorSummary } from './axes'
  import { GRIDLINES, type Gridlines } from './grid'

  let { minor = $bindable(), gridlines = $bindable() }: { minor: number; gridlines?: Gridlines } = $props()

  const MINOR_OPTIONS: [number, string][] = [
    [0, 'None'],
    [2, '2 per block'],
    [4, '4 per block'],
    [5, '5 per block'],
  ]

  const summary = $derived(
    gridlines === 'none'
      ? 'No gridlines'
      : [gridlines && gridlines !== 'standard' ? `${GRIDLINES[gridlines]} gridlines` : '', minorSummary(minor)].filter(Boolean).join(', '),
  )
</script>

<Section title="Grid" icon={Grid3x3} {summary}>
  {#if gridlines !== undefined}
    <label class="field">
      <span>Gridlines <span class="hint">bold for photocopies</span></span>
      <select bind:value={gridlines}>
        {#each Object.entries(GRIDLINES) as [v, name]}<option value={v}>{name}</option>{/each}
      </select>
    </label>
  {/if}
  {#if gridlines !== 'none'}
    <label class="field">
      Minor gridlines
      <select bind:value={minor}>
        {#each MINOR_OPTIONS as [v, name]}<option value={v}>{name}</option>{/each}
      </select>
    </label>
  {/if}
</Section>

<style>
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .field + .field { margin-top: 0.75rem; }
  .field .hint { font-weight: 400; color: var(--muted); }
</style>
