<script lang="ts">
  // The motion typed segment by segment, for the Motion Graph and Motion Map
  // Generators alike: each segment's kind, speed and duration, moved, removed
  // or added from a button for each kind, then where the motion starts. Each
  // segment shows its numbers, and a warning when it can't reach its speed.
  // `segments` and `start` are the live settings; `clean` and `m` are the
  // tidied segments and the motion they make, as the page draws them.
  import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import { numberText, segmentLines, type Motion } from './motion'
  import { KIND_NAMES, KINDS, MAX_SEGMENTS, newSegment, speedFor, type Kind, type Segment } from './settings'

  interface Props {
    segments: Segment[]
    start: number
    clean: Segment[]
    m: Motion
  }
  let { segments = $bindable(), start = $bindable(), clean, m }: Props = $props()

  const lines = $derived(segmentLines(m))

  const full = $derived(clean.length >= MAX_SEGMENTS)
  const add = (kind: Kind) => {
    if (!full) segments.push(newSegment({ kind }))
  }
  const remove = (i: number) => segments.splice(i, 1)
  function move(i: number, by: -1 | 1) {
    const [seg] = segments.splice(i, 1)
    segments.splice(i + by, 0, seg)
  }
  const SPEED_NAMES: Record<Exclude<Kind, 'rest'>, string> = { forward: 'Speed', back: 'Speed', faster: 'Speeds up to', slower: 'Slows down to' }
  // Slowing down starts out to a stop, and the others at a speed, so a new
  // kind of segment draws something rather than a warning.
  function setKind(seg: Segment, kind: Kind) {
    if (kind === 'slower' || seg.kind === 'slower') seg.speed = speedFor(kind)
    seg.kind = kind
  }
  function unreachedNote(i: number) {
    const was = Math.abs(m.pieces[i - 1]?.v1 ?? 0)
    const to = numberText(clean[i].speed)
    const faster = clean[i].kind === 'faster'
    if (was === 0) return faster ? 'It starts at rest, so speeding up to 0 m/s leaves it at rest.' : 'It starts at rest, so there’s nothing to slow down: it stays at rest.'
    return faster
      ? `It’s already going ${numberText(was)} m/s, so it can’t speed up to ${to} m/s: it keeps going ${numberText(was)} m/s.`
      : `It’s only going ${numberText(was)} m/s, so it can’t slow down to ${to} m/s: it keeps going ${numberText(was)} m/s.`
  }
  // Which way a segment speeding up goes is only asked when it starts at rest.
  const fromRest = (i: number) => clean[i]?.kind === 'faster' && (i === 0 ? true : m.pieces[i - 1]?.v1 === 0)
</script>

{#each segments as seg, i (seg)}
  <div class="segment">
    <div class="segment-head">
      <span>Segment {i + 1}</span>
      <span class="moves">
        <button type="button" class="icon-btn" aria-label="Move segment {i + 1} earlier" data-tip="Earlier" disabled={i === 0} onclick={() => move(i, -1)}>
          <ArrowUp size={17} />
        </button>
        <button type="button" class="icon-btn" aria-label="Move segment {i + 1} later" data-tip="Later" disabled={i === clean.length - 1} onclick={() => move(i, 1)}>
          <ArrowDown size={17} />
        </button>
        <button type="button" class="icon-btn" aria-label="Remove segment {i + 1}" data-tip="Remove" onclick={() => remove(i)}>
          <Trash2 size={17} />
        </button>
      </span>
    </div>
    <label class="field">
      What it does
      <select value={seg.kind} onchange={(e) => setKind(seg, e.currentTarget.value as Kind)}>
        {#each KINDS as k}<option value={k}>{KIND_NAMES[k]}</option>{/each}
      </select>
    </label>
    <div class="field-row">
      {#if seg.kind !== 'rest'}
        <label class="field">
          {SPEED_NAMES[seg.kind]} (m/s)
          <input type="number" min="0" max="100" step="any" bind:value={seg.speed} />
        </label>
      {/if}
      <label class="field">
        Lasts (s)
        <input type="number" min="0.1" max="60" step="any" bind:value={seg.duration} />
      </label>
    </div>
    {#if fromRest(i)}
      <div class="field">
        Which way
        <Choice name="Segment {i + 1} direction" options={[['forward', 'Forward'], ['back', 'Back']]} bind:value={seg.dir} />
      </div>
    {/if}
    {#if lines[i]}<p class="note numbers">{lines[i]}</p>{/if}
    {#if m.unreached.includes(i)}<p class="note warning" role="status">{unreachedNote(i)}</p>{/if}
  </div>
{/each}

<div class="field add">
  {full ? `A motion has up to ${MAX_SEGMENTS} segments.` : 'Add a segment'}
  <div class="starters">
    {#each KINDS as k}
      <button type="button" class="btn-ghost" disabled={full} onclick={() => add(k)}><Plus size={15} aria-hidden="true" /> {KIND_NAMES[k]}</button>
    {/each}
  </div>
</div>
<label class="field">
  Starting position (m)
  <input type="number" min="-50" max="50" step="1" bind:value={start} />
</label>

<style>
  .segment { border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
  .segment-head { display: flex; align-items: center; justify-content: space-between; font-weight: 800; margin-bottom: 0.25rem; }
  .moves { display: flex; gap: 0.15rem; }
  .numbers { margin: 0; }
  .warning { color: var(--ink); background: #fffbeb; border-left: 3px solid var(--amber); border-radius: 6px; padding: 0.5rem 0.7rem; margin: 0.5rem 0 0; }
  .starters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .starters button { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 9px; }
</style>
