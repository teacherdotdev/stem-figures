<script lang="ts">
  // The Electrochemical Cells figure: two beakers, each a metal strip in a
  // solution of its own ion, joined by a salt bridge, with wires from the
  // strips to a digital voltmeter, a dial voltmeter or a coil of wire. A
  // voltmeter's + terminal is wired to the cathode, so it reads E°cell.
  import FigureFrame from '$lib/shared/FigureFrame.svelte'
  import { segmentTextWidth, sevenSegment } from '$lib/shared/sevenSegment'
  import { METAL_INFO, cellOf, solutionLabel, voltageText, type Side } from './cell'
  import { answerLines, cellVoltage, type CellSettings } from './settings'

  let { settings, svg = $bindable() }: { settings: CellSettings; svg?: SVGSVGElement } = $props()

  const W = 560
  const MID = W / 2
  const WIRE_Y = 60
  const BEAKER = { top: 170, bottom: 360, width: 160, liquid: 205 }
  const STRIP = { top: 110, bottom: 320, width: 22 }
  const BEAKERS: Record<Side, { x: number; strip: number; leg: number }> = {
    left: { x: 40, strip: 100, leg: 170 },
    right: { x: 360, strip: 460, leg: 390 },
  }
  const INK = '#111'
  const SIDES: Side[] = ['left', 'right']

  const cell = $derived(cellOf(settings.left, settings.right))
  const height = $derived(settings.electrodes ? 398 : 370)
  const signOf = (side: Side) => (side === cell.cathode ? '+' : '−')

  // What sits on the wire between the strips, and where the wire meets it.
  const meterBox = $derived(
    settings.meter === 'digital'
      ? { x: MID - 70, y: 24, w: 140, h: 72 }
      : settings.meter === 'dial'
        ? { x: MID - 75, y: 12, w: 150, h: 98 }
        : { x: MID - 40, y: WIRE_Y, w: 80, h: 0 },
  )

  // Digital display
  const DIGIT_H = 30
  const voltage = $derived(cellVoltage(settings))
  const reading = $derived(voltageText(voltage))
  const digits = $derived(sevenSegment(reading, MID - segmentTextWidth(reading, DIGIT_H) / 2 + 3, 38, DIGIT_H))

  // Dial: 0 to 4 V across 120° of arc
  const DIAL = { cx: MID, cy: 96, r: 62, max: 4 }
  const angleOf = (v: number) => ((150 - (v / DIAL.max) * 120) * Math.PI) / 180
  const on = (v: number, r: number) => ({ x: DIAL.cx + r * Math.cos(angleOf(v)), y: DIAL.cy - r * Math.sin(angleOf(v)) })
  const ticks = Array.from({ length: DIAL.max * 5 + 1 }, (_, i) => i / 5)
  const needle = $derived(on(Math.max(0, Math.min(voltage, DIAL.max)), DIAL.r - 4))
  const arc = (() => {
    const a = on(0, DIAL.r)
    const b = on(DIAL.max, DIAL.r)
    return `M ${a.x} ${a.y} A ${DIAL.r} ${DIAL.r} 0 0 1 ${b.x} ${b.y}`
  })()

  // Coil: a helix of wire seen from the side, starting and ending on the wire
  const coil = (() => {
    const loops = 5
    const r = 11
    const turns = loops + 0.5
    const pitch = (80 - 2 * r) / turns
    const x0 = MID - 40
    const steps = Math.round(turns * 48)
    return Array.from({ length: steps + 1 }, (_, i) => {
      const t = (i / steps) * turns * 2 * Math.PI
      const x = x0 + r - r * Math.cos(t) + (pitch * t) / (2 * Math.PI)
      const y = WIRE_Y - 1.4 * r * Math.sin(t)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  })()

  // Wires from each strip's top up to the meter
  const wire = (side: Side) => {
    const x = BEAKERS[side].strip
    const end = side === 'left' ? meterBox.x : meterBox.x + meterBox.w
    return `${x},${STRIP.top} ${x},${WIRE_Y} ${end},${WIRE_Y}`
  }

  // Electrons flow from the anode, through the wire, to the cathode.
  const flowRight = $derived(cell.anode === 'left')
  const arrows = $derived(
    SIDES.map((side) => {
      const [a, b] = side === 'left' ? [BEAKERS.left.strip + 25, meterBox.x - 15] : [meterBox.x + meterBox.w + 15, BEAKERS.right.strip - 25]
      return flowRight ? { from: a, to: b } : { from: b, to: a }
    }),
  )

  const BRIDGE = `M ${BEAKERS.left.leg} 290 V 165 Q ${BEAKERS.left.leg} 145 ${BEAKERS.left.leg + 20} 145 H ${BEAKERS.right.leg - 20} Q ${BEAKERS.right.leg} 145 ${BEAKERS.right.leg} 165 V 290`

  const METER_WORDS = { digital: 'a digital voltmeter', dial: 'a dial voltmeter', coil: 'a coil of wire' }
  const label = $derived(
    `An electrochemical cell: a ${METAL_INFO[settings.left].name} electrode in ${solutionLabel(settings.left)} and a ` +
      `${METAL_INFO[settings.right].name} electrode in ${solutionLabel(settings.right)}, joined by a salt bridge and wired to ` +
      `${METER_WORDS[settings.meter]}${settings.meter === 'coil' ? '' : ` reading ${reading} V`}`,
  )
</script>

<FigureFrame
  bind:svg
  width={W}
  {height}
  {label}
  title={settings.titleMode === 'text' ? settings.title : ''}
  answerKey={settings.answerKey ? answerLines(settings).join('\n') : ''}
>
  <!-- solutions -->
  {#each SIDES as side (side)}
    {@const b = BEAKERS[side]}
    <rect x={b.x} y={BEAKER.liquid} width={BEAKER.width} height={BEAKER.bottom - BEAKER.liquid} fill={METAL_INFO[settings[side]].solution} />
    <line x1={b.x} y1={BEAKER.liquid} x2={b.x + BEAKER.width} y2={BEAKER.liquid} stroke="#7aa7cf" stroke-width="1.5" />
  {/each}

  <!-- salt bridge -->
  <path d={BRIDGE} fill="none" stroke="#444" stroke-width="22" />
  <path d={BRIDGE} fill="none" stroke="#fbf8ef" stroke-width="17" />
  {#each [BEAKERS.left.leg, BEAKERS.right.leg] as x (x)}
    <line x1={x - 11} y1={290} x2={x + 11} y2={290} stroke="#444" stroke-width="2.5" />
  {/each}

  <!-- beakers -->
  {#each SIDES as side (side)}
    {@const b = BEAKERS[side]}
    <path
      d="M {b.x - 6} {BEAKER.top} L {b.x} {BEAKER.top + 6} V {BEAKER.bottom} H {b.x + BEAKER.width} V {BEAKER.top + 6} L {b.x + BEAKER.width + 6} {BEAKER.top}"
      fill="none"
      stroke={INK}
      stroke-width="2.5"
      stroke-linejoin="round"
    />
  {/each}

  <!-- electrodes and wires -->
  {#each SIDES as side (side)}
    {@const b = BEAKERS[side]}
    <rect x={b.strip - STRIP.width / 2} y={STRIP.top} width={STRIP.width} height={STRIP.bottom - STRIP.top} fill={METAL_INFO[settings[side]].color} stroke={INK} stroke-width="1.5" />
    <polyline points={wire(side)} fill="none" stroke={INK} stroke-width="2.5" stroke-linejoin="round" />
    <circle cx={b.strip} cy={STRIP.top} r="3.5" fill={INK} />
  {/each}

  <!-- meter -->
  {#if settings.meter === 'coil'}
    <polyline points={coil} fill="none" stroke={INK} stroke-width="2.5" stroke-linejoin="round" />
  {:else}
    <rect x={meterBox.x} y={meterBox.y} width={meterBox.w} height={meterBox.h} rx="8" fill="#f3f4f6" stroke={INK} stroke-width="2" />
    {#if settings.meter === 'digital'}
      <rect x={MID - 46} y={32} width={92} height={42} rx="3" fill="#dfe8d6" stroke={INK} stroke-width="1.2" />
      {#each digits as points, i (i)}
        <polygon {points} fill="#1d2a1d" />
      {/each}
      <text x={MID} y={90} text-anchor="middle" font-size="13" font-weight="700" fill={INK}>V</text>
    {:else}
      <path d={arc} fill="none" stroke={INK} stroke-width="1.5" />
      {#each ticks as v (v)}
        {@const major = Number.isInteger(v)}
        {@const a = on(v, DIAL.r)}
        {@const b = on(v, DIAL.r - (major ? 10 : 5))}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={INK} stroke-width={major ? 1.6 : 1} />
        {#if major}
          {@const n = on(v, DIAL.r - 21)}
          <text x={n.x} y={n.y + 5} text-anchor="middle" font-size="13" fill={INK}>{v}</text>
        {/if}
      {/each}
      <text x={meterBox.x + 14} y={meterBox.y + 22} text-anchor="middle" font-size="14" font-weight="700" fill={INK}>V</text>
      <line x1={DIAL.cx} y1={DIAL.cy} x2={needle.x} y2={needle.y} stroke="#c62828" stroke-width="2" stroke-linecap="round" />
      <circle cx={DIAL.cx} cy={DIAL.cy} r="4" fill={INK} />
    {/if}
    {#each SIDES as side (side)}
      {@const x = side === 'left' ? meterBox.x : meterBox.x + meterBox.w}
      <circle cx={x} cy={WIRE_Y} r="5" fill="#fff" stroke={INK} stroke-width="2" />
      <text
        x={side === 'left' ? meterBox.x + 12 : meterBox.x + meterBox.w - 12}
        y={meterBox.y + meterBox.h - 8}
        text-anchor="middle"
        font-size="17"
        font-weight="700"
        fill={side === cell.cathode ? '#c62828' : INK}>{signOf(side)}</text
      >
    {/each}
  {/if}

  <!-- electron flow -->
  {#if settings.electronFlow}
    {#each arrows as { from, to }, i (i)}
      {@const dir = Math.sign(to - from)}
      <line x1={from} y1={42} x2={to - dir * 8} y2={42} stroke="#1f5fbf" stroke-width="2" />
      <polygon points="{to},42 {to - dir * 10},37 {to - dir * 10},47" fill="#1f5fbf" />
      <text x={(from + to) / 2} y={33} text-anchor="middle" font-size="15" fill="#1f5fbf">e⁻</text>
    {/each}
  {/if}

  <!-- labels -->
  {#if settings.labels}
    {#each SIDES as side (side)}
      {@const b = BEAKERS[side]}
      <text
        x={side === 'left' ? b.strip - STRIP.width / 2 - 8 : b.strip + STRIP.width / 2 + 8}
        y={150}
        text-anchor={side === 'left' ? 'end' : 'start'}
        font-size="18"
        font-weight="700"
        fill={INK}>{settings[side]}</text
      >
      <text x={b.x + BEAKER.width / 2} y={346} text-anchor="middle" font-size="16" fill={INK}>{solutionLabel(settings[side])}</text>
    {/each}
    <text x={MID} y={182} text-anchor="middle" font-size="15" fill={INK}>Salt bridge</text>
  {/if}
  {#if settings.electrodes}
    {#each SIDES as side (side)}
      {@const b = BEAKERS[side]}
      <text x={b.x + BEAKER.width / 2} y={388} text-anchor="middle" font-size="17" font-weight="700" fill={INK}>
        {side === cell.anode ? 'Anode (−)' : 'Cathode (+)'}
      </text>
    {/each}
  {/if}
</FigureFrame>
