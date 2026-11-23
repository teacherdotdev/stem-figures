import { describe, expect, it } from 'vitest'
import { crosses, textWidth, type Box, type Segment } from '$shared/graph/labels'
import { readAxes } from '$shared/graph/axes'
import { answerLines, buildDiagram, checkDiagram, describe as describeFigure, fittedAxes, lettersOf, sig3, toLine, valuesOf } from './figure'
import { SUBSTANCES } from './phase'
import { phaseSettings } from './settings'

const settingsOf = (query: string) => phaseSettings.fromParams(new URLSearchParams(query))
const build = (query: string) => buildDiagram(settingsOf(query))
type Layout = ReturnType<typeof build>

const overlap = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const shrink = (b: Box, by: number): Box => ({ x0: b.x0 + by, y0: b.y0 + by, x1: b.x1 - by, y1: b.y1 - by })
const segmentsOf = (run: { x: number; y: number }[]): Segment[] => run.slice(1).map((q, k) => ({ x1: run[k].x, y1: run[k].y, x2: q.x, y2: q.y }))

/** Every way a label is in the way: on a boundary or a dot, on another label, off the grid, or a value at the axis on another. */
function clashes(g: Layout): string[] {
  const out: string[] = []
  const area = { x0: g.grid.x, y0: g.grid.y, x1: g.grid.x + g.grid.w, y1: g.grid.y + g.grid.h }
  const boundaries = Object.entries(g.lines).flatMap(([name, runs]) => runs.flatMap(segmentsOf).map((sg) => [name, sg] as const))
  const name = (l: Layout['words'][number]) => l.rows.join(' ') || 'blank'
  g.words.forEach((l, i) => {
    const b = shrink(l.box, 1)
    if (b.x0 < area.x0 || b.x1 > area.x1 || b.y0 < area.y0 || b.y1 > area.y1) out.push(`${name(l)} is off the grid`)
    for (const [what, sg] of boundaries) if (crosses(sg, b)) out.push(`${name(l)} crosses the ${what}`)
    for (const p of g.dots) if (overlap(b, { x0: p.x - p.r, y0: p.y - p.r, x1: p.x + p.r, y1: p.y + p.r })) out.push(`${name(l)} covers a dot`)
    g.words.slice(i + 1).forEach((m) => overlap(b, shrink(m.box, 1)) && out.push(`${name(l)} overlaps ${name(m)}`))
  })
  // A boundary's name along it: inside the grid, and clear of the other boundaries.
  for (const a of g.along) {
    const label = a.rows.join(' ') || 'blank'
    if (a.corners.some((p) => p.x < area.x0 - 1 || p.x > area.x1 + 1 || p.y < area.y0 - 1 || p.y > area.y1 + 1)) out.push(`${label} is off the grid`)
    for (const [what, runs] of Object.entries(g.lines))
      for (const run of runs) {
        const mid = { x: a.x, y: a.y }
        if (toLine(mid, run) < 3) out.push(`${label} sits on the ${what}`)
      }
    // Its box, turned to run with the boundary, on no other label.
    const [c0, c1, , c3] = a.corners
    for (let i = 0; i <= 10; i++)
      for (let j = 0; j <= 4; j++) {
        const p = { x: c0.x + ((c1.x - c0.x) * i) / 10 + ((c3.x - c0.x) * j) / 4, y: c0.y + ((c1.y - c0.y) * i) / 10 + ((c3.y - c0.y) * j) / 4 }
        for (const l of g.words) {
          const b = shrink(l.box, 1)
          if (p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1) out.push(`${label} runs into ${name(l)}`)
        }
      }
  }
  // The values under the temperature axis on one row don't run into each other.
  const under = g.marks.filter((m) => m.anchor === 'middle')
  under.forEach((m, i) => {
    const w = (x: typeof m) => (x.blank ? x.blank.x2 - x.blank.x1 : textWidth(x.text, g.mfs))
    for (const n of under.slice(i + 1))
      if (Math.abs(m.y - n.y) < 1 && Math.abs(m.x - n.x) < (w(m) + w(n)) / 2) out.push(`${m.text || 'blank'} runs into ${n.text || 'blank'} under the axis`)
  })
  // And those up the pressure axis stay apart.
  const side = g.marks.filter((m) => m.anchor === 'end').sort((a, b) => a.y - b.y)
  side.slice(1).forEach((m, i) => m.y - side[i].y < g.mfs && out.push(`${side[i].text} and ${m.text} run together at the pressure axis`))
  return [...new Set(out)]
}

