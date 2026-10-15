<script lang="ts">
  // The Angles Generator: a card of rays on the left, each a row with its
  // direction from the baseline, and the figure on the right, where every
  // angle, ray and place for a point can be clicked to label or style it, as
  // on the Parallel Lines and Transversal Generator, whose drawing, picking
  // and popups it shares. Settings are mirrored into the page address so a
  // bookmark or shared link brings back exactly this figure, and the server
  // renders that same figure on first load.
  import { Plus, Shapes, X } from '@lucide/svelte'
  import { untrack } from 'svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import LineStylePicker from '$lib/shapes/LineStylePicker.svelte'
  import { ROUND_NAMES } from '$lib/shapes/parts.js'
  import CapPicker from '../parallel-lines/CapPicker.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import LineButton from '../parallel-lines/LineButton.svelte'
  import LinesFigure from '../parallel-lines/LinesFigure.svelte'
  import AngleOptions from '$lib/labeling/AngleOptions.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import PointOptions from '$lib/labeling/PointOptions.svelte'
  import Popover from '$lib/labeling/Popover.svelte'
  import ScrubAngle from '$lib/labeling/ScrubAngle.svelte'
  import { buildAngles } from './layout.js'
  import {
    ANGLE_DEFAULTS, BASELINE, MAX_RAYS, cleanSettings, freeDirection, idsIn, newRay, nextId, readRays, settingsFromParams, settingsToQuery,
    type RawSettings, type Ray,
  } from './settings.js'

  const gen = generatorState(
    { tidy: (s) => cleanSettings(s as RawSettings), fromParams: settingsFromParams, toQuery: settingsToQuery, keyOf: settingsToQuery },
    'angles',
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const problems = $derived(readRays(clean).problems)

  const drawing = $derived(buildAngles(clean))

  const rayOf = (id: string): Ray | undefined => s.rays.find((r) => r.id === id)
  /** What the teacher calls a ray: the baseline, then Ray 2, Ray 3… in the list's order. */
  const nameOf = (id: string) => {
    const i = s.rays.findIndex((r) => r.id === id)
    return i <= 0 ? 'the baseline' : `ray ${i + 1}`
  }
  const capital = (text: string) => text[0].toUpperCase() + text.slice(1)
  /** A half-ray's name: a ray's own, or "the other side of" a two-sided one. */
  const halfName = (half: string) => (half.endsWith('-') ? `the other side of ${nameOf(half.slice(0, -1))}` : nameOf(half.slice(0, -1)))

  // The popup open, for one part of the figure, and where.
  let popup = $state<{ part: Part; at: { x: number; y: number }; owner: Element | null } | null>(null)
  const close = () => (popup = null)
  function open(part: Part, at: { x: number; y: number }, owner: Element | null = null) {
    if (part.kind === 'angle' && !s.angles[part.key]) s.angles[part.key] = { ...ANGLE_DEFAULTS }
    popup = { part, at, owner }
  }
  function openRay(id: string, button: HTMLElement | undefined) {
    if (popup?.part.kind === 'line' && popup.part.key === id) return close()
    const r = button!.getBoundingClientRect()
    open({ kind: 'line', key: id }, { x: r.left + r.width / 2, y: r.bottom }, button)
  }
  const buttons: Record<string, HTMLButtonElement> = $state({})

  const popupAngle = $derived(popup?.part.kind === 'angle' ? drawing.angles.find((a) => a.key === popup!.part.key) : null)
  const popupRay = $derived(popup?.part.kind === 'line' ? rayOf(popup.part.key) : null)
  // A part that's gone (its ray deleted, or no longer two-sided) closes its popup.
  $effect(() => {
    if (!popup) return
    const { kind, key } = popup.part
    const there =
      kind === 'line' ? !!rayOf(key) : kind === 'angle' ? drawing.angles.some((a) => a.key === key) : drawing.spots.some((p) => p.key === key)
    if (!there) close()
  })

  function addRay() {
    s.rays.push(newRay(nextId(s.rays), freeDirection(clean)))
  }
  /** Removes a ray, and what was set on its angles and points, so a new ray can't inherit them. */
  function removeRay(id: string) {
    if (id === BASELINE) return
    s.rays = s.rays.filter((r) => r.id !== id)
    for (const key of Object.keys(s.angles)) if (idsIn(key).includes(id)) delete s.angles[key]
    for (const key of Object.keys(s.points)) if (idsIn(key).includes(id)) delete s.points[key]
    if (popup?.part.key === id) close()
  }

  function togglePoint(key: string, name: string | undefined) {
    if (name === undefined) delete s.points[key]
    else s.points[key] = name
  }
  /** What a point's popup is about: the vertex, or near which end of which ray. */
  function pointTitle(key: string) {
    if (key === 'v') return 'The vertex'
    const [id, end] = key.split(':')
    return end === 'end' ? `Near the tip of ${nameOf(id)}` : `Near the other end of ${nameOf(id)}`
  }

  const figureSummary = $derived(
    [clean.turn ? `turned ${clean.turn}°` : 'baseline pointing right', `measures to ${ROUND_NAMES[clean.round]}`].join(' · '),
  )

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

{#snippet sidesIcon(two: boolean)}
  <!-- A ray from a dot, or a line through it. -->
  <svg viewBox="0 0 30 14" width="30" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <line x1={two ? 3 : 15} y1="7" x2="27" y2="7" />
    <circle cx="15" cy="7" r="2.6" fill="currentColor" stroke="none" />
  </svg>
{/snippet}

{#snippet rayRow(ray: Ray, i: number)}
  <div class="row" role="group" aria-label={capital(nameOf(ray.id))}>
    <LineButton
      line={{ ...ray, name: '', arrows: 0, startCap: ray.twoSided ? ray.startCap : 'none' }} name={nameOf(ray.id)}
      expanded={popup?.part.kind === 'line' && popup.part.key === ray.id} bind:button={buttons[ray.id]} onclick={() => openRay(ray.id, buttons[ray.id])}
    />
    {#if i === 0}
      <span class="baseline">Baseline <span class="deg">0°</span></span>
    {:else}
      <div class="direction">
        <ScrubAngle id="direction-{ray.id}" label="the direction of {nameOf(ray.id)} from the baseline" min={0} max={359} invalid={!!problems[ray.id]} bind:value={ray.direction} />
      </div>
    {/if}
    <button
      type="button" class="sides" aria-pressed={ray.twoSided} aria-label="Run {nameOf(ray.id)} through the vertex, as a line"
      data-tip={ray.twoSided ? 'Line through the vertex' : 'Ray from the vertex'} onclick={() => (ray.twoSided = !ray.twoSided)}
    >{@render sidesIcon(ray.twoSided)}</button>
    <button type="button" class="remove" aria-label="Remove {nameOf(ray.id)}" data-tip="Remove" disabled={i === 0} onclick={() => removeRay(ray.id)}><X size={16} /></button>
  </div>
  {#if problems[ray.id]}<p class="help problem">{problems[ray.id]}</p>{/if}
{/snippet}

<GeneratorPage name="Angles Generator" filename="angles" {gen} {svg} bind:labelSize={s.labelSize} printWidth={5}>
  {#snippet inputs()}
    <section class="card-body">
      <div class="head-row">
        <h2 class="card-head">Rays</h2>
        <HelpTip id="angles-tip" label="How the figure works">
          Every ray starts at the vertex. The baseline points right, and each other ray's direction is its angle from the
          baseline, counterclockwise, as a protractor reads it: 90° points straight up. Turn a ray into a line through the
          vertex with the button after it. Click any angle on the figure to label, mark or shade it, or click the vertex or
          near a ray's end to put a named point there.
        </HelpTip>
      </div>
      <p class="hint">Each direction is measured from the baseline, counterclockwise. Drag the ∠ to change it.</p>
      {#each s.rays as ray, i (ray.id)}{@render rayRow(ray, i)}{/each}
      <button type="button" class="btn-ghost add" disabled={s.rays.length >= MAX_RAYS} onclick={addRay}><Plus size={16} /> Add ray</button>
      <p class="hint on-figure">On the figure, click an angle or a ray to label or style it, or the vertex or near a ray's end to add a point.</p>
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
      <LinesFigure figure={drawing} label="Angles" bind:svg />
      <PickLayer figure={drawing} selected={popup?.part ?? null} onpick={(part, at) => open(part, at)} />
    </div>
  {/snippet}
</GeneratorPage>

{#if popup}
  {@const key = popup.part.key}
  <Popover at={popup.at} owner={popup.owner} onclose={close} label="Settings for this part of the figure">
    {#if popup.part.kind === 'angle' && s.angles[key] && popupAngle}
      {@const a = s.angles[key]}
      {@const [from, to] = popupAngle.rays}
      {@const right = popupAngle.right}
      <div class="pop-head">
        <span>Angle from {halfName(from)} to {halfName(to)}</span>
        <span class="measure">{popupAngle.ghost.text}</span>
      </div>
      <AngleOptions value={a} {right} onchange={(patch) => Object.assign(a, patch)} />
    {:else if popup.part.kind === 'point'}
      <div class="pop-head"><span>{pointTitle(key)}</span></div>
      <PointOptions name={s.points[key]} onchange={(name) => togglePoint(key, name)} />
    {:else if popup.part.kind === 'line' && popupRay}
      {@const ray = popupRay}
      <div class="pop-head"><span>{capital(nameOf(ray.id))}</span></div>
      <div class="group">
        <span class="name" id="pop-sides">Through the vertex</span>
        <div class="segmented" role="radiogroup" aria-labelledby="pop-sides">
          <button type="button" role="radio" aria-checked={!ray.twoSided} class:on={!ray.twoSided} onclick={() => (ray.twoSided = false)}>Ray</button>
          <button type="button" role="radio" aria-checked={ray.twoSided} class:on={ray.twoSided} onclick={() => (ray.twoSided = true)}>Line</button>
        </div>
      </div>
      <div class="group">
        <span class="name">End points{#if ray.twoSided} <span class="sides-names">Other end · Tip</span>{/if}</span>
        <div class="caps">
          {#if ray.twoSided}<CapPicker side="start" label="Other end" bind:value={ray.startCap} />{/if}
          <CapPicker side="end" label="Tip" bind:value={ray.endCap} />
        </div>
      </div>
      <LineStylePicker id="pop-style" bind:value={ray.style} />
      <button type="button" class="btn-ghost delete" disabled={ray.id === BASELINE} onclick={() => removeRay(ray.id)}>Delete this ray</button>
    {/if}
  </Popover>
{/if}

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .row { display: flex; align-items: center; gap: 0.35rem; }
  .direction { flex: 1; min-width: 0; }
  .baseline { flex: 1; min-width: 0; padding-left: 0.6rem; font-weight: 600; font-size: 0.9rem; color: var(--muted); }
  .baseline .deg { font-family: 'Times New Roman', Times, serif; font-weight: 400; font-size: 1.05rem; color: var(--ink); margin-left: 0.3rem; }
  .sides {
    display: inline-grid; place-items: center; width: 2.6rem; height: 2.6rem; flex: none; padding: 0;
    border: 1.5px solid var(--border); border-radius: 10px; background: #fff; color: var(--muted);
  }
  .sides:hover { border-color: var(--blue-border); }
  .sides[aria-pressed='true'] { border-color: var(--blue-border); background: var(--blue-soft); color: var(--blue); }
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

  .caps { display: flex; gap: 0.5rem; }
  .sides-names { font-weight: 400; }
</style>
