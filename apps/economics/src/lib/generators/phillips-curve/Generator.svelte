<script lang="ts">
  // Phillips Curve: the short-run Phillips curve, convex and sloping down,
  // and the vertical long-run one at the natural rate of unemployment, with
  // a movement along the short-run curve or either curve shifting, the long
  // run after a movement, and the points A, B and C with dashed guides to
  // the inflation and unemployment rates. Schematic (no numbers, as AP graphs
  // are drawn) or numbered in percent, running below 0 for deflation. Drawn
  // by the econ graph library ($lib/graph).
  import { MapPin, MoveRight, Tags } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import LabelField from '$shared/LabelField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import TitleSettings from '$shared/graph/TitleSettings.svelte'
  import type { TitleMode } from '$shared/graph/axes'
  import { plainOf } from '$shared/graph/runs'
  import AxesPicker from '$lib/graph/AxesPicker.svelte'
  import LookSettings from '$lib/graph/LookSettings.svelte'
  import NumberSettings from '$lib/graph/NumberSettings.svelte'
  import { rangesOf, typeRange } from '$lib/graph/fit'
  import { NUMBER_FROMS, NUMBER_FROM_NAMES, filenameOf } from '$lib/graph/settings'
  import { SHIFT_SIZES, SHIFT_SIZE_NAMES } from '$lib/graph/shifts'
  import PhillipsFigure from './PhillipsFigure.svelte'
  import { axesOf, buildPhillips, fitOf } from './figure'
  import {
    CAUSES, CAUSE_NAMES, CURVATURES, CURVATURE_NAMES, MOVEMENTS, PERCENTS, PERCENT_NAMES, phillipsSettings,
    type Movement, type PhillipsSettings,
  } from './settings'
  import { SETUPS, settingsFor } from './setups'

  const gen = generatorState(phillipsSettings, 'phillips-curve')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  let svg = $state<SVGSVGElement>()

  const numeric = $derived(clean.look === 'numeric')
  const built = $derived(buildPhillips(clean))

  function chooseSetup(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) Object.assign(s, settingsFor(setup, phillipsSettings.defaults, gen.snapshot()))
  }
  // The setup picker shows the setup the graph still is: one whose settings
  // (any a setup sets) all match. Changing one of them leaves it blank again.
  const SETUP_KEYS = [...new Set(SETUPS.flatMap((x) => Object.keys(x.settings)))] as (keyof PhillipsSettings)[]
  const setupId = $derived(
    SETUPS.find((x) => {
      const m = { ...phillipsSettings.defaults, ...x.settings }
      return SETUP_KEYS.every((key) => m[key] === clean[key])
    })?.id ?? '',
  )

  // While the axes are fitted, the range boxes show the fitted range; typing takes over.
  const fit = $derived(fitOf(clean))
  const shown = $derived(rangesOf(clean, fit))
  const read = $derived(axesOf(clean))
  const type = (key: Parameters<typeof typeRange>[0], v: string) => Object.assign(s, typeRange(key, v, s, fit))

  const MOVE_NAMES: Record<Movement, string> = { none: 'None', along: 'Along SRPC', srpc: 'SRPC', lrpc: 'LRPC' }
  const along = $derived(clean.movement === 'along')
  const shock = $derived(clean.movement === 'srpc' && clean.cause === 'shock')
  const longRun = $derived(along && clean.longRun)
  const shifting = $derived(clean.movement === 'srpc' || clean.movement === 'lrpc' || longRun)
  // With the LRPC shifting and the SRPC left where it is, the economy stays at A: there's no B.
  const hasB = $derived(clean.movement !== 'none' && (clean.movement !== 'lrpc' || clean.withSrpc))

  const moveSummary = $derived(
    clean.movement === 'none' ? 'No movement'
    : clean.movement === 'along' ? `Along the SRPC${numeric ? '' : clean.along === 'up' ? ', up' : ', down'}${clean.longRun ? ', then the long run' : ''}`
    : clean.movement === 'srpc' ? `SRPC shifts${numeric ? '' : ` ${clean.srpcSide}`} (${CAUSE_NAMES[clean.cause].toLowerCase()})`
    : `LRPC shifts${numeric ? '' : ` ${clean.lrpcSide}`}`,
  )
  const pointNames = $derived([
    clean.pointA && 'A',
    hasB && clean.pointB && 'B',
    longRun && clean.pointC && 'C',
  ].filter(Boolean))
  const pointSummary = $derived([pointNames.length ? `Points ${pointNames.join(', ')}` : 'No points', clean.guides ? 'guides to the axes' : 'no guides'].join(' · '))
  const labelSummary = $derived([clean.srpcLabel, clean.lrpcLabel, clean.nruLabel].map((t) => plainOf(t.trim())).filter(Boolean).join(', ') || 'No labels')
  const filename = $derived(filenameOf(clean, 'phillips-curve'))

  type LabelKey = 'srpcLabel' | 'lrpcLabel' | 'nruLabel' | 'aLabel' | 'bLabel' | 'cLabel' | 'piLabel' | 'uLabel'
  /** The labels on the figure as it is, each with its name in the panel. */
  const labelList = $derived(
    [
      ...(clean.srpc ? [['srpcLabel', 'Short-run Phillips curve']] : []),
      ...(clean.lrpc ? [['lrpcLabel', 'Long-run Phillips curve']] : []),
      ...(clean.lrpc || (clean.guides && clean.values) ? [['nruLabel', 'Natural rate at the axis']] : []),
      ...(clean.pointA ? [['aLabel', 'Point A']] : []),
      ...(hasB && clean.pointB ? [['bLabel', 'Point B']] : []),
      ...(longRun && clean.pointC ? [['cLabel', 'Point C']] : []),
      ...(clean.guides && clean.values ? [['piLabel', 'Inflation at the axis'], ['uLabel', 'Unemployment at the axis']] : []),
    ] as [LabelKey, string][],
  )
  const mode = (key: LabelKey) => `${key}Mode` as `${LabelKey}Mode`
  function allLabels(m: TitleMode) {
    for (const [key] of labelList) s[mode(key)] = m
  }
