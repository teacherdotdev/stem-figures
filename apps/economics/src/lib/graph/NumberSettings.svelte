<script lang="ts">
  // The Numbers settings group for a numbered economics graph: each axis's
  // range (From, To, Count by), how often it's numbered, and gridlines. A
  // generator that fits its axes to its data passes `fit` and its own
  // setters, so typing a range takes over from the fitted one.
  import { Hash } from '@lucide/svelte'
  import Section from '$shared/Section.svelte'
  import { axisEnd, type Axis, type RangeSettings } from '$shared/graph/axes'
  import { niceText } from '$shared/graph/numbering'

  type RangeKey = keyof RangeSettings
  interface Props {
    /** the ranges shown: as typed, or fitted */
    shown: RangeSettings
    read: { x: Axis; y: Axis }
    problems: Record<string, string | null>
    type: (key: RangeKey, v: string) => void
    xEvery: number
    yEvery: number
    gridlines: boolean
    minor: number
    /** fit the axes to the figure; left out for a generator that doesn't */
    fit?: boolean
  }
  let {
    shown, read, problems, type, xEvery = $bindable(), yEvery = $bindable(), gridlines = $bindable(), minor = $bindable(), fit = $bindable(),
  }: Props = $props()

  const EVERY: [number, string][] = [[1, 'Every line'], [2, 'Every 2nd line'], [5, 'Every 5th line'], [10, 'Every 10th line'], [0, 'No numbers']]
  const MINOR: [number, string][] = [[0, 'None'], [2, '2 per block'], [4, '4 per block'], [5, '5 per block']]
  const span = (a: Axis) => `${niceText(a.start, a.numbering)} to ${niceText(axisEnd(a), a.numbering)}`
  const summary = $derived([`x ${span(read.x)}`, `y ${span(read.y)}`, fit ? 'fitted' : '', gridlines ? 'gridlines' : 'no gridlines'].filter(Boolean).join(' · '))
</script>

{#snippet range(axis: 'x' | 'y')}
  <div class="axis">
    <span class="axis-name">{axis}-axis</span>
    <div class="ranges">
      {#each [['From', 'From'], ['To', 'To'], ['Step', 'Count by']] as [key, name]}
        {@const k = `${axis}${key}` as RangeKey}
        <label class="range-field">
          <span>{name}</span>
          <input type="text" inputmode="decimal" aria-invalid={!!problems[k]} value={shown[k]} oninput={(e) => type(k, e.currentTarget.value)} />
        </label>
      {/each}
    </div>
    {#each ['From', 'To', 'Step'] as key}
      {#if problems[`${axis}${key}`]}<p class="problem">{problems[`${axis}${key}`]}</p>{/if}
    {/each}
    <label class="field">
      <span>Numbers</span>
      {#if axis === 'x'}
        <select bind:value={xEvery}>{#each EVERY as [v, name]}<option value={v}>{name}</option>{/each}</select>
      {:else}
        <select bind:value={yEvery}>{#each EVERY as [v, name]}<option value={v}>{name}</option>{/each}</select>
      {/if}
    </label>
  </div>
{/snippet}

<Section title="Numbers" icon={Hash} {summary}>
  {#if fit !== undefined}
    <label class="check"><input type="checkbox" bind:checked={fit} /> Fit the axes to the figure</label>
  {/if}
  {@render range('x')}
  {@render range('y')}
  <label class="check"><input type="checkbox" bind:checked={gridlines} /> Gridlines</label>
  {#if gridlines}
    <label class="field">
      <span>Minor gridlines</span>
      <select bind:value={minor}>{#each MINOR as [v, name]}<option value={v}>{name}</option>{/each}</select>
    </label>
  {/if}
</Section>

<style>
  .axis { margin-bottom: 0.85rem; }
  .axis-name { display: block; font-weight: 700; font-size: 0.88rem; margin-bottom: 0.35rem; }
  .ranges { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; margin-bottom: 0.6rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.85rem; min-width: 0; }
  .range-field input { width: 100%; min-width: 0; }
  .problem { margin: -0.2rem 0 0.6rem; font-size: 0.84rem; color: var(--red); font-weight: 600; }
</style>
