import { describe, expect, test } from 'vitest'
import { EXAMPLES } from '$lib/examples/examples'
import { buildVenn } from './layout.js'
import { buildRegions, circlesFor, maskAt, pathCovers, type Vec } from './regions.js'
import {
  cleanSettings, maskOf, parseList, readVenn, regionsOf, settingsFromParams, settingsToQuery, sortElements, type RawSettings,
} from './settings.js'

const venn = (s: RawSettings) => buildVenn(cleanSettings(s))
const ARRANGED: [string, RawSettings][] = [
  ['one set', { sets: 1 }],
  ['two overlapping', { sets: 2, arrangement: 'overlap' }],
  ['two separate', { sets: 2, arrangement: 'separate' }],
  ['B inside A', { sets: 2, arrangement: 'subset' }],
  ['three sets', { sets: 3 }],
]
type Rect = { x0: number; y0: number; x1: number; y1: number }
const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
const rectOf = (p: { x: number; y: number; box: { w: number; asc: number; desc: number } }): Rect => ({
  x0: p.x, y0: p.y - p.box.asc, x1: p.x + p.box.w, y1: p.y + p.box.desc,
})

describe('the page address', () => {
  test('the defaults make an empty address', () => {
    expect(settingsToQuery(cleanSettings({}))).toBe('')
  })

  test('regions, shading, lists and choices round-trip', () => {
    const s = cleanSettings({
      mode: 'elements', sets: 3, nameA: 'Football', universe: 'U', universeList: '1-20', listA: '2, 4, 6',
      values: { ab: '5', out: '12' }, shaded: ['out', 'a'], shade: 'hatch', empty: 'line',
    })
    expect(s.shaded).toEqual(['a', 'out'])
    const q = settingsToQuery(s)
    expect(q).toContain('r_ab=5')
    expect(q).toContain('shaded=a%7Cout')
    expect(settingsFromParams(new URLSearchParams(q))).toEqual(s)
  })

  test('unknown choices fall back to the defaults, and empty regions are dropped', () => {
    const s = cleanSettings({ mode: 'pictures', sets: 4, arrangement: 'nested', shade: 'ink', values: { a: '  ', zz: '3' }, shaded: ['q'] })
    expect([s.mode, s.sets, s.arrangement, s.shade, s.values, s.shaded]).toEqual(['numbers', 2, 'overlap', 'blue', {}, []])
  })
})

describe('regions', () => {
  for (const [name, raw] of ARRANGED) {
    test(`${name}: each region's path covers its own points and no other region's`, () => {
      const s = cleanSettings(raw)
      const circles = circlesFor(s.sets, s.arrangement, 100)
      const box = { x: -300, y: -260, w: 600, h: 520 }
      const regions = buildRegions(circles, box)
      expect([...regions.keys()].sort()).toEqual(regionsOf(s.sets, s.arrangement).map(maskOf).sort())
      for (let y = box.y + 3; y < box.y + box.h; y += 17) {
        for (let x = box.x + 3; x < box.x + box.w; x += 17) {
          const p: Vec = [x, y]
          // Points right on a circle belong to neither side.
          if (circles.some((c) => Math.abs(Math.hypot(x - c.x, y - c.y) - c.r) < 1)) continue
          const mask = maskAt(circles, p)
          for (const [m, region] of regions) expect(pathCovers(region, p), `${m} at ${x}, ${y}`).toBe(m === mask)
        }
      }
    })

    test(`${name}: each region's label point is in it, and in no other region`, () => {
      const g = venn({ ...raw, values: { a: '1', b: '2', ab: '3', c: '4', ac: '5', bc: '6', abc: '7', out: '8' } })
      const masks = g.regions.map((r) => maskOf(r.key))
      expect(masks.sort()).toEqual(regionsOf(cleanSettings(raw).sets, cleanSettings(raw).arrangement).map(maskOf).sort())
      const paths = buildRegions(g.circles, g.box)
      for (const r of g.regions) {
        expect(maskAt(g.circles, r.anchor)).toBe(maskOf(r.key))
        for (const [m, region] of paths) expect(pathCovers(region, r.anchor)).toBe(m === maskOf(r.key))
      }
    })

    test(`${name}: shading a region shades that region alone`, () => {
      const s = cleanSettings(raw)
      for (const key of regionsOf(s.sets, s.arrangement)) {
        const g = venn({ ...raw, shaded: [key] })
        expect(g.regions.filter((r) => r.fill).map((r) => r.key)).toEqual([key])
      }
    })
  }

  test('a region not in the arrangement draws nothing, whatever is typed for it', () => {
    const g = venn({ arrangement: 'separate', values: { a: '4', ab: '9', b: '6' }, shaded: ['ab'] })
    expect(g.regions.map((r) => r.key)).toEqual(['a', 'b', 'out'])
    expect(g.items.map((p) => p.box.items.map((i) => (i.kind === 'text' ? i.text : '')).join(''))).toEqual(['4', '6'])
    expect(g.regions.some((r) => r.fill)).toBe(false)
  })
})