</script>

{#snippet segmented<T extends string>(name: string, options: readonly T[], names: Record<T, string>, value: T, set: (v: T) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as v}
      <button type="button" role="radio" aria-checked={value === v} class:on={value === v} onclick={() => set(v)}>{names[v]}</button>
    {/each}
  </div>
{/snippet}

{#snippet percentField(name: string, get: () => number, set: (v: number) => void)}
  <label class="field">
    <span>{name}</span>
    <div class="percent"><input type="number" step="any" value={get()} oninput={(e) => { const v = e.currentTarget.valueAsNumber; if (Number.isFinite(v)) set(v) }} /><span>%</span></div>
  </label>
{/snippet}

<GeneratorPage name="Phillips Curve" {filename} {gen} {svg} settingsWidth={26} bind:labelSize={s.labelSize}>
  {#snippet inputs()}
    <section class="curves">
      <div class="head-row">
        <h2 class="card-head">Curves</h2>
        <HelpTip id="pc-tip" label="How the curves are drawn">
          The short-run Phillips curve (SRPC) slopes down and bends, crossing the vertical long-run curve (LRPC) at the
          natural rate of unemployment, where inflation is what people expect. Numbered, the SRPC goes through A and a
          second point you type, and the axes run below 0% for deflation. In any label, _ lowers the next letter (u_n is
          uₙ) and _{'{…}'} lowers everything in the braces.
        </HelpTip>
      </div>
      <label class="field">
        <span>Common setups</span>
        <select value={setupId} onchange={(e) => chooseSetup(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>
      <AxesPicker bind:look={s.look} />

      <div class="checks">
        <label class="check"><input type="checkbox" bind:checked={s.srpc} /> SRPC</label>
        <label class="check"><input type="checkbox" bind:checked={s.lrpc} /> LRPC</label>
      </div>
      <label class="field">
        <span>SRPC curvature</span>
        <select bind:value={s.curvature}>{#each CURVATURES as v}<option value={v}>{CURVATURE_NAMES[v]}</option>{/each}</select>
      </label>

      {#if numeric}
        <div class="field-row">
          {@render percentField('Natural rate (A)', () => s.nru, (v) => (s.nru = v))}
          {@render percentField('Expected inflation (A)', () => s.expected, (v) => (s.expected = v))}
        </div>
        <div class="field-row">
          {@render percentField(along ? 'Unemployment at B' : 'SRPC also through: unemployment', () => s.u2, (v) => (s.u2 = v))}
          {@render percentField(along ? 'Inflation at B' : 'Inflation there', () => s.pi2, (v) => (s.pi2 = v))}
        </div>
        <label class="field">
          <span>Percent signs</span>
          <select bind:value={s.percent}>{#each PERCENTS as v}<option value={v}>{PERCENT_NAMES[v]}</option>{/each}</select>
        </label>
      {:else}
        <label class="field">
          <span>Natural rate of unemployment</span>
          <div class="slider"><input type="range" min="0.4" max="0.7" step="0.01" bind:value={s.nruAt} aria-label="Natural rate of unemployment" /></div>
        </label>
      {/if}

      {#each built.notes as note}<p class="problem">{note}</p>{/each}
      {#if built.readout.length}
        <ul class="readout">{#each built.readout as line}<li>{line}</li>{/each}</ul>
      {/if}
    </section>
  {/snippet}

  {#snippet settings()}
    <Section title="Movement" icon={MoveRight} summary={moveSummary}>
      <div class="field">
        <span>What moves</span>
        {@render segmented('What moves', MOVEMENTS, MOVE_NAMES, s.movement, (v) => (s.movement = v))}
      </div>
      {#if clean.movement === 'along'}
        {#if !numeric}
          <div class="field">
            <span>Direction</span>
            {@render segmented('Direction', ['up', 'down'] as const, { up: 'Up (inflation rises)', down: 'Down (unemployment rises)' }, s.along, (v) => (s.along = v))}
          </div>
        {/if}
        <label class="check"><input type="checkbox" bind:checked={s.longRun} /> Long run: expectations adjust, back to the LRPC at C</label>
      {:else if clean.movement === 'srpc'}
        <div class="field">
          <span>Why it shifts</span>
          {@render segmented('Why it shifts', CAUSES, CAUSE_NAMES, s.cause, (v) => (s.cause = v))}
        </div>
        {#if numeric}
          <div class="field-row">
            {@render percentField('Expected inflation after', () => s.expected2, (v) => (s.expected2 = v))}
            {#if shock}{@render percentField('Unemployment at B', () => s.uShock, (v) => (s.uShock = v))}{/if}
          </div>
        {:else}
          <div class="field">
            <span>Direction</span>
            {@render segmented('Direction', ['right', 'left'] as const, { right: 'Right (up)', left: 'Left (down)' }, s.srpcSide, (v) => (s.srpcSide = v))}
          </div>
        {/if}
      {:else if clean.movement === 'lrpc'}
        {#if numeric}
          {@render percentField('Natural rate after', () => s.nru2, (v) => (s.nru2 = v))}
        {:else}
          <div class="field">
            <span>Direction</span>
            {@render segmented('Direction', ['left', 'right'] as const, { left: 'Left (lower NRU)', right: 'Right (higher NRU)' }, s.lrpcSide, (v) => (s.lrpcSide = v))}
          </div>
        {/if}
        <label class="check"><input type="checkbox" bind:checked={s.withSrpc} /> The SRPC shifts with it</label>
      {/if}
      {#if clean.movement !== 'none' && !numeric}
        <label class="field">
          <span>How far</span>
          <select bind:value={s.size}>{#each SHIFT_SIZES as v}<option value={v}>{SHIFT_SIZE_NAMES[v]}</option>{/each}</select>
        </label>
      {/if}
      {#if shifting}
        <label class="field">
          <span>Shift arrows</span>
          <select bind:value={s.arrows}>
            {#each [[0, 'None'], [1, 'One'], [2, 'Two'], [3, 'Three']] as [v, name]}<option value={v}>{name}</option>{/each}
          </select>
        </label>
      {/if}
      {#if along || shock}
        <label class="check"><input type="checkbox" bind:checked={s.pathArrows} /> Arrows from point to point</label>
      {/if}
    </Section>

    <Section title="Points" icon={MapPin} summary={pointSummary}>
      <label class="check"><input type="checkbox" bind:checked={s.pointA} /> A, where the economy starts</label>
      {#if hasB}
        <label class="check"><input type="checkbox" bind:checked={s.pointB} /> B, {clean.movement === 'lrpc' ? 'after the natural rate changes' : clean.movement === 'srpc' && clean.cause === 'expectations' ? 'after expectations change' : 'in the short run'}</label>
      {/if}
      {#if longRun}
        <label class="check"><input type="checkbox" bind:checked={s.pointC} /> C, in the long run</label>
      {/if}
      <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines to the axes</label>
      {#if clean.guides}
        <label class="check"><input type="checkbox" bind:checked={s.values} /> Inflation and unemployment rates at the axes</label>
      {/if}
    </Section>

    <Section title="Labels" icon={Tags} summary={labelSummary}>
      <div class="field">
        <span>Before and after</span>
        {@render segmented('Before and after', NUMBER_FROMS, NUMBER_FROM_NAMES, s.numberFrom, (v) => (s.numberFrom = v))}
      </div>
      <div class="field">
        <span>Every label</span>
        <div class="segmented" role="group" aria-label="Every label">
          <button type="button" onclick={() => allLabels('text')}>Written</button>
          <button type="button" onclick={() => allLabels('blank')}>Blank lines</button>
          <button type="button" onclick={() => allLabels('none')}>None</button>
        </div>
      </div>
      {#each labelList as [key, name] (key)}
        <div class="field">
          <span>{name}</span>
          <LabelField {name} placeholder={phillipsSettings.defaults[key]} bind:mode={s[mode(key)]} bind:text={s[key]} />
        </div>
      {/each}
    </Section>

    <TitleSettings
      bind:title={s.title} bind:titleMode={s.titleMode} bind:xTitle={s.xTitle} bind:xTitleMode={s.xTitleMode}
      bind:yTitle={s.yTitle} bind:yTitleMode={s.yTitleMode}
      placeholders={{ title: 'The Phillips curve', xTitle: 'Unemployment rate', yTitle: 'Inflation rate' }}
    />
    <LookSettings bind:ink={s.ink} bind:xEndCap={s.xEndCap} bind:yEndCap={s.yEndCap} />
    {#if numeric}
      <NumberSettings
        {shown} read={read} problems={read.problems} {type}
        bind:xEvery={s.xEvery} bind:yEvery={s.yEvery} bind:gridlines={s.gridlines} bind:minor={s.minor} bind:fit={s.fit}
      />
    {/if}
  {/snippet}

  {#snippet figure()}
    <PhillipsFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .card-head { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
  .curves { padding: 1rem 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .curves .field, .curves .check, .curves .field-row { margin-bottom: 0; }
  .head-row { display: flex; align-items: center; justify-content: space-between; }
  .checks { display: flex; gap: 1.25rem; }
  .percent { display: flex; align-items: center; gap: 0.35rem; }
  .percent input { flex: 1; min-width: 0; }
  .percent span { font-weight: 700; color: var(--muted); }
  .problem { margin: 0; font-size: 0.85rem; font-weight: 600; color: var(--red); }
  .readout { margin: 0; padding: 0.55rem 0.75rem; list-style: none; border-radius: 10px; background: var(--blue-soft); font-size: 0.85rem; font-weight: 600; }
  .readout li + li { margin-top: 0.2rem; }
</style>
