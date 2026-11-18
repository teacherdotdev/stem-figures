<script lang="ts">
  // The Tree Diagram Generator: presets, then a card of the stages (each
  // stage's outcomes and their probabilities, one row for every branch or one
  // row per node before it), the labels and layout under it, and the figure
  // on the right, where clicking any label makes it a blank for students.
  // Settings are mirrored into the page address so a bookmark or shared link
  // brings back exactly this tree, and the server renders that same figure on
  // first load.
  import { Network, Plus, Type, X } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import Section from '$shared/Section.svelte'
  import PickLayer from '$lib/labeling/PickLayer.svelte'
  import type { Part } from '$lib/labeling/pick.js'
  import { buildTree } from './layout.js'
  import TreeDiagram from './TreeDiagram.svelte'
  import {
    DIRECTIONS, MAX_OUTCOMES, MAX_PATHS, MAX_PATHS_DOWN, MAX_STAGES, MIN_OUTCOMES, PATH_STYLES, SHOWS,
    addOutcome, addStage, cleanSettings, countsOf, pathCount, pathName, removeOutcome, removeStage, rowOf, setSame,
    settingsFromParams, settingsToQuery, tuples, type RawSettings, type Settings,
  } from './settings.js'

  const gen = generatorState(
    {
      tidy: (s) => cleanSettings(s as RawSettings),
      fromParams: settingsFromParams,
      toQuery: settingsToQuery,
      keyOf: settingsToQuery,
    },
    'tree-diagram',
    { history: 'mathfigures.tree-diagram.history', presets: 'mathfigures.tree-diagram.presets' },
  )
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const drawing = $derived(buildTree(clean))
  const read = $derived(drawing.read)
  const counts = $derived(countsOf(clean.stages))
  const paths = $derived(pathCount(counts))

  /** One choice as a row of buttons. */
  type Choice = { key: keyof Settings; name: string; options: Record<string, string>; disabled?: (v: string) => boolean }

  // Structural changes go through settings.ts, which keeps the rows and blanks in step.
  const change = (patch: Partial<Settings>) => Object.assign(s, cleanSettings({ ...clean, ...patch }))
  const canAddOutcome = (k: number) => counts[k] < MAX_OUTCOMES && (paths / counts[k]) * (counts[k] + 1) <= MAX_PATHS
  const canAddStage = $derived(clean.stages.length < MAX_STAGES && paths * MIN_OUTCOMES <= MAX_PATHS)

  function setOutcome(k: number, j: number, v: string) {
    s.stages[k].outcomes[j] = v
  }
  function setProb(k: number, row: number, j: number, v: string) {
    const st = s.stages[k]
    while (st.probs.length <= row) st.probs.push(st.outcomes.map(() => ''))
    st.probs[row][j] = v
  }
  function setTitle(k: number, v: string) {
    s.stages[k].title = v
  }
  /** The nodes before stage k, named by their paths, for its rows when they differ by branch. */
  const rowNames = (k: number) => tuples(counts, k).map((t) => pathName(t.map((j, i) => clean.stages[i].outcomes[j] || '?'), 'comma'))

  // The column at the end of the tree, its path names and their probabilities, on or off at once.
  const pathsShown = $derived(clean.showNames !== 'hide' || clean.showPathProbs !== 'hide')
  function showPaths(on: boolean) {
    s.showNames = on ? 'show' : 'hide'
    s.showPathProbs = on ? 'show' : 'hide'
  }

  // Clicking a label on the figure makes it a blank, or gives it back.
  function toggle(part: Part) {
    s.blanks = clean.blanks.includes(part.key) ? clean.blanks.filter((k) => k !== part.key) : [...clean.blanks, part.key]
  }
  const pickable = $derived({
    frame: { x: 0, y: 0, w: drawing.width, h: drawing.height },
    segments: [],
    angles: [],
    spots: [],
    labels: [],
    areas: drawing.picks.map((p) => ({
      key: p.key,
      d: `M${p.x.toFixed(1)} ${p.y.toFixed(1)}h${p.w.toFixed(1)}v${p.h.toFixed(1)}h${(-p.w).toFixed(1)}Z`,
      anchor: [p.x + p.w / 2, p.y + p.h / 2] as [number, number],
      name: `${p.name}: ${clean.blanks.includes(p.key) ? 'blank, click to show' : 'click to make a blank'}`,
    })),
  })

  const label = $derived(
    `Tree diagram of ${clean.stages.length === 1 ? 'one stage' : `${clean.stages.length} stages`}: ${clean.stages
      .map((st) => st.outcomes.map((o) => o || 'blank').join(' or '))
      .join(', then ')}`,
  )
  const SHOW_KEYS = [
    { key: 'showOutcomes', name: 'Outcomes' },
    { key: 'showProbs', name: 'Probabilities' },
    { key: 'showNames', name: 'Path names' },
    { key: 'showPathProbs', name: 'Path probabilities' },
  ] as const
  const labelsSummary = $derived(
    [
      SHOW_KEYS.filter((x) => clean[x.key] !== 'show').map((x) => `${x.name.toLowerCase()} ${clean[x.key] === 'blank' ? 'blank' : 'hidden'}`).join(', ') || 'All shown',
      clean.blanks.length && `${clean.blanks.length} clicked blank${clean.blanks.length === 1 ? '' : 's'}`,
      clean.start.trim() && `starts at “${clean.start.trim()}”`,
      clean.stageTitles && 'stage titles',
    ].filter(Boolean).join(' · '),
  )

  // Printed at its own size (about an inch for every 96 units), no wider than
  // the page and no taller than it either.
  const printWidth = $derived(Math.max(2, Math.min(7.5, drawing.width / 96, (9.5 * drawing.width) / drawing.height)))

  let svg = $state<SVGSVGElement>()
  const filename = 'tree-diagram'
