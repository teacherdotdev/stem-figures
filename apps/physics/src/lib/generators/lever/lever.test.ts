import { describe, expect, test } from 'vitest'
import { LABEL_SIZES, type LabelSize } from '$shared/labelSize'
import type { Label } from '$lib/shared/label'
import { crosses, overlaps } from '$lib/shared/layout'
import { BEAM, HEIGHT, LONGEST, MIN_ARM, SHORTEST, SPAN, WIDTH, arrowLengths, buildLever, drawnArms, scaledBox } from './lever'
import { CLASSES, answerLines, comesOutEven, exact, leverOf, leverSettings, sig3, valueTexts, worked, type LeverSettings } from './settings'
import { LABEL_SCALE } from '$shared/labelSize'

const settings = (over: Partial<LeverSettings> = {}): LeverSettings => leverSettings.tidy({ ...leverSettings.defaults, ...over })
const fig = (over: Partial<LeverSettings> = {}) => buildLever(settings(over))
const text = (t: string): Label => ({ mode: 'text', text: t })

describe('the sums', () => {
  test('the default lever: 300 N at 0.5 m is lifted by 100 N at 1.5 m', () => {
    const l = leverOf(settings())
    expect(l.effort).toBeCloseTo(100, 9)
    expect(l.advantage).toBeCloseTo(3, 9)
    expect(l.forceUnit).toBe('N')
    expect(valueTexts(settings())).toEqual({ load: '300 N', effort: '100 N', effortArm: '1.5 m', loadArm: '0.5 m' })
  })

  test('a load in lb gives an effort in lb', () => {
    expect(valueTexts(settings({ load: 60, loadUnit: 'lb', effortArm: 3, loadArm: 1, lengthUnit: 'ft' })).effort).toBe('20 lb')
  })

  test('a load in kg weighs its mass × 9.8 N/kg, and the effort is in N', () => {
    const s = settings({ load: 30, loadUnit: 'kg' })
    expect(leverOf(s).weight).toBeCloseTo(294, 9)
    expect(valueTexts(s)).toMatchObject({ load: '30 kg', effort: '98 N' })
  })

  test('grams are divided by 1000 first', () => {
    const s = settings({ load: 500, loadUnit: 'g', effortArm: 20, loadArm: 10, lengthUnit: 'cm' })
    expect(leverOf(s).weight).toBeCloseTo(4.9, 9)
    expect(valueTexts(s).effort).toBe('2.45 N')
  })

  test('a class 3 lever needs more effort than its load', () => {
    const s = settings({ class: '3', effortArm: 0.5, loadArm: 1.5 })
    expect(valueTexts(s).effort).toBe('900 N')
    expect(sig3(leverOf(s).advantage)).toBe('0.333')
  })

  test('worked-out values are rounded to 3 significant figures, and written out in full', () => {
    expect(sig3(133.3333)).toBe('133')
    expect(sig3(0.33333)).toBe('0.333')
    expect(sig3(99.96)).toBe('100')
    // Trailing zeros are significant figures too.
    expect(sig3(0.030030)).toBe('0.0300')
    expect(sig3(1.001e-4)).toBe('0.000100')
    expect(sig3(3)).toBe('3.00')
    expect(sig3(1.5e-8)).toBe('0.0000000150')
    expect(sig3(1234.5)).toBe('1230')
    expect(sig3(979020000)).toBe('979000000')
    expect(sig3(0.0000000981)).toBe('0.0000000981')
    expect(sig3(100)).toBe('100')
    expect(exact(0.1 + 0.2)).toBe('0.3')
    expect(exact(12.345 * 9.8)).toBe('120.981')
    expect(comesOutEven(100)).toBe(true)
    expect(comesOutEven(400 / 3)).toBe(false)
    expect(comesOutEven(2.45)).toBe(true)
    expect(comesOutEven(0.03003)).toBe(false)
    // An even value is shown in full, a rounded one to 3 significant figures with its zeros.
    expect(worked(3)).toBe('3')
    expect(worked(0.25)).toBe('0.25')
    expect(worked(0.03003)).toBe('0.0300')
  })

  test('a tiny effort keeps its 3 significant figures', () => {
    const s = settings({ effortArm: 999, loadArm: 0.1 })
    expect(valueTexts(s).effort).toBe('0.0300 N')
    expect(answerLines(s).at(-1)).toBe('Effort = 300 N ÷ 9990 ≈ 0.0300 N')
  })
})

