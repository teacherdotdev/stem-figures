<script lang="ts">
  // A micrometer with its thimble's edge at `reading` mm on the sleeve and
  // its spindle `gap` mm from the anvil (less than the reading by its zero
  // error), holding an object, drawn at `zoom` (1 for the whole micrometer;
  // more inside the magnifier, where lines and numbers stay a comfortable
  // size). The U-shaped frame, with its insulating pad, holds the anvil on
  // the left and the spindle through its hub on the right, with the lock
  // lever on top; the sleeve carries the datum line, whole mm above it and
  // half mm below; the thimble's 50 marks bunch toward its top and bottom
  // edges as they turn away, and the ratchet is at the end.
  import { sizeAt } from '$shared/magnify'
  import HeldObject from './HeldObject.svelte'
  import type { JawObject } from './instrument'
  import { AT, MICROMETER, PX, micrometerLayout, thimbleMarks } from './micrometer'

  interface Props {
    reading: number
    gap: number
    object?: JawObject
    objectLabel?: string
    printed?: boolean
    zoom?: number
  }
  let { reading, gap, object = 'none', objectLabel = '', printed = true, zoom = 1 }: Props = $props()

  const at = $derived(micrometerLayout(reading, gap, object, !!objectLabel))
  const k = $derived(sizeAt(zoom))
  const INK = '#111'
  const STEEL = '#e2e5e9'
  const FACE = '#f4f5f7'
  const PAD = '#4b5058'
  const X = (mm: number) => at.x(mm)
  const Y = (mm: number) => at.y(mm)
  const mm = (n: number) => n * PX

  /** A path written in mm: x then y in pairs, an H's number an x and a V's a y. */
  function path(d: [string, ...number[]][]) {
    const isY = (cmd: string, i: number) => (cmd === 'V' ? true : cmd === 'H' ? false : i % 2 === 1)
    return d.map(([cmd, ...n]) => `${cmd} ${n.map((v, i) => (isY(cmd, i) ? Y(v) : X(v))).join(' ')}`).join(' ')
  }
  const { armOuter: ao, armInner: ai, hubInner: hi, hubOuter: ho, frameTop: ft, throat: th, bottom: bo } = AT
  const frame = $derived(
    path([
      ['M', ao, ft + 2], ['Q', ao, ft, ao + 2, ft], ['H', ai], ['V', 14], ['Q', ai, th, ai + 10, th], ['H', hi - 10], ['Q', hi, th, hi, 14],
      ['V', ft], ['H', ho - 2], ['Q', ho, ft, ho, ft + 2], ['V', 12], ['Q', ho, bo, 12, bo], ['H', 6], ['Q', ao, bo, ao, 18], ['Z'],
    ]),
  )
  const pad = $derived(
    path([['M', ao + 3.4, 20], ['Q', ao + 3.4, bo - 3, 6, bo - 3], ['H', 12], ['Q', ho - 3.4, bo - 3, ho - 3.4, 14], ['L', hi + 3, 14], ['Q', hi + 3, th + 4, hi - 10, th + 4], ['H', ai + 10], ['Q', ai - 3, th + 4, ai - 3, 20], ['Z']]),
  )

  const edge = $derived(AT.sleeveZero + reading)
  const face = $derived(gap)
  const sleeveMarks = $derived(Array.from({ length: MICROMETER.range * 2 + 1 }, (_, i) => i / 2))
  const marks = $derived(thimbleMarks(reading))
  const font = $derived(12 * k)
  const thimbleFont = $derived(12.5 * k)
  /** how far clear of the thimble's edge a mark it has uncovered is drawn, in mm */
  const SHOWING = 0.3
  const knurl = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) }, (_, i) => from + (i + 0.5) * step)
</script>

