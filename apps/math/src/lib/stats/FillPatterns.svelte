<script lang="ts">
  // The SVG patterns behind the black-and-white fills a figure uses, inside
  // its <defs>. Each id is `${id}-${fill}`, as paint() in fills.ts writes it.
  import { isPattern, type Fill } from './fills'

  let { id, fills }: { id: string; fills: Fill[] } = $props()

  const used = $derived([...new Set(fills.filter(isPattern))])
  const LINE = '#374151'
</script>

{#each used as f (f)}
  {#if f === 'hatch' || f === 'backhatch'}
    <pattern id="{id}-{f}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate({f === 'hatch' ? 45 : -45})">
      <rect width="8" height="8" fill="#fff" />
      <line x1="0" y1="0" x2="0" y2="8" stroke={LINE} stroke-width="1.8" />
    </pattern>
  {:else if f === 'cross'}
    <pattern id="{id}-{f}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="#fff" />
      <path d="M0 0V8M0 0H8" stroke={LINE} stroke-width="1.3" />
    </pattern>
  {:else}
    <pattern id="{id}-{f}" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#fff" />
      <circle cx="4" cy="4" r="1.6" fill={LINE} />
    </pattern>
  {/if}
{/each}