describe('the answer key', () => {
  test('gives the class, the mechanical advantage and the effort', () => {
    expect(answerLines(settings({ class: '2' }))).toEqual(['Class 2 lever', 'MA = effort arm ÷ load arm = 1.5 m ÷ 0.5 m = 3', 'Effort = 300 N ÷ 3 = 100 N'])
  })

  test('gives a mass’s weight first', () => {
    expect(answerLines(settings({ load: 30, loadUnit: 'kg' }))).toEqual([
      'Class 1 lever',
      'Load = 30 kg × 9.8 N/kg = 294 N',
      'MA = effort arm ÷ load arm = 1.5 m ÷ 0.5 m = 3',
      'Effort = 294 N ÷ 3 = 98 N',
    ])
    expect(answerLines(settings({ load: 500, loadUnit: 'g' }))[1]).toBe('Load = 500 g = 0.5 kg, and 0.5 kg × 9.8 N/kg = 4.9 N')
  })

  test('a mass’s weight that doesn’t come out even is to 3 significant figures, and the effort from it is ≈', () => {
    expect(answerLines(settings({ class: '2', effortArm: 999, loadArm: 0.1, load: 9999, loadUnit: 'g' }))).toEqual([
      'Class 2 lever',
      'Load = 9999 g = 9.999 kg, and 9.999 kg × 9.8 N/kg ≈ 98.0 N',
      'MA = effort arm ÷ load arm = 999 m ÷ 0.1 m = 9990',
      'Effort = 98.0 N ÷ 9990 ≈ 0.00981 N',
    ])
    expect(answerLines(settings({ load: 1.234, loadUnit: 'kg', effortArm: 1, loadArm: 1 }))).toEqual([
      'Class 1 lever',
      'Load = 1.234 kg × 9.8 N/kg ≈ 12.1 N',
      'MA = effort arm ÷ load arm = 1 m ÷ 1 m = 1',
      'Effort = 12.1 N ÷ 1 ≈ 12.1 N',
    ])
  })

  test('says ≈ for a value that doesn’t come out even, and works the effort from the arms when the advantage is rounded', () => {
    expect(answerLines(settings({ effortArm: 0.9, loadArm: 0.4 }))).toEqual([
      'Class 1 lever',
      'MA = effort arm ÷ load arm = 0.9 m ÷ 0.4 m = 2.25',
      'Effort = 300 N ÷ 2.25 ≈ 133 N',
    ])
    expect(answerLines(settings({ class: '3', effortArm: 0.5, loadArm: 1.5 }))).toEqual([
      'Class 3 lever',
      'MA = effort arm ÷ load arm = 0.5 m ÷ 1.5 m ≈ 0.333',
      'Effort = 300 N × 1.5 m ÷ 0.5 m = 900 N',
    ])
  })

  test('is the same whichever label is the unknown', () => {
    const key = answerLines(settings())
    expect(answerLines(settings({ effortLabel: text('?') }))).toEqual(key)
    expect(answerLines(settings({ loadArmLabel: { mode: 'blank', text: '' }, loadLabel: { mode: 'none', text: '' } }))).toEqual(key)
  })

  test('the figure’s effort label, the form and the answer key round the same way', () => {
    const s = settings({ effortArm: 0.9, loadArm: 0.4, load: 7, loadUnit: 'kg' })
    const shown = buildLever(s).labels.find((l) => l.key === 'effortValue')!.label.text
    expect(shown).toBe(valueTexts(s).effort)
    expect(answerLines(s).at(-1)).toContain(`≈ ${shown}`)
  })
})

