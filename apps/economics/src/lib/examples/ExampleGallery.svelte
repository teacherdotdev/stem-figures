<script lang="ts">
  // A generator's example figures as a grid of thumbnails, each linking to
  // its example page. Shown under a generator and on each example page (with
  // that example left out). Not printed.
  import { examplesFor } from './examples'

  interface Props {
    /** the generator's id, e.g. "supply-demand" */
    generator: string
    /** an example's slug to leave out: the one whose page this is */
    exclude?: string
    heading?: string
  }
  let { generator, exclude, heading = 'Example figures' }: Props = $props()

  const examples = $derived(examplesFor(generator).filter((e) => e.slug !== exclude))
  const headingId = $derived(`examples-${generator}`)
</script>

{#if examples.length}
  <section class="examples no-print" aria-labelledby={headingId}>
    <h2 id={headingId}>{heading}</h2>
    <ul>
      {#each examples as e (e.slug)}
        <li>
          <a class="card" href={e.path}>
            <span class="pic">
              <img src={e.image} alt={e.alt} width={e.width || undefined} height={e.height || undefined} loading="lazy" decoding="async" />
            </span>
            <span class="caption">{e.title}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .examples { max-width: 72rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
  h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.9rem; }
  ul {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  a {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    color: var(--ink);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.08s;
  }
  a:hover { border-color: var(--blue-border); }
  a:hover .caption { color: var(--blue-dark); text-decoration: underline; text-underline-offset: 3px; }
  a:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
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
  .caption { padding: 0.65rem 0.85rem 0.8rem; font-size: 0.92rem; font-weight: 600; line-height: 1.3; }
  /* Phones: two across, so the grid still reads as a gallery. */
  @media (max-width: 520px) {
    ul { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .caption { padding: 0.5rem 0.6rem 0.65rem; font-size: 0.85rem; }
  }
  @media print { .examples { display: none; } }
</style>