describe('a phase diagram', () => {
  it('draws water by default: three boundaries, the triple and critical points, regions and points named', () => {
    const g = build('')
    expect(g.lines.fusion).toHaveLength(1)
    expect(g.lines.vaporization).toHaveLength(1)
    expect(g.lines.sublimation).toHaveLength(1)
    expect(g.dots).toHaveLength(2)
    expect(g.words.map((l) => l.rows.join(' '))).toEqual(expect.arrayContaining(['Solid', 'Liquid', 'Gas', 'Triple point', 'Critical point']))
    expect(g.marks.map((m) => m.text)).toEqual(expect.arrayContaining(['0.00604 atm', '218 atm', '0.01 °C', '373.9 °C']))
    expect(g.vLines).toEqual([])
    expect(Object.values(g.problems).filter(Boolean)).toEqual([])
  })

  it('leans water’s fusion line left, up the page, and every other substance’s right', () => {
    for (const x of SUBSTANCES) {
      const [run] = build(`substance=${x.id}`).lines.fusion
      const [bottom, top] = [run[0], run.at(-1)!]
      expect(top.y).toBeLessThan(bottom.y)
      if (x.id === 'water') expect(top.x).toBeLessThan(bottom.x)
      else expect(top.x).toBeGreaterThan(bottom.x)
    }
  })

  it('ends the vaporization curve at the critical point’s dot', () => {
    for (const x of SUBSTANCES) {
      const g = build(`substance=${x.id}`)
      const end = g.lines.vaporization[0].at(-1)!
      expect(g.dots.some((d) => Math.hypot(d.x - end.x, d.y - end.y) < 0.6)).toBe(true)
    }
  })

  it('crosses carbon dioxide’s 1 atm line with the sublimation curve only, at −78.5 °C', () => {
    const g = build('substance=co2&isobar=1')
    expect(g.dots).toHaveLength(3)
    expect(g.marks.map((m) => m.text)).toEqual(expect.arrayContaining(['1 atm', '5.11 atm', '72.8 atm', '−78.5 °C', '−56.6 °C', '31.0 °C']))
    expect(answerLines(settingsOf('substance=co2'))).toContain(
      'At 1 atm: sublimes at −78.5 °C. Its triple point is above 1 atm, so the solid turns straight to gas',
    )
  })

  it('writes the values in the units chosen, with the axis titles to match', () => {
    const g = build('substance=nitrogen&tUnit=K&pUnit=kPa&isobar=1')
    expect(g.marks.map((m) => m.text)).toEqual(expect.arrayContaining(['12.5 kPa', '3,400 kPa', '101.3 kPa', '63.2 K', '126.2 K', '77.4 K']))
    expect(g.gridSettings.xTitle).toBe('Temperature (K)')
    expect(g.gridSettings.yTitle).toBe('Pressure (kPa)')
    expect(build('xTitle=Heat').gridSettings.xTitle).toBe('Heat')
    // Water’s triple point and melting point told apart, in both units.
    expect(build('isobar=1').marks.map((m) => m.text)).toEqual(expect.arrayContaining(['0.01 °C', '0.00 °C', '100.0 °C']))
    expect(build('isobar=1&tUnit=K').marks.map((m) => m.text)).toEqual(expect.arrayContaining(['273.16 K', '273.15 K', '373.1 K']))
  })

  it('writes pressures to 3 significant figures, keeping a final zero', () => {
    expect([0.0060366, 47.994, 217.75, 3395.8, 22064, 5.112].map(sig3)).toEqual(['0.00604', '48.0', '218', '3,400', '22,100', '5.11'])
  })

  it('leaves off a melting point no source gives apart from the triple point', () => {
    const g = build('substance=argon&isobar=1')
    expect(g.dots).toHaveLength(4)
    expect(g.marks.map((m) => m.text)).toEqual(['0.680 atm', '48.0 atm', '1 atm', '−189.3 °C', '−185.8 °C', '−122.5 °C'].sort((a, b) => g.marks.findIndex((m) => m.text === a) - g.marks.findIndex((m) => m.text === b)))
  })

  const LABELINGS = [
    '',
    'isobar=1',
    'isobar=1&normalPoints=names&curves=names',
    'regions=letters&points=letters&curves=letters&isobar=1&normalPoints=letters',
    'regions=blank&points=blank&curves=blank&axisValues=blank&isobar=1&normalPoints=blank',
    'supercritical=1&isobar=1&curves=names',
    'supercritical=1&regions=letters&points=letters&curves=letters',
    'regions=none&points=none&guides=0&axisValues=none',
    'labelSize=large&isobar=1&curves=names',
  ]

  it('keeps every label off the boundaries, the dots and each other, and on the grid, for every substance and labeling', () => {
    const found: string[] = []
    for (const id of [...SUBSTANCES.map((x) => x.id), 'custom'])
      for (const units of ['', '&tUnit=K&pUnit=kPa'])
        for (const labeling of LABELINGS) {
          const query = `substance=${id}${units}&${labeling}`
          const g = build(query)
          for (const c of clashes(g)) found.push(`${query}: ${c}`)
          // Large labels can crowd a boundary’s name off; the page says so. At medium everything fits.
          if (g.problems.room && !labeling.includes('labelSize=large')) found.push(`${query}: ${g.problems.room}`)
        }
    expect(found).toEqual([])
  }, 30_000)

  it('leaves off a boundary’s name with no room, and says so', () => {
    const g = build('substance=nitrogen&labelSize=large&isobar=1&curves=names')
    expect(g.along.map((a) => a.rows.join(' '))).not.toContain('Sublimation / deposition')
    expect(g.problems.room).toBe('There’s no room on the graph for Sublimation / deposition. Try a smaller label size.')
  })

  it('keeps every label clear on a grid too', () => {
    const found: string[] = []
    for (const labeling of LABELINGS) {
      const query = `substance=custom&axes=numbered&${labeling}`
      for (const c of clashes(build(query))) found.push(`${query}: ${c}`)
      // On axes fitted to the diagram, everything has room.
      const s = settingsOf(query)
      const fitted = buildDiagram({ ...s, ...fittedAxes(s) })
      for (const c of clashes(fitted)) found.push(`${query}, fitted: ${c}`)
      if (fitted.problems.room && !labeling.includes('labelSize=large')) found.push(`${query}, fitted: ${fitted.problems.room}`)
    }
    expect(found).toEqual([])
  })
})