describe('numbers and text', () => {
  test('each number is written in its own region', () => {
    const g = venn({ values: { a: '12', ab: '5', b: '8', out: '3' } })
    const at = (text: string) => g.items.find((p) => p.box.items.some((i) => i.kind === 'text' && i.text === text))!
    for (const [text, key] of [['12', 'a'], ['5', 'ab'], ['8', 'b'], ['3', 'out']] as const) {
      const p = at(text)
      expect(maskAt(g.circles, [p.x + p.box.w / 2, p.y - p.box.asc / 2])).toBe(maskOf(key))
    }
  })

  test('an empty region writes nothing, or a blank line when asked for', () => {
    expect(venn({ values: { a: '5' } }).items).toHaveLength(1)
    expect(venn({ values: { a: '5' } }).blanks).toHaveLength(0)
    const g = venn({ values: { a: '5' }, empty: 'line' })
    expect(g.items).toHaveLength(1)
    expect(g.blanks).toHaveLength(3)
    expect(venn({ mode: 'elements', empty: 'line' }).blanks).toHaveLength(0)
  })

  test('a word or letter that isn’t a number is a problem in numbers mode, but fine as text', () => {
    expect(readVenn(cleanSettings({ values: { ab: 'x' } })).problems.values.ab).toContain('isn’t a number')
    expect(readVenn(cleanSettings({ values: { ab: '-2' } })).problems.values.ab).toContain('less than 0')
    expect(readVenn(cleanSettings({ mode: 'text', values: { ab: 'x' } })).problems.values).toEqual({})
  })

  test('the readout adds up the regions, leaving out sums with a region unknown', () => {
    const lines = (s: RawSettings) => readVenn(cleanSettings(s)).readout.counts.map((l) => `${l.label} = ${l.value}`)
    expect(lines({ values: { a: '12', ab: '5', b: '8', out: '3' } })).toEqual(['n(ξ) = 28', 'n(A) = 17', 'n(B) = 13', 'n(A ∩ B) = 5', 'n(A ∪ B) = 25'])
    expect(lines({ values: { a: '12', ab: '5' } })).toEqual(['n(A) = 17', 'n(A ∩ B) = 5'])
    expect(lines({ mode: 'text', values: { a: '12', ab: '5', b: '8', out: '3' } })).toEqual([])
    const three = lines({ sets: 3, nameA: 'Cats', universe: 'U', values: { a: '1', b: '2', ab: '3', c: '4', ac: '5', bc: '6', abc: '7', out: '8' } })
    expect(three).toContain('n(U) = 36')
    expect(three).toContain('n(Cats ∩ B ∩ C) = 7')
    expect(three).toContain('n(Cats ∪ B ∪ C) = 28')
    expect(three).toContain('n(B ∩ C) = 13')
  })
})