describe('the settings', () => {
  test('arms that don’t suit the class are read the other way round', () => {
    expect(settings({ class: '2', effortArm: 0.5, loadArm: 1.5 })).toMatchObject({ effortArm: 1.5, loadArm: 0.5 })
    expect(settings({ class: '3', effortArm: 1.5, loadArm: 0.5 })).toMatchObject({ effortArm: 0.5, loadArm: 1.5 })
    expect(settings({ class: '1', effortArm: 0.5, loadArm: 1.5 })).toMatchObject({ effortArm: 0.5, loadArm: 1.5 })
    expect(leverSettings.fromParams(new URLSearchParams('class=3'))).toMatchObject({ class: '3', effortArm: 0.5, loadArm: 1.5 })
  })

  test('numbers stay in range', () => {
    expect(settings({ effortArm: 0, loadArm: 5000, load: 1e6 })).toMatchObject({ effortArm: 0.1, loadArm: 999, load: 9999 })
  })

  test('a page address draws the same figure again', () => {
    const s = settings({ class: '2', effortArm: 80, loadArm: 20, lengthUnit: 'cm', load: 12.5, loadUnit: 'kg', effortLabel: text('F_E'), fulcrumName: { mode: 'blank', text: 'Fulcrum' }, arms: false, mirror: true })
    const query = leverSettings.toQuery(s)
    expect(leverSettings.keyOf(leverSettings.fromParams(new URLSearchParams(query)))).toBe(leverSettings.keyOf(s))
    expect(leverSettings.toQuery(leverSettings.defaults)).toBe('')
  })
})

describe('along the beam', () => {
  test('the beam is 480 long, and the arms are drawn to scale', () => {
    const f = fig()
    expect(f.beam.width).toBe(BEAM)
    expect((f.x.effort - f.x.fulcrum) / (f.x.fulcrum - f.x.load)).toBeCloseTo(3, 6)
    expect(f.toScale).toBe(true)
    const two = fig({ class: '2', effortArm: 2, loadArm: 0.8 })
    expect((two.x.effort - two.x.fulcrum) / (two.x.load - two.x.fulcrum)).toBeCloseTo(2.5, 6)
    const three = fig({ class: '3', effortArm: 10, loadArm: 35 })
    expect((three.x.load - three.x.fulcrum) / (three.x.effort - three.x.fulcrum)).toBeCloseTo(3.5, 6)
  })

  test('class 1: load · fulcrum · effort; class 2: fulcrum · load · effort; class 3: fulcrum · effort · load', () => {
    const one = fig().x
    expect(one.load < one.fulcrum && one.fulcrum < one.effort).toBe(true)
    const two = fig({ class: '2' }).x
    expect(two.fulcrum < two.load && two.load < two.effort).toBe(true)
    const three = fig({ class: '3', effortArm: 0.5, loadArm: 1.5 }).x
    expect(three.fulcrum < three.effort && three.effort < three.load).toBe(true)
  })

  test('the fulcrum, load and effort are all on the beam, a little in from its ends', () => {
    for (const cls of CLASSES)
      for (const [effortArm, loadArm] of [[1, 1], [999, 0.1], [0.1, 999], [3, 2]]) {
        const f = fig({ class: cls, effortArm, loadArm })
        for (const x of Object.values(f.x)) {
          expect(x).toBeGreaterThanOrEqual(f.beam.x + 29.99)
          expect(x).toBeLessThanOrEqual(f.beam.x + f.beam.width - 29.99)
        }
        expect(f.fulcrum.apex).toEqual({ x: f.x.fulcrum, y: f.beam.y + f.beam.height })
      }
  })

  test('no arm is drawn shorter than 15% of the beam, and the figure says it isn’t to scale', () => {
    expect(drawnArms({ class: '1', effortArm: 999, loadArm: 0.1 })).toEqual({ effort: SPAN - MIN_ARM, load: MIN_ARM, toScale: false })
    expect(drawnArms({ class: '1', effortArm: 0.1, loadArm: 999 })).toEqual({ effort: MIN_ARM, load: SPAN - MIN_ARM, toScale: false })
    expect(drawnArms({ class: '2', effortArm: 999, loadArm: 0.1 })).toEqual({ effort: SPAN, load: MIN_ARM, toScale: false })
    expect(drawnArms({ class: '3', effortArm: 0.1, loadArm: 999 })).toEqual({ effort: MIN_ARM, load: SPAN, toScale: false })
    expect(fig({ effortArm: 999, loadArm: 0.1 }).toScale).toBe(false)
  })

  test('on a class 2 or 3 lever the load and effort are never nearer than 15% of the beam', () => {
    expect(drawnArms({ class: '2', effortArm: 1, loadArm: 1 })).toEqual({ effort: SPAN, load: SPAN - MIN_ARM, toScale: false })
    expect(drawnArms({ class: '3', effortArm: 0.99, loadArm: 1 })).toEqual({ effort: SPAN - MIN_ARM, load: SPAN, toScale: false })
  })
})