describe('the letters', () => {
  it('run A, B, C… with no gaps across the regions, boundaries, points and 1 atm crossings, in that order', () => {
    const s = settingsOf('regions=letters&points=letters&curves=letters&isobar=1&normalPoints=letters')
    const letters = lettersOf(s)
    expect(letters.map((l) => l.key)).toEqual(['solid', 'liquid', 'gas', 'fusion', 'vaporization', 'sublimation', 'triple', 'critical', 'at-fusion', 'at-vaporization'])
    expect(letters.map((l) => l.letter).join('')).toBe('ABCDEFGHIJ')
    // Only what is lettered takes a letter.
    expect(lettersOf(settingsOf('points=letters&isobar=1&normalPoints=letters')).map((l) => l.letter + l.key).join(' ')).toBe('Atriple Bcritical Cat-fusion Dat-vaporization')
    expect(lettersOf(settingsOf('substance=co2&isobar=1&normalPoints=letters')).map((l) => l.key)).toEqual(['at-sublimation'])
  })

  it('shuffles the same letters the same way for a seed', () => {
    const q = 'regions=letters&points=letters&curves=letters&isobar=1&normalPoints=letters'
    const a = lettersOf(settingsOf(`${q}&shuffle=12345`))
    expect(a.map((l) => l.letter).sort().join('')).toBe('ABCDEFGHIJ')
    expect(a.map((l) => l.letter).join('')).not.toBe('ABCDEFGHIJ')
    expect(lettersOf(settingsOf(`${q}&shuffle=12345`))).toEqual(a)
  })

  it('draws every letter on the figure and lists it in the answer key', () => {
    const q = 'regions=letters&points=letters&curves=letters&isobar=1&normalPoints=letters'
    const g = build(q)
    const shown = [...g.words.flatMap((l) => l.rows), ...g.marks.map((m) => m.text)].filter((t) => /^[A-Z]$/.test(t))
    expect(shown.sort().join('')).toBe('ABCDEFGHIJ')
    expect(answerLines(settingsOf(q)).at(-2)).toBe(
      'A: solid; B: liquid; C: gas; D: melting / freezing (the fusion line); E: boiling / condensing (the vaporization curve); F: sublimation / deposition (the sublimation curve); G: the triple point; H: the critical point; I: the normal melting point; J: the normal boiling point',
    )
  })
})

