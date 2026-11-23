<script lang="ts">
  // Chromatography: type the inks spotted on the paper and how far each of
  // their colors travels, and get the paper after the solvent has run, set
  // up in a beaker or alone, with the paper before it beside it if asked
  // and the distances from the origin line marked for working out Rf.
  import { FlaskConical, Plus, Ruler, Trash2, Type, X } from '@lucide/svelte'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import Section from '$lib/shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import ChromatographyFigure from './ChromatographyFigure.svelte'
  import { INK_COLORS, INK_HEX, MAX_FRONT, MAX_NAME, MAX_SAMPLES, MAX_SPOTS, MIN_FRONT, cleanName, nextSampleName, roundCm, typedFront, type InkColor } from './inks'
  import { MAX_SOLVENT, SHOWS, SHOW_NAMES, answerLines, chromatographySettings } from './settings'

  const gen = generatorState(chromatographySettings, 'chromatography')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const NEXT_COLORS: InkColor[] = ['blue', 'red', 'yellow', 'green', 'purple', 'orange', 'pink', 'brown', 'black']

  function setDistance(i: number, j: number, value: number) {
    if (Number.isFinite(value) && value >= 0) s.samples[i].spots[j].distance = Math.min(roundCm(value), clean.front)
  }
  function setFront(value: number, done = false) {
    const front = typedFront(value, done)
    if (front !== undefined) s.front = front
  }
  function addSpot(i: number) {
    const used = new Set(s.samples[i].spots.map((p) => p.color))
    const color = NEXT_COLORS.find((c) => !used.has(c)) ?? 'blue'
    s.samples[i].spots.push({ color, distance: roundCm(clean.front / 2) })
  }
  function addSample() {
    const name = nextSampleName(s.samples.map((sample) => sample.name))
    s.samples.push({ name, spots: [{ color: 'blue', distance: roundCm(clean.front / 2) }] })
  }

  const inkSummary = $derived(`${clean.samples.length} ${clean.samples.length === 1 ? 'ink' : 'inks'}, front at ${clean.front} cm`)
  const showSummary = $derived(`${SHOW_NAMES[clean.show]}, ${clean.setup ? 'in a beaker' : 'paper only'}`)
  const markSummary = $derived([clean.measurements ? 'Measurements' : 'No measurements', clean.labels ? 'labels' : ''].filter(Boolean).join(', '))
  const textSummary = $derived(
    [clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title', clean.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
  const answer = $derived.by(() => {
    const lines = answerLines(clean)
    return lines.length > 1 ? `${lines[0]} …` : lines[0]
  })
</script>

{#snippet check(label: string, checked: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" {checked} onchange={(e) => set(e.currentTarget.checked)} />
    <span>
      <strong>{label}</strong>
    </span>
  </label>
{/snippet}

<GeneratorPage name="Chromatography" filename="chromatography" settingsWidth={27} {gen} {svg}>
  {#snippet inputs()}
    <section class="inks" aria-label="Inks">
      <div class="head">
        <h2 class="card-head">Inks</h2>
        <span class="muted">{inkSummary}</span>
      </div>
      <label class="front">
        <span>Solvent front above the origin line</span>
        <span class="cm">
          <input
            type="number"
            min={MIN_FRONT}
            max={MAX_FRONT}
            step="0.1"
            value={s.front}
            oninput={(e) => setFront(e.currentTarget.valueAsNumber)}
            onchange={(e) => {
              setFront(e.currentTarget.valueAsNumber, true)
              e.currentTarget.value = String(s.front)
            }}
          />
          cm
        </span>
      </label>
      {#each s.samples as sample, i (i)}
        <div class="sample">
          <div class="sample-head">
            <input
              type="text"
              class="name"
              maxlength={MAX_NAME}
              aria-label="Ink {i + 1} name"
              placeholder="Sample {i + 1}"
              value={sample.name}
              oninput={(e) => (s.samples[i].name = cleanName(e.currentTarget.value))}
            />
            <button
              type="button"
              class="icon-btn"
              aria-label="Remove ink {sample.name || i + 1}"
              data-tip="Remove ink"
              disabled={s.samples.length === 1}
              onclick={() => s.samples.splice(i, 1)}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
          {#each sample.spots as spot, j (j)}
            <div class="spot">
              <span class="swatch" style:background={INK_HEX[spot.color]} aria-hidden="true"></span>
              <select aria-label="Ink {sample.name || i + 1}, color {j + 1}" bind:value={s.samples[i].spots[j].color}>
                {#each INK_COLORS as c (c)}<option value={c}>{c}</option>{/each}
              </select>
              <span class="cm">
                <input
                  type="number"
                  min="0"
                  max={clean.front}
                  step="0.1"
                  aria-label="Ink {sample.name || i + 1}, how far the {spot.color} traveled in cm"
                  value={clean.samples[i]?.spots[j]?.distance ?? spot.distance}
                  oninput={(e) => setDistance(i, j, e.currentTarget.valueAsNumber)}
                  onchange={(e) => (e.currentTarget.value = String(clean.samples[i]?.spots[j]?.distance ?? spot.distance))}
                />
                cm
              </span>
              <button
                type="button"
                class="icon-btn"
                aria-label="Remove the {spot.color} from ink {sample.name || i + 1}"
                data-tip="Remove color"
                disabled={sample.spots.length === 1}
                onclick={() => s.samples[i].spots.splice(j, 1)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          {/each}
          {#if sample.spots.length < MAX_SPOTS}
            <button type="button" class="add-color" onclick={() => addSpot(i)}><Plus size={15} aria-hidden="true" /> Add a color</button>
          {/if}
        </div>
      {/each}
      {#if s.samples.length < MAX_SAMPLES}
        <button type="button" class="btn-ghost small" onclick={addSample}><Plus size={17} aria-hidden="true" /> Add an ink</button>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Show" summary={showSummary} icon={FlaskConical} open>
      <div class="segmented" role="radiogroup" aria-label="Papers">
        {#each SHOWS as show (show)}
          <button type="button" role="radio" aria-checked={s.show === show} class:on={s.show === show} onclick={() => (s.show = show)}>
            {SHOW_NAMES[show]}
          </button>
        {/each}
      </div>
      {@render check('Beaker of solvent and glass rod', s.setup, (v) => (s.setup = v))}
    </Section>
    <Section title="Measurements and labels" summary={markSummary} icon={Ruler} open>
      {@render check('Distance arrows, in cm', s.measurements, (v) => (s.measurements = v))}
      {@render check('Part labels', s.labels, (v) => (s.labels = v))}
      {#if s.labels && s.setup}
        <label class="field">
          <span>Solvent</span>
          <input type="text" maxlength={MAX_SOLVENT} placeholder="Water" bind:value={s.solvent} />
        </label>
      {/if}
    </Section>
    <Section title="Title and answer key" summary={textSummary} icon={Type}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} {answer} />
    </Section>
  {/snippet}

  {#snippet figure()}
    <ChromatographyFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .inks { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; }
  .card-head { margin: 0; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .muted { font-size: 0.82rem; color: var(--muted); }
  .front { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; font-weight: 600; font-size: 0.88rem; }
  .cm { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: var(--muted); }
  .cm input { width: 5.2rem; font-variant-numeric: tabular-nums; }
  .sample { border: 1.5px solid var(--border); border-radius: 12px; padding: 0.6rem 0.65rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .sample-head { display: flex; align-items: center; gap: 0.4rem; }
  .name { font-weight: 700 !important; }
  .spot { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; }
  .swatch { width: 1rem; height: 1rem; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.35); }
  .add-color {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.25rem 0.4rem; border: 0; border-radius: 8px;
    background: transparent; color: var(--blue-dark); font-weight: 600; font-size: 0.86rem;
  }
  .add-color:hover { background: var(--blue-soft); }
  .small { align-self: flex-start; padding: 0.5rem 0.85rem; font-size: 0.9rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.75rem; font-weight: 600; font-size: 0.88rem; }
  .field input { font-weight: 400; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin: 1rem 0 0.25rem; cursor: pointer; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; accent-color: var(--blue); }
  .check span { display: flex; flex-direction: column; }
  .check strong { font-size: 0.9rem; }
</style>
