<script lang="ts">
  // One example figure: its picture at full size, what it shows, its answer
  // key, and links to edit it in its generator or download it. Built as a
  // static page, so search engines index the picture with its words.
  import { Download, Pencil } from '@lucide/svelte'
  import { findGenerator } from '$lib/generators/index'
  import ExampleGallery from '$lib/examples/ExampleGallery.svelte'
  import { IMAGE_LICENSE } from '$lib/examples/license'
  import Seo from '$lib/site/Seo.svelte'
  import { SITE_NAME, SITE_URL } from '$lib/site/config'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
  const example = $derived(data.example)
  const details = $derived(data.details)
  const generator = $derived(findGenerator(`/${example.generator}`)!)

  /** The caption's first sentence, for search results. */
  const description = $derived(`${example.caption.split(/(?<=\.)\s/)[0]} A free, printable example from ${SITE_NAME}’s ${generator.name} generator.`)
  const downloadName = $derived(`${example.slug}.png`)

  const jsonLd = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      contentUrl: `${SITE_URL}${example.image}`,
      url: `${SITE_URL}${example.path}`,
      name: example.title,
      caption: example.caption,
      description: example.alt,
      encodingFormat: 'image/png',
      ...(example.width ? { width: example.width, height: example.height } : {}),
      creator: { '@type': 'Organization', name: IMAGE_LICENSE.credit, url: SITE_URL },
      creditText: IMAGE_LICENSE.credit,
      copyrightNotice: IMAGE_LICENSE.copyright,
      license: IMAGE_LICENSE.url,
      acquireLicensePage: `${SITE_URL}${IMAGE_LICENSE.page}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: generator.name, item: `${SITE_URL}${generator.path}` },
        { '@type': 'ListItem', position: 3, name: example.title, item: `${SITE_URL}${example.path}` },
      ],
    },
  ])
</script>

<Seo title={example.title} {description} path={example.path} image={example.image} imageAlt={example.alt} {jsonLd} />

<div class="page">
  <nav class="crumbs no-print" aria-label="Breadcrumb">
    <a href="/">{SITE_NAME}</a>
    <span aria-hidden="true">›</span>
    <a href={generator.path}>{generator.name}</a>
    <span aria-hidden="true">›</span>
    <span aria-current="page">Example</span>
  </nav>

  <h1>{example.title}</h1>
  <p class="sub no-print">An example figure from the <a href={generator.path}>{generator.name}</a> generator.</p>

  <figure class="card figure">
    <div class="pic">
      <img
        src={example.image}
        alt={example.alt}
        width={example.width || undefined}
        height={example.height || undefined}
        loading="eager"
        fetchpriority="high"
      />
    </div>
    <figcaption>{example.caption}</figcaption>
  </figure>

  <div class="actions no-print">
    <a class="btn-primary" href={details.editPath}><Pencil size={16} aria-hidden="true" />Edit this figure</a>
    <a class="btn-ghost" href={example.image} download={downloadName}><Download size={16} aria-hidden="true" />Download PNG</a>
  </div>
  <p class="edit-note no-print">
    Editing opens it in {generator.name} with these settings, to change anything and copy or download your own.
  </p>

  {#if details.answer}
    <section class="card answer">
      <h2>{details.answer.heading}</h2>
      <ul>
        {#each details.answer.lines as line (line)}<li>{line}</li>{/each}
      </ul>
    </section>
  {/if}

  <p class="license no-print">
    Free to use in your tests, worksheets, slides or anything else, no credit needed. Public domain under
    <a href={IMAGE_LICENSE.url} rel="license">{IMAGE_LICENSE.name}</a>.
    <a href={IMAGE_LICENSE.page}>How to reuse our figures</a>
  </p>
</div>

<ExampleGallery generator={example.generator} exclude={example.slug} heading="More {generator.name} examples" />

<div class="back no-print">
  <a class="btn-ghost" href={generator.path}>Make your own in {generator.name} →</a>
</div>

<style>
  .page { max-width: 58rem; margin: 0 auto; padding: 1.5rem 1.25rem 0.5rem; }
  .crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 1rem; font-size: 0.92rem; color: var(--muted); }
  .crumbs a { color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .crumbs a:hover { text-decoration: underline; }
  h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.3rem; }
  .sub { margin: 0 0 1.25rem; color: var(--muted); }
  .sub a { color: var(--blue-dark); font-weight: 600; text-decoration: none; }
  .sub a:hover { text-decoration: underline; }

  .figure { margin: 0 0 1.25rem; overflow: hidden; }
  .pic { display: flex; justify-content: center; padding: 1.25rem; background: #fff; border-bottom: 1px solid var(--border); }
  .pic img { display: block; max-width: 100%; max-height: 72vh; width: auto; height: auto; }
  figcaption { padding: 1rem 1.25rem 1.15rem; color: #374151; }

  .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .actions a { padding: 0.5rem 0.95rem; border-radius: 10px; font-size: 0.92rem; }
  /* Phones: the two share a row, splitting it. */
  @media (max-width: 420px) {
    .actions { gap: 0.5rem; }
    .actions a { flex: 1 1 auto; padding: 0.5rem 0.6rem; }
  }
  .edit-note { margin: 0.6rem 0 1.25rem; color: var(--muted); font-size: 0.92rem; }

  .answer { padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
  .answer h2 { font-size: 1.05rem; font-weight: 800; margin-bottom: 0.4rem; }
  .answer ul { margin: 0; padding-left: 1.2rem; color: #374151; }
  .answer li + li { margin-top: 0.2rem; }

  .license { margin: 0 0 0.5rem; color: var(--muted); font-size: 0.9rem; }
  .license a { color: var(--blue-dark); font-weight: 600; }

  .back { max-width: 72rem; margin: 0 auto; padding: 0 1.25rem 1rem; }

  @media print {
    .page { padding: 0; }
    .figure { border: none; }
    .pic { padding: 0; border: none; }
  }
</style>
