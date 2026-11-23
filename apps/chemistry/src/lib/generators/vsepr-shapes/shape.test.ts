import { describe, expect, it } from 'vitest'
import { textWidth } from '../lewis-structures/drawing'
import { ANGLE_FONT, layoutFigure, turn } from './layout'
import { angleLabels, asking, findShape, labelLines, vseprSettings, withAngleLabel } from './settings'
import { defaultAngleText } from './shape'

const shapeOf = (formula: string) => {
  const f = findShape(formula)
  if (!f.ok) throw new Error(`${formula}: ${f.message}`)
  return f
}

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const degrees = (a: number[], b: number[]) => (Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180) / Math.PI

describe('the shape a formula makes', () => {
  const cases: [string, string, string, string][] = [
    ['CO2', 'linear', 'linear', 'AX₂'],
    ['BF3', 'trigonal planar', 'trigonal planar', 'AX₃'],
    ['SO2', 'bent', 'trigonal planar', 'AX₂E'],
    ['CH4', 'tetrahedral', 'tetrahedral', 'AX₄'],
    ['NH3', 'trigonal pyramidal', 'tetrahedral', 'AX₃E'],
    ['H2O', 'bent', 'tetrahedral', 'AX₂E₂'],
    ['PCl5', 'trigonal bipyramidal', 'trigonal bipyramidal', 'AX₅'],
    ['SF4', 'seesaw', 'trigonal bipyramidal', 'AX₄E'],
    ['ClF3', 'T-shaped', 'trigonal bipyramidal', 'AX₃E₂'],
    ['I3-', 'linear', 'trigonal bipyramidal', 'AX₂E₃'],
    ['SF6', 'octahedral', 'octahedral', 'AX₆'],
    ['BrF5', 'square pyramidal', 'octahedral', 'AX₅E'],
    ['XeF4', 'square planar', 'octahedral', 'AX₄E₂'],
    ['SO4 2-', 'tetrahedral', 'tetrahedral', 'AX₄'],
    ['NH4+', 'tetrahedral', 'tetrahedral', 'AX₄'],
    ['HCl', 'linear', 'tetrahedral', 'AXE₃'],
  ]
  for (const [formula, name, geometry, axe] of cases)
    it(`${formula} is ${name}`, () => {
      const { shape } = shapeOf(formula)
      expect([shape.name, shape.electronGeometry, shape.axe]).toEqual([name, geometry, axe])
    })

  it('counts a lone electron as an electron group (NO₂ is bent)', () => {
    const { shape } = shapeOf('NO2')
    expect(shape.name).toBe('bent')
    expect(shape.lone.map((g) => g.electrons)).toEqual([1])
  })

  it('places every atom and lone pair at the ideal angles of its electron geometry', () => {
    for (const [formula, ideal] of [['CH4', 109.47], ['NH3', 109.47], ['H2O', 109.47], ['XeF4', 90], ['BF3', 120]] as const) {
      const { shape } = shapeOf(formula)
      const dirs = [...shape.atoms, ...shape.lone].map((g) => g.dir)
      for (const d of dirs) expect(Math.hypot(...d)).toBeCloseTo(1, 3)
      const nearest = dirs.map((d, i) => Math.min(...dirs.filter((_, j) => j !== i).map((e) => degrees(d, e))))
      for (const n of nearest) expect(n, formula).toBeCloseTo(ideal, 0)
    }
  })

  it('puts the more electronegative atoms axial in a trigonal bipyramid', () => {
    const { shape, structure } = shapeOf('PCl3F2')
    const axial = shape.atoms.filter((g) => Math.abs(g.dir[0]) < 0.01 && Math.abs(Math.abs(g.dir[1]) - 1) < 0.1)
    expect(axial.map((g) => structure.atoms[g.atom].element)).toEqual(['F', 'F'])
  })

  it('puts lone pairs equatorial in a trigonal bipyramid', () => {
    for (const formula of ['SF4', 'ClF3', 'I3-']) {
      const { shape } = shapeOf(formula)
      // the axial pair is up and down, before the tilt; lone pairs sit across it
      const axis = shape.name === 'linear' ? shape.atoms[0].dir : shape.atoms[0].dir
      for (const g of shape.lone) expect(Math.abs(dot(g.dir, axis)), formula).toBeLessThan(0.01)
    }
  })

  it('puts the odd atom out at a square pyramid’s apex, however the formula is typed', () => {
    for (const formula of ['XeOF4', 'XeF4O']) {
      const { shape, structure } = shapeOf(formula)
      expect(shape.name).toBe('square pyramidal')
      // the apex is opposite the lone pair
      const apex = shape.atoms.find((g) => dot(g.dir, shape.lone[0].dir) < -0.99)!
      expect(structure.atoms[apex.atom].element, formula).toBe('O')
    }
    const brf5 = shapeOf('BrF5').shape
    expect(brf5.atoms.filter((g) => dot(g.dir, brf5.lone[0].dir) < -0.99)).toHaveLength(1)
  })

  it('draws the methyl radical planar, and other three-atom radicals and ions as usual', () => {
    const methyl = shapeOf('CH3').shape
    expect([methyl.name, methyl.electronGeometry]).toEqual(['trigonal planar', 'trigonal planar'])
    expect(methyl.lone.map((g) => g.electrons)).toEqual([1])
    for (const a of methyl.atoms) expect(Math.abs(dot(a.dir, methyl.lone[0].dir))).toBeLessThan(0.01)
    expect(shapeOf('CH3-').shape.name).toBe('trigonal pyramidal')
    expect(shapeOf('BH3').shape.name).toBe('trigonal planar')
  })

  it('keeps like atoms together (CH₂Cl₂’s H atoms share a side)', () => {
    const { shape, structure } = shapeOf('CH2Cl2')
    expect(shape.atoms.map((g) => structure.atoms[g.atom].element)).toEqual(['H', 'H', 'Cl', 'Cl'])
  })

  it('doesn’t draw several central atoms, single atoms or seven electron groups', () => {
    for (const formula of ['C2H6', 'N', 'Cl-', 'IF7']) expect(findShape(formula).ok, formula).toBe(false)
  })
})