describe('the load and the forces', () => {
  const pointsDown = (v: { y1: number; y2: number }) => v.y2 > v.y1

  test('class 1: the effort points down onto the beam; class 2 and 3: up from it', () => {
    const one = fig()
    const effort = one.forces.find((f) => f.kind === 'effort')!.v
    expect(pointsDown(effort)).toBe(true)
    expect(effort.y2).toBe(one.beam.y)
    expect(effort.x1).toBe(one.x.effort)
    for (const cls of ['2', '3'] as const) {
      const f = fig({ class: cls })
      const v = f.forces.find((k) => k.kind === 'effort')!.v
      expect(pointsDown(v)).toBe(false)
      expect(v.y1).toBe(f.beam.y)
    }
  })

  test('the load is a block sitting on the beam with no arrow, or an arrow down onto it', () => {
    const block = fig()
    expect(block.block).toEqual({ at: { x: block.x.load, y: block.beam.y }, size: expect.any(Number) })
    expect(block.forces.map((f) => f.kind)).toEqual(['effort'])
    const arrow = fig({ loadShown: 'arrow', class: '2' })
    expect(arrow.block).toBeNull()
    const v = arrow.forces.find((f) => f.kind === 'load')!.v
    expect(pointsDown(v)).toBe(true)
    expect(v.y2).toBe(arrow.beam.y)
    expect(v.x1).toBe(arrow.x.load)
  })

  test('a load in kg or g is always a block', () => {
    for (const loadUnit of ['kg', 'g'] as const) {
      const f = fig({ loadShown: 'arrow', loadUnit })
      expect(f.block).not.toBeNull()
      expect(f.forces.map((k) => k.kind)).toEqual(['effort'])
    }
  })

  test('the longer arrow is the bigger force, in proportion, between 45 and 110 px', () => {
    expect(arrowLengths(100, 300)).toEqual({ effort: 36.67 < SHORTEST ? SHORTEST : 36.67, load: LONGEST })
    expect(arrowLengths(200, 300)).toEqual({ effort: 73.33, load: LONGEST })
    expect(arrowLengths(900, 300)).toEqual({ effort: LONGEST, load: SHORTEST })
    expect(arrowLengths(50, 50)).toEqual({ effort: LONGEST, load: LONGEST })
    const f = fig({ loadShown: 'arrow', effortArm: 1.5, loadArm: 1 })
    const len = (kind: string) => {
      const v = f.forces.find((k) => k.kind === kind)!.v
      return Math.abs(v.y2 - v.y1)
    }
    expect(len('load')).toBe(110)
    expect(len('effort')).toBeCloseTo(73.33, 2)
  })
})