describe('your own substance', () => {
  const own = (query: string) => checkDiagram(settingsOf(`substance=custom&${query}`))

  it('draws the defaults with no problems, on a grid with axes that fit', () => {
    expect(own('')).toEqual({})
    const s = settingsOf('substance=custom&axes=numbered')
    const g = buildDiagram({ ...s, ...fittedAxes(s) })
    expect(g.problems.fit).toBeUndefined()
    expect(g.vLines.length).toBeGreaterThan(0)
    const axes = readAxes({ ...s, ...fittedAxes(s) })
    expect(axes.x.start).toBeLessThanOrEqual(s.tripleT)
    expect(axes.x.start + axes.x.blocks * axes.x.step).toBeGreaterThanOrEqual(s.critT)
    expect(axes.y.start + axes.y.blocks * axes.y.step).toBeGreaterThanOrEqual(s.critP)
  })

  it('passes the vaporization curve through the typed boiling point on a grid', () => {
    const g = build('substance=custom&axes=numbered&isobar=1')
    const [fusion, vap] = g.dots.slice(2)
    const s = settingsOf('substance=custom&axes=numbered')
    const axes = readAxes(s)
    const xAt = (t: number) => g.grid.x + ((t - axes.x.start) / (axes.x.blocks * axes.x.step)) * g.grid.w
    expect(fusion.x).toBeCloseTo(xAt(22), 0)
    expect(vap.x).toBeCloseTo(xAt(75), 0)
  })

  it('leans its fusion line left with the melting point below the triple point', () => {
    const [run] = build('substance=custom&nmp=18').lines.fusion
    expect(run.at(-1)!.x).toBeLessThan(run[0].x)
    const [right] = build('substance=custom&nmp=22').lines.fusion
    expect(right.at(-1)!.x).toBeGreaterThan(right[0].x)
  })

  it('says by each field what doesn’t make a diagram', () => {
    expect(own('tripleP=0').tripleP).toBe('The triple point’s pressure has to be above 0.')
    expect(own('tripleP=1.5').tripleP).toMatch(/^Your own substance has to be a liquid somewhere along the 1 atm line/)
    expect(own('critT=10').critT).toBe('The critical point is hotter than the triple point, so make this higher than 20 °C.')
    expect(own('critP=0.3').critP).toBe('The critical point is at a higher pressure than the triple point, so make this more than 0.4 atm.')
    expect(own('critP=0.9').critP).toMatch(/^The vaporization curve has to cross the 1 atm line/)
    expect(own('nbp=40').nbp).toMatch(/^The vaporization curve bends upward, as vapor pressure does.*higher than 47\.69 °C\.$/)
    expect(own('nbp=139').nbp).toMatch(/^A boiling point this close to the critical point would make the curve an elbow/)
    expect(own('nmp=60').nmp).toMatch(/^The fusion line would cross the vaporization curve/)
    expect(own('tUnit=K&tripleT=0').tripleT).toBe('A temperature in kelvin is above 0.')
    expect(own('axes=numbered&nmp=10').nmp).toMatch(/^The fusion line leaves the side of the grid before it reaches the top/)
    expect(build('substance=custom&axes=numbered&critT=200').problems.fit).toMatch(/doesn’t all fit on these axes/)
  })

  it('draws nothing it can’t, and gives no answer key, when a value doesn’t make a diagram', () => {
    const g = build('substance=custom&critT=10')
    expect(g.curves).toEqual([])
    expect(answerLines(settingsOf('substance=custom&critT=10'))).toEqual([])
  })
})

