<script lang="ts">
  // A page's title, description and canonical address for search engines,
  // its social card (Open Graph and Twitter), and any structured data
  // (JSON-LD) describing it.
  import { SITE_NAME, SITE_URL } from './config'

  interface Props {
    /** left out on the directory, which is titled by the site name alone */
    title?: string
    description: string
    path: string
    /** the social card image: a site path like `/og/punnett-square.png`, or a full URL */
    image?: string
    /** what the image shows, for people who can't see it */
    imageAlt?: string
    /** one or more schema.org objects, each written in its own script tag */
    jsonLd?: object | object[]
  }
  let { title = '', description, path, image, imageAlt, jsonLd }: Props = $props()

  const fullTitle = $derived(title ? `${title} | ${SITE_NAME}` : SITE_NAME)
  const url = $derived(`${SITE_URL}${path}`)
  const imageUrl = $derived(image ? (/^https?:\/\//.test(image) ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`) : '')

  /** JSON that can't end its script tag early: `<`, `>` and `&` are written
   *  as Unicode escapes, which JSON reads as the same characters. */
  const scriptJson = (data: object) =>
    JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
  const scripts = $derived((jsonLd === undefined ? [] : Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map(scriptJson))
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:site_name" content={SITE_NAME} />
  {#if imageUrl}
    <meta property="og:image" content={imageUrl} />
    {#if imageAlt}<meta property="og:image:alt" content={imageAlt} />{/if}
  {/if}
  <meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  {#if imageUrl}
    <meta name="twitter:image" content={imageUrl} />
    {#if imageAlt}<meta name="twitter:image:alt" content={imageAlt} />{/if}
  {/if}
  {#each scripts as json, i (i)}
    {@html '<script type="application/ld+json">' + json + '</script>'}
  {/each}
</svelte:head>
