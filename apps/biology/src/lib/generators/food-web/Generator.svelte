<script lang="ts">
  // Food Webs and Energy Pyramids: a food web of up to 14 organisms in rows
  // by trophic level, a food chain taken from it, or an energy pyramid,
  // started from an ecosystem in one click and changed by hand: pictures
  // from the bundled drawings or the teacher's own uploads, what each one
  // eats, names and pictures left blank. Clicking an organism in the figure
  // opens it for changing.
  import { tick } from 'svelte'
  import { ImagePlus, Palette, Plus, Tags, Trash2, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import { answerItems, buildFigure } from './figure'
  import FoodWebFigure from './FoodWebFigure.svelte'
  import { loadUploads, uploads } from './images'
  import { levelName } from './layout'
  import { ORGANISM_BY_ID } from './organisms/manifest'
  import OrganismPicker from './OrganismPicker.svelte'
  import Picture from './Picture.svelte'
  import { loadDrawings, picturesIn } from './pictures.svelte'
  import {
    chainKeys, foodWebSettings, typedNamesOf, webOf, FIGURE_NAMES, FIGURES, UNITS, type FoodWebSettings, type LabelMode,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'
  import {
    formatWeb, freshKey, levelsOf, MAX_CHAIN, MAX_LEVEL, MAX_ORGANISMS, nameOf, removeOrganism, setEats, updateOrganism,
    UPLOAD, wouldCycle, type Blank, type Entry, type Web,
  } from './web'

  const gen = generatorState(foodWebSettings, 'food-web')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const web = $derived(webOf(clean))
  const placed = $derived(levelsOf(web))
  const chain = $derived(chainKeys(clean))
  const fig = $derived(buildFigure(clean))

  // Pictures load as the web needs them: bundled ones from the app, uploads from this browser.
  $effect(() => {
    loadDrawings(picturesIn(web))
    loadUploads(web.map((e) => e.picture).filter((p) => UPLOAD.test(p)))
  })

  let selected = $state<string | null>(null)
  const picked = $derived(selected && web.some((e) => e.key === selected) ? web.find((e) => e.key === selected)! : null)
  let picker = $state<{ add: true } | { add: false; key: string } | null>(null)

  const setWeb = (next: Web) => (s.web = formatWeb(next))
  const name = (key: string) => nameOf(web.find((e) => e.key === key)!)

  async function select(key: string) {
    selected = key
    await tick()
    document.getElementById(`food-web-${key}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function pick(picture: string, uploadName: string) {
    const target = picker
    picker = null
    if (!target) return
    if (target.add) {
      const base = picture === 'none' ? 'organism' : UPLOAD.test(picture) ? uploadName || 'picture' : picture
      const key = freshKey(web, base)
      setWeb([...web, { key, picture, name: UPLOAD.test(picture) ? uploadName : '', mark: '', blank: '', eats: [] }])
      select(key)
      return
    }
    const entry = web.find((e) => e.key === target.key)
    if (!entry) return
    // A new bundled picture brings its name, unless the teacher typed one.
    const known = ORGANISM_BY_ID.get(picture)
    const typed = entry.name !== ''
    setWeb(updateOrganism(web, entry.key, { picture, name: typed ? entry.name : known ? known.name : uploadName }))
  }

  /** What a saved preset or the current figure uses an upload for, to ask before deleting it. */
  function inUse(key: string) {
    if (web.some((e) => e.picture === key)) return 'The figure uses this picture.'
    const presets = gen.presets.load().filter((p) => p.settings.web.split(';').some((part) => part.includes(`.${key}`)))
    return presets.length ? `Your preset “${presets[0].name}” uses this picture.` : ''
  }

  // ---- Setups ----
  function made(id: string, current: FoodWebSettings) {
    const setup = SETUPS.find((x) => x.id === id)!
    return foodWebSettings.tidy(settingsFor(setup, foodWebSettings.defaults, current))
  }
  /** The setup the figure still is: its web, chain and figure as the setup made them. */
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = made(x.id, clean)
      return m.web === clean.web && m.chain === clean.chain && (x.settings.figure ?? clean.figure) === clean.figure
    })?.id ?? '',
  )
  function chooseSetup(id: string) {
    selected = null
    gen.apply(made(id, clean))
  }

  // ---- One organism ----
  const roleOf = (e: Entry) => placed.get(e.key)!.role
  const canEat = (e: Entry) => roleOf(e) === 'producer' || roleOf(e) === 'consumer'
  const foodChoices = (e: Entry) => web.filter((f) => f.key !== e.key)
  const BLANKS: [Blank, string][] = [['', 'Neither'], ['n', 'Name'], ['p', 'Picture'], ['b', 'Both']]
  function setDecomposer(e: Entry, on: boolean) {
    const bundledDecomposer = ORGANISM_BY_ID.get(e.picture)?.role === 'decomposer'
    setWeb(updateOrganism(web, e.key, { mark: on ? (bundledDecomposer ? '' : 'd') : bundledDecomposer ? 'c' : '', eats: on ? [] : e.eats }))
  }
  function remove(e: Entry) {
    selected = null
    setWeb(removeOrganism(web, e.key))
  }

  // ---- The chain ----
  function setChain(keys: string[]) {
    s.chain = keys.join(',')
  }
  const nextChoices = $derived(web.filter((e) => !chain.includes(e.key) && placed.get(e.key)!.role !== 'decomposer'))

  // ---- The pyramid's typed names ----
  const typed = $derived(typedNamesOf(clean))
  function setTyped(i: number, value: string) {
    const names = Array.from({ length: clean.levels }, (_, j) => (j === i ? value : typed[j] ?? ''))
    s.typedNames = names.join(';').replace(/;+$/, '')
  }

  const MODE_NAMES: Record<LabelMode, string> = { text: 'Text', blank: 'Blank line', none: 'None' }
  const VALUE_NAMES = { all: 'All', base: 'Producers only', blank: 'All blank', none: 'None' }
  const PYRAMID_NAME_NAMES = { levels: 'Trophic levels', chain: 'Food chain', typed: 'Typed', blank: 'Blank lines', none: 'None' }
  const COLOR_NAMES = { color: 'Color', bw: 'Black and white' }

  const labelsSummary = $derived(
    clean.figure === 'pyramid'
      ? `Names: ${PYRAMID_NAME_NAMES[clean.pyramidNames].toLowerCase()}`
      : [clean.levelLabels === 'none' ? 'No level labels' : `Levels: ${MODE_NAMES[clean.levelLabels].toLowerCase()}`, clean.arrows ? 'arrows' : 'no arrows'].join(' · '),
  )
  const lookSummary = $derived(`${COLOR_NAMES[clean.colors]}${clean.figure === 'pyramid' ? '' : clean.boxes ? ', boxes' : ', no boxes'}`)
  const answerPreview = $derived.by(() => {
    const items = answerItems(clean, fig)
    return items.length > 1 ? `${items[0]} …` : items[0] ?? ''
  })
  const filename = $derived(
    (clean.titleMode === 'text' && clean.title.trim() ? clean.title.trim() : FIGURE_NAMES[clean.figure])
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'food-web',
  )
</script>

{#snippet thumb(e: Entry, size: number)}
  <svg viewBox="0 0 {size} {size}" width={size} height={size} aria-hidden="true" class="thumb">
    {#if e.picture === 'none'}
      <rect x="1" y="1" width={size - 2} height={size - 2} rx="5" fill="none" stroke="#9ca3af" stroke-width="1.5" />
    {:else}
      <Picture picture={e.picture} x={0} y={0} {size} />
    {/if}
  </svg>
{/snippet}

{#snippet segmented(label: string, options: [string, string][], value: string, set: (v: string) => void)}
  <div class="field">
    <span>{label}</span>
    <div class="segmented" role="radiogroup" aria-label={label}>
      {#each options as [v, text] (v)}
        <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{text}</button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet check(label: string, value: boolean, set: (v: boolean) => void)}
  <label class="check">
    <input type="checkbox" checked={value} onchange={(e) => set(e.currentTarget.checked)} />
    <span><strong>{label}</strong></span>
  </label>
{/snippet}

<GeneratorPage name="Food Webs and Energy Pyramids" {filename} {gen} {svg} settingsWidth={27} printWidth={Math.min(7.5, Math.max(3.5, fig.width / 90))} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="web">
      <div class="head-row">
        <h2 class="card-head">Food web</h2>
        <HelpTip id="food-web-tip" label="How the figure is drawn">
          Arrows point the way energy flows, from what is eaten to what eats it. Each organism sits one level above the
          highest thing it eats; producers eat nothing, along the bottom. Decomposers sit at the side, with dashed
          arrows from every level. Click an organism in the figure to change it.
        </HelpTip>
      </div>
      <label class="field">
        <span>Classic setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as x (x.id)}<option value={x.id}>{x.name}</option>{/each}
        </select>
      </label>
      {@render segmented('Figure', FIGURES.map((f) => [f, FIGURE_NAMES[f]]), s.figure, (v) => (s.figure = v as FoodWebSettings['figure']))}

      <div class="field">
        <span>Organisms</span>
        <ul class="organisms">
          {#each web as e (e.key)}
            {@const missing = UPLOAD.test(e.picture) && uploads.get(e.picture) === null}
            <li id="food-web-{e.key}" class:open={picked?.key === e.key}>
              <button type="button" class="row" aria-expanded={picked?.key === e.key} onclick={() => (selected = picked?.key === e.key ? null : e.key)}>
                {@render thumb(e, 30)}
                <span class="row-name">{nameOf(e)}</span>
                <span class="row-level">{levelName(placed.get(e.key)!.level, false)}</span>
              </button>
              {#if picked?.key === e.key}
                <div class="editor">
                  {#if missing}<p class="warn" role="status">This picture is only on the computer it was uploaded on.</p>{/if}
                  <div class="pair">
                    <button type="button" class="btn-ghost change" onclick={() => (picker = { add: false, key: e.key })}>
                      <ImagePlus size={17} aria-hidden="true" /> Picture
                    </button>
                    <label class="field grow">
                      <span>Name</span>
                      <input type="text" maxlength="30" value={nameOf(e)} onchange={(ev) => setWeb(updateOrganism(web, e.key, { name: ev.currentTarget.value }))} />
                    </label>
                  </div>
                  {#if canEat(e)}
                    <fieldset class="eats">
                      <legend>Eats</legend>
                      {#each foodChoices(e) as f (f.key)}
                        {@const on = e.eats.includes(f.key)}
                        <label class="eat" class:disabled={!on && wouldCycle(web, e.key, f.key)}>
                          <input type="checkbox" checked={on} disabled={!on && wouldCycle(web, e.key, f.key)} onchange={(ev) => setWeb(setEats(web, e.key, f.key, ev.currentTarget.checked))} />
                          {nameOf(f)}
                        </label>
                      {/each}
                    </fieldset>
                  {/if}
                  {#if roleOf(e) === 'consumer'}
                    <label class="field">
                      <span>Trophic level</span>
                      <select value={typeof e.mark === 'number' ? String(e.mark) : ''} onchange={(ev) => setWeb(updateOrganism(web, e.key, { mark: ev.currentTarget.value ? (Number(ev.currentTarget.value) as Entry['mark']) : '' }))}>
                        <option value="">From what it eats</option>
                        {#each Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2) as l (l)}<option value={String(l)}>{levelName(l, false)}</option>{/each}
                      </select>
                    </label>
                  {/if}
                  {@render check('Decomposer', roleOf(e) === 'decomposer', (v) => setDecomposer(e, v))}
                  {@render segmented('Leave blank', BLANKS, e.blank, (v) => setWeb(updateOrganism(web, e.key, { blank: v as Blank })))}
                  <button type="button" class="btn-ghost remove" onclick={() => remove(e)}><Trash2 size={16} aria-hidden="true" /> Remove {nameOf(e).toLowerCase()}</button>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
        <button type="button" class="btn-ghost add" disabled={web.length >= MAX_ORGANISMS} onclick={() => (picker = { add: true })}>
          <Plus size={18} aria-hidden="true" /> {web.length >= MAX_ORGANISMS ? `${MAX_ORGANISMS} organisms at most` : 'Add an organism'}
        </button>
      </div>

      {#if clean.figure !== 'web'}
        <div class="field">
          <span>Food chain</span>
          <ol class="chain">
            {#each chain as k, i (i)}
              <li>
                <select aria-label="Organism {i + 1} in the chain" value={k} onchange={(ev) => setChain(chain.map((c, j) => (j === i ? ev.currentTarget.value : c)))}>
                  {#each web as e (e.key)}<option value={e.key} disabled={e.key !== k && chain.includes(e.key)}>{nameOf(e)}</option>{/each}
                </select>
                {#if i > 0 && !web.find((e) => e.key === k)!.eats.includes(chain[i - 1])}<span class="warn" role="status">doesn’t eat {name(chain[i - 1]).toLowerCase()}</span>{/if}
              </li>
            {/each}
          </ol>
          <div class="chain-buttons">
            {#if chain.length < MAX_CHAIN && nextChoices.length}
              <select aria-label="Add to the chain" value="" onchange={(ev) => setChain([...chain, ev.currentTarget.value])}>
                <option value="" disabled>Add the next…</option>
                {#each nextChoices as e (e.key)}<option value={e.key}>{nameOf(e)}</option>{/each}
              </select>
            {/if}
            {#if chain.length > 2}
              <button type="button" class="btn-ghost small" onclick={() => setChain(chain.slice(0, -1))}>Remove the last</button>
            {/if}
            {#if clean.chain}
              <button type="button" class="btn-ghost small" onclick={() => (s.chain = '')}>Longest chain</button>
            {/if}
          </div>
        </div>
      {/if}
      {#if clean.figure === 'chain'}
        {@render segmented('Direction', [['right', 'Left to right'], ['up', 'Bottom to top']], s.direction, (v) => (s.direction = v as FoodWebSettings['direction']))}
      {/if}

      {#if clean.figure === 'pyramid'}
        {@render segmented('Levels', [['3', '3'], ['4', '4'], ['5', '5']], String(s.levels), (v) => (s.levels = Number(v)))}
        <div class="fields">
          <label class="field">
            <span>Energy at the base</span>
            <input type="number" min="0.001" step="any" bind:value={s.energy} />
          </label>
          <label class="field">
            <span>Units</span>
            <select bind:value={s.unit}>{#each UNITS as u (u)}<option value={u}>{u}</option>{/each}</select>
          </label>
          <label class="field">
            <span>Passed up (%)</span>
            <input type="number" min="1" max="50" step="any" bind:value={s.share} />
          </label>
        </div>
        {@render check('Per m² per year', s.perArea, (v) => (s.perArea = v))}
        <label class="field">
          <span>Energy written</span>
          <select bind:value={s.values}>{#each Object.entries(VALUE_NAMES) as [v, t] (v)}<option value={v}>{t}</option>{/each}</select>
        </label>
        <label class="field">
          <span>Level names</span>
          <select bind:value={s.pyramidNames}>{#each Object.entries(PYRAMID_NAME_NAMES) as [v, t] (v)}<option value={v}>{t}</option>{/each}</select>
        </label>
        {#if clean.pyramidNames === 'typed'}
          <div class="typed">
            {#each Array.from({ length: clean.levels }, (_, i) => clean.levels - 1 - i) as i (i)}
              <input type="text" maxlength="30" aria-label="Level {i + 1} name" placeholder={levelName(i + 1, true)} value={typed[i] ?? ''} onchange={(ev) => setTyped(i, ev.currentTarget.value.replace(/;/g, ' '))} />
            {/each}
          </div>
        {/if}
        {@render check('Pictures from the food chain', s.pictures, (v) => (s.pictures = v))}
        {@render segmented('Heat lost', Object.entries(MODE_NAMES), s.heat, (v) => (s.heat = v as LabelMode))}
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Labels" icon={Tags} summary={labelsSummary}>
      {#if clean.figure !== 'pyramid'}
        {@render segmented('Trophic levels', Object.entries(MODE_NAMES), s.levelLabels, (v) => (s.levelLabels = v as LabelMode))}
      {/if}
      {@render segmented('Wording', [['consumers', 'Consumers'], ['diet', 'Herbivores, carnivores']], s.wording, (v) => (s.wording = v as FoodWebSettings['wording']))}
      {#if clean.figure !== 'pyramid'}
        {@render check('Arrows', s.arrows, (v) => (s.arrows = v))}
      {/if}
      {#if clean.figure === 'web'}
        {@render check('Decomposers', s.decomposers, (v) => (s.decomposers = v))}
      {/if}
    </Section>
    <Section title="Look" icon={Palette} summary={lookSummary}>
      {@render segmented('Pictures', Object.entries(COLOR_NAMES), s.colors, (v) => (s.colors = v as FoodWebSettings['colors']))}
      {#if clean.figure !== 'pyramid'}
        {@render check('Boxes', s.boxes, (v) => (s.boxes = v))}
      {/if}
    </Section>
    <Section title="Chart title" icon={Type} summary={clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title'}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answerPreview} />
    </Section>
  {/snippet}

  {#snippet figure()}
    <FoodWebFigure settings={clean} selected={picked?.key ?? null} onselect={select} bind:svg />
  {/snippet}
</GeneratorPage>

{#if picker}
  <OrganismPicker
    title={picker.add ? 'Add an organism' : `Picture for ${name(picker.key).toLowerCase()}`}
    current={picker.add ? '' : web.find((e) => !picker!.add && e.key === picker!.key)?.picture}
    onpick={pick}
    onclose={() => (picker = null)}
    {inUse}
  />
{/if}

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .web { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; min-width: 0; }
  .field select, .field input { font-weight: 400; }
  .fields { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 0.6rem; align-items: end; }
  .fields input { width: 100%; min-width: 0; }
  .organisms { display: flex; flex-direction: column; gap: 0.3rem; margin: 0; padding: 0; list-style: none; }
  .organisms li { border: 1px solid var(--border); border-radius: 10px; }
  .organisms li.open { border-color: var(--blue-border); }
  .row { display: flex; align-items: center; gap: 0.6rem; width: 100%; padding: 0.3rem 0.6rem; border: 0; background: none; font: inherit; text-align: left; cursor: pointer; border-radius: 10px; }
  .row:hover { background: var(--blue-soft); }
  .thumb { flex: none; }
  .row-name { flex: 1; font-weight: 600; font-size: 0.9rem; }
  .row-level { color: var(--muted); font-size: 0.8rem; font-weight: 500; }
  .editor { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.4rem 0.75rem 0.75rem; }
  .pair { display: flex; align-items: flex-end; gap: 0.6rem; }
  .grow { flex: 1; }
  .change { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.7rem; }
  .eats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.25rem 0.6rem; margin: 0; padding: 0; border: 0; }
  .eats legend { padding: 0; margin-bottom: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .eat { display: flex; align-items: center; gap: 0.4rem; font-size: 0.86rem; cursor: pointer; }
  .eat input { accent-color: var(--blue); }
  .eat.disabled { color: var(--muted); cursor: default; }
  .remove { display: inline-flex; align-items: center; gap: 0.35rem; align-self: flex-start; padding: 0.4rem 0.7rem; font-size: 0.86rem; }
  .add { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; margin-top: 0.35rem; }
  .warn { margin: 0; color: #b45309; font-size: 0.84rem; font-weight: 600; }
  .chain { display: flex; flex-direction: column; gap: 0.3rem; margin: 0; padding-left: 1.4rem; }
  .chain li { display: flex; align-items: center; gap: 0.5rem; }
  .chain-buttons { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.2rem; }
  .small { padding: 0.35rem 0.6rem; font-size: 0.84rem; }
  .typed { display: flex; flex-direction: column; gap: 0.3rem; }
  .check { display: flex; align-items: flex-start; gap: 0.6rem; margin-bottom: 0.75rem; cursor: pointer; font-size: 0.9rem; }
  .web .check { margin-bottom: 0; }
  .check:last-child { margin-bottom: 0; }
  .check input { width: 1.1rem; height: 1.1rem; margin: 0.15rem 0 0; flex: none; accent-color: var(--blue); }
  :global(.section) .field { margin-bottom: 0.75rem; }
</style>
