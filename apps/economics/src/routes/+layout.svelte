<script lang="ts">
  // Every page: the top bar, the page, then the footer (generators go without,
  // so the figure gets the whole window), plus the Help and request dialogs.
  import type { Snippet } from 'svelte'
  import '../app.css'
  import { page } from '$app/state'
  import { findGenerator } from '$lib/generators/index'
  import Footer from '$lib/site/Footer.svelte'
  import Help from '$lib/site/Help.svelte'
  import RequestDialog from '$shared/RequestDialog.svelte'
  import TopBar from '$lib/site/TopBar.svelte'

  let { children }: { children: Snippet } = $props()

  // Cloudflare Web Analytics beacon; the token is set in Vercel's production env only.
  const beacon = import.meta.env.CF_BEACON_TOKEN
  const onGenerator = $derived(!!findGenerator(page.url.pathname))
</script>

<svelte:head>
  {#if beacon}
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: beacon, spa: false })}></script>
  {/if}
</svelte:head>

<TopBar />
<main>{@render children()}</main>
{#if !onGenerator}<Footer />{/if}
<Help />
<RequestDialog />
