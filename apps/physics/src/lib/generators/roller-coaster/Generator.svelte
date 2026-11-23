<script lang="ts">
  // The Roller Coaster Generator: the track's points, the loop, the object
  // and the marks on the left, the figure on the right. Settings live in the
  // page address.
  import { ArrowDown, ArrowUp, Box, Plus, RefreshCw, Route, Ruler, Trash2 } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import FigureOptions from '$lib/shared/FigureOptions.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import Track from './Track.svelte'
  import { MAX_POINTS, MIN_POINTS, added, coasterSettings, heightTyped, moved, removed, type TrackPoint } from './settings'
  import { buildTrack, loopIndexOf } from './track'

  const gen = createGenerator(coasterSettings, 'roller-coaster')
  const s = $derived(gen.snapshot())
  const fig = $derived(buildTrack(s))

  const shown = (l: Label) => (l.mode === 'text' ? `“${l.text}”` : l.mode === 'blank' ? 'blank' : 'no label')
  const hasLoop = $derived(loopIndexOf(s) >= 0)
  const nameOf = (p: TrackPoint, i: number) => `Point ${i + 1}${p.label.mode === 'text' && p.label.text ? ` (${p.label.text})` : ''}`
  const anyRough = $derived(s.points.slice(0, -1).some((p) => p.rough))

  const trackSummary = $derived(`${s.points.length} points · heights ${s.points.map((p) => p.height).join(', ')}`)
  const loopSummary = $derived(hasLoop ? `at point ${s.loopAt} · radius ${s.loopRadius}` : 'none')
  const objectSummary = $derived(
    s.object === 'none'
      ? 'none'
      : [s.object, shown(s.objectLabel), s.objectOnLoop && hasLoop ? 'at the top of the loop' : `at point ${Math.min(s.objectAt, s.points.length)}`, s.velocity === 'none' ? '' : 'velocity']
          .filter(Boolean)
          .join(' · '),
  )
  const marksSummary = $derived([anyRough ? `rough ${shown(s.roughLabel)}` : '', s.ground ? 'ground' : 'no ground'].filter(Boolean).join(' · '))

  // The loop and the object are at a point by its number, so they follow their point when one is added, moved or removed.
  const follow = (to: Pick<typeof gen.s, 'points' | 'loopAt' | 'objectAt'>) => Object.assign(gen.s, to)
  const track = () => ({ points: gen.s.points, loopAt: gen.s.loopAt, objectAt: gen.s.objectAt })
</script>

