<script lang="ts">
  // "Start from a motion graph", under "Start from an example": paste the link
  // to a graph on the Motion Graph Generator and get the motion map of the
  // same motion, with this page's other settings at their defaults.
  import { ChartLine, Share } from '@lucide/svelte'
  import Modal from '$shared/Modal.svelte'
  import { KIND_NAMES } from '../motion-graphs/settings'
  import { mapFromLink } from './settings'

  let { apply }: { apply: (settings: object) => void } = $props()

  let open = $state(false)
  let link = $state('')
  const found = $derived(link.trim() ? mapFromLink(link) : null)
  const motion = $derived(found?.segments.map((g) => KIND_NAMES[g.kind].toLowerCase()).join(', ') ?? '')

  function close() {
    open = false
    link = ''
  }
  function make(event: SubmitEvent) {
    event.preventDefault()
    if (!found) return
    apply(found)
    close()
  }
</script>

<button type="button" class="btn-ghost browse" aria-haspopup="dialog" onclick={() => (open = true)}>
  <ChartLine size={18} aria-hidden="true" />Start from a motion graph
</button>

{#if open}
  <Modal title="Start from a motion graph" onclose={close}>
    <ol>
      <li>Open your graph in the <a href="/motion-graphs" target="_blank" rel="noopener">Motion Graph Generator</a>.</li>
      <li>Click <strong>Share link</strong> <Share size={15} aria-hidden="true" class="inline-icon" /> above the graph to copy its link.</li>
      <li>Paste the link here.</li>
    </ol>
    <form onsubmit={make}>
      <label for="graph-link">Motion graph link</label>
      <input
        id="graph-link"
        type="text"
        inputmode="url"
        bind:value={link}
        placeholder="https://physicsfigures.com/motion-graphs?…"
        autocomplete="off"
        spellcheck="false"
        data-autofocus
      />
      {#if found}
        <p class="found" role="status">{found.segments.length === 1 ? '1 segment' : `${found.segments.length} segments`}: {motion}.</p>
      {:else if link.trim()}
        <p class="note warning" role="status">That isn’t a link to the Motion Graph Generator.</p>
      {/if}
      <button type="submit" class="btn-primary make" disabled={!found}>Make the motion map</button>
    </form>
  </Modal>
{/if}

<style>
  .browse { width: 100%; margin-top: 0.5rem; padding: 0.6rem 1rem; font-size: 0.95rem; }
  ol { margin: 0 0 1rem; padding-left: 1.3rem; font-size: 15px; line-height: 1.6; }
  ol :global(.inline-icon) { vertical-align: -2px; }
  label { display: block; margin-bottom: 0.3rem; font-weight: 600; font-size: 0.92rem; }
  input { width: 100%; }
  .found { margin-top: 0.5rem; font-size: 0.9rem; }
  .warning { margin: 0.5rem 0 0; color: var(--ink); background: #fffbeb; border-left: 3px solid var(--amber); border-radius: 6px; padding: 0.5rem 0.7rem; }
  .make { width: 100%; margin-top: 0.9rem; }
</style>
