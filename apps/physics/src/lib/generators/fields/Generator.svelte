<script lang="ts">
  // The Electric and Magnetic Field Generator: what's drawn and its field lines
  // on the left, the figure on the right. Settings live in the page address.
  import { Atom, Spline, SlidersHorizontal } from '@lucide/svelte'
  import Choice, { radioKeys, radioTabIndex } from '$lib/shared/Choice.svelte'
  import { createGenerator } from '$lib/shared/generator.svelte'
  import Section from '$lib/shared/Section.svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import Fields from './Fields.svelte'
  import { SETUP_NAMES, SETUPS, fieldSettings } from './settings'

  const gen = createGenerator(fieldSettings, 'electric-and-magnetic-fields')
  const s = $derived(gen.snapshot())

  const setupSummary = $derived(
    [
      SETUP_NAMES[s.setup],
      s.setup === 'charge' || s.setup === 'like' ? (s.sign === '+' ? 'positive' : 'negative') : '',
      s.setup === 'wire' ? (s.current === 'out' ? 'current out of the page' : 'current into the page') : '',
    ]
      .filter(Boolean)
      .join(' · '),
  )
  const linesSummary = $derived(s.fieldLines ? [s.lines, s.arrows ? 'with arrows' : 'no arrows'].join(' · ') : 'none')
</script>

<GeneratorPage name="Electric and Magnetic Field Generator" filename="electric-and-magnetic-fields" {gen}>
  {#snippet settings()}
    <Section title="Setup" icon={Atom} summary={setupSummary}>
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
      {#if s.setup === 'charge' || s.setup === 'like'}
        <div class="field">
          {s.setup === 'charge' ? 'Charge' : 'Both charges'}
          <Choice name="Sign" options={[['+', 'Positive'], ['-', 'Negative']]} bind:value={gen.s.sign} />
        </div>
      {/if}
      {#if s.setup === 'wire'}
        <div class="field">
          Current
          <Choice name="Current" options={[['out', 'Out of the page'], ['in', 'Into the page']]} bind:value={gen.s.current} />
        </div>
      {/if}
    </Section>

    <Section title="Field lines" icon={Spline} summary={linesSummary}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.fieldLines} /> Draw the field lines</label>
      {#if s.fieldLines}
        <div class="field">
          How many
          <Choice name="How many field lines" options={[['fewer', 'Fewer'], ['normal', 'Normal'], ['more', 'More']]} bind:value={gen.s.lines} />
        </div>
        <label class="check"><input type="checkbox" bind:checked={gen.s.arrows} /> Arrows showing the direction</label>
      {/if}
    </Section>

    <Section title="Figure" icon={SlidersHorizontal} summary={s.color ? 'color' : 'black and white'}>
      <label class="check"><input type="checkbox" bind:checked={gen.s.color} /> Color (for slides)</label>
    </Section>
  {/snippet}

  {#snippet figure()}
    <Fields settings={s} id="f" />
  {/snippet}
</GeneratorPage>

<style>
  .setups { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.75rem; }
  .setups button {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--card);
    color: var(--ink);
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .setups button:hover { background: var(--blue-soft); }
  .setups button.on { border-color: var(--blue); background: var(--blue-soft); color: var(--blue-dark); font-weight: 700; }
</style>
