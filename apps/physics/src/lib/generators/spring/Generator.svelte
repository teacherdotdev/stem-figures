<script lang="ts">
  // The Spring Generator: the spring and how it's drawn, the object, the
  // marks, the Three positions' arrows and the figure's options down the
  // left, the figure on the right. Settings live in the page address.
  import { Activity, Box, MoveUpRight, Ruler, SlidersHorizontal, Type } from '@lucide/svelte'
  import Choice from '$lib/shared/Choice.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import TitleField from '$shared/LabelField.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import Spring from './Spring.svelte'
  import { equilibriumLabelled, equilibriumShown } from './spring'
  import { HORIZONTAL_MOST_AMPLITUDE, LEAST_HANGING_STRETCH, MOST_COMPRESSED, MOST_STRETCHED, arrangementOf, springSettings, type Orientation, type Picture } from './settings'

  const gen = generatorState(springSettings, 'spring', { history: 'physicsfigures.spring.history', presets: 'physicsfigures.spring.presets' })
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const hanging = $derived(clean.orientation === 'hanging')
  const positions = $derived(clean.picture === 'positions')

  /** After the orientation or picture changes, the form shows what the figure draws. */
  function settle() {
    const now = gen.snapshot()
    s.stretch = now.stretch
    s.object = now.object
  }
  function setOrientation(o: Orientation) {
    // A spring squashed on a floor is stretched as much when it hangs.
    if (o === 'hanging' && s.stretch < 0) s.stretch = -s.stretch
    s.orientation = o
    settle()
  }
  function setPicture(p: Picture) {
    s.picture = p
    if (p === 'positions') s.equilibriumLine = true
    if (p === 'beforeAfter') s.extensionMark = true
    settle()
  }

  const PICTURES: [Picture, string][] = [
    ['one', 'One spring'],
    ['beforeAfter', 'Before and after'],
    ['positions', 'Three positions'],
  ]
  const lowest = $derived(positions ? 0 : hanging ? LEAST_HANGING_STRETCH : MOST_COMPRESSED)
  const highest = $derived(positions && !hanging ? HORIZONTAL_MOST_AMPLITUDE : MOST_STRETCHED)
  const percent = (n: number) => `${Math.round(Math.abs(n) * 100)}%`

  const shown = (l: Label) => (l.mode === 'text' ? l.text.trim() : l.mode === 'blank' ? 'blank' : '')
  const arrangement = $derived(arrangementOf(clean.springs))
  const springSummary = $derived(
    [
      hanging ? 'Hanging' : 'Horizontal',
      PICTURES.find(([p]) => p === clean.picture)![1],
      arrangement.count === 1 ? '1 spring' : `${arrangement.count} in ${arrangement.joined}`,
      positions ? `A = ${percent(clean.stretch)}` : clean.stretch === 0 ? 'natural length' : `${clean.stretch > 0 ? 'stretched' : 'squashed'} ${percent(clean.stretch)}`,
      clean.coils,
    ].join(' · '),
  )
  const objectSummary = $derived([clean.object === 'masses' ? 'slotted masses' : clean.object, shown(clean.massLabel)].filter(Boolean).join(' · '))
  const marksSummary = $derived(
    [
      shown(clean.springLabel),
      !positions && clean.extensionMark ? 'extension' : '',
      !positions && clean.lengthMark ? 'natural length' : '',
      clean.equilibriumLine ? 'equilibrium line' : '',
      !positions && clean.appliedForce ? 'applied force' : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const motionSummary = $derived(
    { none: 'no arrows', velocity: 'velocity', acceleration: 'acceleration', both: 'velocity and acceleration' }[clean.motionArrows],
  )
  const titleSummary = $derived(clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title')
</script>

<GeneratorPage name="Spring Generator" filename="spring" {gen} {svg}>
  {#snippet settings()}
    <Section title="Spring" icon={Activity} summary={springSummary}>
      <div class="field">
        Orientation
        <Choice name="Orientation" options={[['hanging', 'Hanging'], ['horizontal', 'Horizontal']] as const} bind:value={() => clean.orientation, setOrientation} />
      </div>
      <div class="field">
        Picture
        <Choice name="Picture" options={PICTURES} bind:value={() => clean.picture, setPicture} />
      </div>
      {#if !positions}
        <div class="field">
          Springs
          <Choice name="Springs" options={[['1', '1'], ['2s', '2 in series'], ['2p', '2 in parallel'], ['3s', '3 in series'], ['3p', '3 in parallel']] as const} bind:value={s.springs} />
        </div>
      {/if}
      <label class="field">
        {positions ? 'Amplitude A' : hanging ? 'Extension' : 'Extension (below 0, squashed)'}, as a share of the natural length
        <span class="slider">
          <input type="range" min={lowest} max={highest} step="0.05" bind:value={s.stretch} />
          <output>{clean.stretch < 0 ? '−' : ''}{percent(clean.stretch)}</output>
        </span>
      </label>
      <div class="field">
        Coils
        <Choice name="Coils" options={[['zigzag', 'Zigzag'], ['loops', 'Loops']] as const} bind:value={s.coils} />
      </div>
    </Section>

    <Section title="Object" icon={Box} summary={objectSummary}>
      <div class="field">
        {#if hanging}
          <Choice name="Object" options={[['block', 'Block'], ['masses', 'Slotted masses'], ['ball', 'Ball']] as const} bind:value={s.object} />
        {:else}
          <Choice name="Object" options={[['block', 'Block'], ['ball', 'Ball']] as const} bind:value={s.object} />
        {/if}
      </div>
      <div class="field">Label <LabelField name="Object label" bind:label={s.massLabel} /></div>
    </Section>

    <Section title="Labels and marks" icon={Ruler} summary={marksSummary}>
      <div class="field">Spring <LabelField name="Spring label" bind:label={s.springLabel} /></div>
      {#if !positions}
        <label class="check"><input type="checkbox" bind:checked={s.extensionMark} /> Extension</label>
        {#if clean.extensionMark}<div class="field"><LabelField name="Extension label" bind:label={s.extensionLabel} /></div>{/if}
        <label class="check"><input type="checkbox" bind:checked={s.lengthMark} /> Natural length</label>
        {#if clean.lengthMark}<div class="field"><LabelField name="Natural length label" bind:label={s.lengthLabel} /></div>{/if}
      {/if}
      <label class="check"><input type="checkbox" bind:checked={s.equilibriumLine} /> Equilibrium line</label>
      {#if clean.equilibriumLine && !equilibriumShown(clean)}
        <p class="note">Left off while the applied force pulls the object past where it hangs at rest.</p>
      {/if}
      {#if equilibriumShown(clean) && equilibriumLabelled(clean)}<div class="field"><LabelField name="Equilibrium line label" bind:label={s.equilibriumLabel} /></div>{/if}
      {#if !positions}
        <label class="check"><input type="checkbox" bind:checked={s.appliedForce} /> Applied force</label>
        {#if clean.appliedForce}<div class="field"><LabelField name="Applied force label" bind:label={s.forceLabel} /></div>{/if}
      {/if}
    </Section>

    {#if positions}
      <Section title="Three positions" icon={MoveUpRight} summary={motionSummary}>
        <div class="field">Amplitude <LabelField name="Amplitude label" bind:label={s.amplitudeLabel} /></div>
        <div class="field">
          Arrows
          <Choice name="Arrows" options={[['none', 'None'], ['velocity', 'v'], ['acceleration', 'a'], ['both', 'Both']] as const} bind:value={s.motionArrows} />
        </div>
        {#if clean.motionArrows === 'velocity' || clean.motionArrows === 'both'}
          <div class="field">Velocity <LabelField name="Velocity label" bind:label={s.velocityLabel} /></div>
          <div class="field">
            At equilibrium, moving
            <Choice name="Moving" options={[['away', hanging ? 'Down' : 'Away from the wall'], ['toward', hanging ? 'Up' : 'Toward the wall']] as const} bind:value={s.moving} />
          </div>
        {/if}
        {#if clean.motionArrows === 'acceleration' || clean.motionArrows === 'both'}
          <div class="field">Acceleration <LabelField name="Acceleration label" bind:label={s.accelerationLabel} /></div>
        {/if}
      </Section>
    {/if}

    <Section title="Title" icon={Type} summary={titleSummary}>
      <TitleField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. Hooke's law" blank={false} />
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={clean.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <Spring settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>