describe('elements', () => {
  test('lists are read with ranges, commas, spaces and words', () => {
    const texts = (t: string) => parseList(t).elements.map((e) => e.text)
    expect(texts('1-5')).toEqual(['1', '2', '3', '4', '5'])
    expect(texts('1 to 3, 10')).toEqual(['1', '2', '3', '10'])
    expect(texts('2 4 6')).toEqual(['2', '4', '6'])
    expect(texts('ice cream, cake')).toEqual(['ice cream', 'cake'])
    expect(parseList('1-1000').tooLong).toBe(true)
  })

  test('elements land in the regions of the sets they’re in', () => {
    const r = sortElements(cleanSettings({ mode: 'elements', universeList: '1-12', listA: '2, 4, 6, 8, 10, 12', listB: '3 6 9 12' })).regions
    expect(r).toEqual({ out: ['1', '5', '7', '11'], a: ['2', '4', '8', '10'], b: ['3', '9'], ab: ['6', '12'] })
  })

  test('a repeated element is another copy, so prime factors sort as they should', () => {
    const r = sortElements(cleanSettings({ mode: 'elements', listA: '2, 2, 3, 3', listB: '2, 2, 3, 5' })).regions
    expect(r).toEqual({ ab: ['2', '2', '3'], a: ['3'], b: ['5'] })
  })

  test('words match whatever their case, and three sets sort too', () => {
    const r = sortElements(cleanSettings({ mode: 'elements', sets: 3, listA: 'Ann, Ben, Cal', listB: 'cal, Dee', listC: 'Ben, CAL' })).regions
    expect(r).toEqual({ ac: ['Ben'], abc: ['Cal'], b: ['Dee'], a: ['Ann'] })
  })

  test('an element missing from ξ, or in two separate sets, is a problem', () => {
    const problem = (s: RawSettings) => sortElements(cleanSettings({ mode: 'elements', ...s })).problem
    expect(problem({ universeList: '1-10', listA: '2, 12' })).toBe('12 is in A but not in ξ. Add it to ξ, or take it out of A.')
    expect(problem({ universeList: '2, 3', listA: '2, 2' })).toBe('2 is in A twice but in ξ once.')
    expect(problem({ arrangement: 'separate', listA: '1, 2', listB: '2, 3' })).toContain('2 is in both A and B')
    expect(problem({ arrangement: 'subset', listA: '1, 2', listB: '2, 3' })).toContain('3 is in B but not in A')
    expect(problem({ universeList: '1-10', listA: '2, 4', listB: '4, 6' })).toBeNull()
  })

  test('the readout counts each region and lists its members', () => {
    const read = readVenn(cleanSettings({ mode: 'elements', universeList: '1-6', listA: '2, 4, 6', listB: '3, 6' }))
    expect(read.readout.counts.map((l) => `${l.label} = ${l.value}`)).toEqual(['n(ξ) = 6', 'n(A) = 3', 'n(B) = 2', 'n(A ∩ B) = 1', 'n(A ∪ B) = 4'])
    expect(read.readout.members).toEqual([
      { label: 'A only', value: '2, 4' },
      { label: 'A and B', value: '6' },
      { label: 'B only', value: '3' },
      { label: 'Neither', value: '1, 5' },
    ])
  })

  for (const [name, raw] of ARRANGED) {
    test(`${name}: long lists grow the diagram, and every element stays inside its region, clear of the rest`, () => {
      const lists = { universeList: '1-60', listA: '1-30', listB: '20-45', listC: '10-25, 40-50' }
      const subset = raw.arrangement === 'subset' ? { listB: '5-20' } : raw.arrangement === 'separate' ? { listB: '31-45' } : {}
      const s = { ...raw, ...lists, ...subset, mode: 'elements' }
      const g = venn(s)
      expect(g.problem).toBeNull()
      expect(readVenn(cleanSettings(s)).problems.elements).toBeNull()
      expect(g.circles[0].r).toBeGreaterThanOrEqual(venn(raw).circles[0].r)
      expect(g.items).toHaveLength(60)
      expectInside(s)
    })
  }

  test('a crowded outside region wraps round the circles, every element still inside it', () => {
    expectInside({ mode: 'elements', universeList: '1-60', listA: '1-5' })
    expectInside({ mode: 'elements', sets: 3, universeList: '1-70', listA: '1-4', listB: '5, 6', listC: '7' })
  })

  /** Every element's box lies wholly in its own region and in the frame, clear of the other elements and the names. */
  function expectInside(s: RawSettings) {
    const g = venn(s)
    {
      const sorted = sortElements(cleanSettings(s)).regions
      const boxes = g.items.map(rectOf)
      g.items.forEach((p, i) => {
        const text = p.box.items.map((it) => (it.kind === 'text' ? it.text : '')).join('')
        const key = Object.entries(sorted).find(([, list]) => list!.includes(text))![0] as keyof typeof sorted
        const b = boxes[i]
        // Every point round the element's box is in its region and inside the frame.
        for (let t = 0; t <= 1; t += 0.125) {
          for (const pt of [[b.x0 + t * (b.x1 - b.x0), b.y0], [b.x0 + t * (b.x1 - b.x0), b.y1], [b.x0, b.y0 + t * (b.y1 - b.y0)], [b.x1, b.y0 + t * (b.y1 - b.y0)]] as Vec[]) {
            expect(maskAt(g.circles, pt), `${text} at ${pt}`).toBe(maskOf(key))
            expect(pt[0] > g.box.x && pt[0] < g.box.x + g.box.w && pt[1] > g.box.y && pt[1] < g.box.y + g.box.h).toBe(true)
          }
        }
        for (let j = 0; j < i; j++) expect(overlaps(b, boxes[j]), `${text} and another`).toBe(false)
        for (const n of [...g.names, ...(g.universe ? [g.universe] : [])]) expect(overlaps(b, rectOf(n))).toBe(false)
      })
    }
  }

  test('a list too long for a region grows the whole diagram rather than shrinking the text', () => {
    const base = venn({ mode: 'elements' })
    const g = venn({ mode: 'elements', listA: '1-30', listB: '20-45' })
    expect(g.circles[0].r).toBeGreaterThan(base.circles[0].r)
    expect(g.width).toBeGreaterThan(base.width)
    expect(g.fs).toBe(base.fs)
  })

  test('names and the universal set’s symbol stay inside the box and clear of each other', () => {
    for (const [, raw] of ARRANGED) {
      const g = venn({ ...raw, nameA: 'Multiples of 3', nameB: 'Even numbers', nameC: 'Squares', universe: 'word', universeWord: 'Whole numbers 1 to 50' })
      const all = [...g.names, g.universe!].map(rectOf)
      all.forEach((b, i) => {
        expect(b.x0 > g.box.x && b.x1 < g.box.x + g.box.w && b.y0 > g.box.y && b.y1 < g.box.y + g.box.h).toBe(true)
        for (let j = 0; j < i; j++) expect(overlaps(b, all[j])).toBe(false)
      })
    }
  })
})

describe('examples', () => {
  const examples = EXAMPLES.filter((e) => e.generator === 'venn-diagram')
  test('there are some', () => expect(examples.length).toBeGreaterThan(3))
  test.each(examples.map((e) => [e.slug, e] as const))('%s round-trips and draws without a problem', (_, e) => {
    const s = cleanSettings(e.settings)
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
    const read = readVenn(s)
    expect(read.problems.elements).toBeNull()
    expect(read.problems.values).toEqual({})
    expect(buildVenn(s).problem).toBeNull()
  })
})
