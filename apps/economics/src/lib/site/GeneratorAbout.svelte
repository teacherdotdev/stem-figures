<script lang="ts">
  // A generator's About drawer, opened from the top bar so the page
  // itself is just the figure: what its figures show and how teachers use
  // them, what can be set, its example figures, and frequently asked
  // questions, from generatorCopy.ts (the same questions go into the page's
  // FAQPage data). It is a <dialog>, so all of it is in the page's HTML for
  // search engines even while closed. It never prints; printing is just the figure.
  import { X } from '@lucide/svelte'
  import type { CatalogEntry } from '$shared/catalog/index'
  import ExampleGallery from '$lib/examples/ExampleGallery.svelte'
  import { aboutDrawer } from './aboutDrawer.svelte'
  import type { GeneratorCopy } from './generatorCopy'

  let { generator, copy }: { generator: CatalogEntry; copy: GeneratorCopy } = $props()

  let dialog = $state<HTMLDialogElement>()

  $effect(() => {
    if (!dialog) return
    if (aboutDrawer.open && !dialog.open) dialog.showModal()
    else if (!aboutDrawer.open && dialog.open) dialog.close()
  })
  // Leaving the page closes it, so the next generator starts closed.
  $effect(() => () => (aboutDrawer.open = false))
</script>

<dialog
  bind:this={dialog}
  class="drawer no-print"
  aria-labelledby="about-{generator.id}"
  onclose={() => (aboutDrawer.open = false)}
  onclick={(event) => { if (event.target === dialog) aboutDrawer.open = false }}
>
  <div class="inner">
    <header>
      <h2 id="about-{generator.id}">{copy.heading}</h2>
      <button type="button" class="close" aria-label="Close" onclick={() => (aboutDrawer.open = false)}><X aria-hidden="true" /></button>
    </header>
    {#each copy.intro as paragraph, i (i)}<p>{paragraph}</p>{/each}

    <h3>What you can set</h3>
    <ul>
      {#each copy.settings as line, i (i)}<li>{line}</li>{/each}
    </ul>

    <h3>Copying, printing and sharing</h3>
    <p>
      Copy the figure straight into a test, worksheet or slide, or download it as a PNG or SVG. Printing the page prints
      just the figure. Share link copies the page’s address with your settings in it, so anyone who opens it sees this
      exact figure, and presets save settings you use often in your browser. It’s free, with no sign-up.
    </p>

    <div class="gallery"><ExampleGallery generator={generator.id} /></div>

    <h2>Frequently asked questions</h2>
    <div class="faqs">
      {#each copy.faqs as faq, i (i)}
        <details>
          <summary>{faq.q}</summary>
          <p>{faq.a}</p>
        </details>
      {/each}
    </div>

    <a class="back" href="/">← All economics figures</a>
  </div>
</dialog>

<style>
  /* A panel down the right side of the window, over the generator. */
  .drawer {
    position: fixed;
    inset: 0 0 0 auto;
    width: min(34rem, 100vw);
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-left: 1px solid var(--border);
    background: #fff;
    color: var(--ink);
    box-shadow: -18px 0 60px rgb(17 24 39 / 18%);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .drawer::backdrop { background: rgb(17 24 39 / 32%); }
  .drawer[open] { animation: slide-in 0.18s ease-out; }
  @keyframes slide-in { from { transform: translateX(2rem); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .drawer[open] { animation: none; } }

  .inner { padding: 1.1rem 1.5rem 2rem; }
  header {
    position: sticky;
    top: -1.1rem;
    z-index: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin: -1.1rem -1.5rem 0.75rem;
    padding: 1.1rem 1.5rem 0.6rem;
    background: #fff;
  }
  header h2 { margin: 0; }
  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--muted);
    background: transparent;
  }
  .close:hover, .close:focus-visible { border-color: var(--border); background: var(--blue-soft); color: var(--blue-dark); }
  .close :global(svg) { width: 18px; height: 18px; }

  h2 { font-size: 1.15rem; font-weight: 800; margin: 1.5rem 0 0.5rem; }
  h3 { font-size: 1rem; font-weight: 700; margin: 1.1rem 0 0.4rem; }
  p { margin: 0 0 0.75rem; color: #374151; }
  ul { margin: 0; padding-left: 1.25rem; color: #374151; }
  li + li { margin-top: 0.3rem; }

  /* The gallery sits in the drawer's column, two thumbnails across. */
  .gallery :global(.examples) { padding: 1.5rem 0 0; }
  .gallery :global(.examples h2) { font-size: 1.15rem; margin-bottom: 0.75rem; }
  .gallery :global(.examples ul) { grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .faqs { margin-top: 0.25rem; }
  details { border-top: 1px solid var(--border); }
  details:last-child { border-bottom: 1px solid var(--border); }
  summary {
    padding: 0.7rem 0;
    font-weight: 600;
    cursor: pointer;
  }
  summary:hover { color: var(--blue-dark); }
  details p { margin: 0 0 0.85rem; }

  .back { display: inline-block; margin-top: 1.5rem; color: var(--blue-dark); text-decoration: none; font-weight: 600; font-size: 0.95rem; }
  .back:hover { text-decoration: underline; }
</style>
