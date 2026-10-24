// What an example page says about its figure beyond the caption: the
// generator address that draws it and its answer key, both worked out by the
// generator's own code (its settings and the reading of them it draws from),
// so they can't drift from the figure. Server-only, so example pages don't
// ship every generator's solving to the browser.
//
// It also checks each example: a setting the generator doesn't take as
// written (a misspelled choice, measures that make no triangle) fails the build.

import { settingsFor as solidSettings } from '$lib/generators/3d-shape/settings'
import { partName, radiusOf, readShape } from '$lib/generators/3d-shape/solve'
import * as barGraph from '$lib/generators/bar-graph/settings'
import * as boxPlot from '$lib/generators/box-plot/settings'
import { parseEquation, readEquations } from '$lib/generators/coordinate-grid/equations'
import * as grid from '$lib/generators/coordinate-grid/settings'
import * as histogram from '$lib/generators/histogram/settings'
import { family as kiteFamily } from '$lib/generators/kite/family'
import { lengthSettings, answerLine as lengthAnswer } from '$lib/generators/length-reading/settings'
import * as mapping from '$lib/generators/mapping-diagram/settings'
import type { Interval } from '$lib/generators/number-line/inequality'
import * as numberLine from '$lib/generators/number-line/settings'
import { family as parallelogramFamily } from '$lib/generators/parallelogram/family'
import { family as rectangleFamily } from '$lib/generators/rectangle/family'
import * as polygon from '$lib/generators/regular-polygon/settings'
import { family as trapezoidFamily } from '$lib/generators/trapezoid/family'
import * as triangle from '$lib/generators/triangle/settings'
import * as shapeParts from '$lib/shapes/parts'
import * as quadKinds from '$lib/shapes/quadrilateral/kinds'
import * as quad from '$lib/shapes/quadrilateral/settings'
import { fmt, niceText, numberingOf } from '$shared/graph/numbering'
import type { Example, ExampleGeneratorId, SettingsById } from './types'

export interface ExampleDetails {
  /** the generator page drawing this figure, e.g. "/triangle?A=30&AB=10" */
  editPath: string
  /** the answer key's heading and lines */
  answer: { heading: string; lines: string[] } | null
}

interface Definition<S> {
  tidy(stored: unknown): S
  toQuery(s: S): string
  fromParams(params: URLSearchParams): S
}

/** Most of Math's generators keep their settings as three functions rather
 *  than one definition; the address is also what tells two figures apart, as
 *  in each generator's page. */
interface SettingsFunctions<S> {
  cleanSettings(s: Record<string, any>): S
  settingsToQuery(s: S): string
  settingsFromParams(params: URLSearchParams): S
}
const definitionOf = <S>(m: SettingsFunctions<S>): Definition<S> => ({
  tidy: (stored) => m.cleanSettings(stored && typeof stored === 'object' ? (stored as Record<string, any>) : {}),
  toQuery: m.settingsToQuery,
  fromParams: m.settingsFromParams,
})

type Answer<S> = (s: S) => ExampleDetails['answer']

