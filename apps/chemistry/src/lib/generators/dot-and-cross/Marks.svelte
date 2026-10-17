<script lang="ts">
  // Electrons as drawn: a filled dot, a cross, an open circle or an open
  // square, by whose electron each is (see marks.ts). Open marks are filled
  // white, so a ring doesn't run through them.
  import { INK, MARK_COLORS, markOf } from './marks'
  import { MARK, type Mark } from './shells'

  let { marks, swap = false, color = false }: { marks: Mark[]; swap?: boolean; color?: boolean } = $props()

  const ink = (m: Mark) => (color ? MARK_COLORS[markOf(m.owner, swap)] : INK)
  const ARM = MARK * 0.95
</script>

{#each marks as m, i (i)}
  {@const kind = markOf(m.owner, swap)}
  {#if kind === 'dot'}
    <circle cx={m.x} cy={m.y} r={MARK * 0.95} fill={ink(m)} />
  {:else if kind === 'cross'}
    <path
      d="M {m.x - ARM} {m.y - ARM} L {m.x + ARM} {m.y + ARM} M {m.x - ARM} {m.y + ARM} L {m.x + ARM} {m.y - ARM}"
      stroke={ink(m)}
      stroke-width="1.8"
      stroke-linecap="round"
      fill="none"
    />
  {:else if kind === 'circle'}
    <circle cx={m.x} cy={m.y} r={MARK * 0.9} fill="#fff" stroke={ink(m)} stroke-width="1.5" />
  {:else}
    <rect x={m.x - MARK * 0.85} y={m.y - MARK * 0.85} width={MARK * 1.7} height={MARK * 1.7} fill="#fff" stroke={ink(m)} stroke-width="1.5" />
  {/if}
{/each}
