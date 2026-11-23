<script lang="ts">
  // The Circular Motion Generator: the setup, the object, its vectors and
  // marks on the left, the figure on the right. Settings live in the page
  // address.
  import { Circle, MoveUpRight, Orbit, Ruler, SlidersHorizontal } from '@lucide/svelte'
  import Choice, { radioKeys, radioTabIndex } from '$lib/shared/Choice.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import LabelField from '$lib/shared/LabelField.svelte'
  import type { Label } from '$lib/shared/label'
  import Section from '$lib/shared/Section.svelte'
  import CircularMotion from './CircularMotion.svelte'
  import { SETUP_NAMES, SETUPS, circularSettings, hasInner, objectKind, pointsOf } from './settings'

  const gen = createGenerator(circularSettings, 'circular-motion')
  const s = $derived(gen.snapshot())

  const shown = (l: Label) => (l.mode === 'text' ? `“${l.text}”` : l.mode === 'blank' ? 'blank' : 'no label')
  const top = $derived(s.setup === 'top')
  const conical = $derived(s.setup === 'conical')
  const ground = $derived(s.setup === 'vertical' && (s.held === 'hill' || s.held === 'dip'))
  const turning = $derived(s.direction === 'ccw' ? 'counterclockwise' : 'clockwise')
  /** What pushes or pulls the object toward the centre in a side view. */
  const contact = $derived(s.setup === 'vertical' && s.held !== 'string' ? 'normal force' : 'tension')

  const AROUND_NAMES = { nothing: 'nothing around it', string: 'on a string', turntable: 'on a turntable', road: 'on a road' }
  const HELD_NAMES = { string: 'on a string', loop: 'inside a loop', hill: 'over a hill', dip: 'through a dip' }
  const setupSummary = $derived(
    (top
      ? [SETUP_NAMES.top, AROUND_NAMES[s.around], `${s.positions} position${s.positions === 1 ? '' : 's'}`, turning]
      : conical
        ? [SETUP_NAMES.conical, `${s.angle}°`]
        : [SETUP_NAMES.vertical, HELD_NAMES[s.held], ground ? '' : pointsOf(s).join(', ')]
    )
      .filter(Boolean)
      .join(' · '),
  )
  const objectSummary = $derived([objectKind(s), hasInner(s) ? 'and a second one' : '', s.objectLabel.mode === 'none' ? '' : shown(s.objectLabel)].filter(Boolean).join(' · '))
  const vectorsSummary = $derived(
    [
      s.velocity ? `velocity ${shown(s.velocityLabel)}` : '',
      s.acceleration ? `acceleration ${shown(s.accelerationLabel)}` : '',
      top && s.inwardForce ? `inward force ${shown(s.forceLabel)}` : '',
      !top && s.forces ? `gravity and the ${contact}` : '',
      conical && s.forces && s.components ? 'components' : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'none',
  )
  const marksSummary = $derived(
    [
      s.radius === 'none' ? '' : s.radius === 'diameter' && !conical && !ground ? 'diameter' : `radius ${shown(s.radiusLabel)}`,
      top && s.angularSpeed ? `angular speed ${shown(s.omegaLabel)}` : '',
      top && s.angleMark ? `angle ${shown(s.angleLabel)}` : '',
      !conical && s.pointLabels ? 'lettered' : '',
    ]
      .filter(Boolean)
      .join(' · ') || 'none',
  )
</script>

<GeneratorPage name="Circular Motion Generator" filename="circular-motion" {gen}>
  {#snippet settings()}
    <Section title="Setup" icon={Orbit} summary={setupSummary}>
      <div class="setups" role="radiogroup" aria-label="Setup">
        {#each SETUPS as setup}
          <button
            type="button"
            role="radio"
            aria-checked={s.setup === setup}
            tabindex={radioTabIndex(SETUPS, s.setup, setup)}
            class:on={s.setup === setup}
            onclick={() => (gen.s.setup = setup)}
            onkeydown={(e) => radioKeys(e, SETUPS, s.setup, (next) => (gen.s.setup = next))}
          >
            {SETUP_NAMES[setup]}
          </button>
        {/each}
      </div>

      {#if top}
        <div class="field">
          Around it
          <Choice name="Around it" options={[['nothing', 'Nothing'], ['string', 'String'], ['turntable', 'Turntable'], ['road', 'Road']]} bind:value={gen.s.around} />
        </div>
        {#if s.around === 'turntable'}
          <label class="check"><input type="checkbox" bind:checked={gen.s.inner} /> A second object, halfway out</label>
        {/if}
        <label class="field">
          Positions
          <span class="slider">
            <input type="range" min="1" max="8" bind:value={gen.s.positions} />
            <output>{s.positions}</output>
          </span>
        </label>
        {#if s.positions > 4}<p class="note">Past four positions, only the first one's vectors are labeled.</p>{/if}
        <label class="field">
          First position
          <span class="slider">
            <input type="range" min="0" max="359" bind:value={gen.s.startAngle} />
            <output>{s.startAngle}°</output>
          </span>
        </label>
      {:else if s.setup === 'vertical'}
        <div class="field">
          Held by
          <Choice name="Held by" options={[['string', 'String'], ['loop', 'Loop'], ['hill', 'Hill'], ['dip', 'Dip']]} bind:value={gen.s.held} />
        </div>
        {#if !ground}
          <div class="field">
            Drawn at
            <Choice
              name="Drawn at"
              options={[['top', 'Top'], ['bottom', 'Bottom'], ['side', 'Side'], ['topBottom', 'Top and bottom'], ['all', 'All three']]}
              bind:value={gen.s.points}
            />
          </div>
        {/if}
      {:else}
        <label class="field">
          Angle from the vertical
          <span class="slider">
            <input type="range" min="15" max="60" bind:value={gen.s.angle} />
            <output>{s.angle}°</output>
          </span>
        </label>
        <div class="field">Angle label <LabelField name="Angle label" bind:label={gen.s.angleLabel} /></div>
        <div class="field">String length label <LabelField name="String length label" bind:label={gen.s.lengthLabel} /></div>
      {/if}

      {#if !conical}
        <div class="field">
          Going round
          <Choice name="Direction" options={[['ccw', 'Counterclockwise'], ['cw', 'Clockwise']]} bind:value={gen.s.direction} />
        </div>
      {/if}
    </Section>

    <Section title="Object" icon={Circle} summary={objectSummary}>
      {#if top && s.around === 'road'}
        <p class="note">On a road the object is a block.</p>
      {:else}
        <div class="field">
          <Choice name="Object" options={[['ball', 'Ball'], ['block', 'Block']]} bind:value={gen.s.object} />
        </div>
      {/if}
      <div class="field">Label <LabelField name="Object label" bind:label={gen.s.objectLabel} placeholder="m" /></div>
    </Section>

    <Section title="Vectors" icon={MoveUpRight} summary={vectorsSummary}>
      <div class="vector">
        <label class="check"><input type="checkbox" bind:checked={gen.s.velocity} /> Velocity</label>
        {#if s.velocity}
          <div class="field"><LabelField name="Velocity label" bind:label={gen.s.velocityLabel} /></div>
          {#if conical}
            <div class="field">
              The bob is moving
              <Choice name="Velocity direction" options={[['out', 'Out of the page'], ['in', 'Into the page']]} bind:value={gen.s.velocityInto} />
            </div>
          {/if}
        {/if}
      </div>
      <div class="vector">
        <label class="check"><input type="checkbox" bind:checked={gen.s.acceleration} /> Centripetal acceleration</label>
        {#if s.acceleration}
          <div class="field"><LabelField name="Acceleration label" bind:label={gen.s.accelerationLabel} /></div>
        {/if}
      </div>
      {#if top}
        <div class="vector">
          <label class="check"><input type="checkbox" bind:checked={gen.s.inwardForce} /> Inward force</label>
          {#if s.inwardForce}
            <div class="field"><LabelField name="Inward force label" bind:label={gen.s.forceLabel} /></div>
          {/if}
        </div>
      {:else}
        <div class="vector">
          <label class="check"><input type="checkbox" bind:checked={gen.s.forces} /> Forces on the object</label>
          {#if s.forces}
            <div class="field">Gravity <LabelField name="Gravity label" bind:label={gen.s.gravityLabel} /></div>
            {#if contact === 'tension'}
              <div class="field">Tension <LabelField name="Tension label" bind:label={gen.s.tensionLabel} /></div>
            {:else}
              <div class="field">Normal force <LabelField name="Normal force label" bind:label={gen.s.normalLabel} /></div>
            {/if}
            {#if conical}
              <label class="check"><input type="checkbox" bind:checked={gen.s.components} /> The tension's components</label>
              {#if s.components}
                <div class="field">Horizontal <LabelField name="Horizontal component label" bind:label={gen.s.xLabel} /></div>
                <div class="field">Vertical <LabelField name="Vertical component label" bind:label={gen.s.yLabel} /></div>
              {/if}
            {/if}
          {/if}
        </div>
      {/if}
      <div class="vector">
        <div class="field">
          Vector notation
          <Choice name="Vector notation" options={[['none', 'None'], ['arrow', 'Arrow'], ['bold', 'Bold']]} bind:value={gen.s.notation} />
        </div>
      </div>
    </Section>

    <Section title="Marks" icon={Ruler} summary={marksSummary}>
      <div class="field">
        {conical || ground ? 'Radius' : 'Radius or diameter'}
        {#if conical || ground}
          <Choice name="Radius" options={[['none', 'None'], ['radius', 'Radius']]} bind:value={gen.s.radius} />
        {:else}
          <Choice name="Radius or diameter" options={[['none', 'None'], ['radius', 'Radius'], ['diameter', 'Diameter']]} bind:value={gen.s.radius} />
        {/if}
      </div>
      {#if s.radius !== 'none'}
        <div class="field">
          <LabelField name="{s.radius === 'diameter' && !conical && !ground ? 'Diameter' : 'Radius'} label" bind:label={gen.s.radiusLabel} />
        </div>
      {/if}
      {#if top}
        <label class="check"><input type="checkbox" bind:checked={gen.s.angularSpeed} /> Angular speed</label>
        {#if s.angularSpeed}<div class="field"><LabelField name="Angular speed label" bind:label={gen.s.omegaLabel} /></div>{/if}
        <label class="check"><input type="checkbox" bind:checked={gen.s.angleMark} /> Angle of the first position</label>
        {#if s.angleMark}
          <div class="field"><LabelField name="Angle label" bind:label={gen.s.angleLabel} /></div>
          {#if s.startAngle === 0}<p class="note">The first position is at 0°, so there is no angle to mark.</p>{/if}
        {/if}
      {/if}
      {#if !conical}
        <label class="check"><input type="checkbox" bind:checked={gen.s.pointLabels} /> Letter the positions A, B, C…</label>
      {/if}
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={s.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <CircularMotion settings={s} id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .setups { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; margin-bottom: 0.75rem; }
  .setups button {
    padding: 0.45rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--ink);
    font: inherit;
    font-size: 0.86rem;
    cursor: pointer;
  }
  .setups button:hover { background: var(--blue-soft); }
  .setups button.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-dark); font-weight: 700; }
  .vector + .vector { border-top: 1px solid var(--border); padding-top: 0.75rem; margin-top: 0.25rem; }
</style>