/** Typed math as it reads in print: "x>=-2" as x ≥ −2, "y=x^2-4" as y = x² − 4. */
const mathText = (typed: string) =>
  typed
    .replace(/<=/g, '≤').replace(/>=/g, '≥').replace(/!=/g, '≠').replace(/pi/g, 'π').replace(/_n/g, 'ₙ')
    .replace(/\^2/g, '²').replace(/\^3/g, '³')
    .replace(/,/g, ', ')
    .replace(/([^\s(,=<>≤≥≠])([+-])/g, '$1 $2 ')
    .replace(/([=<>≤≥≠])/g, ' $1 ')
    .replace(/-/g, '−')
    .replace(/\s+/g, ' ')
    .trim()

function gridAnswer(s: SettingsById['coordinate-grid']): ExampleDetails['answer'] {
  const axes = grid.readAxes(s)
  const box = { x0: axes.x.start, x1: axes.x.start + axes.x.blocks * axes.x.step, y0: axes.y.start, y1: axes.y.start + axes.y.blocks * axes.y.step }
  const drawn = readEquations(s.equations.map((r) => r.text), box, s.angle)
  const out = s.equations.flatMap((row, i) => {
    const read = parseEquation(row.text, s.angle)
    if (!read) return []
    if (drawn[i]?.problem) throw new Error(`The coordinate grid example can’t draw ${row.text}: ${drawn[i]!.problem}`)
    if (read.points) return [read.points.map((p) => `${p.name ?? ''}(${fmt(p.x)}, ${fmt(p.y)})`).join(', ')]
    const { line } = read
    if (line && Math.abs(line.b) > 1e-12) return [`${mathText(row.text)}: slope ${fmt(-line.a / line.b)}, y-intercept ${fmt(-line.c / line.b)}`]
    return [mathText(row.text)]
  })
  return out.length ? { heading: 'Answer key', lines: out } : null
}

/** A set of numbers in interval notation: [−2, ∞), (−3, 4], {2}. */
function intervalText(set: Interval[], numbering: Parameters<typeof niceText>[1]) {
  const end = (v: number) => (v === Infinity ? '∞' : v === -Infinity ? '−∞' : niceText(v, numbering))
  if (!set.length) return 'no solution'
  return set
    .map(({ lo, hi }) => (lo.v === hi.v ? `{${end(lo.v)}}` : `${lo.closed ? '[' : '('}${end(lo.v)}, ${end(hi.v)}${hi.closed ? ']' : ')'}`))
    .join(' ∪ ')
}

function numberLineAnswer(s: SettingsById['number-line']): ExampleDetails['answer'] {
  const line = numberLine.readLine(s)
  const out = s.equations.flatMap((row, i) => {
    const read = line.rows[i]
    if (!read) return []
    if (read.problem) throw new Error(`The number line example can’t draw ${row.text}: ${read.problem}`)
    const numbering = numberingOf(row.text)
    const value = (v: number) => niceText(v, numbering)
    if (read.sequence) return [`${mathText(row.text)} for n = ${row.first} to ${row.last}: ${read.points!.map((p) => value(p.v)).join(', ')}`]
    if (read.points) return [read.points.map((p) => (p.label ? `${p.label} = ${value(p.v)}` : value(p.v))).join(', ')]
    return [`${mathText(row.text)}: ${intervalText(read.set!, numbering)}`]
  })
  return out.length ? { heading: 'Answer key', lines: out } : null
}

/** A length as the shapes' labels write it: rounded to the figure's places, with its unit. */
const lengthIn = (s: { unit: string; round: number }) => (v: number) => `${shapeParts.roundTo(v, s.round)}${s.unit.trim() ? ` ${s.unit.trim()}` : ''}`
/** An area's unit, cm², or none. */
const squared = (s: { unit: string }) => (s.unit.trim() ? ` ${s.unit.trim()}²` : '')

function triangleAnswer(s: SettingsById['triangle']): ExampleDetails['answer'] {
  const read = triangle.readTriangle(s)
  const t = read.triangle
  if (!t) throw new Error(`The triangle example makes no triangle: ${read.problem ?? 'a measure can’t be read'}`)
  const name = (v: 'A' | 'B' | 'C') => s[`name${v}`].trim() || v
  const sideName = (side: 'AB' | 'BC' | 'CA') => `${name(side[0] as 'A')}${name(side[1] as 'A')}`
  const length = lengthIn(s)
  // The measures the teacher left for the generator to solve.
  const sides = t.sized ? triangle.SIDES.filter((k) => !s[k].trim()).map((k) => `${sideName(k)} = ${length(t.sides[k])}`) : []
  const angles = triangle.ANGLES.filter((v) => !s[v].trim()).map((v) => `∠${name(v)} = ${shapeParts.roundTo(t.angles[v], s.round)}°`)
  const out = [...sides, ...angles]
  // A height drawn is for area: its length, and the area.
  const area = 0.5 * t.sides.AB * t.sides.CA * Math.sin((t.angles.A * Math.PI) / 180)
  const heights = triangle.HEIGHTS.filter((h) => s[h])
  if (t.sized && heights.length) {
    for (const h of heights) {
      const v = h[1] as 'A' | 'B' | 'C'
      const onto = ({ A: 'BC', B: 'CA', C: 'AB' } as const)[v]
      out.push(`Height from ${name(v)} to ${sideName(onto)} = ${length((2 * area) / t.sides[onto])}`)
    }
    out.push(`Area = ${shapeParts.roundTo(area, s.round)}${squared(s)}`)
  }
  return { heading: 'Answer key', lines: out }
}

function polygonAnswer(s: SettingsById['regular-polygon']): ExampleDetails['answer'] {
  const read = polygon.readPolygon(s)
  const p = read.polygon
  if (!p) throw new Error(`The regular polygon example can’t be drawn: ${read.problem}`)
  const length = lengthIn(s)
  const perimeter = p.n * p.side
  return {
    heading: 'Answer key',
    lines: [
      `${polygon.polygonName(p.n)}: ${p.n} sides`,
      `Side ${length(p.side)}, apothem ${length(p.apothem)}, radius ${length(p.radius)}`,
      `Each interior angle ${shapeParts.roundTo(p.interior, s.round)}°, central angle ${shapeParts.roundTo(p.central, s.round)}°`,
      `Perimeter ${length(perimeter)}, area ${shapeParts.roundTo((perimeter * p.apothem) / 2, s.round)}${squared(s)}`,
    ],
  }
}

/** A quadrilateral's sides and angles as the generator writes them (as typed
 *  when given, rounded when worked out), any heights and diagonals drawn, and
 *  its perimeter and area. */
function quadrilateralAnswer(s: quad.Settings): ExampleDetails['answer'] {
  const read = quad.readQuadrilateral(s)
  if (!read.shape) throw new Error(`The ${s.kind} example makes no quadrilateral: ${read.problem ?? Object.values(read.problems)[0]}`)
  const { corners, angles, sides } = read.shape
  const kind = quadKinds.kindOf(s.kind)
  const n = quad.names(s)
  const unit = s.unit.trim()
  const round = (v: number) => shapeParts.roundTo(v, s.round)
  const length = (v: number) => `${round(v)}${unit ? ` ${unit}` : ''}`
  const typed = (m: quadKinds.Corner | quadKinds.Side) => {
    const source = kind.equal?.[m as quadKinds.Side] ?? m
    return kind.givens.includes(source) ? shapeParts.pretty(s[source].trim()) : ''
  }
  const side = (k: quadKinds.Side) => `${n[k[0] as quadKinds.Corner]}${n[k[1] as quadKinds.Corner]} = ${typed(k) ? `${typed(k)}${unit ? ` ${unit}` : ''}` : length(sides[k])}`
  const angle = (v: quadKinds.Corner) => `∠${n[v]} = ${typed(v) || round(angles[v])}°`
  const distance = (p: quadKinds.Point, q: quadKinds.Point) => Math.hypot(q[0] - p[0], q[1] - p[1])
  // From a corner straight to the line through A and B.
  const [A, B] = [corners.A, corners.B]
  const toAB = (p: quadKinds.Point) => Math.abs((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) / distance(A, B)
  const area = Math.abs(quadKinds.CORNERS.reduce((sum, v, i) => {
    const [p, q] = [corners[v], corners[quadKinds.CORNERS[(i + 1) % 4]]]
    return sum + p[0] * q[1] - q[0] * p[1]
  }, 0)) / 2
  const perimeter = quadKinds.SIDES.reduce((sum, k) => sum + sides[k], 0)
  const squared = unit === 'units' ? ' square units' : unit ? ` ${unit}²` : ''

  const out = [`Sides: ${quadKinds.SIDES.map(side).join(', ')}`, `Angles: ${quadKinds.CORNERS.map(angle).join(', ')}`]
  const heights = quad.HEIGHTS.filter((h) => s[h])
  const typedHeight = kind.givens.includes('h') ? `${shapeParts.pretty(s.h.trim())}${unit ? ` ${unit}` : ''}` : ''
  if (heights.length) out.push(`Height to ${n.A}${n.B}: ${typedHeight || length(toAB(corners[heights[0][1] as quadKinds.Corner]))}`)
  const diagonals = quad.DIAGONALS.filter((d) => s[d])
  if (diagonals.length) out.push(`Diagonals: ${diagonals.map((d) => `${n[d[1] as quadKinds.Corner]}${n[d[2] as quadKinds.Corner]} = ${length(distance(corners[d[1] as quadKinds.Corner], corners[d[2] as quadKinds.Corner]))}`).join(', ')}`)
  out.push(`Perimeter: ${length(perimeter)}`, `Area: ${round(area)}${squared}`)
  return { heading: 'Answer key', lines: out }
}

/** A 3D shape's volume and surface area from its solved measures, rounded as
 *  its labels are, with π left in when the multiple of π is a tidy number.
 *  None for a figure labeled only in letters (r and h), which has no numbers. */
function solidAnswer(s: SettingsById['prism']): ExampleDetails['answer'] {
  const read = readShape(s)
  const v = read.values
  if (!v) throw new Error(`The ${s.shape} example doesn’t make a shape: ${read.problem ?? Object.values(read.problems)[0]}`)
  const { form } = read
  const showsMeasure = (k: (typeof form.parts)[number]) => {
    const mode = s[`${k}Label`]
    return mode === 'measure' || (mode === 'auto' && read.given[k] !== null)
  }
  if (!form.parts.some(showsMeasure)) return null
  const unit = s.unit.trim()
  const rounded = (x: number) => String(Number(x.toFixed(s.round)))
  const length = (x: number) => `${rounded(x)}${unit ? ` ${unit}` : ''}`
  const power = (p: 2 | 3) => (unit === 'units' ? ` ${p === 2 ? 'square' : 'cubic'} units` : unit ? ` ${unit}${p === 2 ? '²' : '³'}` : '')
  const tidy = (k: number) => Math.abs(k - Math.round(k * 100) / 100) < 1e-9
  /** k·π, as "48π ≈ 150.8" when k is tidy, or thirds as "16π/3 ≈ 16.8". */
  const withPi = (k: number, p: 2 | 3) => {
    const exact = tidy(k) ? `${Number(k.toFixed(2))}π` : tidy(3 * k) ? `${Number((3 * k).toFixed(2))}π/3` : ''
    return exact ? `${exact} ≈ ${rounded(k * Math.PI)}${power(p)}` : `${rounded(k * Math.PI)}${power(p)}`
  }
  const plain = (x: number, p: 2 | 3) => `${rounded(x)}${power(p)}`
  const name = (k: 'height' | 'slant' | 'edge' | 'lean' | 'hyp' | 'apothem') => {
    const n = partName(s, form, k)
    return n[0].toUpperCase() + n.slice(1)
  }
  // Measures worked out from the others, which the figure may not show.
  const solved = (['hyp', 'apothem', 'height', 'slant', 'edge', 'lean'] as const)
    .filter((k) => form.parts.includes(k) && read.given[k] === null)
    .map((k) => `${name(k)}: ${length(v[k])}`)

  const r = form.parts.includes('radius') ? radiusOf(s, v.radius) : 0
  const h = v.height
  let volume = ''
  let area = ''
  if (form.shape === 'sphere') [volume, area] = [withPi((4 / 3) * r ** 3, 3), withPi(4 * r * r, 2)]
  else if (form.shape === 'hemisphere') [volume, area] = [withPi((2 / 3) * r ** 3, 3), withPi(3 * r * r, 2)]
  else if (form.shape === 'cylinder') {
    volume = withPi(r * r * h, 3)
    if (!form.oblique) area = withPi(2 * r * r + 2 * r * h, 2)
  } else if (form.shape === 'cone') {
    volume = withPi((r * r * h) / 3, 3)
    if (!form.oblique) area = withPi(r * r + r * v.slant, 2)
  } else {
    // The base's area and perimeter.
    const [base, perimeter] =
      form.base === 'rectangle' ? [v.length * v.width, 2 * (v.length + v.width)]
      : form.base === 'regular' ? [(form.sides * v.side * v.apothem) / 2, form.sides * v.side]
      : [(v.triBase * v.triHeight) / 2, form.base === 'right' ? v.triBase + v.triHeight + v.hyp : v.triBase + 2 * v.hyp]
    if (form.shape === 'prism') {
      volume = plain(base * h, 3)
      if (!form.oblique) area = plain(2 * base + perimeter * h, 2)
    } else {
      volume = plain((base * h) / 3, 3)
      // A rectangular base's long and short sides have different slant heights.
      if (!form.oblique) {
        area = form.base === 'regular'
          ? plain(base + (perimeter * v.slant) / 2, 2)
          : plain(base + v.length * v.slant + v.width * Math.hypot(h, v.length / 2), 2)
      }
    }
  }
  const areaName = form.shape === 'hemisphere' ? 'Surface area, with the flat face' : 'Surface area'
  return { heading: 'Answer key', lines: [...solved, `Volume: ${volume}`, ...(area ? [`${areaName}: ${area}`] : [])] }
}

function boxPlotAnswer(s: SettingsById['box-plot']): ExampleDetails['answer'] {
  const { rows } = boxPlot.readPlot(s)
  const out = rows.flatMap((r, i) => {
    if (!r) return []
    if (!r.summary || r.problem) throw new Error(`The box plot example can’t draw data set ${i + 1}: ${r.problem ?? 'no numbers'}`)
    const { min, q1, median, q3, max } = r.summary
    const f = boxPlot.fmt
    const outliers = r.outliers.length ? ` · Outliers: ${r.outliers.map(f).join(', ')}` : ''
    return [`${r.name ? `${r.name}: ` : ''}Minimum ${f(min)} · Q1 ${f(q1)} · Median ${f(median)} · Q3 ${f(q3)} · Maximum ${f(max)} · IQR ${f(q3 - q1)}${outliers}`]
  })
  return { heading: 'Answer key', lines: out }
}

function barGraphAnswer(s: SettingsById['bar-graph']): ExampleDetails['answer'] {
  const read = barGraph.readGraph(s)
  const problem = read.problems.table ?? read.problems.from ?? read.problems.to ?? read.problems.step
  if (problem) throw new Error(`The bar graph example can’t be drawn as written: ${problem}`)
  // The figure shows every value it has; a bar left for students has none to give.
  return null
}

function histogramAnswer(s: SettingsById['histogram']): ExampleDetails['answer'] {
  const read = histogram.readHistogram(s)
  const problem = Object.values(read.problems).find(Boolean)
  if (problem) throw new Error(`The histogram example can’t be drawn as written: ${problem}`)
  if (!read.bins.length) throw new Error('The histogram example has no bins')
  // A data set's frequency table, which students work out; a typed table gives its own.
  if (s.source !== 'data') return null
  return { heading: 'Answer key', lines: [...read.bins.map((b) => `${b.name}: ${histogram.fmt(b.frequency ?? 0)}`), `n = ${histogram.fmt(read.n)}`] }
}

function mappingAnswer(s: SettingsById['mapping-diagram']): ExampleDetails['answer'] {
  const map = mapping.readMapping(s)
  if (!map.inputs.length || !map.outputs.length) throw new Error('The mapping diagram example has no inputs or outputs')
  // No arrows: a diagram for students to draw on, with nothing to check.
  if (!map.verdict) return null
  const pairs = map.arrows.map((a) => `(${map.inputs[a.from]}, ${map.outputs[a.to]})`)
  return { heading: 'Answer key', lines: [map.verdict.text, `Ordered pairs: ${pairs.join(', ')}`] }
}

const GENERATORS: { [G in ExampleGeneratorId]: { definition: Definition<SettingsById[G]>; answer: Answer<SettingsById[G]> } } = {
  'coordinate-grid': { definition: definitionOf(grid), answer: gridAnswer },
  'number-line': { definition: definitionOf(numberLine), answer: numberLineAnswer },
  'triangle': { definition: definitionOf(triangle), answer: triangleAnswer },
  'rectangle': { definition: definitionOf(rectangleFamily), answer: quadrilateralAnswer },
  'parallelogram': { definition: definitionOf(parallelogramFamily), answer: quadrilateralAnswer },
  'trapezoid': { definition: definitionOf(trapezoidFamily), answer: quadrilateralAnswer },
  'kite': { definition: definitionOf(kiteFamily), answer: quadrilateralAnswer },
  'regular-polygon': { definition: definitionOf(polygon), answer: polygonAnswer },
  'prism': { definition: definitionOf(solidSettings('prism')), answer: solidAnswer },
  'cylinder': { definition: definitionOf(solidSettings('cylinder')), answer: solidAnswer },
  'pyramid': { definition: definitionOf(solidSettings('pyramid')), answer: solidAnswer },
  'cone': { definition: definitionOf(solidSettings('cone')), answer: solidAnswer },
  'sphere': { definition: definitionOf(solidSettings('sphere')), answer: solidAnswer },
  'box-plot': { definition: definitionOf(boxPlot), answer: boxPlotAnswer },
  'bar-graph': { definition: definitionOf(barGraph), answer: barGraphAnswer },
  'histogram': { definition: definitionOf(histogram), answer: histogramAnswer },
  'mapping-diagram': { definition: definitionOf(mapping), answer: mappingAnswer },
  'length-reading': { definition: lengthSettings, answer: (s) => ({ heading: 'Answer key', lines: lengthAnswer(s).split(' · ') }) },
}

/** Whether a kept value has everything the example gives: a list's rows,
 *  given in part, have those fields as written. */
function keeps(kept: unknown, given: unknown): boolean {
  if (Array.isArray(given)) return Array.isArray(kept) && kept.length === given.length && given.every((g, i) => keeps(kept[i], g))
  if (given && typeof given === 'object') {
    return !!kept && typeof kept === 'object' && Object.entries(given).every(([k, g]) => keeps((kept as Record<string, unknown>)[k], g))
  }
  return kept === given
}

function detailsOf<G extends ExampleGeneratorId>(generator: G, example: Example): ExampleDetails {
  const { definition, answer } = GENERATORS[generator]
  // An example gives only what differs, so what it leaves out must stay the default.
  if (definition.toQuery(definition.tidy({}))) throw new Error(`${generator} doesn’t keep its defaults for settings left out`)
  // Tidied from the example's settings alone, as "Start from an example" loads them.
  const s = definition.tidy(example.settings)
  // Every setting as written, or the figure isn't the one described.
  for (const [name, value] of Object.entries(example.settings)) {
    const kept = (s as Record<string, unknown>)[name]
    if (!keeps(kept, value)) throw new Error(`Example ${example.path}: ${name} is ${JSON.stringify(kept)}, not ${JSON.stringify(value)}`)
  }
  const query = definition.toQuery(s)
  if (definition.toQuery(definition.fromParams(new URLSearchParams(query))) !== query) {
    throw new Error(`Example ${example.path}: its address doesn't draw the same figure`)
  }
  return { editPath: `/${generator}${query ? `?${query}` : ''}`, answer: answer(s) }
}

export const exampleDetails = (example: Example) => detailsOf(example.generator, example)