<g stroke-linejoin="round" stroke-linecap="round">
  <!-- the frame, with its insulating pad and what's printed on it -->
  <path d={frame} fill={STEEL} stroke={INK} stroke-width={1.8 * k} />
  <path d={pad} fill={PAD} stroke={INK} stroke-width={1.2 * k} />
  {#if printed}
    <text x={X(4)} y={Y(33.6)} text-anchor="middle" font-size={11 * k} font-weight="700" fill="#fff">0–25 mm</text>
    <text x={X(18)} y={Y(33.6)} text-anchor="middle" font-size={11 * k} font-weight="700" fill="#fff">0.01 mm</text>
  {/if}

  <!-- the lock lever on top of the hub -->
  <line x1={X(34)} y1={Y(-10.4)} x2={X(39)} y2={Y(AT.lever + 1.2)} stroke={INK} stroke-width={mm(2.4) + 1.6 * k} />
  <line x1={X(34)} y1={Y(-10.4)} x2={X(39)} y2={Y(AT.lever + 1.2)} stroke={STEEL} stroke-width={mm(2.4)} />
  <rect x={X(31.4)} y={Y(-11.6)} width={mm(5.2)} height={mm(2.8)} rx={mm(0.8)} fill={STEEL} stroke={INK} stroke-width={1.4 * k} />

  <!-- the anvil and spindle, and the object between them -->
  <rect x={X(ai - 0.5)} y={Y(-AT.anvilR)} width={mm(0.5 - ai)} height={mm(2 * AT.anvilR)} fill={FACE} stroke={INK} stroke-width={1.5 * k} />
  <rect x={X(face)} y={Y(-AT.spindleR)} width={X(hi + 0.5) - X(face)} height={mm(2 * AT.spindleR)} fill={FACE} stroke={INK} stroke-width={1.5 * k} />
  <line x1={X(face + 0.6)} x2={X(hi)} y1={Y(-1.6)} y2={Y(-1.6)} stroke="#fff" stroke-width={mm(0.9)} />
  {#if object !== 'none'}
    <HeldObject shape={at.object} {k} />
  {/if}

  <!-- the sleeve, its datum line, whole mm above and half mm below -->
  <rect x={X(ho)} y={Y(-AT.sleeveR)} width={X(edge + 1) - X(ho)} height={mm(2 * AT.sleeveR)} fill={FACE} stroke={INK} stroke-width={1.5 * k} />
  <line x1={X(ho + 0.4)} x2={X(edge)} y1={Y(0)} y2={Y(0)} stroke={INK} stroke-width={1.1 * k} />
  {#each sleeveMarks as m (m)}
    {@const showing = m <= reading + 1e-9}
    <!-- A mark the thimble has just uncovered is drawn a hair clear of its
         edge, so it plainly shows, as exam drawings show it. -->
    {@const x = showing ? Math.min(at.xOf(m), at.edge - mm(SHOWING)) : at.xOf(m)}
    {@const whole = Number.isInteger(m)}
    {#if showing}
      <line x1={x} x2={x} y1={Y(0)} y2={Y(whole ? -2.1 : 2.1)} stroke={INK} stroke-width={1 * k} />
      {#if whole && m % 5 === 0}
        <!-- over its mark, or just left of it where the thimble would cover half -->
        {@const near = x > at.edge - mm(1.2)}
        <text
          x={near ? Math.min(x + mm(0.35), at.edge - mm(0.15)) : x}
          y={Y(-2.1) - mm(0.5)}
          text-anchor={near ? 'end' : 'middle'}
          font-size={font}
          fill={INK}
        >{m}</text>
      {/if}
    {/if}
  {/each}

  <!-- the ratchet and the thimble's knurled grip -->
  <rect x={X(edge + AT.gripEnd - 0.5)} y={Y(-3.8)} width={mm(AT.ratchetStart - AT.gripEnd + 1)} height={mm(7.6)} fill={STEEL} stroke={INK} stroke-width={1.3 * k} />
  <rect x={X(edge + AT.ratchetStart)} y={Y(-AT.ratchetR)} width={mm(AT.ratchetEnd - AT.ratchetStart)} height={mm(2 * AT.ratchetR)} rx={mm(1.6)} fill={STEEL} stroke={INK} stroke-width={1.5 * k} />
  {#each knurl(AT.ratchetStart + 1, AT.ratchetEnd - 1.5, 0.9) as kx (kx)}
    <line x1={X(edge + kx)} x2={X(edge + kx)} y1={Y(-AT.ratchetR + 0.6)} y2={Y(AT.ratchetR - 0.6)} stroke={INK} stroke-width={0.6 * k} />
  {/each}
  <rect x={X(edge + AT.scaleEnd)} y={Y(-AT.gripR)} width={mm(AT.gripEnd - AT.scaleEnd)} height={mm(2 * AT.gripR)} rx={mm(0.8)} fill={STEEL} stroke={INK} stroke-width={1.6 * k} />
  {#each knurl(AT.scaleEnd + 0.8, AT.gripEnd - 0.8, 0.8) as kx (kx)}
    <line x1={X(edge + kx)} x2={X(edge + kx)} y1={Y(-AT.gripR + 0.5)} y2={Y(AT.gripR - 0.5)} stroke={INK} stroke-width={0.6 * k} />
  {/each}

  <!-- the thimble: its bevelled edge, and its marks round it, seen side on -->
  <rect x={at.edge} y={Y(-AT.thimbleR)} width={mm(AT.scaleEnd)} height={mm(2 * AT.thimbleR)} fill={FACE} stroke={INK} stroke-width={1.6 * k} />
  <rect x={at.edge} y={Y(-AT.thimbleR)} width={mm(0.9)} height={mm(2 * AT.thimbleR)} fill={STEEL} stroke={INK} stroke-width={1.2 * k} />
  <rect x={at.edge + mm(AT.scaleEnd - 4)} y={Y(-AT.thimbleR) + mm(0.5)} width={mm(1.2)} height={mm(2 * AT.thimbleR - 1)} fill="#fff" stroke="none" opacity="0.7" />
  {#each marks as m (m.j)}
    {@const y = Y(-AT.thimbleR * Math.sin(m.angle))}
    {@const long = m.j % 5 === 0}
    {@const squash = Math.cos(m.angle)}
    <line x1={at.edge} x2={at.edge + mm(long ? 4 : 2.5)} y1={y} y2={y} stroke={INK} stroke-width={(long ? 1.1 : 0.9) * k} />
    {#if long && squash > 0.4}
      <text
        transform="translate({at.edge + mm(4.6)} {y}) scale(1 {squash})"
        dy="0.35em"
        font-size={thimbleFont}
        fill={INK}
      >{m.j}</text>
    {/if}
  {/each}

  {#if object !== 'none' && objectLabel}
    <text x={at.labelAt.x} y={at.labelAt.y} text-anchor="middle" font-size={16} font-weight="700" fill={INK}>{objectLabel}</text>
  {/if}
</g>
