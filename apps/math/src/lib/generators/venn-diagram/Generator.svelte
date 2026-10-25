<script lang="ts">
  // The Venn Diagram Generator: presets, then a card of the sets and what's
  // in each region on the left, the look under it, and the figure on the
  // right, where any region can be clicked to fill it in or shade it.
  // Settings are mirrored into the page address so a bookmark or shared link
  // brings back exactly this diagram, and the server renders that same figure
  // on first load.
  import { PaintBucket, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import Popover from '$lib/labeling/Popover.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import { buildVenn } from './layout.js'
  import VennDiagram from './VennDiagram.svelte'
  import {
    ARRANGEMENTS, EMPTIES, LETTERS, MODES, REGION_KEYS, SET_COUNTS, SHADES, SHADE_NAMES, UNIVERSES,
    cleanSettings, regionName, settingsFromParams, settingsToQuery, universeText,
    type RawSettings, type RegionKey, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'venn-diagram',
    { history: 'mathfigures.venn-diagram.history', presets: 'mathfigures.venn-diagram.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const drawing = $derived(buildVenn(clean))
  const read = $derived(drawing.read)

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string> }

  const NAME_KEYS = ['nameA', 'nameB', 'nameC'] as const
  const LIST_KEYS = ['listA', 'listB', 'listC'] as const
  const SET_PLACEHOLDERS = ['2, 4, 6, 8, 10', '3, 6, 9', '5, 10']

  const value = (k: RegionKey) => s.values[k] ?? ''
  const setValue = (k: RegionKey, v: string) => (s.values[k] = v)
  const isShaded = (k: RegionKey) => clean.shaded.includes(k)
  function setShaded(k: RegionKey, on: boolean) {
    s.shaded = on ? REGION_KEYS.filter((r) => r === k || s.shaded.includes(r)) : s.shaded.filter((r) => r !== k)
  }

  // The popup open for one region of the figure, and where.
  let popup = $state<{ key: RegionKey; at: { x: number; y: number } } | null>(null)
  const close = () => (popup = null)
  const open = (part: Part, at: { x: number; y: number }) => (popup = { key: part.key as RegionKey, at })
  // A region that's gone (fewer sets, another arrangement) closes its popup.
  $effect(() => {
    if (popup && !read.keys.includes(popup.key)) close()
  })
  const pickable = $derived({
    frame: { x: 0, y: 0, w: drawing.width, h: drawing.height },
    segments: [],
    angles: [],
    spots: [],
    labels: [],
    areas: drawing.regions.map((r) => ({ key: r.key, d: r.d, anchor: r.anchor, name: r.name })),
  })

  const label = $derived(
    `Venn diagram of ${clean.sets === 1 ? 'one set' : `${clean.sets} sets`}${clean.sets === 2 && clean.arrangement !== 'overlap' ? `, ${ARRANGEMENTS[clean.arrangement].toLowerCase()}` : ''}`,
  )
  const labelsSummary = $derived(
    [
      universeText(clean) ? `Universal set ${universeText(clean)}` : 'No universal set name',
      clean.mode !== 'elements' && clean.empty === 'line' && 'blank lines in empty regions',
    ].filter(Boolean).join(' · '),
  )
  const shadingSummary = $derived(
    `${SHADE_NAMES[clean.shade]} · ${clean.shaded.length ? `${read.keys.filter(isShaded).length} shaded` : 'none shaded'}`,
  )

  let svg = $state<SVGSVGElement>()
  const filename = 'venn-diagram'
</script>

{#snippet choice({ key, name, options }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options) as [v, title]}
        <button type="button" role="radio" aria-checked={String(clean[key]) === v} class:on={String(clean[key]) === v} onclick={() => ((s as any)[key] = key === 'sets' ? Number(v) : v)}>{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet shadeBox(k: RegionKey)}
  <input type="checkbox" class="shade" aria-label="Shade {regionName(clean, k)}" checked={isShaded(k)} onchange={(e) => setShaded(k, e.currentTarget.checked)} />
{/snippet}

<!-- 40% of the window for the settings: the regions take typed text. -->
<GeneratorPage name="Venn Diagram Generator" {filename} {gen} settingsWidth="minmax(28rem, 40%)" {svg} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="card-body">
      <div class="head-row">
        <h2 class="card-head">Sets</h2>
        <HelpTip id="venn-tip" label="How to fill in the diagram">
          Numbers puts one number in each region, such as how many people are in it. Elements sorts lists into the regions for
          you: type the universal set and each set's members with commas between, or a range like 1-20. Repeat an element to
          put it in twice, as for prime factors. Text writes words, a letter or an expression in each region, like x, 2x + 1 or 3/20; commas split it into lines, as in red flesh, mushy, savory. Leave a
          region empty for students to fill in. Click any region on the figure to fill it in or shade it.
        </HelpTip>
      </div>
      {@render choice({ key: 'mode', name: 'In each region', options: MODES })}
      {@render choice({ key: 'sets', name: 'Sets', options: Object.fromEntries(SET_COUNTS.map((n) => [n, String(n)])) })}
      {#if clean.sets === 2}{@render choice({ key: 'arrangement', name: 'Arrangement', options: ARRANGEMENTS })}{/if}

      {#if clean.mode === 'elements'}
        <div class="lists">
          <span class="set-name universe" class:word={[...universeText(clean)].length > 1} aria-hidden="true">{universeText(clean) || 'U'}</span>
          <input type="text" aria-label="Members of the universal set" placeholder="1-20" bind:value={s.universeList} />
          {#each NAME_KEYS.slice(0, clean.sets) as key, i}
            <input type="text" class="set-name" aria-label="Name of set {LETTERS[i]}" placeholder={LETTERS[i]} bind:value={s[key]} />
            <input type="text" aria-label="Members of {clean[key].trim() || LETTERS[i]}" placeholder={SET_PLACEHOLDERS[i]} bind:value={s[LIST_KEYS[i]]} />
          {/each}
        </div>
        {#if read.problems.elements}<p class="help problem">{read.problems.elements}</p>{/if}
        <div class="regions elements" role="group" aria-label="Shaded regions">
          <span class="col-head">Region</span><span class="col-head shade-head">Shaded</span>
          {#each read.keys as k (k)}
            <span class="region-name">{regionName(clean, k)}</span>
            {@render shadeBox(k)}
          {/each}
        </div>
      {:else}
        <div class="field">
          <span id="names-label">Names</span>
          <div class="names" role="group" aria-labelledby="names-label">
            {#each NAME_KEYS.slice(0, clean.sets) as key, i}
              <input type="text" class="set-name" aria-label="Name of set {LETTERS[i]}" placeholder={LETTERS[i]} bind:value={s[key]} />
            {/each}
          </div>
        </div>
        <div class="regions" role="group" aria-label="Regions">
          <span class="col-head">Region</span><span class="col-head">{clean.mode === 'numbers' ? 'Number' : 'Text'}</span><span class="col-head shade-head">Shaded</span>
          {#each read.keys as k (k)}
            <label class="region-name" for="region-{k}">{regionName(clean, k)}</label>
            {#if clean.mode === 'numbers'}
              <input
                type="text" class="value" id="region-{k}" inputmode="decimal" aria-invalid={!!read.problems.values[k]}
                bind:value={() => value(k), (v) => setValue(k, v)}
              />
            {:else}
              <input type="text" class="text" id="region-{k}" bind:value={() => value(k), (v) => setValue(k, v)} />
            {/if}
            {@render shadeBox(k)}
            {#if read.problems.values[k]}<p class="help problem wide">{read.problems.values[k]}</p>{/if}
          {/each}
        </div>
      {/if}

      {#if drawing.problem}<p class="help problem">{drawing.problem}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Labels" icon={Type} summary={labelsSummary}>
      {@render choice({ key: 'universe', name: 'Universal set', options: UNIVERSES })}
      {#if clean.universe === 'word'}
        <label class="field">
          <span>Universal set’s name</span>
          <input type="text" placeholder="Students" bind:value={s.universeWord} />
        </label>
      {/if}
      {#if clean.mode !== 'elements'}{@render choice({ key: 'empty', name: 'Empty regions', options: EMPTIES })}{/if}
    </Section>

    <Section title="Shading" icon={PaintBucket} summary={shadingSummary}>
      <label class="field">
        <span>Fill</span>
        <select bind:value={s.shade}>
          {#each SHADES as v}<option value={v}>{SHADE_NAMES[v]}</option>{/each}
        </select>
      </label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <div class="stage">
      <VennDiagram layout={drawing} {label} bind:svg />
      <PickLayer figure={pickable} selected={popup ? { kind: 'area', key: popup.key } : null} onpick={open} />
    </div>
  {/snippet}
</GeneratorPage>

{#if popup}
  {@const k = popup.key}
  <Popover at={popup.at} onclose={close} label="Settings for this region">
    <div class="pop-head"><span>{regionName(clean, k)}</span></div>
    {#if clean.mode === 'numbers'}
      <label class="group">
        <span class="name">Number</span>
        <input type="text" inputmode="decimal" aria-invalid={!!read.problems.values[k]} bind:value={() => value(k), (v) => setValue(k, v)} />
      </label>
      {#if read.problems.values[k]}<p class="help problem">{read.problems.values[k]}</p>{/if}
    {:else if clean.mode === 'text'}
      <div class="group">
        <span class="name" id="pop-text">Text</span>
        <input type="text" aria-labelledby="pop-text" bind:value={() => value(k), (v) => setValue(k, v)} />
      </div>
    {/if}
    <label class="check">
      <input type="checkbox" checked={isShaded(k)} onchange={(e) => setShaded(k, e.currentTarget.checked)} />
      <span>Shaded</span>
    </label>
  </Popover>
{/if}

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .help { margin: 0; font-size: 0.84rem; }
  .help.problem { color: var(--red); font-weight: 600; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .card-body .part { margin-bottom: 0; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .card-body .field { margin-bottom: 0; }
  .field:last-child { margin-bottom: 0; }

  .names { display: flex; gap: 0.4rem; }
  .names input { flex: 1; min-width: 0; }
  .set-name { font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; }

  /* Elements: the universal set, then each set, a name and its members. */
  .lists { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: 0.4rem; align-items: center; }
  .lists input { min-width: 0; }
  .universe { font-style: italic; font-size: 1.2rem; padding-left: 0.55rem; overflow-wrap: anywhere; }
  .universe.word { font-style: normal; font-size: 1.05rem; }

  /* Each region: its name, what's in it, and whether it's shaded. */
  .regions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.35rem 0.6rem; align-items: center; }
  .regions.elements { grid-template-columns: minmax(0, 1fr) auto; }
  .col-head { font-size: 0.75rem; font-weight: 700; color: var(--muted); }
  .region-name { font-size: 0.88rem; font-weight: 600; overflow-wrap: anywhere; }
  .regions input.value { min-width: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .regions .wide { grid-column: 1 / -1; }
  .shade-head { justify-self: center; }
  .shade { justify-self: center; width: 1.05rem; height: 1.05rem; margin: 0 0.6rem; accent-color: var(--blue); }

  /* The counts run on in lines, each kept whole where it fits; each region's members get a line of their own. */

  .stage { position: relative; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); }
</style>
