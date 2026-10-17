<script lang="ts">
  // The key as drawn, from (0, 0): its border, the "Key" heading, each kind
  // with its name, and the note line. Names and the note are drawn piece by
  // piece, so subscripts and superscripts sit below and above the line.
  import Discs from './Discs.svelte'
  import { KEY_PAD, type KeyLayout, type Span } from './key'

  let { key }: { key: KeyLayout } = $props()
</script>

<!-- one line, so no spaces creep in between the pieces -->
{#snippet pieces(spans: Span[])}{#each spans as span, i (i)}<tspan font-size={span.size} dy={span.dy || undefined}>{span.text}</tspan>{/each}{/snippet}

<rect x="0.75" y="0.75" width={key.width - 1.5} height={key.height - 1.5} fill="none" stroke="#222" stroke-width="1.5" />
<text x={KEY_PAD} y={key.headingY} dominant-baseline="central" font-size={key.headingSize} font-weight="700" fill="#111">Key</text>
{#each key.lines as line, i (i)}
  <Discs discs={line.discs} />
  <text x={line.nameX} y={line.nameY} dominant-baseline="central" font-size={key.fontSize} fill="#111">{@render pieces(line.spans)}</text>
{/each}
{#if key.note}
  <text x={key.note.x} y={key.note.y} dominant-baseline="central" font-size={key.noteSize} fill="#111">{@render pieces(key.note.spans)}</text>
{/if}
