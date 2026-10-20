<script lang="ts">
  // A caliper with its sliding scale's zero at `reading` mm and its jaws
  // `gap` mm apart (less than the reading by its zero error), holding an
  // object, drawn at `zoom` (1 for the whole caliper; more inside the
  // close-up, where lines and numbers stay a comfortable size). The fixed
  // head is on the left, its outside jaw hanging down and its inside jaw
  // pointing up; the slider carries the sliding scale, the other two jaws, a lock
  // screw on top and a thumb rest below; the depth rod comes out of the
  // beam's right end as far as the jaws are apart.
  import { sizeAt } from '$shared/magnify'
  import HeldObject from './HeldObject.svelte'
  import type { JawObject } from './instrument'
  import { PX, caliperLayout, mainScaleEnd, scaleSizes, slideMarks, type CaliperScale } from './caliper'

  interface Props {
    v: CaliperScale
    reading: number
    gap: number
    object?: JawObject
    objectLabel?: string
    printed?: boolean
    zoom?: number
  }
  let { v, reading, gap, object = 'none', objectLabel = '', printed = true, zoom = 1 }: Props = $props()

  const at = $derived(caliperLayout(v, reading, gap, object, !!objectLabel))
  const k = $derived(sizeAt(zoom))
  const Y = $derived(at.y)
  const INK = '#111'
  const STEEL = '#e2e5e9'
  const FACE = '#f4f5f7'
  const PLATE = '#eceef1'
  const mm = (n: number) => n * PX

  // Main scale: a mark every mm, longer every 5, numbered every 10 in cm as calipers print it.
  const z = $derived(scaleSizes(zoom))
  const mainMarks = $derived(
    Array.from({ length: mainScaleEnd(v) + 1 }, (_, n) => ({
      n,
      kind: n % 10 === 0 ? ('major' as const) : n % 5 === 0 ? ('medium' as const) : ('minor' as const),
    })),
  )

  // The sliding scale: its numbers each 0.1 mm, thinned to every 5th where they'd crowd.
  const vMarks = $derived(slideMarks(v, reading))
  const numberStep = $derived.by(() => {
    const gapSeen = v.numberEvery * v.spacing * PX * zoom
    const widest = 0.62 * z.slideFont * zoom + 6
    return [1, 5, 10].find((n) => n * gapSeen >= widest) ?? 10
  })
  const numberShown = (number: string) => Number(number) % numberStep === 0

  // Head and fixed jaws, then the slider's, in mm from the fixed jaw's face (`f`) or the slider's (`s`).
  const f = $derived(at.face / PX)
  const s = $derived(at.slider.left / PX)
  const sEnd = $derived(at.slider.right / PX)
  const down = $derived(Y.tip) // the whole caliper's shift down, for a big ball

  /** A path written in mm: x then y in pairs, a V's one number a y. */
  function path(d: [string, ...number[]][]) {
    const isY = (cmd: string, i: number) => (cmd === 'V' ? true : cmd === 'H' ? false : i % 2 === 1)
    return d.map(([cmd, ...n]) => `${cmd} ${n.map((v, i) => (isY(cmd, i) ? down + v * PX : v * PX)).join(' ')}`).join(' ')
  }
  // The inside jaws: narrow blades meeting along the jaw faces, their outer edges the measuring ones.
  const fixedInside = $derived(path([['M', f, 14.4], ['V', 1.4], ['L', f - 0.6, 0], ['L', f - 2, 0.4], ['L', f - 2.6, 4], ['Q', f - 3.6, 10, f - 7.5, 14.4], ['Z']]))
  /** the beam's left end, carrying the fixed outside jaw down to its tip */
  const head = $derived(
    path([['M', 2, 15.2], ['Q', 2, 14, 3.2, 14], ['H', f], ['V', 76.4], ['L', f - 0.9, 78], ['L', f - 2.4, 78], ['L', f - 9, 52], ['Q', f - 11.6, 43, 5, 40.2], ['Q', 2, 39, 2, 36], ['Z']]),
  )
  const slideInside = $derived(path([['M', s, 11.4], ['V', 1.4], ['L', s + 0.6, 0], ['L', s + 2, 0.4], ['L', s + 2.6, 4], ['Q', s + 3.6, 9, s + 7.5, 11.4], ['Z']]))
  const slideJaw = $derived(path([['M', s, 36], ['V', 76.4], ['L', s + 0.9, 78], ['L', s + 2.4, 78], ['L', s + 9, 52], ['Q', s + 11.4, 43.6, s + 18, 41.8], ['Q', s + 20, 41.2, s + 20.4, 38.6], ['L', s + 20.4, 36], ['Z']]))
  /** the slider's frame: around the beam, with a window for the main scale above the sliding scale plate */
  const sliderFrame = $derived(
    `${path([['M', s, 11], ['H', sEnd - 2], ['Q', sEnd, 11, sEnd, 13], ['V', 35], ['Q', sEnd, 37, sEnd - 2, 37], ['H', s], ['Z']])} ` +
      path([['M', s + 1.6, 15.5], ['V', 26], ['H', sEnd - 1.6], ['V', 15.5], ['Z']]),
  )
  const screwX = $derived(at.screw / PX)
