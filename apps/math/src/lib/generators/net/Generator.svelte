<script lang="ts">
  // The Net Generator: presets, the 3D shape and its measures, and collapsed
  // settings on the left, the net on the right. Settings are mirrored into the
  // page address so a bookmark or shared link brings back exactly this net,
  // and the server renders that same net on first load. When the measures
  // stop making a shape, the last one that did stays on screen.
  import { Box, PenLine, Tag } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import MathInput from '$lib/shared/MathInput.svelte'
  import Section from '$shared/Section.svelte'
  import PartLabel from '$lib/shapes/PartLabel.svelte'
  import { ROUND_NAMES, UNITS, pretty, roundTo } from '$lib/shapes/parts.js'
  import { CUBE_NETS, cornersOf } from './cubes.js'
  import { buildNet } from './layout.js'
  import Net from './Net.svelte'
  import {
    BASES, DEFAULT_SETTINGS, FACE_TEXT, FOLDS, MEASURES, PYRAMID_BASES, SIDE_COUNTS, SHAPES, cleanSettings, readMoved, settingsFromParams,
    settingsToQuery, writeMoved, type Base, type Measure, type Offset, type Part, type RawSettings, type Settings, type ShapeKind,
  } from './settings.js'
  import { partName, readNet, type NetRead } from './solve.js'

  const gen = generatorState({ tidy: (s) => cleanSettings(s as RawSettings), fromParams: settingsFromParams, toQuery: settingsToQuery, keyOf: settingsToQuery }, 'net')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readNet(clean))
  const form = $derived(read.form)

  // The last settings that made a shape, drawn in place of ones that don't.
  type Good = NetRead & { values: Record<Part, number>; settings: Settings }
  const opening = cleanSettings(DEFAULT_SETTINGS)
  let lastGood = { ...readNet(opening), settings: opening } as Good // the opening net always makes one
  const good = $derived.by(() => {
    if (read.values) lastGood = { ...read, settings: clean } as Good
    return lastGood
  })
  const drawing = $derived(buildNet(read.values ? clean : { ...good.settings, labelSize: clean.labelSize, moved: clean.moved }, good))

  const title = (k: Part) => {
    const n = partName(clean, form, k)
    return n[0].toUpperCase() + n.slice(1)
  }
  const typed = (k: Part) => (form.inputs as Part[]).includes(k)
  const labeled = (k: Part) => form.parts.includes(k)
  const unitText = $derived(clean.unit.trim() ? ` ${clean.unit.trim()}` : '')
  const solvedText = (k: Part) => (read.values ? roundTo(read.values[k], clean.round) : '')
  function measureText(k: Part) {
    if (k === 'angle') return `${solvedText(k) || '?'}°`
    const given = typed(k) ? clean[k as Measure].trim() : ''
    return `${given ? pretty(given) : solvedText(k) || '?'}${unitText}`
  }
  const measureNote = (k: Part) =>
    typed(k) && clean[k as Measure].trim() ? 'Its measure, as you typed it.' : `Rounded to the nearest ${['whole number', 'tenth', 'hundredth'][clean.round]}.`
  const fieldProblem = $derived(form.inputs.map((k) => read.problems[k]).find(Boolean) ?? null)

  /** How to fill in the measures, for the help tip. */
  const measureHelp = $derived(
    form.shape === 'pyramid' || form.shape === 'cone'
      ? 'Give the height or the slant height, and the other is worked out. Only the slant height is on the net.'
      : form.shape === 'cube' ? 'Give the length of an edge.' : 'Give every measure.',
  )

  function moveLabel(part: string, offset: Offset) {
    const moved = readMoved(s.moved)
    moved[part] = offset
    s.moved = writeMoved(moved)
  }

  // "Other…" stays picked while its box is still empty.
  let pickedOther = $state(false)
  const otherUnit = $derived(pickedOther || !UNITS.includes(clean.unit))
  function chooseUnit(event: Event & { currentTarget: HTMLSelectElement }) {
    const v = event.currentTarget.value
    pickedOther = v === 'other'
    s.unit = pickedOther ? '' : v
  }
  // A preset brings its own unit, so "Other…" is unpicked first.
  const page = { ...gen, apply: (preset: Settings) => ((pickedOther = false), gen.apply(preset)) }

  const hasSquares = $derived(form.shape === 'pyramid' || (form.shape === 'prism' && form.base !== 'rectangle'))
  const linesSummary = $derived(
    [`${FOLDS[clean.fold].toLowerCase()} folds`, clean.tabs ? 'glue tabs' : 'no tabs', hasSquares ? (clean.square ? 'right-angle squares' : 'no right-angle squares') : '']
      .filter(Boolean).join(' · '),
  )
  const facesSummary = $derived(
    [clean.faceText === 'none' ? 'nothing in the faces' : FACE_TEXT[clean.faceText].toLowerCase(), clean.shade ? 'matching faces tinted' : '', clean.showShape ? 'the 3D shape beside it' : '']
      .filter(Boolean).join(' · '),
  )
  const labelsSummary = $derived(
    [clean.unit.trim() || 'no unit', `rounded to ${ROUND_NAMES[clean.round]}`, clean.moved ? 'labels moved' : ''].filter(Boolean).join(' · '),
  )

  // Each cube net, drawn small for its button.
  const CELL = 9
  const netIcon = (i: number) => {
    const cells = CUBE_NETS[i]
    const w = Math.max(...cells.map((c) => c[0])) + 1
    const h = Math.max(...cells.map((c) => c[1])) + 1
    return { w: w * CELL + 2, h: h * CELL + 2, d: cells.map((c) => `M${cornersOf(c).map(([x, y]) => `${x * CELL + 1},${y * CELL + 1}`).join(' L')} Z`).join(' ') }
  }

  let svg = $state<SVGSVGElement>()
  const filename = $derived(`${form.shape}-net`)
  const figureName = $derived(`Net of a ${form.shape === 'prism' || form.shape === 'pyramid' ? `${BASES[form.base].toLowerCase()} ${form.shape}` : form.shape}`)
