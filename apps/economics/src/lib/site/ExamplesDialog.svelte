<script lang="ts">
  // A generator's example figures in a dialog over the generator: pick one to
  // load its settings and keep editing, or download its PNG as it is. Escape,
  // the close button or a click outside close it without changing anything.
  import { Download, Pencil, X } from '@lucide/svelte'
  import type { Example } from '$lib/examples/types'

  interface Props {
    name: string
    examples: Example[]
    onpick: (settings: Record<string, unknown>) => void
    onclose: () => void
  }
  let { name, examples, onpick, onclose }: Props = $props()

  let dialog = $state<HTMLDialogElement>()
  $effect(() => {
    dialog?.showModal()
    return () => dialog?.close()
  })
</script>

<dialog
  bind:this={dialog}
  class="examples-dialog no-print"
  aria-labelledby="examples-title"
  onclose={onclose}
  onclick={(event) => { if (event.target === dialog) onclose() }}
>
  <header>
    <div>
      <h2 id="examples-title">{name} examples</h2>
      <p>Pick one to edit it here, or download it as it is.</p>
    </div>
    <button type="button" class="close" aria-label="Close" onclick={onclose}><X aria-hidden="true" /></button>
  </header>
  <ul>
    {#each examples as e (e.slug)}
      <li class="card">
        <!-- The picture and title are a bigger target for the mouse; Edit is the one to tab to. -->
        <button type="button" class="pick" tabindex="-1" aria-hidden="true" onclick={() => onpick(e.settings)}>
          <span class="pic">
            <img src={e.image} alt="" width={e.width || undefined} height={e.height || undefined} decoding="async" />
          </span>
          <span class="title">{e.title}</span>
        </button>
        <div class="actions">
          <button type="button" class="edit" aria-label="Edit {e.title}" onclick={() => onpick(e.settings)}><Pencil size={15} aria-hidden="true" />Edit</button>
          <a class="download" href={e.image} download="{e.slug}.png" aria-label="Download {e.title} as a PNG">
            <Download size={15} aria-hidden="true" />PNG
          </a>
        </div>
      </li>
    {/each}
  </ul>
</dialog>

<style>
  .examples-dialog {
    width: min(58rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    box-shadow: 0 18px 60px rgb(17 24 39 / 24%);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .examples-dialog::backdrop { background: rgb(17 24 39 / 42%); backdrop-filter: blur(2px); }

  header {
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem 0.8rem;
    background: #fff;
  }
  h2 { margin: 0; font-size: 1.2rem; font-weight: 800; }
  header p { margin: 0.2rem 0 0; color: var(--muted); font-size: 0.9rem; }
  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--muted);
    background: transparent;
  }
  .close:hover, .close:focus-visible { border-color: var(--border); background: var(--blue-soft); color: var(--blue-dark); }
  .close :global(svg) { width: 20px; height: 20px; }

  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    margin: 0;
    padding: 0.25rem 1.25rem 1.25rem;
    list-style: none;
  }
  li { display: flex; flex-direction: column; overflow: hidden; }
  li:hover { border-color: var(--blue-border); }
  .pick {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    text-align: left;
  }
  .pick:hover .title { color: var(--blue-dark); text-decoration: underline; text-underline-offset: 3px; }
  .pick:focus-visible { outline: 2px solid var(--blue); outline-offset: -2px; }
  /* Every thumbnail the same box, the figure fitted inside it on white. */
  .pic {
    position: relative;
    aspect-ratio: 4 / 3;
    background: #fff;
    border-bottom: 1px solid var(--border);
  }
  img {
    position: absolute;
    inset: 0.75rem;
    display: block;
    width: calc(100% - 1.5rem);
    height: calc(100% - 1.5rem);
    object-fit: contain;
  }
  .title { padding: 0.6rem 0.85rem 0.4rem; font-size: 0.92rem; font-weight: 600; line-height: 1.3; }

  .actions { display: flex; gap: 0.4rem; padding: 0.3rem 0.85rem 0.8rem; }
  .edit, .download {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.86rem;
    font-weight: 700;
    text-decoration: none;
  }
  .edit { border: 0; background: var(--blue); color: #fff; }
  .edit:hover { background: var(--blue-dark); }
  .download { border: 1.5px solid var(--blue-border); background: #fff; color: var(--blue-dark); }
  .download:hover { background: var(--blue-soft); }

  /* Phones: two across, so more of them fit on screen. */
  @media (max-width: 520px) {
    ul { grid-template-columns: 1fr 1fr; gap: 0.6rem; padding: 0.25rem 0.75rem 0.75rem; }
    header { padding: 0.9rem 0.75rem 0.7rem; }
    .title { padding: 0.5rem 0.6rem 0.3rem; font-size: 0.85rem; }
    .actions { padding: 0.25rem 0.6rem 0.65rem; }
    .edit, .download { padding: 0.35rem 0.5rem; font-size: 0.8rem; }
  }
</style>
