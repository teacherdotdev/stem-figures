<script lang="ts">
  // The Normal Curve Generator: presets and the mean and SD on the left, the
  // figure's settings under them, the figure card on the right. Settings are
  // mirrored into the page address so a bookmark or shared link brings back
  // exactly this curve, and the server renders that same figure on first load.
  import { Heading, MapPin, MoveRight, PaintBucket, Percent, Plus, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { FILLS } from '$lib/stats/fills'
  import NormalCurve from './NormalCurve.svelte'
  import {
    AREA_LABELS, BOUND_LABELS, BYS, KINDS, LOOKS, MARK_LABELS, MAX_MARKS, MAX_REGIONS, NUMBERS, PERCENTS, REACHES, SD_LINES,
    cleanSettings, newRegion, readCurve, settingsFromParams, settingsToQuery, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'normal-curve',
    { history: 'mathfigures.normal-curve.history', presets: 'mathfigures.normal-curve.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readCurve(clean))

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }
  const TITLES = [
    { key: 'title', name: 'Chart title', placeholder: 'IQ scores' },
    { key: 'xTitle', name: 'Axis title', placeholder: 'Score' },
  ] as const
  const ROW_NUMBERS = Object.entries(NUMBERS)

  function addRegion() {
    s.regions.push(newRegion())
    const i = s.regions.length - 1
    requestAnimationFrame(() => document.getElementById(`region-${i}-a`)?.focus())
  }
  function addMark() {
    s.marks.push({ at: '', label: 'value', text: '' })
    const i = s.marks.length - 1
    requestAnimationFrame(() => document.getElementById(`mark-${i}`)?.focus())
  }

  /** What a region's first box asks for, as its label and an example. */
  const firstBox = (r: Settings['regions'][number]) =>
    r.by === 'area'
      ? { name: 'Area', placeholder: r.kind === 'between' ? '0.95' : r.kind === 'outside' ? '0.05' : '0.1' }
      : { name: r.kind === 'between' || r.kind === 'outside' ? 'From' : 'At', placeholder: r.by === 'z' ? '1.5' : example(1) }
  const example = (z: number) => String(Number(read.xOf(z).toPrecision(6)))

  const axisSummary = $derived(
    [REACHES[clean.reach], clean.numbers !== 'none' && NUMBERS[clean.numbers], clean.second !== 'none' && `then ${NUMBERS[clean.second].toLowerCase()}`, clean.density && 'density axis']
      .filter(Boolean)
      .join(' · '),
  )
  const linesSummary = $derived([`SD lines: ${SD_LINES[clean.sdLines].toLowerCase()}`, clean.percents !== 'off' && PERCENTS[clean.percents]].filter(Boolean).join(' · '))
  const regionsSummary = $derived(read.regions.map((r) => r.sentence).join(' · ') || 'None')
  const marksSummary = $derived(read.marks.length ? `${read.marks.length} marked` : 'None')
  const titlesSummary = $derived.by(() => {
    const parts = TITLES.map(({ key, name }) =>
      clean[`${key}Mode`] === 'blank' ? `${name}: blank line` : clean[`${key}Mode`] === 'text' && clean[key].trim() ? `“${clean[key].trim()}”` : '',
    )
    return parts.filter(Boolean).join(' · ') || 'None'
  })

  let svg = $state<SVGSVGElement>()
  const filename = 'normal-curve'
</script>

{#snippet choice({ key, name, options }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options) as [value, title]}
        <button type="button" role="radio" aria-checked={String(clean[key]) === value} class:on={String(clean[key]) === value} onclick={() => ((s as any)[key] = key === 'reach' ? Number(value) : value)}>{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

<GeneratorPage name="Normal Curve Generator" {filename} {gen} {svg} settingsWidth="minmax(26rem, 38%)" bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="data">
      <h2 class="card-head">Distribution</h2>
      <div class="pair">
        <div class="range-field">
          <label for="mean">Mean (μ)</label>
          <input type="text" id="mean" inputmode="decimal" placeholder="0" aria-invalid={!!read.problems.mean} bind:value={s.mean} />
        </div>
        <div class="range-field">
          <label for="sd">Standard deviation (σ)</label>
          <input type="text" id="sd" inputmode="decimal" placeholder="1" aria-invalid={!!read.problems.sd} bind:value={s.sd} />
        </div>
      </div>
      {#if read.problems.mean}<p class="help problem">{read.problems.mean}</p>{/if}
      {#if read.problems.sd}<p class="help problem">{read.problems.sd}</p>{/if}
      {#if read.regions.length}
        <ul class="readout">
          {#each read.regions as r}<li>{r.sentence}</li>{/each}
        </ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Shaded regions" icon={PaintBucket} summary={regionsSummary}>
      {#each s.regions as r, i}
        <fieldset class="item">
          <legend class="sr-only">Region {i + 1}</legend>
          <div class="item-head">
            <select aria-label="Region {i + 1}: shade" bind:value={r.kind}>
              {#each Object.entries(KINDS) as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
            <select aria-label="Region {i + 1}: given as" bind:value={r.by}>
              {#each Object.entries(BYS) as [v, name]}<option value={v}>{name}</option>{/each}
            </select>
            <button type="button" class="icon-btn" aria-label="Remove region {i + 1}" title="Remove" onclick={() => s.regions.splice(i, 1)}><X size={17} /></button>
          </div>
          <div class="pair">
            <label class="range-field">
              {firstBox(r).name}
              <input type="text" id="region-{i}-a" inputmode="decimal" placeholder={firstBox(r).placeholder} aria-invalid={!!read.problems.regions[i]} bind:value={r.a} />
            </label>
            {#if r.by !== 'area' && (r.kind === 'between' || r.kind === 'outside')}
              <label class="range-field">
                To
                <input type="text" inputmode="decimal" placeholder={r.by === 'z' ? '1' : example(1)} aria-invalid={!!read.problems.regions[i]} bind:value={r.b} />
              </label>
            {/if}
          </div>
          {#if read.problems.regions[i]}<p class="help problem">{read.problems.regions[i]}</p>{/if}
          <div class="triple">
            <label class="range-field">
              Area label
              <select bind:value={r.area}>{#each Object.entries(AREA_LABELS) as [v, name]}<option value={v}>{name}</option>{/each}</select>
            </label>
            <label class="range-field">
              Bound labels
              <select bind:value={r.bounds}>{#each Object.entries(BOUND_LABELS) as [v, name]}<option value={v}>{name}</option>{/each}</select>
            </label>
            <label class="range-field">
              Fill
              <select bind:value={r.fill}>
                <option value="">In turn</option>
                {#each Object.entries(FILLS) as [v, name]}<option value={v}>{name}</option>{/each}
              </select>
            </label>
          </div>
        </fieldset>
      {/each}
      {#if s.regions.length < MAX_REGIONS}
        <button type="button" class="add" onclick={addRegion}><Plus size={16} aria-hidden="true" /> Add a region</button>
      {/if}
      {@render choice({ key: 'look', name: 'Look', options: LOOKS })}
    </Section>

    <Section title="SD lines and percents" icon={Percent} summary={linesSummary}>
      {@render choice({ key: 'sdLines', name: 'SD lines', options: SD_LINES })}
      {@render choice({ key: 'percents', name: 'Percent in each section', options: PERCENTS })}
    </Section>

    <Section title="Axis" icon={MoveRight} summary={axisSummary}>
      {@render choice({ key: 'reach', name: 'SD ticks', options: REACHES })}
      <div class="pair">
        <label class="range-field">
          Numbers
          <select bind:value={s.numbers}>{#each ROW_NUMBERS as [v, name]}<option value={v}>{name}</option>{/each}</select>
        </label>
        <label class="range-field">
          Second row
          <select bind:value={s.second}>{#each ROW_NUMBERS as [v, name]}<option value={v}>{name}</option>{/each}</select>
        </label>
      </div>
      <label class="field">
        More ticks at
        <input type="text" inputmode="decimal" placeholder={`${example(0.5)}, ${example(1.5)}`} aria-invalid={!!read.problems.ticks} bind:value={s.ticks} />
      </label>
      {#if read.problems.ticks}<p class="help problem">{read.problems.ticks}</p>{/if}
      <label class="check">
        <input type="checkbox" bind:checked={s.density} />
        <span>Density axis</span>
      </label>
    </Section>

    <Section title="Marked values" icon={MapPin} summary={marksSummary}>
      {#each s.marks as m, i}
        <div class="mark">
          <input type="text" id="mark-{i}" inputmode="decimal" aria-label="Marked value {i + 1}" placeholder={example(1)} aria-invalid={!!read.problems.marks[i]} bind:value={m.at} />
          <select aria-label="Marked value {i + 1}: label" bind:value={m.label}>
            {#each Object.entries(MARK_LABELS) as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
          <button type="button" class="icon-btn" aria-label="Remove marked value {i + 1}" title="Remove" onclick={() => s.marks.splice(i, 1)}><X size={17} /></button>
        </div>
        {#if m.label === 'text'}
          <input type="text" class="mark-text" aria-label="Marked value {i + 1}: text" placeholder="Jo’s score" bind:value={m.text} />
        {/if}
        {#if read.problems.marks[i]}<p class="help problem">{read.problems.marks[i]}</p>{/if}
      {/each}
      {#if s.marks.length < MAX_MARKS}
        <button type="button" class="add" onclick={addMark}><Plus size={16} aria-hidden="true" /> Mark a value</button>
      {/if}
    </Section>

    <Section title="Titles" icon={Heading} summary={titlesSummary}>
      {#each TITLES as { key, name, placeholder }}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} {placeholder} bind:mode={s[`${key}Mode`]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>
  {/snippet}

  {#snippet figure()}
    <NormalCurve settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .data { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .triple { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
  .range-field { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .readout li + li { margin-top: 0.2rem; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .field:last-child { margin-bottom: 0; }
  .check { align-self: flex-start; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }
  .pair + .field, .pair + .help { margin-top: 0.6rem; }

  .item { display: flex; flex-direction: column; gap: 0.5rem; margin: 0 0 0.75rem; padding: 0.7rem; border: 1.5px solid var(--border); border-radius: 12px; }
  .item-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.4rem; align-items: center; }
  .mark { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.4rem; align-items: center; margin-bottom: 0.4rem; }
  .mark-text { width: 100%; margin-bottom: 0.4rem; }
  .add {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.6rem; margin-bottom: 0.75rem;
    border: 1.5px dashed var(--border); border-radius: 999px; background: none; color: var(--blue-dark); font-weight: 700; font-size: 0.85rem;
  }
  .add:hover { background: var(--blue-soft); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