</script>

{#snippet choice(labelId: string, options: [any, string][], value: any, pick: (v: any) => void)}
  <div class="segmented" role="radiogroup" aria-labelledby={labelId}>
    {#each options as [v, title]}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => pick(v)}>{title}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Net Generator" {filename} gen={page} {svg} bind:labelSize={s.labelSize} printWidth={6.5}>
  {#snippet inputs()}
    <section class="measures">
      <h2 class="card-head">Shape</h2>
      <label class="field">
        3D shape
        <select value={form.shape} onchange={(e) => (s.shape = e.currentTarget.value as ShapeKind)}>
          {#each Object.entries(SHAPES) as [value, name]}<option {value}>{name}</option>{/each}
        </select>
      </label>

      {#if form.shape === 'prism' || form.shape === 'pyramid'}
        <div class="two">
          <label class="field">
            Base
            <select value={form.base} onchange={(e) => (s.base = e.currentTarget.value as Base)}>
              {#each Object.entries(BASES) as [value, name]}
                {#if form.shape === 'prism' || PYRAMID_BASES.includes(value as Base)}<option {value}>{name}</option>{/if}
              {/each}
            </select>
          </label>
          {#if form.base === 'regular'}
            <label class="field">
              Sides
              <select bind:value={s.sides}>
                {#each SIDE_COUNTS as n}<option value={n}>{n}</option>{/each}
              </select>
            </label>
          {/if}
        </div>
      {/if}

      {#if form.shape === 'cube'}
        <div class="field">
          <span id="cube-net">Net</span>
          <div class="nets" role="radiogroup" aria-labelledby="cube-net">
            {#each CUBE_NETS as _, i}
              {@const icon = netIcon(i)}
              <button type="button" role="radio" aria-checked={clean.cubeNet === i + 1} aria-label="Cube net {i + 1}" class:on={clean.cubeNet === i + 1} onclick={() => (s.cubeNet = i + 1)}>
                <svg viewBox="0 0 {icon.w} {icon.h}" width={icon.w} height={icon.h} aria-hidden="true"><path d={icon.d} /></svg>
                <span>{i + 1}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="head-row">
        <h2 class="card-head">Measures</h2>
        <HelpTip id="measure-tip" label="How to give the measures">
          {measureHelp} Worked-out measures are shown faintly. Type sqrt for √, / for a fraction and pi for π.
        </HelpTip>
      </div>
      {#each form.rows as k (k)}
        <div class="row">
          <span class="pname">{title(k)}</span>
          {#if typed(k)}
            <MathInput
              id="m-{k}" aria-label={title(k)} placeholder={clean[k as Measure].trim() ? '' : solvedText(k)}
              aria-invalid={!!read.problems[k]} bind:value={s[k as Measure]}
            />
          {:else}
            <span class="solved" aria-label="{title(k)}, worked out">{solvedText(k) || '?'}</span>
          {/if}
          <span class="suffix unit" aria-hidden="true">{k === 'angle' ? '°' : clean.unit.trim()}</span>
          {#if labeled(k)}
            <PartLabel
              name={title(k)} id="l-{k}" given={typed(k) && !!clean[k as Measure].trim()} measure={measureText(k)} note={measureNote(k)}
              bind:mode={s[`${k}Label` as const]} bind:text={s[`${k}Text` as const]}
            />
          {:else}
            <span class="not-on" title="Not on the net">—</span>
          {/if}
        </div>
      {/each}
      {#if form.rows.includes('radius')}
        <label class="check diameter">
          <input type="checkbox" bind:checked={s.diameter} />
          <span>Give the diameter instead <span class="hint">drawn right across the circle</span></span>
        </label>
      {/if}

      {#if fieldProblem}<p class="help problem">{fieldProblem}</p>
      {:else if read.problem}<p class="help problem">{read.problem}</p>{/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Lines" icon={PenLine} summary={linesSummary}>
      <div class="field">
        <span id="folds">Fold lines</span>
        {@render choice('folds', Object.entries(FOLDS), clean.fold, (v) => (s.fold = v))}
      </div>
      <label class="check">
        <input type="checkbox" bind:checked={s.tabs} />
        <span>Glue tabs <span class="hint">on one of each pair of edges that meet when it’s folded, for cutting it out</span></span>
      </label>
      {#if hasSquares}
        <label class="check">
          <input type="checkbox" bind:checked={s.square} />
          <span>Right-angle squares <span class="hint">where a height or slant height meets a side</span></span>
        </label>
      {/if}
    </Section>

    <Section title="Faces" icon={Box} summary={facesSummary}>
      <label class="field">
        In each face
        <select bind:value={s.faceText}>
          {#each Object.entries(FACE_TEXT) as [value, name]}<option {value}>{name}</option>{/each}
        </select>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.shade} />
        <span>Tint matching faces <span class="hint">faces the same shape and size share a color</span></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.showShape} />
        <span>Show the 3D shape <span class="hint">beside the net, the shape it folds into</span></span>
      </label>
    </Section>

    <Section title="Labels" icon={Tag} summary={labelsSummary}>
      <div class="two">
        <label class="field">
          Unit
          <select value={otherUnit ? 'other' : clean.unit} onchange={chooseUnit}>
            <option value="">None</option>
            {#each UNITS.slice(1) as u}<option value={u}>{u}</option>{/each}
            <option value="other">Other…</option>
          </select>
        </label>
        <label class="field">
          Round to
          <select bind:value={s.round}>
            <option value={0}>Whole numbers</option>
            <option value={1}>Tenths</option>
            <option value={2}>Hundredths</option>
          </select>
        </label>
      </div>
      {#if otherUnit}
        <label class="field">
          Unit name
          <input type="text" maxlength="12" placeholder="km" bind:value={s.unit} />
        </label>
      {/if}
      <div class="reset-row">
        <p class="hint">Drag any label on the figure to move it.</p>
        <button class="btn-ghost small" disabled={!clean.moved} onclick={() => (s.moved = '')}>Reset label positions</button>
      </div>
    </Section>
  {/snippet}

  {#snippet figure()}
    <Net figure={drawing} bind:svg label={figureName} onmove={moveLabel} />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .measures { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.3rem; }
  .row > :global(.caret-field) { flex: 1; min-width: 0; }
  .pname { width: 6.6rem; flex: none; font-weight: 600; font-size: 0.86rem; }
  .solved { flex: 1; min-width: 0; padding: 0.45rem 0.6rem; font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; color: var(--muted); }
  .suffix { width: 1.6rem; flex: none; font-family: 'Times New Roman', Times, serif; font-size: 1.1rem; color: var(--muted); }
  .suffix.unit { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .not-on { width: 5.2rem; flex: none; text-align: center; color: var(--muted); }

  .help { margin: 0.2rem 0 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .hint { font-weight: 400; color: var(--muted); font-size: 0.84rem; margin: 0; }

  .check { display: flex; align-items: flex-start; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0.08rem 0 0; accent-color: var(--blue); flex: none; }
  .check .hint { display: block; }
  .check.diameter { margin: 0.2rem 0 0; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.4rem; }
  .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .segmented button { flex: 1; display: inline-grid; place-items: center; padding: 0.3rem 0.4rem; }

  .nets { display: grid; grid-template-columns: repeat(auto-fill, minmax(3.6rem, 1fr)); gap: 0.35rem; }
  .nets button {
    display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 0.2rem;
    padding: 0.35rem 0.2rem 0.2rem; border: 1px solid var(--border); border-radius: 8px; background: var(--card, #fff);
    font-size: 0.72rem; font-weight: 600; color: var(--muted); cursor: pointer;
  }
  .nets button.on { border-color: var(--blue); box-shadow: 0 0 0 1px var(--blue); color: var(--ink, inherit); }
  .nets svg { display: block; max-width: 100%; height: auto; }
  .nets path { fill: none; stroke: currentColor; stroke-width: 1; }

  .reset-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.85rem; border-radius: 10px; white-space: nowrap; }
</style>