describe('the arms’ dimension lines', () => {
  test('class 1: side by side in one row, from the load to the fulcrum and from the fulcrum to the effort', () => {
    const f = fig()
    expect(f.marks!.rows).toBe(1)
    expect(f.marks!.marks.map((m) => [m.line.x1, m.line.x2])).toEqual([
      [f.x.load, f.x.fulcrum],
      [f.x.fulcrum, f.x.effort],
    ])
  })

  test('class 2 and 3: both start at the fulcrum, in two rows, the shorter arm nearer the beam', () => {
    for (const s of [{ class: '2' as const }, { class: '3' as const, effortArm: 0.5, loadArm: 1.5 }]) {
      const f = fig(s)
      expect(f.marks!.rows).toBe(2)
      const [load, effort] = f.marks!.marks
      expect(load.line.x1).toBe(f.x.fulcrum)
      expect(effort.line.x1).toBe(f.x.fulcrum)
      const [short, long] = s.class === '2' ? [load, effort] : [effort, load]
      expect(short.row).toBe(0)
      expect(long.row).toBe(1)
      expect(short.line.y1).toBeLessThan(long.line.y1)
    }
  })

  test('are below the fulcrum’s ground and its hatches', () => {
    const f = fig()
    const hatchBottom = Math.max(...f.fulcrum.ground.hatches.map((h) => Math.max(h.y1, h.y2)))
    for (const m of f.marks!.marks) expect(m.line.y1).toBeGreaterThan(hatchBottom + 5)
  })

  test('each arm’s label is under its own line and shows its own value', () => {
    const f = fig({ class: '2', effortArm: 2, loadArm: 0.5 })
    const [load, effort] = f.marks!.marks
    const at = (key: string) => f.labels.find((l) => l.key === key)!
    expect(at('loadArm').label.text).toBe('0.5 m')
    expect(at('effortArm').label.text).toBe('2 m')
    expect(at('loadArm').at.y).toBeGreaterThan(load.line.y1)
    expect(at('loadArm').at.y).toBeLessThan(effort.line.y1)
    expect(at('effortArm').at.y).toBeGreaterThan(effort.line.y1)
    expect(at('effortArm').at.x).toBeCloseTo(effort.middle.x, 6)
  })

  test('can be turned off, with their labels', () => {
    const f = fig({ arms: false })
    expect(f.marks).toBeNull()
    expect(f.labels.map((l) => l.key)).toEqual(['loadValue', 'effortValue', 'loadName', 'effortName', 'fulcrumName'])
  })
})