describe('bond angle labels', () => {
  it('reads the ideal angle, with < when lone pairs squeeze it', () => {
    expect(angleLabels(shapeOf('CH4').shape, '')).toEqual(['109.5°'])
    expect(angleLabels(shapeOf('H2O').shape, '')).toEqual(['<109.5°'])
    expect(angleLabels(shapeOf('SF4').shape, '')).toEqual(['<90°', '<120°'])
    expect(angleLabels(shapeOf('PCl5').shape, '')).toEqual(['90°', '120°'])
    expect(defaultAngleText({ ideal: 180, squeezed: false, pairs: [] })).toBe('180°')
  })

  it('doesn’t squeeze an angle with a lone electron (NO₂ is 134°, ClO₂ 117.6°)', () => {
    expect(angleLabels(shapeOf('NO2').shape, '')).toEqual(['120°'])
    expect(angleLabels(shapeOf('ClO2').shape, '')).toEqual(['109.5°'])
    expect(angleLabels(shapeOf('CH3').shape, '')).toEqual(['120°'])
    expect(angleLabels(shapeOf('NO2-').shape, '')).toEqual(['<120°'])
  })

  it('takes the teacher’s own label for each kind of angle', () => {
    const { shape } = shapeOf('SF4')
    const typed = withAngleLabel(shape, '', 1, '102°')
    expect(typed).toBe('|102°')
    expect(angleLabels(shape, typed)).toEqual(['<90°', '102°'])
    expect(withAngleLabel(shape, typed, 1, '')).toBe('')
  })

  it('leaves the labels blank for a question, with the answers in the key', () => {
    const { shape } = shapeOf('XeF4')
    const s = { ...vseprSettings.defaults, formula: 'XeF4', electronGeometry: true, question: true, answerKey: true }
    const { under, key } = labelLines(s, shape)
    expect(under.every((l) => l.endsWith('______________'))).toBe(true)
    expect(key).toEqual(['Answer key', 'Shape: square planar', 'Electron geometry: octahedral'])
  })

  it('isn’t a question with no label on to leave blank', () => {
    const s = vseprSettings.tidy({ ...vseprSettings.defaults, shapeName: false, question: true, answerKey: true })
    expect(s.question).toBe(false)
    const raw = { ...vseprSettings.defaults, shapeName: false, question: true }
    expect(asking(raw)).toBe(false)
    expect(asking({ ...raw, axe: true })).toBe(true)
    expect(vseprSettings.tidy({ ...vseprSettings.defaults, question: true }).question).toBe(true)
  })
})

