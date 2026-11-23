<script lang="ts">
  // The Pendulum Generator: the picture and the angle, the marks, the forces
  // or the velocity, and the bob's label down the left, the figure on the
  // right. Settings live in the page address.
  import { Circle, MoveUpRight, Ruler, SlidersHorizontal, Type, Waypoints } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import { typeLabel, type Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import SharedLabelField from '$shared/LabelField.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import Pendulum from './Pendulum.svelte'
  import { MAX_ANGLE, MIN_ANGLE, MIN_SWING_ANGLE, PICTURE_DEFAULTS, PICTURE_NAMES, PICTURES, pendulumSettings, type Picture } from './settings'

  const gen = generatorState(pendulumSettings, 'pendulum', { history: 'physicsfigures.pendulum.history', presets: 'physicsfigures.pendulum.presets' })
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const swing = $derived(clean.picture === 'swing')

  /** Each picture starts with its own marks: the path and the height on in the Swing, off for One bob. */
  function setPicture(p: Picture) {
    if (p === clean.picture) return
    s.picture = p
    Object.assign(s, PICTURE_DEFAULTS[p])
    if (p === 'swing') s.angle = Math.max(MIN_SWING_ANGLE, clean.angle)
  }

  const shown = (l: Label) => (l.mode === 'text' ? `“${typeLabel(l.text)}”` : l.mode === 'blank' ? 'blank' : '')
  const pendulumSummary = $derived(`${PICTURE_NAMES[clean.picture]} · ${clean.angle}° · ${clean.side}`)
  const marksSummary = $derived(
    [
      clean.arc ? 'path' : '',
      clean.angleMark ? `angle ${shown(clean.angleLabel)}`.trim() : '',
      shown(clean.lengthLabel) ? `length ${shown(clean.lengthLabel)}` : '',
      clean.heightMark ? `height ${shown(clean.heightLabel)}`.trim() : '',
      swing && clean.pointLabels ? 'lettered' : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const FORCE_NAMES = { none: 'none', tensionWeight: 'tension and weight', components: 'tension, weight and its components' }
  const vectorsSummary = $derived(swing ? (clean.velocity ? `velocity ${shown(clean.velocityLabel)}`.trim() : 'none') : FORCE_NAMES[clean.forces])
  const textSummary = $derived(clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title')
</script>

<GeneratorPage name="Pendulum Generator" filename="pendulum" {gen} {svg}>
  {#snippet settings()}
    <Section title="Pendulum" icon={Waypoints} summary={pendulumSummary}>
      <div class="chips" role="radiogroup" aria-label="Picture">
        {#each PICTURES as p (p)}
          <button type="button" role="radio" aria-checked={clean.picture === p} class="chip" class:on={clean.picture === p} onclick={() => setPicture(p)}>
            {PICTURE_NAMES[p]}
          </button>
        {/each}
      </div>
      <p class="note below">
        {swing ? 'The bob at its release point, at the bottom and at the far side, for energy problems.' : 'The bob at one angle, for the forces on it.'}
      </p>
      <label class="field">
        Angle from the vertical
        <span class="slider">
          <input type="range" min={swing ? MIN_SWING_ANGLE : MIN_ANGLE} max={MAX_ANGLE} bind:value={s.angle} />
          <output>{clean.angle}°</output>
        </span>
      </label>
      {#if swing}<p class="note">At least {MIN_SWING_ANGLE}° in the Swing, so the three bobs stand apart.</p>{/if}
      <div class="field">
        {swing ? 'Released on the' : 'Bob on the'}
        <Choice name="Side" options={[['left', 'Left'], ['right', 'Right']] as const} bind:value={s.side} />
      </div>
    </Section>

    <Section title="Marks" icon={Ruler} summary={marksSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.arc} /> The bob’s path, dashed</label>
      <label class="check"><input type="checkbox" bind:checked={s.angleMark} /> Angle from the vertical</label>
      {#if clean.angleMark}<div class="field"><LabelField name="Angle label" bind:label={s.angleLabel} placeholder="θ" /></div>{/if}
      <div class="field">String length <LabelField name="String length label" bind:label={s.lengthLabel} placeholder="L" /></div>
      <label class="check"><input type="checkbox" bind:checked={s.heightMark} /> Height above the lowest point</label>
      {#if clean.heightMark}<div class="field"><LabelField name="Height label" bind:label={s.heightLabel} placeholder="h" /></div>{/if}
      {#if swing}
        <label class="check"><input type="checkbox" bind:checked={s.pointLabels} /> Letter the three bobs</label>
        {#if clean.pointLabels}
          <div class="field">Release point <LabelField name="Release point label" bind:label={s.labelA} placeholder="A" /></div>
          <div class="field">Bottom <LabelField name="Bottom label" bind:label={s.labelB} placeholder="B" /></div>
          <div class="field">Far side <LabelField name="Far side label" bind:label={s.labelC} placeholder="C" /></div>
        {/if}
      {/if}
    </Section>

    <Section title={swing ? 'Velocity' : 'Forces'} icon={MoveUpRight} summary={vectorsSummary}>
      {#if swing}
        <label class="check"><input type="checkbox" bind:checked={s.velocity} /> Velocity at the bottom</label>
        {#if clean.velocity}<div class="field"><LabelField name="Velocity label" bind:label={s.velocityLabel} placeholder="v" /></div>{/if}
        <p class="note">At the release point and the far side the bob is at rest for a moment, so it has no velocity there.</p>
      {:else}
        <div class="field">
          <Choice name="Forces" options={[['none', 'None'], ['tensionWeight', 'Tension and weight'], ['components', 'With components']] as const} bind:value={s.forces} />
        </div>
        {#if clean.forces !== 'none'}
          <div class="field">Tension <LabelField name="Tension label" bind:label={s.tensionLabel} placeholder="T" /></div>
          <div class="field">Weight <LabelField name="Weight label" bind:label={s.weightLabel} placeholder="mg" /></div>
          {#if clean.forces === 'components'}
            <div class="field">Along the string <LabelField name="Component along the string label" bind:label={s.alongLabel} placeholder="mg cos θ" /></div>
            <div class="field">Along the path <LabelField name="Component along the path label" bind:label={s.acrossLabel} placeholder="mg sin θ" /></div>
          {/if}
          <p class="note">Drawn at the release point, where the bob is at rest for a moment, so the tension is as long as mg cos θ.</p>
        {/if}
      {/if}
    </Section>

    <Section title="Bob" icon={Circle} summary={shown(clean.bobLabel) || 'no label'}>
      <div class="field">Label <LabelField name="Bob label" bind:label={s.bobLabel} placeholder="m" /></div>
    </Section>

    <Section title="Title" icon={Type} summary={textSummary}>
      <p class="field-label">Chart title</p>
      <SharedLabelField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. A swinging pendulum" blank={false} />
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={clean.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <Pendulum settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .below { margin-top: 0.6rem; }
  .field-label { margin: 0 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
</style>