describe('the labels', () => {
  test('a value’s label shows the value when left empty, what was typed otherwise, or is a blank line or off', () => {
    const at = (f: ReturnType<typeof fig>, key: string) => f.labels.find((l) => l.key === key)!.label
    expect(at(fig(), 'loadValue')).toEqual(text('300 N'))
    expect(at(fig(), 'effortValue')).toEqual(text('100 N'))
    expect(at(fig({ effortLabel: text('F_E') }), 'effortValue')).toEqual(text('F_E'))
    expect(at(fig({ effortLabel: text('?') }), 'effortValue')).toEqual(text('?'))
    expect(at(fig({ loadLabel: { mode: 'blank', text: '' } }), 'loadValue').mode).toBe('blank')
    expect(at(fig({ loadArmLabel: { mode: 'none', text: '' } }), 'loadArm').mode).toBe('none')
    expect(at(fig({ load: 30, loadUnit: 'kg' }), 'loadValue')).toEqual(text('30 kg'))
  })

  test('each name sits above its value, above its arrow or block', () => {
    for (const s of [{}, { class: '2' as const, loadShown: 'arrow' as const }, { class: '3' as const, effortArm: 0.5, loadArm: 1.5 }]) {
      const f = fig(s)
      const at = (key: string) => f.labels.find((l) => l.key === key)!.at
      for (const part of ['load', 'effort'] as const) {
        expect(at(`${part}Name`).y).toBeLessThan(at(`${part}Value`).y)
        expect(at(`${part}Value`).y).toBeLessThan(f.beam.y)
        expect(at(`${part}Value`).x).toBeCloseTo(f.x[part], 6)
      }
    }
  })

  test('when the two columns can’t stand side by side, the inner one goes beside its force, on the fulcrum’s side', () => {
    const long = { loadShown: 'arrow' as const, load: 1234.5, effortName: text('Effort force F_E'), loadName: text('Load force F_L'), effortArm: 1, loadArm: 1 }
    for (const [cls, inner] of [['2', 'load'], ['3', 'effort']] as const) {
      const f = fig({ class: cls, ...long, labelSize: 'large' })
      const sc = LABEL_SCALE.large
      for (const key of [`${inner}Name`, `${inner}Value`]) {
        const l = f.labels.find((l) => l.key === key)!
        const b = scaledBox(l.at, l.label, sc)
        expect(b.x + b.w / 2, key).toBeLessThan(f.x[inner])
        expect(b.y + b.h / 2, key).toBeLessThanOrEqual(f.beam.y)
      }
    }
  })

  test('with its value off, a name takes the value’s place', () => {
    const on = fig().labels.find((l) => l.key === 'effortValue')!.at
    const off = fig({ effortLabel: { mode: 'none', text: '' } }).labels.find((l) => l.key === 'effortName')!.at
    expect(off).toEqual(on)
  })

  test('the fulcrum’s name is beside the fulcrum, between the beam and the ground', () => {
    for (const cls of CLASSES) {
      const f = fig({ class: cls })
      const at = f.labels.find((l) => l.key === 'fulcrumName')!.at
      expect(at.y).toBeGreaterThan(f.beam.y + f.beam.height)
      expect(at.y).toBeLessThan(f.fulcrum.ground.line.y1)
      expect(Math.abs(at.x - f.x.fulcrum)).toBeLessThan(110)
    }
  })

  // Every arrangement that crowds the figure: each class with its arms at both
  // extremes and in between, each way of drawing the load, a long unit, long
  // typed labels, and every label size.
  const ARMS: [number, number][] = [[1.5, 0.5], [0.5, 1.5], [1, 1], [999, 0.1], [0.1, 999], [9, 1.35], [123.45, 100], [2, 1.8]]
  const VARIANTS: Partial<LeverSettings>[] = [
    {},
    { loadShown: 'arrow' },
    { load: 9999, loadUnit: 'kg', lengthUnit: 'cm' },
    { load: 0.1, loadUnit: 'g', lengthUnit: 'in' },
    { loadShown: 'arrow', loadUnit: 'lb', lengthUnit: 'ft', effortLabel: text('F_E'), loadLabel: text('F_L'), effortArmLabel: text('d_E'), loadArmLabel: text('d_L') },
    { effortLabel: { mode: 'blank', text: '' }, loadLabel: { mode: 'blank', text: '' }, effortArmLabel: { mode: 'blank', text: '' }, loadArmLabel: { mode: 'blank', text: '' }, effortName: { mode: 'blank', text: '' }, loadName: { mode: 'blank', text: '' }, fulcrumName: { mode: 'blank', text: '' } },
    { effortLabel: { mode: 'none', text: '' }, loadLabel: { mode: 'none', text: '' }, arms: false },
    { effortName: text('Input force'), loadName: text('Output force'), fulcrumName: text('Pivot') },
    // Long names on two arrows, which at equal arms on a class 2 or 3 lever can't stand side by side.
    { loadShown: 'arrow', load: 1234.5, effortName: text('Effort force F_E'), loadName: text('Load force F_L') },
  ]
  const every = (check: (f: ReturnType<typeof fig>, sc: number, name: string) => void) => {
    let n = 0
    for (const cls of CLASSES)
      for (const [effortArm, loadArm] of ARMS)
        for (const variant of VARIANTS)
          for (const labelSize of Object.keys(LABEL_SIZES) as LabelSize[]) {
            const s = settings({ class: cls, effortArm, loadArm, labelSize, ...variant })
            check(buildLever(s), LABEL_SCALE[labelSize], `class ${cls}, arms ${effortArm} and ${loadArm}, ${labelSize}, variant ${VARIANTS.indexOf(variant)}`)
            n++
          }
    expect(n).toBe(3 * ARMS.length * VARIANTS.length * 3)
  }
  const boxOf = (l: { at: { x: number; y: number }; label: Label }, sc: number) => scaledBox(l.at, l.label, sc)

  test('every label is inside the figure', () => {
    every((f, sc, name) => {
      for (const l of f.labels) {
        const b = boxOf(l, sc)
        if (b.w <= 6 * sc) continue
        expect(b.x - b.w / 2, `${name}: ${l.key} left`).toBeGreaterThanOrEqual(0)
        expect(b.x + b.w / 2, `${name}: ${l.key} right`).toBeLessThanOrEqual(WIDTH)
        expect(b.y - b.h / 2, `${name}: ${l.key} top`).toBeGreaterThanOrEqual(0)
        expect(b.y + b.h / 2, `${name}: ${l.key} bottom`).toBeLessThanOrEqual(HEIGHT)
      }
    })
  })

  test('no label overlaps another', () => {
    every((f, sc, name) => {
      const boxes = f.labels.map((l) => ({ key: l.key, b: boxOf(l, sc) })).filter((l) => l.b.w > 6 * sc)
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) expect(overlaps(boxes[i].b, boxes[j].b), `${name}: ${boxes[i].key} on ${boxes[j].key}`).toBe(false)
    })
  })

  test('no label is on an arrow, a witness line, a dimension line, the beam, the block or the fulcrum', () => {
    every((f, sc, name) => {
      const top = f.beam.y
      const under = f.beam.y + f.beam.height
      const [apex, left, right] = f.fulcrum.triangle
      const lines = [
        ...f.forces.map((k) => k.v),
        ...(f.marks?.witnesses ?? []),
        ...(f.marks?.marks.map((m) => m.line) ?? []),
        { x1: f.beam.x, y1: top, x2: f.beam.x + f.beam.width, y2: top },
        { x1: f.beam.x, y1: under, x2: f.beam.x + f.beam.width, y2: under },
        { x1: apex.x, y1: apex.y, x2: left.x, y2: left.y },
        { x1: apex.x, y1: apex.y, x2: right.x, y2: right.y },
        f.fulcrum.ground.line,
        ...(f.block ? [{ x1: f.block.at.x - 23, y1: f.block.at.y - 46, x2: f.block.at.x + 23, y2: f.block.at.y - 46 }] : []),
      ]
      for (const l of f.labels) {
        const b = boxOf(l, sc)
        if (b.w <= 6 * sc) continue
        // A hair inside the box, so a line it only touches doesn't count.
        for (const v of lines) expect(crosses(v, b, 1), `${name}: ${l.key} on a line from ${v.x1},${v.y1} to ${v.x2},${v.y2}`).toBe(false)
      }
    })
  })

  test('everything drawn is inside the figure', () => {
    every((f, _sc, name) => {
      const ys = [...f.forces.flatMap((k) => [k.v.y1, k.v.y2]), f.marks?.bottom ?? f.beam.y, ...(f.marks?.witnesses.map((w) => w.y2) ?? [])]
      expect(Math.min(...ys), name).toBeGreaterThan(0)
      expect(Math.max(...ys), name).toBeLessThan(HEIGHT)
      expect(f.beam.x, name).toBeGreaterThan(0)
      expect(f.beam.x + f.beam.width, name).toBeLessThan(WIDTH)
      expect(f.fulcrum.ground.line.x1, name).toBeGreaterThan(0)
    })
  })
})