<GeneratorPage name="Roller Coaster Generator" filename="roller-coaster" {gen}>
  {#snippet settings()}
    <Section title="Track" icon={Route} summary={trackSummary}>
      {#each gen.s.points as p, i (p)}
        {@const name = nameOf(s.points[i] ?? p, i)}
        <div class="point">
          <div class="point-head">
            <span>{name}</span>
            <span class="moves">
              <button type="button" class="icon-btn" aria-label="Move point {i + 1} earlier" data-tip="Earlier" disabled={i === 0} onclick={() => follow(moved(track(), i, -1))}>
                <ArrowUp size={17} />
              </button>
              <button type="button" class="icon-btn" aria-label="Move point {i + 1} later" data-tip="Later" disabled={i === gen.s.points.length - 1} onclick={() => follow(moved(track(), i, 1))}>
                <ArrowDown size={17} />
              </button>
              <button type="button" class="icon-btn" aria-label="Remove point {i + 1}" data-tip="Remove" disabled={gen.s.points.length <= MIN_POINTS} onclick={() => follow(removed(track(), i))}>
                <Trash2 size={17} />
              </button>
            </span>
          </div>
          <label class="field">
            Height
            <input type="number" min="0" max="100" step="any" bind:value={() => p.height, (v) => heightTyped(p, v)} />
          </label>
          <div class="field">Label <LabelField name="{name} label" bind:label={p.label} /></div>
          <div class="field">Height mark <LabelField name="{name} height mark" bind:label={p.heightLabel} /></div>
          {#if i < gen.s.points.length - 1}
            <label class="check"><input type="checkbox" bind:checked={p.rough} /> Rough from here to point {i + 2}</label>
            {#if p.rough}
              <div class="field">Length mark <LabelField name="{name} length mark" bind:label={p.lengthLabel} /></div>
            {/if}
          {/if}
        </div>
      {/each}
      {#if gen.s.points.length < MAX_POINTS}
        <button type="button" class="btn-ghost add" onclick={() => follow(added(track()))}><Plus size={15} aria-hidden="true" /> Add a point</button>
      {:else}
        <p class="note">A track has up to {MAX_POINTS} points.</p>
      {/if}
    </Section>

    <Section title="Loop" icon={RefreshCw} summary={loopSummary}>
      <label class="field">
        Loop at
        <select bind:value={gen.s.loopAt}>
          <option value={0}>No loop</option>
          {#each s.points as p, i}<option value={i + 1}>{nameOf(p, i)}</option>{/each}
        </select>
      </label>
      {#if hasLoop}
        <label class="field">
          Radius
          <span class="slider">
            <input type="range" min="2" max="50" step="1" bind:value={gen.s.loopRadius} />
            <output>{s.loopRadius}</output>
          </span>
        </label>
        {#if fig.loopCapped}
          <p class="note">There’s no room for a loop this big between its neighbours, so it’s drawn smaller than to scale.</p>
        {/if}
        <div class="field">Radius label <LabelField name="Radius label" bind:label={gen.s.radiusLabel} /></div>
        <div class="field">Label at the top of the loop <LabelField name="Label at the top of the loop" bind:label={gen.s.loopTopLabel} /></div>
      {/if}
    </Section>

    <Section title="Object" icon={Box} summary={objectSummary}>
      <div class="field">
        <Choice name="Object" options={[['cart', 'Cart'], ['ball', 'Ball'], ['block', 'Block'], ['none', 'None']]} bind:value={gen.s.object} />
      </div>
      {#if s.object !== 'none'}
        <div class="field">Label <LabelField name="Object label" bind:label={gen.s.objectLabel} /></div>
        <label class="field">
          Size
          <span class="slider">
            <input type="range" min="0.3" max="1.2" step="0.05" bind:value={gen.s.objectSize} />
            <output>{Math.round(s.objectSize * 100)}%</output>
          </span>
        </label>
        {#if fig.object && fig.object.size < s.objectSize}
          <p class="note">The track bends tightly here, so the {s.object} is drawn smaller to sit on it.</p>
        {/if}
        {#if hasLoop}
          <label class="check"><input type="checkbox" bind:checked={gen.s.objectOnLoop} /> At the top of the loop, upside down</label>
        {/if}
        {#if !(hasLoop && s.objectOnLoop)}
          <label class="field">
            Sits at
            <select bind:value={gen.s.objectAt}>
              {#each s.points as p, i}<option value={i + 1}>{nameOf(p, i)}</option>{/each}
            </select>
          </label>
        {/if}
        <div class="field">
          Velocity
          <Choice name="Velocity" options={[['none', 'None'], ['forward', 'Forward'], ['back', 'Back']]} bind:value={gen.s.velocity} />
        </div>
        {#if s.velocity !== 'none'}
          <div class="field"><LabelField name="Velocity label" bind:label={gen.s.velocityLabel} /></div>
        {/if}
      {/if}
    </Section>

    <Section title="Marks and friction" icon={Ruler} summary={marksSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.ground} /> Ground</label>
      {#if anyRough}
        <div class="field">Friction label, at the first rough stretch <LabelField name="Friction label" bind:label={gen.s.roughLabel} /></div>
      {:else}
        <p class="note">Friction is set per point, under Track.</p>
      {/if}
    </Section>
    <FigureOptions bind:mirror={gen.s.mirror} bind:color={gen.s.color} />
  {/snippet}

  {#snippet figure()}
    <Track settings={s} id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .point { border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; margin-bottom: 0.75rem; }
  .point-head { display: flex; align-items: center; justify-content: space-between; font-weight: 800; margin-bottom: 0.25rem; }
  .moves { display: flex; gap: 0.15rem; }
  .add { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.35rem 0.65rem; font-size: 0.85rem; border-radius: 9px; }
</style>
