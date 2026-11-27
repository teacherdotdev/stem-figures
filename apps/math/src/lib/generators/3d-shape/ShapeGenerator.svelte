<script lang="ts">
  // A 3D shape's generator, the same page for every kind (the Prism
  // Generator, the Cone Generator …): presets, the shape and its measures, and
  // collapsed settings on the left, the figure card on the right. Settings are
  // mirrored into the page address so a bookmark or shared link brings back
  // exactly this shape, and the server renders that same shape on first load.
  // When the measures stop making a shape, the last one that did stays on screen.
  import { Move, PenLine, Tag } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import MathInput from '$lib/shared/MathInput.svelte'
  import Section from '$shared/Section.svelte'
  import PartLabel from '$lib/shapes/PartLabel.svelte'
  import { ROUND_NAMES, UNITS, pretty, roundTo } from '$lib/shapes/parts.js'
  import { buildShape } from './layout.js'
  import {
    BASES, PYRAMID_BASES, SHAPES, SIDE_COUNTS, SOLVED_ONLY, readMoved, settingsFor, writeMoved,
    type Base, type Kind, type Measure, type Offset, type Part, type RawSettings, type Settings,
  } from './settings.js'
  import Shape3D from './Shape3D.svelte'
  import { partName, readShape, type ShapeRead } from './solve.js'

  let { kind }: { kind: Kind } = $props()
  // A generator's kind never changes while its page is open.
  // svelte-ignore state_referenced_locally
  const { DEFAULT_SETTINGS, cleanSettings, settingsFromParams, settingsToQuery, shapes } = settingsFor(kind)

  // svelte-ignore state_referenced_locally
  const gen = generatorState({ tidy: (s) => cleanSettings(s as RawSettings), fromParams: settingsFromParams, toQuery: settingsToQuery, keyOf: settingsToQuery }, kind)
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const read = $derived(readShape(clean))
  const form = $derived(read.form)

  // The last settings that made a shape, drawn in place of ones that don't.
  type Good = ShapeRead & { values: Record<Part, number>; settings: Settings }
  const opening = cleanSettings(DEFAULT_SETTINGS)
  let lastGood = { ...readShape(opening), settings: opening } as Good // the opening shape always makes one
  const good = $derived.by(() => {
    if (read.values) lastGood = { ...read, settings: clean } as Good
    return lastGood
  })
  const drawing = $derived(buildShape(read.values ? clean : { ...good.settings, labelSize: clean.labelSize, moved: clean.moved }, good))

  const title = (k: Part) => {
    const n = partName(clean, form, k)
    return n[0].toUpperCase() + n.slice(1)
  }
  const solvedOnly = (k: Part) => (SOLVED_ONLY as readonly string[]).includes(k)
  const unitText = $derived(clean.unit.trim() ? ` ${clean.unit.trim()}` : '')
  const rounded = (v: number) => roundTo(v, clean.round)
  const solvedText = (k: Part) => (read.values ? rounded(read.values[k]) : '')
  function measureText(k: Part) {
    const typed = solvedOnly(k) ? '' : clean[k as Measure].trim()
    return `${typed ? pretty(typed) : solvedText(k) || '?'}${unitText}`
  }
  const measureNote = (k: Part) =>
    !solvedOnly(k) && clean[k as Measure].trim() ? 'Its measure, as you typed it.' : `Its measure, worked out from the others and rounded to ${ROUND_NAMES[clean.round]}.`
  const fieldProblem = $derived(form.parts.map((k) => read.problems[k]).find(Boolean) ?? null)

  /** How to fill in the measures, for the help tip. */
  const measureHelp = $derived(
    form.oblique && (form.shape === 'prism' || form.shape === 'cylinder')
      ? 'Give any two of the height, lean and slanted edge, and the third is worked out.'
      : form.parts.includes('slant')
        ? 'Give the height or the slant height, and the other is worked out.'
        : 'Give every measure.',
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

  const round = $derived(!(form.shape === 'prism' || form.shape === 'pyramid'))
  const canLie = $derived(form.shape === 'prism' && form.base !== 'rectangle')
  const canLean = $derived(form.shape !== 'sphere' && form.shape !== 'hemisphere' && !form.lie)
  const hasHeightLine = $derived(form.shape === 'pyramid' || form.shape === 'cone' || form.oblique)
  const cornerCount = $derived(round ? 0 : form.shape === 'prism' ? (form.base === 'rectangle' ? 4 : form.base === 'regular' ? form.sides : 3) * 2 : (form.base === 'rectangle' ? 4 : form.sides) + 1)
  const autoNames = $derived(Array.from({ length: cornerCount }, (_, i) => String.fromCharCode(65 + i)).join(' '))

  const linesSummary = $derived(
    [clean.hidden ? 'hidden edges dashed' : 'no hidden edges', hasHeightLine ? (clean.showHeight ? 'height shown' : 'no height') : '', clean.square ? 'right-angle squares' : 'no right-angle squares']
      .filter(Boolean).join(' · '),
  )
  const labelsSummary = $derived(
    [
      clean.unit.trim() || 'no unit',
      `rounded to ${ROUND_NAMES[clean.round]}`,
      !round && clean.names ? 'corners named' : '',
      clean.moved ? 'labels moved' : '',
    ].filter(Boolean).join(' · '),
  )
  const positionSummary = $derived(
    [round ? '' : `depth goes back to the ${clean.depth}`, form.shape === 'hemisphere' ? (clean.bowl ? 'flat face up' : 'flat face down') : ''].filter(Boolean).join(' · ') || 'Seen from a little above',
  )

  let svg = $state<SVGSVGElement>()
  const filename = $derived(form.shape)
</script>

{#snippet choice(labelId: string, options: [any, string][], value: any, pick: (v: any) => void)}
  <div class="segmented" role="radiogroup" aria-labelledby={labelId}>
    {#each options as [v, title]}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => pick(v)}>{title}</button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="{SHAPES[kind]} Generator" {filename} gen={page} {svg} bind:labelSize={s.labelSize} printWidth={6}>
  {#snippet inputs()}
      <section class="measures">
        <h2 class="card-head">Shape</h2>
        {#if shapes.length > 1}
          <div class="field">
            <span id="whole">Draw</span>
            {@render choice('whole', [['sphere', 'A whole sphere'], ['hemisphere', 'A hemisphere']], form.shape, (v) => (s.shape = v))}
          </div>
        {/if}

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

        {#if canLie}
          <div class="field">
            <span id="pose">Sits</span>
            {@render choice('pose', [['stand', 'Standing on its base'], ['lie', 'Lying on its side']], form.lie ? 'lie' : 'stand', (v) => (s.pose = v))}
          </div>
        {/if}
        {#if canLean}
          <div class="field">
            <span id="lean">Stands</span>
            {@render choice('lean', [[false, 'Right'], [true, 'Oblique']], form.oblique, (v) => (s.oblique = v))}
            {#if form.oblique}
              <div class="lean-to">
                <span id="lean-to" class="hint">Leans to the</span>
                {@render choice('lean-to', [['left', 'Left'], ['right', 'Right']], clean.leanTo, (v) => (s.leanTo = v))}
              </div>
            {/if}
          </div>
        {/if}

        <div class="head-row">
          <h2 class="card-head">Measures</h2>
          <HelpTip id="measure-tip" label="How to give the measures">
            {measureHelp} Worked-out measures are shown faintly. Type sqrt for √, / for a fraction and pi for π.
          </HelpTip>
        </div>
        {#each form.parts as k (k)}
          <div class="row">
            <span class="pname">{title(k)}</span>
            {#if solvedOnly(k)}
              <span class="solved" aria-label="{title(k)}, worked out">{solvedText(k) || '?'}</span>
            {:else}
              <MathInput
                id="m-{k}" aria-label={title(k)} placeholder={clean[k as Measure].trim() ? '' : solvedText(k)}
                aria-invalid={!!read.problems[k]} bind:value={s[k as Measure]}
              />
            {/if}
            <span class="suffix unit" aria-hidden="true">{clean.unit.trim()}</span>
            <PartLabel
              name={title(k)} id="l-{k}" given={!solvedOnly(k) && !!clean[k as Measure].trim()} measure={measureText(k)} note={measureNote(k)}
              bind:mode={s[`${k}Label` as const]} bind:text={s[`${k}Text` as const]}
            />
          </div>
        {/each}
        {#if form.parts.includes('radius')}
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
          <label class="check">
            <input type="checkbox" bind:checked={s.hidden} />
            <span>Hidden edges <span class="hint">dashed, for the edges round the back</span></span>
          </label>
          {#if hasHeightLine}
            <label class="check">
              <input type="checkbox" bind:checked={s.showHeight} />
              <span>Height <span class="hint">dashed, straight down to the base{form.oblique ? '’s line, with the lean along it' : ''}</span></span>
            </label>
          {/if}
          <label class="check">
            <input type="checkbox" bind:checked={s.square} />
            <span>Right-angle squares <span class="hint">where a height or a slant height meets the base</span></span>
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
          {#if !round}
            <label class="check">
              <input type="checkbox" bind:checked={s.names} />
              <span>Name the corners <span class="hint">{form.shape === 'prism' ? 'around the base, then around the top' : 'around the base, then the tip'}</span></span>
            </label>
            {#if clean.names}
              <label class="field names">
                <span>Corner names <span class="hint">in order, separated by spaces</span></span>
                <input type="text" placeholder={autoNames} bind:value={s.nameList} />
              </label>
            {/if}
          {/if}
          <div class="reset-row">
            <p class="hint">Drag any label on the figure to move it.</p>
            <button class="btn-ghost small" disabled={!clean.moved} onclick={() => (s.moved = '')}>Reset label positions</button>
          </div>
        </Section>

        <Section title="Position" icon={Move} summary={positionSummary}>
          {#if !round}
            <div class="field">
              <span id="depth">Depth goes back to the</span>
              {@render choice('depth', [['left', 'Left'], ['right', 'Right']], clean.depth, (v) => (s.depth = v))}
            </div>
          {/if}
          {#if form.shape === 'hemisphere'}
            <div class="field">
              <span id="bowl">Flat face</span>
              {@render choice('bowl', [[false, 'Down, like a dome'], [true, 'Up, like a bowl']], clean.bowl, (v) => (s.bowl = v))}
            </div>
          {/if}
          {#if round && form.shape !== 'hemisphere'}<p class="hint">Round shapes are always seen from a little above.</p>{/if}
        </Section>
        <p class="also">Several shapes together, like a cone on a cylinder or a box with a hole? Build them in the <a href="/composite-3d-shape">Composite 3D Shape Editor</a>.</p>
  {/snippet}

  {#snippet figure()}
    <Shape3D figure={drawing} bind:svg label={SHAPES[form.shape]} onmove={moveLabel} />
  {/snippet}
</GeneratorPage>

<style>
  .also { margin: 0.9rem 0.2rem 0; color: var(--muted); font-size: 0.84rem; line-height: 1.45; }
  .also a { color: var(--blue-dark); font-weight: 600; }
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }

  .measures { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.3rem; }
  .row > :global(.caret-field) { flex: 1; min-width: 0; }
  .pname { width: 6.6rem; flex: none; font-weight: 600; font-size: 0.86rem; }
  .solved { flex: 1; min-width: 0; padding: 0.45rem 0.6rem; font-family: 'Times New Roman', Times, serif; font-size: 1.05rem; color: var(--muted); }
  .suffix { width: 1.6rem; flex: none; font-family: 'Times New Roman', Times, serif; font-size: 1.1rem; color: var(--muted); }
  .suffix.unit { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .help { margin: 0.2rem 0 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .hint { font-weight: 400; color: var(--muted); font-size: 0.84rem; margin: 0; }

  .check { display: flex; align-items: flex-start; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0.08rem 0 0; accent-color: var(--blue); flex: none; }
  .check .hint { display: block; }
  .check.diameter { margin: 0.2rem 0 0; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.4rem; }
  .names { margin-bottom: 0.75rem; }
  .two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .lean-to { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.2rem; }
  .lean-to .segmented { flex: 1; }
  .segmented button { flex: 1; display: inline-grid; place-items: center; padding: 0.3rem 0.4rem; }

  .reset-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .small { padding: 0.45rem 0.8rem; font-size: 0.85rem; border-radius: 10px; white-space: nowrap; }

</style>