describe('the drawing', () => {
  const pieces = (formula: string, extra = {}) => {
    const f = shapeOf(formula)
    return layoutFigure({ ...vseprSettings.defaults, formula, ...extra }, f.structure, f.shape)
  }

  it('draws methane’s textbook view with two bonds in the page, one wedge and one dash', () => {
    const bonds = pieces('CH4').pieces.flatMap((p) => (p.kind === 'bond' ? [p.depth] : []))
    expect(bonds.sort()).toEqual(['dash', 'plane', 'plane', 'wedge'])
  })

  it('draws SF₆ with two bonds in the page, two wedges and two dashes', () => {
    const bonds = pieces('SF6').pieces.flatMap((p) => (p.kind === 'bond' ? [p.depth] : []))
    expect(bonds.sort()).toEqual(['dash', 'dash', 'plane', 'plane', 'wedge', 'wedge'])
  })

  it('draws farther pieces first', () => {
    const zs = pieces('SF6', { style: 'ball-and-stick' }).pieces.map((p) => p.z)
    expect(zs).toEqual([...zs].sort((a, b) => a - b))
  })

  it('turns without changing any angle', () => {
    const { shape } = shapeOf('SF4')
    const [a, b] = [shape.atoms[0].dir, shape.atoms[2].dir]
    expect(degrees(turn(a, 40, -25), turn(b, 40, -25))).toBeCloseTo(degrees(a, b), 6)
  })

  it('draws one arc for each kind of bond angle', () => {
    expect(pieces('PCl5', { bondAngles: true }).arcs.map((a) => a.label)).toEqual(['90°', '120°'])
    expect(pieces('HCl', { bondAngles: true }).arcs).toEqual([])
  })

  it('keeps bond angle labels off the bonds', () => {
    const crosses = (box: number[], [a, b]: number[][]) => {
      for (let t = 0; t <= 40; t++) {
        const [x, y] = [a[0] + ((b[0] - a[0]) * t) / 40, a[1] + ((b[1] - a[1]) * t) / 40]
        if (x > box[0] && x < box[2] && y > box[1] && y < box[3]) return true
      }
      return false
    }
    for (const formula of ['CH4', 'NH3', 'H2O', 'SF4', 'ClF3', 'PCl5', 'SF6', 'BrF5', 'XeF4', 'BF3', 'CO2', 'XeF2'])
      for (const style of ['wedge-and-dash', 'ball-and-stick'] as const) {
        const l = pieces(formula, { style, bondAngles: true })
        const bonds = l.pieces.flatMap((p) => (p.kind === 'bond' ? [[p.from, p.to]] : []))
        for (const a of l.arcs) {
          const w = textWidth(a.label, ANGLE_FONT) / 2
          const box = [a.at[0] - w, a.at[1] - ANGLE_FONT * 0.75, a.at[0] + w, a.at[1]]
          for (const bond of bonds) expect(crosses(box, bond), `${formula} ${style} ${a.label}`).toBe(false)
        }
      }
  })

  it('puts an ion in brackets with its charge', () => {
    expect(pieces('NH4+').brackets?.charge).toBe('+')
    expect(pieces('CH4').brackets).toBeUndefined()
  })

  it('leaves the lone pairs off when asked', () => {
    expect(pieces('H2O').pieces.filter((p) => p.kind === 'lobe')).toHaveLength(2)
    expect(pieces('H2O', { lonePairs: 'dots' }).pieces.filter((p) => p.kind === 'dots')).toHaveLength(2)
    expect(pieces('H2O', { lonePairs: 'none' }).pieces.filter((p) => p.kind === 'lobe' || p.kind === 'dots')).toHaveLength(0)
    expect(pieces('SF6', { outerPairs: true }).pieces.filter((p) => p.kind === 'dots')).toHaveLength(18)
  })
})
