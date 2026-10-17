<script lang="ts">
  // Electrons as drawn: a filled dot, a cross, an open circle or an open
  // square, each worked out by the figure (whose electron it is, Swap and the
  // teacher's edits; see figure.ts), or nothing when edited away. Open marks
  // are filled white, so a ring doesn't run through them.
  import type { DrawnMark } from './figure'
  import { MARK } from './shells'

  let { marks }: { marks: DrawnMark[] } = $props()

  const ARM = MARK * 0.95
</script>

{#each marks as m, i (i)}
  {#if m.kind === 'dot'}
    <circle cx={m.x} cy={m.y} r={MARK * 0.95} fill={m.color} />
  {:else if m.kind === 'cross'}
    <path
      d="M {m.x - ARM} {m.y - ARM} L {m.x + ARM} {m.y + ARM} M {m.x - ARM} {m.y + ARM} L {m.x + ARM} {m.y - ARM}"
      stroke={m.color}
      stroke-width="1.8"
      stroke-linecap="round"
      fill="none"
    />
  {:else if m.kind === 'circle'}
    <circle cx={m.x} cy={m.y} r={MARK * 0.9} fill="#fff" stroke={m.color} stroke-width="1.5" />
  {:else if m.kind === 'square'}
    <rect x={m.x - MARK * 0.85} y={m.y - MARK * 0.85} width={MARK * 1.7} height={MARK * 1.7} fill="#fff" stroke={m.color} stroke-width="1.5" />
  {/if}
{/each}
