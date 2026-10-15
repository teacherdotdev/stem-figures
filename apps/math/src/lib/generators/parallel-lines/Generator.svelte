<script lang="ts">
  // The Parallel Lines and Transversal Generator: a card of parallel lines and
  // a card of transversals on the left, each line a row like the Coordinate
  // Grid's equations, and the figure on the right, where every angle and
  // line can be clicked to label or style it. Settings are mirrored into
  // the page address so a bookmark or shared link brings back exactly this
  // figure, and the server renders that same figure on first load.
  import { Plus, Shapes, X } from '@lucide/svelte'
  import { untrack } from 'svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import LineStylePicker from '$lib/shapes/LineStylePicker.svelte'
  import { ROUND_NAMES } from '$lib/shapes/parts.js'
  import { buildLines, readLines, type Part } from './layout.js'
  import LineButton from './LineButton.svelte'
  import LinesFigure from './LinesFigure.svelte'
  import AngleOptions from '$lib/labeling/AngleOptions.svelte'
  import CountPicker from '$lib/labeling/CountPicker.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import PointOptions from '$lib/labeling/PointOptions.svelte'
  import Popover from '$lib/labeling/Popover.svelte'
  import ScrubAngle from '$lib/labeling/ScrubAngle.svelte'
  import {
    ANGLE_DEFAULTS, MAX_ANGLE, MAX_LINES, MIN_ANGLE,
    cleanSettings, freePos, freshName, idsIn, newParallel, newTransversal, nextId, setAngleKey, settingsFromParams, settingsToQuery,
    type LineBase, type RawSettings,
  } from './settings.js'
  import CapPicker from './CapPicker.svelte'

  const gen = generatorState(
    { tidy: (s) => cleanSettings(s as RawSettings), fromParams: settingsFromParams, toQuery: settingsToQuery, keyOf: settingsToQuery },
    'parallel-lines',
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const problems = $derived(readLines(clean).problems)

  const drawing = $derived(buildLines(clean))

  const lineOf = (id: string): LineBase | undefined => s.parallels.find((l) => l.id === id) ?? s.transversals.find((l) => l.id === id)
  const nameOf = (id: string) => lineOf(id)?.name.trim() || (id.startsWith('p') ? 'a parallel line' : 'a transversal')

  // The angle a transversal's value sets, shown ghost blue while it's changed, focused or its row hovered.
  let ghostLine = $state<string | null>(null)
  let hoveredRow = $state<string | null>(null)
  const ghostId = $derived(ghostLine ?? hoveredRow)
  const ghost = $derived.by(() => {
    const t = ghostId ? clean.transversals.find((x) => x.id === ghostId) : null
    return t ? setAngleKey(clean, t) : null
  })

  // The popup open, for one part of the figure, and where.
  let popup = $state<{ part: Part; at: { x: number; y: number }; owner: Element | null } | null>(null)
  const close = () => (popup = null)
  function open(part: Part, at: { x: number; y: number }, owner: Element | null = null) {
    if (part.kind === 'angle' && !s.angles[part.key]) s.angles[part.key] = { ...ANGLE_DEFAULTS }
    popup = { part, at, owner }
  }
  function openLine(id: string, button: HTMLElement | undefined) {
    if (popup?.part.kind === 'line' && popup.part.key === id) return close()
    const r = button!.getBoundingClientRect()
    open({ kind: 'line', key: id }, { x: r.left + r.width / 2, y: r.bottom }, button)
  }
  const buttons: Record<string, HTMLButtonElement> = $state({})

  const popupAngle = $derived(popup?.part.kind === 'angle' ? drawing.angles.find((a) => a.key === popup!.part.key) : null)
  const popupLine = $derived(popup?.part.kind === 'line' ? lineOf(popup.part.key) : null)
  // A part that's gone (its line deleted, its crossing left the figure) closes its popup.
  $effect(() => {
    if (!popup) return
    const { kind, key } = popup.part
    const there =
      kind === 'line' ? !!lineOf(key) : kind === 'angle' ? drawing.angles.some((a) => a.key === key) : drawing.spots.some((p) => p.key === key)
    if (!there) close()
  })

  function addParallel() {
    s.parallels.push(newParallel(nextId(s.parallels, 'p'), freshName(s.parallels, 'p')))
  }
  const NEW_ANGLES = ['65', '120', '45', '135', '80', '100']
  function addTransversal() {
    const id = nextId(s.transversals, 't')
    s.transversals.push(newTransversal(id, freshName(s.transversals, 't'), NEW_ANGLES[s.transversals.length % NEW_ANGLES.length], freePos(s.transversals)))
  }
  /** Removes a line, and what was set on its angles and points, so a new line can't inherit them. */
  function removeLine(id: string) {
    if (id.startsWith('p')) {
      if (s.parallels.length <= 1) return
      s.parallels = s.parallels.filter((l) => l.id !== id)
    } else s.transversals = s.transversals.filter((l) => l.id !== id)
    for (const key of Object.keys(s.angles)) if (idsIn(key).includes(id)) delete s.angles[key]
    for (const key of Object.keys(s.points)) if (idsIn(key).includes(id)) delete s.points[key]
    if (popup?.part.key === id) close()
  }

  function togglePoint(key: string, name: string | undefined) {
    if (name === undefined) delete s.points[key]
    else s.points[key] = name
  }
  /** What a point's popup is about: where lines cross, or near which end of which line. */
  function pointTitle(key: string) {
    const [id, end] = key.split(':')
    if (!end) {
      const names = idsIn(key).map(nameOf)
      return `Where ${names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(' and ')} cross`
    }
    const ends = ENDS_NAMES(id)
    return `Near the ${(end === 'start' ? ends.start : ends.end).toLowerCase()} end of ${nameOf(id)}`
  }

  const figureSummary = $derived(
    [clean.turn ? `turned ${clean.turn}°` : 'lines across the page', `measures to ${ROUND_NAMES[clean.round]}`]
      .filter(Boolean)
      .join(' · '),
  )
  /** What a line's two ends are called: left and right, or bottom and top for a transversal. */
  const ENDS_NAMES = (id: string) => (id.startsWith('p') ? { start: 'Left', end: 'Right' } : { start: 'Bottom', end: 'Top' })

  let svg = $state<SVGSVGElement>()
  // The turn as typed, kept apart from the setting so a half-typed "−" isn't undone; undo and presets still show through.
  let turnText = $state(String(s.turn))
  $effect(() => {
    const v = Number(turnText)
    if (Number.isFinite(v) && turnText.trim() !== '' && untrack(() => v !== s.turn)) s.turn = Math.max(-180, Math.min(180, Math.round(v)))
  })
  $effect(() => {
    const t = s.turn
    untrack(() => Number(turnText) !== t && (turnText = String(t)))
  })
</script>

{#snippet lineRow(line: LineBase, kind: 'p' | 't')}
  {@const t = kind === 't' ? s.transversals.find((x) => x.id === line.id) : undefined}
  <div
    class="row" role="group" aria-label={kind === 'p' ? 'Parallel line' : 'Transversal'}
    onpointerenter={() => kind === 't' && (hoveredRow = line.id)} onpointerleave={() => hoveredRow === line.id && (hoveredRow = null)}
  >
    <LineButton
      {line} name={line.name || '(unnamed)'} expanded={popup?.part.kind === 'line' && popup.part.key === line.id}
      bind:button={buttons[line.id]} onclick={() => openLine(line.id, buttons[line.id])}
    />
    <input class="name" class:wide={kind === 'p'} type="text" maxlength="4" aria-label="Name of the line" placeholder="name" bind:value={line.name} />
    {#if t}
      <div class="angle">
        <ScrubAngle
          id="angle-{t.id}" label="the angle between {nameOf(clean.parallels[0].id)} and {nameOf(t.id)}" min={MIN_ANGLE} max={MAX_ANGLE}
          invalid={!!problems[t.id]} bind:value={t.angle} onactive={(on) => (ghostLine = on ? t.id : ghostLine === t.id ? null : ghostLine)}
        />
      </div>
    {/if}
    <button
      type="button" class="remove" aria-label="Remove this line" data-tip="Remove"
      disabled={kind === 'p' && s.parallels.length <= 1} onclick={() => removeLine(line.id)}
    ><X size={16} /></button>
  </div>
  {#if problems[line.id]}<p class="help problem">{problems[line.id]}</p>{/if}
{/snippet}

<GeneratorPage name="Parallel Lines and Transversal Generator" filename="parallel-lines-transversal" {gen} {svg} bind:labelSize={s.labelSize} printWidth={6}>
  {#snippet inputs()}
    <section class="card-body">
      <div class="head-row">
        <h2 class="card-head">Parallel lines</h2>
        <HelpTip id="parallel-tip" label="How the figure works">
          The parallel lines run across the page, evenly spaced. Each transversal crosses them at the angle you give: the
          angle above the top line, to the right of the transversal. Click any angle or line on the figure to label or
          style it. Click where lines cross, or near the end of a line, to put a named point there.
        </HelpTip>
      </div>
      {#each s.parallels as line (line.id)}{@render lineRow(line, 'p')}{/each}
      <button type="button" class="btn-ghost add" disabled={s.parallels.length >= MAX_LINES} onclick={addParallel}><Plus size={16} /> Add parallel line</button>
    </section>
    <section class="card-body second">
      <h2 class="card-head">Transversals</h2>
      <p class="hint">Each angle is above {nameOf(clean.parallels[0].id)}, to the right of the transversal. Drag the ∠ to change it.</p>
      {#each s.transversals as line (line.id)}{@render lineRow(line, 't')}{/each}
      <button type="button" class="btn-ghost add" disabled={s.transversals.length >= MAX_LINES} onclick={addTransversal}><Plus size={16} /> Add transversal</button>
      <p class="hint on-figure">On the figure, click an angle or a line to label or style it, or where lines cross or near a line's end to add a point.</p>
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Figure" icon={Shapes} summary={figureSummary}>
      <div class="field">
        <span>Turn the figure</span>
        <div class="turn"><ScrubAngle id="turn" label="the figure's turn" symbol="↻" min={-180} max={180} bind:value={turnText} /></div>
      </div>
      <label class="field">
        Round measures to
        <select bind:value={s.round}>
          <option value={0}>Whole numbers</option>
          <option value={1}>Tenths</option>
          <option value={2}>Hundredths</option>
        </select>
      </label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <div class="stage">
      <LinesFigure figure={drawing} bind:svg />
      <PickLayer figure={drawing} {ghost} selected={popup?.part ?? null} onpick={(part, at) => open(part, at)} />
    </div>
  {/snippet}
</GeneratorPage>

{#if popup}
  {@const key = popup.part.key}
  <Popover at={popup.at} owner={popup.owner} onclose={close} label="Settings for this part of the figure">
    {#if popup.part.kind === 'angle' && s.angles[key] && popupAngle}
      {@const a = s.angles[key]}
      {@const [r1, r2] = key.split('~')}
      {@const right = popupAngle.right}
      <div class="pop-head">
        <span>Angle between {nameOf(r1.slice(0, -1))} and {nameOf(r2.slice(0, -1))}</span>
        <span class="measure">{popupAngle.ghost.text}</span>
      </div>
      <AngleOptions value={a} {right} onchange={(patch) => Object.assign(a, patch)} />
    {:else if popup.part.kind === 'point'}
      <div class="pop-head"><span>{pointTitle(key)}</span></div>
      <PointOptions name={s.points[key]} onchange={(name) => togglePoint(key, name)} />
    {:else if popup.part.kind === 'line' && popupLine}
      {@const line = popupLine}
      {@const ends = ENDS_NAMES(line.id)}
      <div class="pop-head"><span>{line.id.startsWith('p') ? 'Parallel line' : 'Transversal'} {line.name}</span></div>
      <label class="group">
        <span class="name">Name</span>
        <input type="text" maxlength="4" placeholder="m" bind:value={line.name} />
      </label>
      <div class="group">
        <span class="name">End points <span class="sides">{ends.start} · {ends.end}</span></span>
        <div class="caps">
          <CapPicker side="start" label="{ends.start} end" bind:value={line.startCap} />
          <CapPicker side="end" label="{ends.end} end" bind:value={line.endCap} />
        </div>
      </div>
      <div class="group">
        <span class="name" id="pop-arrows">Parallel arrows</span>
        <CountPicker id="pop-arrows" value={line.arrows} glyph="›" onpick={(n) => (line.arrows = n)} />
      </div>
      <LineStylePicker id="pop-style" bind:value={line.style} />
      <button type="button" class="btn-ghost delete" disabled={line.id.startsWith('p') && s.parallels.length <= 1} onclick={() => removeLine(line.id)}>Delete this line</button>
    {/if}
  </Popover>
{/if}

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .card-body.second { border-top: 1px solid var(--border); }
  .head-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.35rem; }
  .name { width: 3.6rem; flex: none; height: 2.6rem; box-sizing: border-box; font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 1.05rem; }
  .angle { flex: 1; min-width: 0; }
  .name.wide { flex: 1; width: auto; min-width: 0; }
  .remove { display: inline-grid; place-items: center; width: 2rem; height: 2.6rem; flex: none; border: 0; background: none; color: var(--muted); border-radius: 8px; }
  .remove:hover:not(:disabled) { color: var(--red); background: #fef2f2; }
  .remove:disabled { opacity: 0.35; }
  .add { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.8rem; font-size: 0.85rem; border-radius: 10px; }

  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }
  .hint { font-weight: 400; color: var(--muted); font-size: 0.84rem; margin: 0; }

  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }
  .turn { max-width: 9rem; }

  .stage { position: relative; }
  .on-figure { margin-top: 0.35rem; }

  .group .name { width: auto; height: auto; font-family: inherit; font-style: normal; }
  .caps { display: flex; gap: 0.5rem; }
  .sides { font-weight: 400; }
</style>
