<script lang="ts">
  // Length Reading: pick a ruler, a caliper or a micrometer. On a ruler,
  // pick metric or imperial and how finely it's marked, type an object's
  // length, and get a figure students measure it from; the object starts
  // lined up with 0, and the teacher can slide it along so students read
  // both ends. On a caliper or micrometer, type the reading, with a zero
  // error if wanted, and get the instrument with a close-up of its scales.
  import { ArrowLeftToLine, Circle, Gauge, MoveHorizontal, Package, Ruler, Type, Wrench, ZoomIn } from '@lucide/svelte'
  import FigureTextSettings from '$shared/FigureTextSettings.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import HelpTip from '$shared/HelpTip.svelte'
  import MagnifierSettings from '$shared/MagnifierSettings.svelte'
  import ReadingField from '$shared/ReadingField.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import { MAGNIFIER_VIEWS, type MagnifierView } from '$shared/magnify'
  import { CALIPER_RANGE, LEAST_COUNTS, caliperScale, readingOf as caliperReadingOf, type LeastCount } from './caliper'
  import { JAW_OBJECTS, JAW_OBJECT_NAMES, minReading, mmText, randomReading, tidyReading, tidyZero } from './instrument'
  import { MICROMETER, readingOf as micrometerReadingOf } from './micrometer'
  import { MARBLE_COUNTS, OBJECTS, OBJECT_NAMES } from './objectKinds'
  import LengthField from './LengthField.svelte'
  import LengthFigure from './LengthFigure.svelte'
  import {
    CM_PER_INCH, CM_SIZES, IMPERIAL_MARKS, INCH_SIZES, METRIC_MARKS, METRIC_MARK_NAMES, READS, READ_NAMES, SYSTEMS, SYSTEM_NAMES, UNITS,
    formatLength, marksFit, nearestSize, randomLength, rulerScale, shortest, type System,
  } from './ruler'
  import {
    INSTRUMENTS, INSTRUMENT_NAMES, LENGTH_VIEWS, LENGTH_VIEW_NAMES, answerLine, endOf, gauge, lengthSettings, lengthText, type LengthSettings,
  } from './settings'

  const gen = generatorState(lengthSettings, 'length-reading')
  const s = gen.s
  let svg = $state<SVGSVGElement>()

  const scale = $derived(rulerScale(s))
  const unit = $derived(UNITS[s.system])

  /** Changes settings, keeping the rest within the rules between them (the
   *  object on the ruler, its ends on what the ruler reads). */
  const set = (patch: Partial<LengthSettings>) => Object.assign(s, lengthSettings.tidy({ ...$state.snapshot(s), ...patch }))

  /** The other system keeps the object the same real length, on the
   *  shortest ruler of that system it fits on, and the magnifiers about as
   *  wide (3 cm across is about 1 inch). */
  function changeSystem(system: System) {
    if (system === s.system) return
    const k = system === 'imperial' ? 1 / CM_PER_INCH : CM_PER_INCH
    const [length, start, across] = [s.length * k, s.start * k, s.span * scale.numbered * k]
    const size = system === 'imperial' ? { inches: nearestSize(INCH_SIZES, start + length) } : { cm: nearestSize(CM_SIZES, start + length) }
    const next = lengthSettings.tidy({ ...$state.snapshot(s), system, ...size, length, start })
    set({ ...next, span: Math.round(across / rulerScale(next).numbered) })
  }

  const marksName = $derived(s.system === 'imperial' ? `${formatLength(scale, scale.minor)} in` : METRIC_MARK_NAMES[s.metricMarks])
  const rulerSummary = $derived(`${scale.size} ${unit}, ${marksName} marks`)
  const objectSummary = $derived(s.object === 'marbles' ? `${s.marbles} marble${s.marbles === 1 ? '' : 's'}` : OBJECT_NAMES[s.object])
  const lengthSummary = $derived(`${lengthText(s, s.length)}${s.start ? `, from ${lengthText(s, s.start)}` : ', from 0'}`)
  // The caliper and micrometer.
  const g = $derived(gauge(s))
  const isCaliper = $derived(s.instrument === 'caliper')
  const caliper = $derived(caliperScale(s.leastCount))
  const instrumentSummary = $derived(
    s.instrument === 'ruler' ? 'Ruler' : isCaliper ? `Caliper, ${s.leastCount} mm least count` : 'Micrometer, 0.01 mm least count',
  )
  const readingSummary = $derived(
    mmText(g.reading, g.instrument.decimals) + (g.zero ? `, zero error ${mmText(g.zero, g.instrument.decimals, true)}` : ''),
  )
  const jawsSummary = $derived(s.jaws !== 'none' && s.jawsLabel ? `${JAW_OBJECT_NAMES[s.jaws]} “${s.jawsLabel}”` : JAW_OBJECT_NAMES[s.jaws])
  const CLOSE_UP_NAMES: Record<MagnifierView, string> = $derived(
    isCaliper
      ? { both: 'Caliper and close-up', magnifier: 'Close-up only', whole: 'Caliper only' }
      : { both: 'Micrometer and magnifier', magnifier: 'Magnifier only', whole: 'Micrometer only' },
  )
  /** how the reading is made up, as students should find it */
  const parts = $derived.by(() => {
    if (isCaliper) {
      const { main, k } = caliperReadingOf(caliper, s.caliper)
      return `Main scale ${main} mm, sliding scale mark ${k} lines up`
    }
    const { sleeve, thimble } = micrometerReadingOf(s.micrometer)
    return `Sleeve ${mmText(sleeve, 1)}, thimble mark ${thimble} on the datum line`
  })

  function setReading(reading: number) {
    if (isCaliper) s.caliper = tidyReading(caliper, s.caliperZero, reading)
    else s.micrometer = tidyReading(MICROMETER, s.micrometerZero, reading)
  }

  function setZero(zero: number) {
    if (isCaliper) {
      s.caliperZero = tidyZero(caliper, zero)
      s.caliper = tidyReading(caliper, s.caliperZero, s.caliper)
    } else {
      s.micrometerZero = tidyZero(MICROMETER, zero)
      s.micrometer = tidyReading(MICROMETER, s.micrometerZero, s.micrometer)
    }
  }

  function changeLeastCount(lc: LeastCount) {
    const next = caliperScale(lc)
    s.caliperZero = tidyZero(next, s.caliperZero)
    s.caliper = tidyReading(next, s.caliperZero, s.caliper)
    s.leastCount = lc
  }

  /** A random reading. On a caliper never a whole number of mm, where the sliding scale's last mark lines up too. */
  function random() {
    let r = randomReading(g.instrument, g.zero)
    if (isCaliper && caliperReadingOf(caliper, r).k === 0) {
      r = tidyReading(caliper, g.zero, r + caliper.leastCount * (1 + Math.floor(Math.random() * (caliper.divisions - 1))))
    }
    setReading(r)
  }

  const textSummary = $derived(
    [s.titleMode === 'text' && s.title ? `“${s.title}”` : 'No title', s.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
</script>

<GeneratorPage name="Length Reading Generator" filename="length-reading" settingsWidth={27} {gen} {svg}>
  {#snippet settings()}
    <Section title="Instrument" summary={instrumentSummary} icon={Wrench} open>
      <div class="segmented" role="radiogroup" aria-label="Instrument">
        {#each INSTRUMENTS as instrument (instrument)}
          <button type="button" role="radio" aria-checked={s.instrument === instrument} class:on={s.instrument === instrument} onclick={() => (s.instrument = instrument)}>
            {INSTRUMENT_NAMES[instrument]}
          </button>
        {/each}
      </div>
      {#if isCaliper}
        <p class="field-label">Least count</p>
        <div class="segmented" role="radiogroup" aria-label="Least count">
          {#each LEAST_COUNTS as lc (lc)}
            <button type="button" role="radio" aria-checked={s.leastCount === lc} class:on={s.leastCount === lc} onclick={() => changeLeastCount(lc)}>
              {lc} mm
            </button>
          {/each}
        </div>
      {/if}
      {#if s.instrument !== 'ruler'}
        <label class="check printed">
          <input type="checkbox" bind:checked={s.printed} /> Least count printed on the {isCaliper ? 'slider' : 'frame'}
        </label>
      {/if}
    </Section>
    {#if s.instrument === 'ruler'}
      <Section title="Ruler" summary={rulerSummary} icon={Ruler} open>
        <div class="segmented" role="radiogroup" aria-label="Units">
          {#each SYSTEMS as system (system)}
            <button type="button" role="radio" aria-checked={s.system === system} class:on={s.system === system} onclick={() => changeSystem(system)}>
              {SYSTEM_NAMES[system]}
            </button>
          {/each}
        </div>
        <p class="field-label">Length</p>
        <div class="chips" role="radiogroup" aria-label="Ruler length">
          {#if s.system === 'metric'}
            {#each CM_SIZES as cm (cm)}
              <button type="button" role="radio" aria-checked={s.cm === cm} class="chip" class:on={s.cm === cm} onclick={() => set({ cm })}>{cm} cm</button>
            {/each}
          {:else}
            {#each INCH_SIZES as inches (inches)}
              <button type="button" role="radio" aria-checked={s.inches === inches} class="chip" class:on={s.inches === inches} onclick={() => set({ inches })}>
                {inches} in
              </button>
            {/each}
          {/if}
        </div>
        <div class="head-row">
          <p class="field-label">Smallest marks</p>
          <HelpTip id="length-marks-tip" label="About the marks">
            {s.system === 'metric'
              ? '5 cm and 10 cm marks are for the 50 cm and 100 cm rulers.'
              : 'Lengths land on a mark and are read as fractions of an inch.'}
          </HelpTip>
        </div>
        <div class="chips" role="radiogroup" aria-label="Smallest marks">
          {#if s.system === 'metric'}
            {#each METRIC_MARKS as metricMarks (metricMarks)}
              <button
                type="button" role="radio" aria-checked={s.metricMarks === metricMarks} class="chip" class:on={s.metricMarks === metricMarks}
                disabled={!marksFit(metricMarks, s.cm)} onclick={() => set({ metricMarks })}
              >
                {METRIC_MARK_NAMES[metricMarks]}
              </button>
            {/each}
          {:else}
            {#each IMPERIAL_MARKS as imperialMarks (imperialMarks)}
              <button
                type="button" role="radio" aria-checked={s.imperialMarks === imperialMarks} class="chip" class:on={s.imperialMarks === imperialMarks}
                onclick={() => set({ imperialMarks })}
              >
                {imperialMarks === '1' ? '1' : `1/${imperialMarks}`} in
              </button>
            {/each}
          {/if}
        </div>
        {#if s.system === 'metric'}
          <div class="head-row">
            <p class="field-label">Read to</p>
            <HelpTip id="length-read-tip" label="How far lengths go">
              {s.read === 'estimate'
                ? `Lengths go one digit past the smallest mark, to ${formatLength(scale, scale.step)} cm.`
                : `Lengths land on a mark, to ${formatLength(scale, scale.step)} cm.`}
            </HelpTip>
          </div>
          <div class="segmented" role="radiogroup" aria-label="Read to">
            {#each READS as read (read)}
              <button type="button" role="radio" aria-checked={s.read === read} class:on={s.read === read} onclick={() => set({ read })}>
                {READ_NAMES[read]}
              </button>
            {/each}
          </div>
        {/if}
      </Section>
      <Section title="Length and position" summary={lengthSummary} icon={MoveHorizontal} open>
        <div class="readings">
          <LengthField
            label="Object’s length"
            value={s.length}
            {scale}
            min={shortest(scale)}
            max={scale.size}
            onchange={(length) => set({ length })}
            onrandom={() => set({ length: randomLength(scale) })}
          />
          <LengthField
            label="Left end at"
            value={s.start}
            {scale}
            min={0}
            max={scale.size - s.length}
            onchange={(start) => set({ start })}
          />
        </div>
        <div class="head-row zero-row">
          <button type="button" class="btn-ghost zero" disabled={!s.start} onclick={() => set({ start: 0 })}>
            <ArrowLeftToLine size={17} aria-hidden="true" /> Line up with 0
          </button>
          <HelpTip id="length-drag-tip" label="Moving the object">You can also drag the object along the ruler in the figure.</HelpTip>
        </div>
        {#if s.start}
          <p class="readout">Right end at {lengthText(s, endOf(s))}</p>
        {/if}
      </Section>
      <Section title="Object" summary={objectSummary} icon={Circle} open>
        <div class="segmented" role="radiogroup" aria-label="Object">
          {#each OBJECTS as object (object)}
            <button type="button" role="radio" aria-checked={s.object === object} class:on={s.object === object} onclick={() => (s.object = object)}>
              {OBJECT_NAMES[object]}
            </button>
          {/each}
        </div>
        {#if s.object === 'marbles'}
          <p class="field-label">How many, in a row</p>
          <div class="chips" role="radiogroup" aria-label="Number of marbles">
            {#each MARBLE_COUNTS as n (n)}
              <button type="button" role="radio" aria-checked={s.marbles === n} class="chip" class:on={s.marbles === n} onclick={() => (s.marbles = n)}>{n}</button>
            {/each}
          </div>
        {/if}
        <div class="head-row guides">
          <label class="check"><input type="checkbox" bind:checked={s.guides} /> Dashed lines at its ends</label>
          <HelpTip id="length-guides-tip" label="About the dashed lines">
            Lines from the object’s ends down to the ruler, for marbles and rocks, whose ends are above where they touch it.
          </HelpTip>
        </div>
      </Section>
      <Section title="Magnifiers" summary={LENGTH_VIEW_NAMES[s.view]} icon={ZoomIn}>
        <div class="head-row">
          <p class="field-label">Show</p>
          <HelpTip id="length-magnifier-tip" label="Where the magnifiers go">
            One on the object’s right end, and one on its left end when that isn’t lined up with 0.
          </HelpTip>
        </div>
        <MagnifierSettings bind:view={s.view} bind:span={s.span} views={LENGTH_VIEWS} names={LENGTH_VIEW_NAMES} />
      </Section>
    {:else}
      <Section title="Reading" summary={readingSummary} icon={Gauge} open>
        <ReadingField
          label="Reading"
          value={g.reading}
          decimals={g.instrument.decimals}
          min={minReading(g.zero)}
          max={isCaliper ? CALIPER_RANGE : MICROMETER.range}
          unit="mm"
          onchange={setReading}
          onrandom={random}
        />
        <p class="readout">{parts}</p>
        <div class="zero-error">
          <div class="head-row">
            <p class="field-label">Zero error</p>
            <HelpTip id="length-zero-tip" label="About the zero error">
              {isCaliper
                ? 'What the caliper reads with its jaws closed: positive when the sliding scale’s zero is right of the main scale’s, negative when it is left of it.'
                : 'What the micrometer reads closed: positive when the thimble’s 0 is below the datum line, negative when it is above it.'}
              The jaws are then that much closer together than the reading says, and the corrected reading is the reading minus
              the zero error.
            </HelpTip>
          </div>
          <ReadingField
            label={isCaliper ? 'Reading with the jaws closed' : 'Reading when closed'}
            value={g.zero}
            decimals={g.instrument.decimals}
            min={-g.instrument.maxZero}
            max={g.instrument.maxZero}
            unit="mm"
            onchange={setZero}
          />
          {#if g.zero}
            <label class="check closed"><input type="checkbox" bind:checked={s.closed} /> Also show it closed</label>
          {/if}
        </div>
      </Section>
      <Section title="In the jaws" summary={jawsSummary} icon={Package}>
        <div class="segmented" role="radiogroup" aria-label="In the jaws">
          {#each JAW_OBJECTS as object (object)}
            <button type="button" role="radio" aria-checked={s.jaws === object} class:on={s.jaws === object} onclick={() => (s.jaws = object)}>
              {JAW_OBJECT_NAMES[object]}
            </button>
          {/each}
        </div>
        {#if s.jaws !== 'none'}
          <label class="field below">
            Label
            <input type="text" maxlength="12" placeholder="e.g. A" bind:value={s.jawsLabel} />
          </label>
        {/if}
      </Section>
      <Section title={isCaliper ? 'Close-up' : 'Magnifier'} summary={CLOSE_UP_NAMES[s.closeUp]} icon={ZoomIn}>
        <div class="segmented" role="radiogroup" aria-label="Show">
          {#each MAGNIFIER_VIEWS as view (view)}
            <button type="button" role="radio" aria-checked={s.closeUp === view} class:on={s.closeUp === view} onclick={() => (s.closeUp = view)}>
              {CLOSE_UP_NAMES[view]}
            </button>
          {/each}
        </div>
      </Section>
    {/if}
    <Section title="Title and answer key" summary={textSummary} icon={Type}>
      <FigureTextSettings bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey} answer={answerLine(s).replace('\n', ' · ')} />
    </Section>
  {/snippet}
  {#snippet figure()}
    <LengthFigure settings={s} bind:svg onmove={(start) => set({ start })} />
  {/snippet}
</GeneratorPage>

<style>
  .field-label { margin: 0.9rem 0 0.45rem; font-weight: 700; font-size: 0.9rem; }
  .readings { display: flex; flex-direction: column; gap: 0.9rem; }
  .zero { margin-top: 0.8rem; padding: 0.5rem 0.8rem; font-size: 0.9rem; }
  .head-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .head-row .field-label { margin-bottom: 0.45rem; }
  .zero-row .zero { margin-top: 0; }
  .zero-row { margin-top: 0.8rem; }
  .readout { margin: 0.5rem 0 0; font-size: 0.85rem; font-weight: 600; }
  .check { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0; accent-color: var(--blue); }
  .field { display: flex; flex-direction: column; gap: 0.35rem; font-weight: 600; font-size: 0.88rem; }
  .guides { margin-top: 1rem; }
  .guides .check { margin: 0; }
  .printed { margin-top: 1rem; }
  .zero-error { margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--border); }
  .closed { margin-top: 0.8rem; }
  .below { margin-top: 0.9rem; }
  .segmented button { font-size: 0.8rem; }
  .chip:disabled, .chip:disabled:hover { border-color: var(--border); background: #fff; color: var(--muted); opacity: 0.6; cursor: not-allowed; }
</style>
