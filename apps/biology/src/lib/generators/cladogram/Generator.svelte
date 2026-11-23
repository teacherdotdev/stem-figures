<script lang="ts">
  // Cladogram: a cladogram or phylogenetic tree of the taxa the teacher
  // types, grouped into clades, with the trait each clade shares marked on
  // the branch leading into it. Text only. Settings live in the page address.
  import { ListTree, Network, Tag, Type } from '@lucide/svelte'
  import GeneratorPage from '$shared/GeneratorPage.svelte'
  import Section from '$shared/Section.svelte'
  import { generatorState } from '$shared/generatorState.svelte'
  import FigureTextSettings from '$lib/shared/FigureTextSettings.svelte'
  import CladogramFigure from './CladogramFigure.svelte'
  import { answerLines, layoutCladogram } from './layout'
  import { STYLES, TAXA_LABELS, TRAIT_LABELS, cladogramSettings, type Style } from './settings'
  import { SETUPS } from './setups'
  import TreeEditor from './TreeEditor.svelte'
  import { MAX_TAXA, MIN_TAXA, applyEdit, setText, taxaOf, type Edit, type Path } from './tree'

  const gen = generatorState(cladogramSettings, 'cladogram')
  const s = gen.s
  const clean = $derived(gen.snapshot())
  const at = $derived(layoutCladogram(clean))
  const answers = $derived(answerLines(clean))
  const count = $derived(taxaOf(clean.tree).length)
  let svg = $state<SVGSVGElement>()

  const STYLE_NAMES: Record<Style, string> = { diagonal: 'Diagonal', rectangular: 'Rectangular' }
  const TAXA_NAMES = { names: 'Names', blank: 'Blank lines' }
  const TRAIT_NAMES = { names: 'Names', blank: 'Blank lines', ticks: 'Ticks only', none: 'None' }

  function start(id: string) {
    const setup = SETUPS.find((x) => x.id === id)
    if (setup) s.tree = structuredClone(setup.tree)
  }
  // The setup picker shows the tree it still is; any change leaves it blank.
  const setupId = $derived(SETUPS.find((x) => JSON.stringify(x.tree) === JSON.stringify(clean.tree))?.id ?? '')

  function onText(path: Path, field: 'name' | 'trait', text: string) {
    s.tree = setText(clean.tree, path, field, text)
  }
  function onEdit(edit: Edit, path: Path) {
    s.tree = applyEdit(clean.tree, edit, path)
  }

  const treeSummary = $derived(
    taxaOf(clean.tree)
      .map((x) => x.name.trim() || '___')
      .join(', '),
  )
  const lookSummary = $derived(`${STYLE_NAMES[clean.style]}${clean.nodeNumbers ? ', numbered nodes' : ''}`)
  const labelSummary = $derived(`Taxa ${TAXA_NAMES[clean.taxa].toLowerCase()}, traits ${TRAIT_NAMES[clean.traits].toLowerCase()}`)
  const textSummary = $derived(
    [clean.titleMode === 'text' && clean.title ? `“${clean.title}”` : 'No title', clean.answerKey ? 'answer key' : 'no answer key'].join(', '),
  )
</script>

{#snippet segmented(name: string, options: readonly string[], names: Record<string, string>, value: string, set: (v: any) => void)}
  <div class="segmented" role="radiogroup" aria-label={name}>
    {#each options as option (option)}
      <button type="button" role="radio" aria-checked={value === option} class:on={value === option} onclick={() => set(option)}>
        {names[option]}
      </button>
    {/each}
  </div>
{/snippet}

<GeneratorPage name="Cladogram" filename="cladogram" settingsWidth={27} {gen} {svg}>
  {#snippet settings()}
    <Section title="Tree" summary={treeSummary} icon={ListTree} open>
      <label class="text-field">
        <span>Classic setups</span>
        <select value={setupId} onchange={(e) => start(e.currentTarget.value)}>
          <option value="" disabled>Choose one…</option>
          {#each SETUPS as setup (setup.id)}<option value={setup.id}>{setup.name}</option>{/each}
        </select>
      </label>

      <div class="tree">
        <TreeEditor node={clean.tree} path={[]} siblings={1} full={count >= MAX_TAXA} least={count <= MIN_TAXA} {onText} {onEdit} />
      </div>
      {#if count >= MAX_TAXA}
        <p class="note">That’s the most taxa a tree can have ({MAX_TAXA}).</p>
      {/if}
    </Section>

    <Section title="Look" summary={lookSummary} icon={Network} open>
      <p class="field-label">Branches</p>
      {@render segmented('Branches', STYLES, STYLE_NAMES, s.style, (v) => (s.style = v))}
      <label class="check spaced">
        <input type="checkbox" bind:checked={s.nodeNumbers} />
        <span>Number the nodes</span>
      </label>
    </Section>

    <Section title="Labels" summary={labelSummary} icon={Tag}>
      <p class="field-label">Taxa</p>
      {@render segmented('Taxa', TAXA_LABELS, TAXA_NAMES, s.taxa, (v) => (s.taxa = v))}
      <p class="field-label spaced">Traits</p>
      {@render segmented('Traits', TRAIT_LABELS, TRAIT_NAMES, s.traits, (v) => (s.traits = v))}
      {#if at.crowded}
        <p class="note">Some trait labels are crowded. Shorter traits, or the other branch style, may help.</p>
      {/if}
    </Section>

    <Section title="Chart title and answer key" summary={textSummary} icon={Type}>
      <FigureTextSettings
        bind:titleMode={s.titleMode} bind:title={s.title} bind:answerKey={s.answerKey}
        answer={answers.join(' · ') || 'nothing yet'}
      />
    </Section>
  {/snippet}
  {#snippet figure()}
    <CladogramFigure settings={clean} bind:svg />
  {/snippet}
</GeneratorPage>

<style>
  .tree { margin-top: 0.9rem; padding-top: 0.8rem; border-top: 1px solid var(--border); }
  .text-field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.88rem; font-weight: 700; }
  .text-field select { font-weight: 400; }
  .note { margin: 0.5rem 0 0; color: var(--muted); font-size: 0.82rem; }
  .field-label { margin: 0 0 0.45rem; font-weight: 700; font-size: 0.88rem; }
  .field-label.spaced { margin-top: 0.9rem; }
  .check { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.88rem; cursor: pointer; }
  .check input { width: 1.05rem; height: 1.05rem; margin: 0.1rem 0 0; flex: none; accent-color: var(--blue); }
  .check.spaced { margin-top: 0.9rem; }
</style>
