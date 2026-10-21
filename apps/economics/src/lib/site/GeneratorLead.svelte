<script lang="ts">
  // The first card in a generator's settings column: what it makes, in one
  // sentence, and a button that opens its example figures to start from.
  // Econ Figures' layout sets it for every generator (see $shared/generatorLead).
  import { Images } from '@lucide/svelte'
  import { page } from '$app/state'
  import { examplesFor } from '$lib/examples/examples'
  import { findGenerator } from '$lib/generators/index'
  import ExamplesDialog from './ExamplesDialog.svelte'

  let { apply }: { apply: (settings: object) => void } = $props()

  const generator = $derived(findGenerator(page.url.pathname))
  /** The catalog description's first sentence: "Make printable … for economics tests." */
  const summary = $derived(generator?.description.split(/(?<=\.)\s/)[0] ?? '')
  const examples = $derived(generator ? examplesFor(generator.id) : [])
  let open = $state(false)
</script>

<div class="lead">
  <p>{summary}</p>
  {#if examples.length}
    <button type="button" class="btn-ghost browse" aria-haspopup="dialog" onclick={() => (open = true)}>
      <Images size={18} aria-hidden="true" />Start from an example
    </button>
  {/if}
</div>

{#if open && generator}
  <ExamplesDialog
    name={generator.name}
    {examples}
    onpick={(settings) => { apply(settings); open = false }}
    onclose={() => (open = false)}
  />
{/if}

<style>
  .lead { padding: 1rem 1.1rem; }
  p { margin: 0; color: #374151; font-size: 0.92rem; line-height: 1.5; }
  .browse { width: 100%; margin-top: 0.8rem; padding: 0.6rem 1rem; font-size: 0.95rem; }
</style>