</script>

{#snippet choice({ key, name, options, disabled }: Choice)}
  <div class="part">
    <span class="part-name" id="{key}-label">{name}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{key}-label">
      {#each Object.entries(options) as [v, title]}
        <button
          type="button" role="radio" aria-checked={clean[key] === v} class:on={clean[key] === v} disabled={disabled?.(v)}
          onclick={() => ((s as any)[key] = v)}
        >{title}</button>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet removeButton(k: number, j: number)}
  <button
    type="button" class="icon-btn remove" aria-label="Remove outcome {clean.stages[k].outcomes[j] || j + 1}"
    disabled={counts[k] <= MIN_OUTCOMES} onclick={() => change(removeOutcome(clean, k, j))}
  ><X size={15} aria-hidden="true" /></button>
{/snippet}

<GeneratorPage name="Tree Diagram Generator" {filename} {gen} {svg} settingsWidth="minmax(26rem, 36%)" {printWidth} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="card-body">
      <div class="head-row">
        <h2 class="card-head">Stages</h2>
        <HelpTip id="tree-tip" label="How to fill in the tree">
          Each stage is one event, like a coin flip or a draw from a bag, and every branch of a stage splits into the same
          outcomes. Type each outcome’s name and its probability as you want it written: 3/7 as a fraction, 0.4 or 40% as a
          decimal or percent, or a letter like x. For dependent events, like drawing without replacement, untick Same on every
          branch and type each branch’s probability. Leave any probability empty for students to fill in, or click any label
          on the figure to make it a blank.
        </HelpTip>
      </div>

      {#each clean.stages as stage, k (k)}
        <fieldset class="stage">
          <legend>Stage {k + 1}</legend>
          {#if clean.stageTitles}
            <input type="text" class="title" aria-label="Title of stage {k + 1}" placeholder="{k === 0 ? '1st' : k === 1 ? '2nd' : k === 2 ? '3rd' : '4th'} draw" value={stage.title} oninput={(e) => setTitle(k, e.currentTarget.value)} />
          {/if}

          {#if stage.same}
            <div class="outcomes" role="group" aria-label="Outcomes of stage {k + 1}">
              <span class="col-head">Outcome</span><span class="col-head">Probability</span><span></span>
              {#each stage.outcomes as outcome, j (j)}
                <input type="text" aria-label="Outcome {j + 1} of stage {k + 1}" placeholder={k === 0 ? (j ? 'T' : 'H') : `Outcome ${j + 1}`} value={outcome} oninput={(e) => setOutcome(k, j, e.currentTarget.value)} />
                <input type="text" class="prob" inputmode="decimal" aria-label="Probability of {outcome || `outcome ${j + 1}`}" placeholder="blank" value={rowOf(stage, 0)[j]} oninput={(e) => setProb(k, 0, j, e.currentTarget.value)} />
                {@render removeButton(k, j)}
              {/each}
            </div>
          {:else}
            <div class="names" role="group" aria-label="Outcomes of stage {k + 1}">
              {#each stage.outcomes as outcome, j (j)}
                <span class="name-cell">
                  <input type="text" aria-label="Outcome {j + 1} of stage {k + 1}" placeholder="Outcome {j + 1}" value={outcome} oninput={(e) => setOutcome(k, j, e.currentTarget.value)} />
                  {@render removeButton(k, j)}
                </span>
              {/each}
            </div>
            <div class="grid" style:--cols={stage.outcomes.length} role="group" aria-label="Probabilities of stage {k + 1} after each branch">
              <span></span>
              {#each stage.outcomes as outcome, j (j)}<span class="col-head">P({outcome || `outcome ${j + 1}`})</span>{/each}
              {#each rowNames(k) as after, r (r)}
                <span class="row-name">after {after}</span>
                {#each stage.outcomes as outcome, j (j)}
                  <input type="text" class="prob" inputmode="decimal" aria-label="Probability of {outcome || `outcome ${j + 1}`} after {after}" placeholder="blank" value={rowOf(stage, r)[j]} oninput={(e) => setProb(k, r, j, e.currentTarget.value)} />
                {/each}
              {/each}
            </div>
          {/if}

          <div class="stage-foot">
            <button type="button" class="btn-ghost small" disabled={!canAddOutcome(k)} onclick={() => change(addOutcome(clean, k))}>
              <Plus size={15} aria-hidden="true" /> Outcome
            </button>
            {#if k > 0}
              <label class="check"><input type="checkbox" checked={stage.same} onchange={(e) => change({ stages: setSame(clean, k, e.currentTarget.checked) })} /> Same on every branch</label>
            {/if}
          </div>
        </fieldset>
      {/each}

      <div class="stage-foot">
        <button type="button" class="btn-ghost small" disabled={!canAddStage} onclick={() => change(addStage(clean))}>
          <Plus size={15} aria-hidden="true" /> Stage
        </button>
        {#if clean.stages.length > 1}
          <button type="button" class="btn-ghost small" onclick={() => change(removeStage(clean))}>
            <X size={15} aria-hidden="true" /> Remove stage {clean.stages.length}
          </button>
        {/if}
      </div>
      {#if !canAddStage && clean.stages.length < MAX_STAGES}<p class="help">A tree can have up to {MAX_PATHS} paths, so there’s no room for another stage.</p>{/if}
      {#each [read.problems.sums, read.problems.overOne] as problem}
        {#if problem}<p class="help problem">{problem}</p>{/if}
      {/each}
      <label class="check">
        <input type="checkbox" checked={pathsShown} onchange={(e) => showPaths(e.currentTarget.checked)} /> Path names and probabilities
      </label>
      <div class="blank-bar">
        <span>Click any label on the figure to make it a blank{clean.blanks.length ? `; ${clean.blanks.length} so far` : ''}.</span>
        {#if clean.blanks.length}
          <button type="button" class="btn-ghost small" onclick={() => (s.blanks = [])}>Clear blanks</button>
        {/if}
      </div>
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Labels" icon={Type} summary={labelsSummary}>
      {#each SHOW_KEYS as x}{@render choice({ key: x.key, name: x.name, options: SHOWS })}{/each}
      {#if clean.showNames !== 'hide'}{@render choice({ key: 'pathStyle', name: 'Path names written', options: PATH_STYLES })}{/if}
      <label class="field">
        <span>Start label</span>
        <input type="text" placeholder="None" bind:value={s.start} />
      </label>
      <label class="check"><input type="checkbox" bind:checked={s.stageTitles} /> Stage titles</label>
    </Section>

    <Section title="Layout" icon={Network} summary={DIRECTIONS[clean.direction]}>
      {@render choice({ key: 'direction', name: 'The tree grows', options: DIRECTIONS, disabled: (v) => v === 'down' && paths > MAX_PATHS_DOWN })}
      {#if paths > MAX_PATHS_DOWN}<p class="help">Top to bottom fits up to {MAX_PATHS_DOWN} paths across a page; this tree has {paths}.</p>{/if}
    </Section>
  {/snippet}

  {#snippet figure()}
    <div class="stage-figure">
      <TreeDiagram layout={drawing} {label} bind:svg />
      <PickLayer figure={pickable} onpick={toggle} />
    </div>
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .card-body { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .help { margin: 0; font-size: 0.84rem; color: var(--muted); }
  .help.problem { color: var(--red); font-weight: 600; }

  .part { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
  .part:last-child { margin-bottom: 0; }
  .part-name { font-weight: 600; font-size: 0.88rem; }
  .segmented button { flex: 1; }
  .segmented button:disabled { opacity: 0.4; cursor: default; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.75rem; }

  .stage { border: 1px solid var(--border); border-radius: 12px; padding: 0.55rem 0.75rem 0.7rem; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  .stage legend { font-size: 0.8rem; font-weight: 700; color: var(--muted); padding: 0 0.3rem; }
  .title { width: 100%; }
  .col-head { font-size: 0.75rem; font-weight: 700; color: var(--muted); overflow-wrap: anywhere; }
  .row-name { font-size: 0.85rem; font-weight: 600; overflow-wrap: anywhere; }
  input { min-width: 0; }

  /* Same on every branch: each outcome, its probability and a remove button. */
  .outcomes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 0.35rem 0.5rem; align-items: center; }
  /* By branch: the outcomes in a row, then a probability for each node before. */
  .names { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .name-cell { display: flex; align-items: center; gap: 0.15rem; flex: 1 1 6rem; min-width: 0; }
  .name-cell input { flex: 1; }
  .grid { display: grid; grid-template-columns: minmax(3.5rem, auto) repeat(var(--cols), minmax(0, 1fr)); gap: 0.35rem 0.4rem; align-items: center; }
  .prob { font-family: 'Times New Roman', Times, serif; font-size: 1.02rem; }

  .remove { width: 1.9rem; height: 1.9rem; }
  .stage-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; }
  .small { padding: 0.35rem 0.7rem; border-radius: 10px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.3rem; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.88rem; margin: 0; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); flex: none; }

  .stage-figure { position: relative; }
  .blank-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
</style>
