<script lang="ts">
  // VSEPR Shapes: type a formula with one central atom and get its real 3D
  // shape, drawn wedge-and-dash or as a ball-and-stick model, turned any way,
  // with its shape name, electron geometry, AXE notation and bond angles, or
  // those left blank for a "name the shape" question.
  import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Atom, Eye, Rotate3d, RotateCcw, Tags, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$lib/shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import { openRequest } from '$shared/request.svelte'
  import VseprFigure from './VseprFigure.svelte'
  import { defaultAngleText } from './shape'
  import { LONE_PAIRS, MAX_ANGLE_TEXT, MAX_FORMULA, STYLES, findShape, vseprSettings, withAngleLabel, type LonePairs, type Style } from './settings'

  const gen = generatorState(vseprSettings, 'vsepr-shapes')
  const s = gen.s
  let svg = $state<SVGSVGElement>()

  const STYLE_NAMES: Record<Style, string> = { 'wedge-and-dash': 'Wedge-and-dash', 'ball-and-stick': 'Ball-and-stick' }
  const LONE_NAMES: Record<LonePairs, string> = { lobes: 'Lobes', dots: 'Dots', none: 'Hidden' }

  const found = $derived(findShape(s.formula))
  const shape = $derived(found.ok ? found.shape : undefined)
  const turned = $derived(s.yaw !== 0 || s.pitch !== 0)

  function setFormula(e: Event & { currentTarget: HTMLInputElement }) {
    s.formula = e.currentTarget.value
    // A new molecule starts from its own textbook view and angle labels.
    s.yaw = 0
    s.pitch = 0
    s.angles = ''
  }

  const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180
  function turnBy(yaw: number, pitch: number) {
    s.yaw = wrap(s.yaw + yaw)
    s.pitch = Math.max(-90, Math.min(90, s.pitch + pitch))
  }

  function angleKindName(i: number) {
    if (!shape || shape.angles.length < 2) return 'Bond angle'
    const a = shape.angles[i]
    if (shape.name === 'square pyramidal') return i === 0 ? 'Top to base' : 'Round the base'
    return a.ideal === 90 ? 'Axial to equatorial' : 'Equatorial'
  }

  const moleculeSummary = $derived(found.ok ? `${found.name}, ${found.shape.name}` : 'No shape')
  const lookSummary = $derived(
    [STYLE_NAMES[s.style], s.lonePairs === 'none' ? 'lone pairs hidden' : `lone pairs as ${s.lonePairs}`, s.style === 'ball-and-stick' && s.grayscale ? 'grayscale' : '']
      .filter(Boolean)
      .join(', '),
  )
  const labelSummary = $derived(
    [s.shapeName && 'shape', s.electronGeometry && 'electron geometry', s.axe && 'AXE', s.bondAngles && 'bond angles'].filter(Boolean).join(', ') || 'None',
  )
  const anyLabel = $derived(s.shapeName || s.electronGeometry || s.axe || s.bondAngles)
  /** a question only while there's a label to leave blank */
  const question = $derived(s.question && anyLabel)
  const keySummary = $derived(
    [s.titleMode === 'text' && s.title ? `“${s.title}”` : 'No title', question ? 'name the shape' : '', question && s.answerKey ? 'answer key' : ''].filter(Boolean).join(', '),
  )
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], value: T, names: Record<T, string>, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} onclick={() => set(option)}>
        {names[option]}
      </button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="VSEPR Shapes" filename="vsepr-shape" settingsWidth={25} {gen} {svg}>
  {#snippet settings()}
    <Section title="Molecule" summary={moleculeSummary} icon={Atom} open>
      <label class="field">
        <span class="field-head">
          Formula
          <HelpTip id="vsepr-formula-tip" label="How to type a formula">
            One central atom, like CH4 or SO4 2-, with a space or ^ before a charge of 2 or more.
          </HelpTip>
        </span>
        <input type="text" maxlength={MAX_FORMULA} value={s.formula} oninput={setFormula} spellcheck="false" autocomplete="off" />
      </label>
      {#if !found.ok}
        <p class="warning" role="status">{found.message}</p>
        {#if found.request}
          <button type="button" class="btn-ghost small request" onclick={() => openRequest(`VSEPR shape of ${s.formula}`)}>Request it</button>
        {/if}
      {:else}
        <p class="note">
          {found.structure.atoms[found.shape.central].element} in the middle, {found.shape.axe}: {found.shape.name}{found.shape.electronGeometry !== found.shape.name
            ? `, ${found.shape.electronGeometry} electron geometry`
            : ''}.
        </p>
      {/if}
    </Section>

    <Section title="Look" summary={lookSummary} icon={Eye}>
      <p class="field-label">Style</p>
      {@render segmented('Style', STYLES, s.style, STYLE_NAMES, (v) => (s.style = v))}
      {#if s.style === 'ball-and-stick'}
        <label class="check">
          <input type="checkbox" bind:checked={s.symbols} />
          <span><strong>Element symbols</strong></span>
        </label>
        <label class="check">
          <input type="checkbox" bind:checked={s.grayscale} />
          <span><strong>Grayscale</strong></span>
        </label>
      {/if}
      <p class="field-label spaced">Central atom’s lone pairs</p>
      {@render segmented('Central atom’s lone pairs', LONE_PAIRS, s.lonePairs, LONE_NAMES, (v) => (s.lonePairs = v))}
      <label class="check">
        <input type="checkbox" bind:checked={s.outerPairs} />
        <span><strong>Outer atoms’ lone pairs</strong></span>
      </label>
    </Section>

    <Section title="View" summary={turned ? 'Turned' : 'Textbook view'} icon={Rotate3d}>
      <p class="note first">Drag the figure to turn it.</p>
      <div class="turns" role="group" aria-label="Turn the molecule">
        <button type="button" class="icon-btn" aria-label="Turn left" onclick={() => turnBy(-15, 0)}><ArrowLeft size={18} /></button>
        <button type="button" class="icon-btn" aria-label="Turn right" onclick={() => turnBy(15, 0)}><ArrowRight size={18} /></button>
        <button type="button" class="icon-btn" aria-label="Tip the top away" onclick={() => turnBy(0, 15)}><ArrowUp size={18} /></button>
        <button type="button" class="icon-btn" aria-label="Tip the top toward you" onclick={() => turnBy(0, -15)}><ArrowDown size={18} /></button>
        <button type="button" class="btn-ghost small" disabled={!turned} onclick={() => ((s.yaw = 0), (s.pitch = 0))}>
          <RotateCcw size={16} aria-hidden="true" /> Reset view
        </button>
      </div>
    </Section>

    <Section title="Labels" summary={labelSummary} icon={Tags}>
      <label class="check first">
        <input type="checkbox" bind:checked={s.shapeName} />
        <span><strong>Shape name</strong></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.electronGeometry} />
        <span><strong>Electron geometry</strong></span>
      </label>
      <label class="check">
        <input type="checkbox" bind:checked={s.axe} />
        <span><strong>AXE notation</strong></span>
      </label>
      <label class="check" class:off={shape && !shape.angles.length}>
        <input type="checkbox" bind:checked={s.bondAngles} disabled={!!shape && !shape.angles.length} />
        <span>
          <strong>Bond angles</strong>
        </span>
      </label>
      {#if s.bondAngles && shape?.angles.length}
        <div class="angles">
          {#each shape.angles as a, i (i)}
            <label class="inline">
              <span>{angleKindName(i)}</span>
              <input
                type="text"
                maxlength={MAX_ANGLE_TEXT}
                value={s.angles.split('|')[i] ?? ''}
                placeholder={defaultAngleText(a)}
                oninput={(e) => (s.angles = withAngleLabel(shape, s.angles, i, e.currentTarget.value))}
                aria-label="{angleKindName(i)} label"
              />
            </label>
          {/each}
        </div>
      {/if}
    </Section>

    <Section title="Question and title" summary={keySummary} icon={Type}>
      <label class="check first" class:off={!anyLabel}>
        <input type="checkbox" checked={question} disabled={!anyLabel} onchange={(e) => (s.question = e.currentTarget.checked)} />
        <span>
          <strong>Name the shape (labels left blank)</strong>
        </span>
      </label>
      <label class="check" class:off={!question}>
        <input type="checkbox" bind:checked={s.answerKey} disabled={!question} />
        <span><strong>Answer key</strong></span>
      </label>
      <p class="field-label spaced">Chart title</p>
      <LabelField name="Chart title" bind:mode={s.titleMode} bind:text={s.title} placeholder="e.g. Name the shape" blank={false} />
    </Section>
  {/snippet}
  {#snippet figure()}
    <VseprFigure settings={s} {found} bind:svg onturn={(yaw, pitch) => ((s.yaw = yaw), (s.pitch = pitch))} />
  {/snippet}
</GeneratorPage>

<style>
  .field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; font-size: 0.9rem; font-weight: 700; }
  .field input { font-weight: 400; }
  .field-head, .field-label { display: flex; align-items: center; gap: 0.25rem; }
  .field-label { margin: 0.9rem 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
  .field-label:first-child { margin-top: 0; }
  .spaced { margin-top: 1.1rem; }
  .note { margin: 0.5rem 0 0; color: var(--muted); font-size: 0.82rem; }
  .note.first { margin-top: 0; }
  .warning { margin: 0.75rem 0 0; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--red-soft); color: #991b1b; font-size: 0.85rem; }
  .request { margin-top: 0.6rem; }
  .small { padding: 0.5rem 0.85rem; font-size: 0.9rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-top: 1rem; cursor: pointer; }
  .check.first { margin-top: 0; }
  .check.off { cursor: default; opacity: 0.6; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check strong { display: flex; align-items: center; gap: 0.3rem; font-size: 0.9rem; }
  .turns { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-top: 0.7rem; }
  .turns .btn-ghost { margin-left: auto; display: inline-flex; align-items: center; gap: 0.35rem; }
  .angles { margin-top: 0.8rem; padding-left: 1.7rem; }
  .inline { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.88rem; font-weight: 700; }
  .inline input { width: 7rem; font-weight: 400; }
</style>