describe('the answer key and description', () => {
  it('lists water’s points, what happens at 1 atm and which way the fusion line leans', () => {
    expect(answerLines(settingsOf(''))).toEqual([
      'Triple point: 0.01 °C, 0.00604 atm',
      'Critical point: 373.9 °C, 218 atm',
      'At 1 atm: melts at 0.00 °C, boils at 100.0 °C',
      'The fusion line leans left: more pressure lowers the melting point, so the solid is less dense than the liquid',
      'Not drawn to scale',
    ])
  })

  it('says a melting point not known apart from the triple point is within 0.1° of it', () => {
    expect(answerLines(settingsOf('substance=nitrogen'))[2]).toBe('At 1 atm: melts within 0.1 °C of its triple point’s temperature, boils at −195.8 °C')
  })

  it('describes the figure without giving away what is blank or lettered', () => {
    expect(describeFigure(settingsOf(''))).toBe(
      'Phase diagram of water: pressure against temperature, the solid, liquid, gas regions named, the triple point at 0.01 °C and 0.00604 atm and the critical point at 373.9 °C and 218 atm, not drawn to scale',
    )
    const blank = describeFigure(settingsOf('regions=letters&points=blank&axisValues=blank'))
    expect(blank).not.toMatch(/°C|atm/)
  })

  it('says no diagram is drawn when the values typed don’t make one', () => {
    const text = describeFigure(settingsOf('substance=custom&tripleT=0&tripleP=0&critT=0&critP=0&nmp=0&nbp=0'))
    expect(text).toBe('Phase diagram of Substance X: empty axes, pressure against temperature, with no diagram drawn (the values typed don’t make one)')
  })
})

describe('the 1 atm crossings and the points, not to scale', () => {
  const dropsTo = (g: Layout, x: number) => g.dashed.some((l) => Math.abs(l.x1 - x) < 0.5 && Math.abs(l.x2 - x) < 0.5 && l.y1 !== l.y2)
  const crossingDots = (g: Layout) => g.dots.filter((p) => Math.abs(p.y - g.dots[2]?.y) < 0.5)

  it('leaves off the line down from a crossing with no value to write at its foot', () => {
    const g = build('substance=nitrogen&isobar=1')
    const [melts, boils] = crossingDots(g)
    expect(dropsTo(g, melts.x)).toBe(false)
    expect(dropsTo(g, boils.x)).toBe(true)
    // Named, lettered or blank, the melting point has its line down.
    for (const mode of ['names', 'letters', 'blank']) {
      const h = build(`substance=nitrogen&isobar=1&normalPoints=${mode}`)
      expect(dropsTo(h, crossingDots(h)[0].x)).toBe(true)
    }
    // Water's melting point has a value, so its line down stays.
    const w = build('isobar=1')
    expect(dropsTo(w, crossingDots(w)[0].x)).toBe(true)
  })

  it('puts each point’s name or blank line next to its own dot, before the regions take the places there', () => {
    for (const query of ['', 'regions=blank&points=blank&axisValues=blank&isobar=1&normalPoints=blank', 'substance=co2&regions=blank&points=blank']) {
      const g = build(query)
      const [triple] = g.dots
      // The first place beside the triple point: below right of it.
      const label = g.words.find((l) => l.box.x0 > triple.x && l.box.x0 < triple.x + 20 && l.box.y0 > triple.y - 2 && l.box.y0 < triple.y + 25)
      expect(label, query).toBeTruthy()
    }
  })

  it('joins each point’s blank line to its dot, so it isn’t taken for a region’s', () => {
    const g = build('regions=blank&points=blank&axisValues=blank&isobar=1&normalPoints=blank')
    const [triple, critical] = g.dots
    const leaders = g.words.filter((l) => l.leader).map((l) => l.leader!)
    expect(leaders).toHaveLength(2)
    for (const p of [triple, critical]) {
      const leader = leaders.find((l) => Math.hypot(l.x1 - p.x, l.y1 - p.y) < 10)
      expect(leader).toBeTruthy()
      // It ends at one end of a blank line.
      expect(g.words.some((w) => w.blank && [w.blank.x1, w.blank.x2].some((x) => Math.abs(x - leader!.x2) < 0.5) && Math.abs(w.blank.y1 - leader!.y2) < 0.5)).toBe(true)
    }
    // Named points need none, nor do the regions' blank lines.
    expect(build('').words.some((l) => l.leader)).toBe(false)
  })
})
