<script lang="ts">
  // The Torque Generator: what holds the beam up, the beam, its loads, the
  // marks and forces, and the torques worked out, on the left; the figure on
  // the right. Settings live in the page address.
  import { ChevronDown, Calculator, Plus, Ruler, Scale, Trash2, Weight } from '@lucide/svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import Choice from '$lib/shared/Choice.svelte'
  import FigureOptions from '$lib/shared/FigureOptions.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { answerLines, balancingValue, distanceText, exact, loadDistanceText, valueText, verdict, whereText } from './moments'
  import { G_VALUES, MAX_LENGTH, MAX_LOADS, inUnit, newLoad, onBeam, resized, torqueSettings, type LengthUnit, type Load, type LoadKind, type SupportKind } from './settings'
  import Torque from './Torque.svelte'
  import { buildTorque } from './torque'

  const gen = createGenerator(torqueSettings, 'torque')
  const s = $derived(gen.snapshot())

  const SUPPORT_NAMES: Record<SupportKind, string> = { pivot: 'Pivot', two: 'Two supports', wall: 'Wall' }
  const KINDS: [LoadKind, string][] = [
    ['hanging', 'Hanging'],
    ['resting', 'On the beam'],
    ['down', 'Force down'],
    ['up', 'Force up'],
  ]
  const KIND_NAMES = Object.fromEntries(KINDS) as Record<LoadKind, string>

  const fig = $derived(buildTorque(s))
  const supportName = $derived(s.support === 'pivot' ? 'the pivot' : 'a support')
  /** Loads drawn on top of a support or of each other, which a teacher will want to move apart. */
  const clashText = $derived(
    fig.clashes
      .map(([i, j]) => (j < 0 ? `Load ${i + 1} hangs where ${supportName} stands` : `Loads ${i + 1} and ${j + 1} are drawn over each other`))
      .join('; ') + (fig.clashes.length ? '. Move them apart, or make one a force arrow.' : ''),
  )
  const answer = $derived(verdict(s))
  const working = $derived(answerLines(s))
  const unit = $derived(s.lengthUnit)
  const end = $derived(s.mirror ? 'right' : 'left')

  // A longer or shorter beam keeps a pivot at its middle and a support or cable at its end.
  const setLength = (v: unknown) => {
    const to = Number(v)
    unitProblem = ''
    if (v === null || v === '' || !Number.isFinite(to)) {
      gen.s.length = v as number
      return
    }
    const next = Math.min(MAX_LENGTH, Math.max(0.1, Math.round(to * 100) / 100))
    Object.assign(gen.s, resized({ pivot: s.pivot, supportA: s.supportA, supportB: s.supportB, cableAt: s.cableAt }, s.length, next))
    gen.s.length = to
  }
  // Changing m to cm (or back) changes every number, so the beam stays the same.
  // A beam that can't be set in the other unit stays as it is, and the form says why.
  let unitProblem = $state('')
  const setUnit = (u: LengthUnit) => {
    if (u === s.lengthUnit) return
    const next = inUnit(s, u)
    if ('problem' in next) {
      unitProblem = next.problem
      return
    }
    unitProblem = ''
    const { loads, ...places } = next.changes
    Object.assign(gen.s, places)
    if (loads) gen.s.loads.forEach((l, i) => (l.position = loads[i].position))
  }

  const shown = (l: Label, value: string) => (l.mode === 'text' ? l.text.trim() || value : l.mode === 'blank' ? 'blank' : 'no label')
  const supportSummary = $derived(
    s.support === 'pivot'
      ? `Pivot at ${distanceText(onBeam(s.pivot, s.length), s)}`
      : s.support === 'two'
        ? `A at ${distanceText(onBeam(s.supportA, s.length), s)}, B at ${distanceText(onBeam(s.supportB, s.length), s)}`
        : s.cable
          ? `Wall and cable at ${s.cableAngle}°`
          : 'Wall, fixed (a cantilever)',
  )
  const beamSummary = $derived(`${exact(s.length)} ${unit} · ${s.beamWeight > 0 ? `weighs ${valueText(s.beamWeight, s)}` : 'light'}`)
  const loadsSummary = $derived(s.loads.map((l) => shown(l.label, valueText(l.value, s))).join(', ') || 'none')
  const marksSummary = $derived(
    [s.distances ? 'distances' : '', s.lengthMark ? 'length' : '', s.weightArrows ? 'weight arrows' : '', s.supportForces ? 'support forces' : '']
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const rowSummary = (l: Load, i: number) => [KIND_NAMES[l.kind], shown(l.label, valueText(l.value, s)), whereText(s, i).split(' · ').at(-1)].join(' · ')

  // Each load folds up to a one-line summary. They start folded, except one just added.
  const unfolded = new SvelteSet<unknown>()
  const full = $derived(s.loads.length >= MAX_LOADS)
  const add = () => {
    if (full) return
    // Somewhere free along the beam: halfway into the widest gap between the loads and the ends.
    const xs = [0, ...s.loads.map((l) => onBeam(l.position, s.length)), s.length].sort((a, b) => a - b)
    let at = s.length / 2
    let widest = -1
    for (let k = 1; k < xs.length; k++) if (xs[k] - xs[k - 1] > widest) [widest, at] = [xs[k] - xs[k - 1], (xs[k] + xs[k - 1]) / 2]
    gen.s.loads.push(newLoad(Math.round(at * 100) / 100, s.unit === 'g' ? 100 : 1))
    unfolded.add(gen.s.loads.at(-1))
  }
  const toggle = (e: Event, load: unknown) => {
    if ((e.currentTarget as HTMLDetailsElement).open) unfolded.add(load)
    else unfolded.delete(load)
  }
  const remove = (e: Event, i: number) => {
    // The button is inside the row's summary, so don't let the click fold it too.
    e.preventDefault()
    gen.s.loads.splice(i, 1)
  }
  const balance = (i: number) => {
    const v = balancingValue(s, i)
    if (v !== null) gen.s.loads[i].value = v
  }
</script>

<GeneratorPage name="Torque Generator" filename="torque" {gen}>
  {#snippet settings()}
    <Section title="Support" icon={Scale} summary={supportSummary}>
      <div class="setups" role="radiogroup" aria-label="What holds the beam up">
        {#each Object.entries(SUPPORT_NAMES) as [kind, name] (kind)}
          <button type="button" role="radio" aria-checked={s.support === kind} class:on={s.support === kind} onclick={() => (gen.s.support = kind as SupportKind)}>
            {name}
          </button>
        {/each}
      </div>
      {#if s.support === 'pivot'}
        <label class="field">
          Pivot, from the {end} end ({unit})
          <input type="number" min="0" max={s.length} step="any" bind:value={gen.s.pivot} />
        </label>
      {:else if s.support === 'two'}
        <div class="field-row">
          <label class="field">
            A, from the {end} end ({unit})
            <input type="number" min="0" max={s.length} step="any" bind:value={gen.s.supportA} />
          </label>
          <label class="field">
            B, from the {end} end ({unit})
            <input type="number" min="0" max={s.length} step="any" bind:value={gen.s.supportB} />
          </label>
        </div>
      {:else}
        <label class="check"><input type="checkbox" bind:checked={gen.s.cable} /> A cable from the wall (a hanging sign)</label>
        {#if s.cable}
          <label class="field">
            Cable meets the beam at ({unit} from the wall)
            <input type="number" min="0" max={s.length} step="any" bind:value={gen.s.cableAt} />
          </label>
          <label class="field">
            Angle between the cable and the beam
            <span class="slider">
              <input type="range" min="15" max="75" step="1" bind:value={gen.s.cableAngle} />
              <output>{s.cableAngle}°</output>
            </span>
          </label>
          <div class="field">Angle label <LabelField name="Angle label" bind:label={gen.s.angleLabel} /></div>
          {#if fig.cableOffTop}
            <p class="note warning" role="status">
              At {s.cableAngle}° the cable meets the wall above the figure. A smaller angle, or the cable nearer the wall, shows where it meets it.
            </p>
          {/if}
        {/if}
      {/if}
    </Section>

    <Section title="Beam" icon={Ruler} summary={beamSummary}>
      <div class="field-row">
        <label class="field">
          Length
          <input type="number" min="0.1" max={MAX_LENGTH} step="any" bind:value={() => gen.s.length, setLength} />
        </label>
        <div class="field">
          In
          <Choice name="Length unit" options={[['m', 'm'], ['cm', 'cm']]} bind:value={() => s.lengthUnit, setUnit} />
        </div>
      </div>
      {#if unitProblem}
        <p class="note warning" role="status">{unitProblem}</p>
      {/if}
      <label class="field">
        Its own {s.unit === 'N' ? 'weight' : 'mass'} ({s.unit}), 0 for a light beam
        <input type="number" min="0" max="99999" step="any" bind:value={gen.s.beamWeight} />
      </label>
      {#if s.beamWeight > 0}
        <div class="field">Label <LabelField name="Beam weight label" bind:label={gen.s.beamLabel} placeholder={valueText(s.beamWeight, s)} /></div>
      {/if}
    </Section>

    <Section title="Loads" icon={Weight} summary={loadsSummary}>
      <div class="field-row">
        <div class="field">
          Values in
          <Choice name="Value unit" options={[['N', 'N'], ['kg', 'kg'], ['g', 'g']]} bind:value={gen.s.unit} />
        </div>
        {#if s.unit !== 'N'}
          <div class="field">
            g (N/kg)
            <Choice name="g" options={G_VALUES.map((g) => [g, g] as const)} bind:value={gen.s.g} />
          </div>
        {/if}
      </div>
      {#each gen.s.loads as load, i (load)}
        {@const l = s.loads[i]}
        <details class="row" open={unfolded.has(load)} ontoggle={(e) => toggle(e, load)}>
          <summary class="row-head">
            <span class="chevron"><ChevronDown size={16} aria-hidden="true" /></span>
            <span class="row-text">
              <span class="row-title">Load {i + 1}</span>
              {#if l}<span class="row-summary">{rowSummary(l, i)}</span>{/if}
            </span>
            <button type="button" class="icon-btn" aria-label="Remove load {i + 1}" data-tip="Remove" onclick={(e) => remove(e, i)}>
              <Trash2 size={17} />
            </button>
          </summary>
          {#if l}
            <div class="field"><Choice name="Load {i + 1} kind" options={KINDS} bind:value={load.kind} /></div>
            <div class="field-row">
              <label class="field">
                From the {end} end ({unit})
                <input type="number" min="0" max={s.length} step="any" bind:value={load.position} />
              </label>
              <label class="field">
                {l.kind === 'up' || l.kind === 'down' ? 'Force' : s.unit === 'N' ? 'Weight' : 'Mass'} ({s.unit})
                <input type="number" min="0" max="99999" step="any" bind:value={load.value} />
              </label>
            </div>
            {#if l.position > s.length}
              <p class="note warning" role="status">That’s past the end of the {exact(s.length)} {unit} beam, so it is drawn and worked out at the end.</p>
            {/if}
            {#if s.support === 'pivot'}
              {@const v = balancingValue(s, i)}
              <button type="button" class="btn-ghost small" disabled={v === null || v === l.value} onclick={() => balance(i)}>
                <Scale size={14} aria-hidden="true" />
                {v === null ? 'No value of this load balances the beam' : v === l.value ? 'Balanced with this value' : `Balance with this load (${valueText(v, s)})`}
              </button>
            {/if}
            <div class="field">Label <LabelField name="Load {i + 1} label" bind:label={load.label} placeholder={valueText(l.value, s)} /></div>
            {#if s.distances}
              <div class="field">
                Distance label
                <LabelField name="Load {i + 1} distance label" bind:label={load.distanceLabel} placeholder={loadDistanceText(s, i)} />
              </div>
            {/if}
            {#if l.kind === 'hanging' || l.kind === 'resting'}
              <div class="field">Shape <Choice name="Load {i + 1} shape" options={[['block', 'Block'], ['ball', 'Ball']]} bind:value={load.shape} /></div>
              <label class="field">
                Size
                <span class="slider">
                  <input type="range" min="0.5" max="2" step="0.05" bind:value={load.size} />
                  <output>{Math.round(l.size * 100)}%</output>
                </span>
              </label>
            {/if}
          {/if}
        </details>
      {/each}
      {#if clashText}
        <p class="note warning" role="status">{clashText}</p>
      {/if}
      <button type="button" class="btn-ghost add" disabled={full} onclick={add}>
        <Plus size={15} aria-hidden="true" />
        {full ? `A beam holds up to ${MAX_LOADS} loads` : 'Add a load'}
      </button>
    </Section>

    <Section title="Marks and forces" icon={Ruler} summary={marksSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.distances} /> Distance marks, from the {s.support === 'pivot' ? 'pivot' : s.support === 'two' ? 'support A' : 'wall'}</label>
      {#if fig.dropped}
        <p class="note warning" role="status">
          {fig.dropped} mark{fig.dropped === 1 ? ' doesn’t' : 's don’t'} fit above the beam and {fig.dropped === 1 ? 'is' : 'are'} left off. Smaller objects or fewer loads on one side make room.
        </p>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={gen.s.lengthMark} /> The beam’s whole length</label>
      {#if s.lengthMark}
        <div class="field">Length label <LabelField name="Length label" bind:label={gen.s.lengthLabel} placeholder={distanceText(s.length, s)} /></div>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={gen.s.weightArrows} /> A weight arrow down from every object</label>
      <label class="check"><input type="checkbox" bind:checked={gen.s.supportForces} /> The forces holding the beam up</label>
      {#if s.supportForces}
        <div class="field">
          {s.support === 'wall' && s.cable ? 'Wall’s force (its parts get _x and _y)' : s.support === 'two' ? 'Support force (A and B get _A and _B)' : s.support === 'wall' ? 'Wall’s force' : 'Pivot’s force'}
          <LabelField name="Support force label" bind:label={gen.s.supportLabel} />
        </div>
        {#if s.support === 'wall' && s.cable}
          <div class="field">Tension <LabelField name="Tension label" bind:label={gen.s.tensionLabel} /></div>
        {:else if s.support === 'wall'}
          <div class="field">Wall’s moment (the curved arrow) <LabelField name="Wall’s moment label" bind:label={gen.s.momentLabel} /></div>
        {/if}
      {/if}
      {#if s.support === 'two'}
        <label class="check"><input type="checkbox" bind:checked={gen.s.supportNames} /> A and B under the supports</label>
      {/if}
    </Section>

    <Section title="Torque" icon={Calculator} summary={answer.text}>
      <p class="note verdict" class:warning={answer.warning} role="status">{answer.text}</p>
      <ol class="working">
        {#each working as line, k (k)}<li>{line}</li>{/each}
      </ol>
    </Section>

    <FigureOptions bind:mirror={gen.s.mirror} bind:color={gen.s.color} />
  {/snippet}

  {#snippet figure()}
    <Torque settings={s} id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .setups { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; margin-bottom: 0.75rem; }
  .setups button {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--ink);
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .setups button:hover { background: var(--blue-soft); }
  .setups button.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-dark); font-weight: 700; }
  .row { border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
  .row[open] { padding-bottom: 0.75rem; }
  .row-head { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; list-style: none; padding: 0.15rem 0; }
  .row-head::-webkit-details-marker { display: none; }
  .row[open] > .row-head { margin-bottom: 0.25rem; }
  .row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .row-title { font-weight: 800; }
  .row-summary { font-size: 0.8rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .row[open] .row-summary { display: none; }
  .chevron { display: inline-flex; color: var(--muted); transform: rotate(-90deg); transition: transform 0.15s; }
  .row[open] .chevron { transform: none; }
  .warning { color: var(--ink); background: #fffbeb; border-left: 3px solid var(--amber); border-radius: 6px; padding: 0.5rem 0.7rem; }
  .verdict { color: var(--ink); font-weight: 700; }
  .working { margin: 0.5rem 0; padding-left: 1.2rem; font-size: 0.85rem; line-height: 1.45; }
  .working li + li { margin-top: 0.25rem; }
  .add { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 9px; }
  .small { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; font-size: 0.82rem; border-radius: 9px; margin: 0.1rem 0 0.6rem; }
</style>