</script>

<g stroke-linejoin="round" stroke-linecap="round">
  <!-- the object, behind the jaws and beam -->
  {#if object !== 'none'}
    <HeldObject shape={at.object} {k} />
  {/if}

  <!-- the depth rod, out of the beam's end -->
  <rect x={at.beamEnd - mm(4)} y={down + mm(21.6)} width={at.rodEnd - at.beamEnd + mm(4)} height={mm(1.8)} fill={STEEL} stroke={INK} stroke-width={1.2 * k} />

  <!-- the beam, with the main scale along its lower edge -->
  <rect x={mm(4)} y={Y.beamTop} width={at.beamEnd - mm(4)} height={Y.beamBottom - Y.beamTop} rx={mm(0.8)} fill={FACE} stroke={INK} stroke-width={1.6 * k} />
  <line x1={at.face} x2={at.beamEnd} y1={Y.edge} y2={Y.edge} stroke={INK} stroke-width={z.thin} />
  {#each mainMarks as m (m.n)}
    {@const x = at.xOf(m.n)}
    <line x1={x} x2={x} y1={Y.edge - z[m.kind]} y2={Y.edge} stroke={INK} stroke-width={m.kind === 'minor' ? z.thin : z.thick} />
    {#if m.kind === 'major'}
      <text x={x} y={Y.edge - z.major - z.gap} text-anchor="middle" font-size={z.mainFont} fill={INK}>{m.n / 10}</text>
    {/if}
  {/each}

  <!-- the head and its jaws -->
  <path d={fixedInside} fill={STEEL} stroke={INK} stroke-width={1.6 * k} />
  <path d={head} fill={STEEL} stroke={INK} stroke-width={1.8 * k} />

  <!-- the slider: its jaws, lock screw and thumb rest, then its frame with the sliding scale on its plate -->
  <path d={slideInside} fill={STEEL} stroke={INK} stroke-width={1.6 * k} />
  <path d={slideJaw} fill={STEEL} stroke={INK} stroke-width={1.8 * k} />
  <rect x={mm(screwX - 1.4)} y={down + mm(7.6)} width={mm(2.8)} height={mm(3.6)} fill={STEEL} stroke={INK} stroke-width={1.2 * k} />
  <rect x={mm(screwX - 4.2)} y={down + mm(2.4)} width={mm(8.4)} height={mm(5.4)} rx={mm(1)} fill={STEEL} stroke={INK} stroke-width={1.4 * k} />
  {#each [-2.8, -1.4, 0, 1.4, 2.8] as dx (dx)}
    <line x1={mm(screwX + dx)} x2={mm(screwX + dx)} y1={down + mm(3)} y2={down + mm(7.2)} stroke={INK} stroke-width={0.7 * k} />
  {/each}
  <rect x={mm(sEnd - 14)} y={down + mm(35)} width={mm(12)} height={mm(5.6)} rx={mm(1.6)} fill={STEEL} stroke={INK} stroke-width={1.4 * k} />
  {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
    <line x1={mm(sEnd - 12.4 + i * 1.25)} x2={mm(sEnd - 12.4 + i * 1.25)} y1={down + mm(37.4)} y2={down + mm(40)} stroke={INK} stroke-width={0.7 * k} />
  {/each}
  <path d={sliderFrame} fill={STEEL} fill-rule="evenodd" stroke={INK} stroke-width={1.8 * k} />
  <rect x={mm(s + 1.6)} y={Y.edge} width={mm(sEnd - s - 3.2)} height={Y.bottom - Y.edge - mm(1.6)} fill={PLATE} stroke="none" />
  <line x1={mm(s + 1.6)} x2={mm(sEnd - 1.6)} y1={Y.edge} y2={Y.edge} stroke={INK} stroke-width={z.thick} />
  {#each vMarks as m (m.i)}
    {@const x = at.xOf(m.at)}
    <line x1={x} x2={x} y1={Y.edge} y2={Y.edge + (m.number ? z.long : z.short)} stroke={INK} stroke-width={m.number ? z.thick : z.thin} />
    {#if m.number && numberShown(m.number)}
      <text x={x} y={Y.edge + z.long + z.gap + 0.72 * z.slideFont} text-anchor="middle" font-size={z.slideFont} fill={INK}>{m.number}</text>
    {/if}
  {/each}
  {#if printed}
    <text x={at.xOf(reading + v.length) + mm(3.4)} y={Y.edge + z.long + z.gap + 0.72 * z.slideFont} font-size={z.stampFont} font-weight="700" fill={INK}>{v.leastCount} mm</text>
  {/if}

  {#if object !== 'none' && objectLabel}
    <text x={at.labelAt.x} y={at.labelAt.y} text-anchor="middle" font-size={16} font-weight="700" fill={INK}>{objectLabel}</text>
  {/if}
</g>
