import { describe, expect, it } from 'vitest'
import { answerLines, describe as describeFigure, isCrowded, layoutCladogram, wrap, type Box } from './layout'
import { STYLES, TRAIT_LABELS, cladogramSettings, type CladogramSettings } from './settings'
import { SETUPS } from './setups'
import { clade, taxaOf, taxon } from './tree'

const settingsFor = (more: Partial<CladogramSettings>): CladogramSettings => ({ ...cladogramSettings.defaults, ...more })
const within = (b: Box, w: number, h: number) => b.x >= -0.01 && b.y >= -0.01 && b.x + b.w <= w + 0.01 && b.y + b.h <= h + 0.01
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

const balanced = clade('', clade('AB', taxon('Alpha'), taxon('Beta')), clade('CD', taxon('Gamma'), taxon('Delta')))
const TREES = [...SETUPS.map((x) => ({ id: x.id, tree: x.tree })), { id: 'balanced', tree: balanced }]

describe('layoutCladogram', () => {
  for (const { id, tree } of TREES)
    for (const style of STYLES)
      for (const traits of TRAIT_LABELS)
        it(`${id}, ${style}, traits ${traits}: everything inside the box, nothing touching`, () => {
          const s = settingsFor({ tree, style, traits, nodeNumbers: true })
          const at = layoutCladogram(s)
          expect(at.crowded).toBe(false)
          expect(isCrowded(at)).toBe(false)
          for (const nm of at.names) expect(within(nm.box, at.width, at.height)).toBe(true)
          for (const tr of at.traits) if (tr.box) expect(within(tr.box, at.width, at.height)).toBe(true)
          for (const line of at.branches) for (const p of line) expect(within({ x: p.x, y: p.y, w: 0, h: 0 }, at.width, at.height)).toBe(true)
          const boxes = at.names.map((n) => n.box)
          for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j])).toBe(false)
          expect(at.names).toHaveLength(taxaOf(tree).length)
        })

  it('lines the tips up along the top for a diagonal tree, down the right for a rectangular one', () => {
    const diagonal = layoutCladogram(settingsFor({ style: 'diagonal' }))
    const tipYs = new Set(diagonal.names.map((n) => Math.round(n.box.y + n.box.h)))
    expect(tipYs.size).toBe(1)
    const rect = layoutCladogram(settingsFor({ style: 'rectangular' }))
    expect(new Set(rect.names.map((n) => Math.round(n.box.x))).size).toBe(1)
  })

  it('gives each shown trait a tick, and only clades with a trait', () => {
    const at = layoutCladogram(settingsFor({}))
    expect(at.traits).toHaveLength(7)
    expect(layoutCladogram(settingsFor({ traits: 'none' })).traits).toHaveLength(0)
  })

  it('numbers blank traits root first', () => {
    const at = layoutCladogram(settingsFor({ traits: 'blank' }))
    expect(at.traits.map((t) => t.number).sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(at.traits.every((t) => t.text === '')).toBe(true)
  })

  it('numbers the nodes from 1 at the root', () => {
    const at = layoutCladogram(settingsFor({ nodeNumbers: true }))
    expect(at.nodes.map((n) => n.n)).toEqual([1, 2, 3, 4, 5, 6])
    // The root is the lowest node of a diagonal cladogram.
    expect(Math.max(...at.nodes.map((n) => n.y))).toBe(at.nodes[0].y)
  })

  it('draws an empty name as a blank line', () => {
    const at = layoutCladogram(settingsFor({ tree: clade('', taxon('A'), taxon('')) }))
    expect(at.names[1].lines).toEqual([])
  })
})

describe('wrap', () => {
  it('breaks long names at spaces', () => {
    expect(wrap('Flowering plants', 16, 110)).toEqual(['Flowering', 'plants'])
    expect(wrap('  Frog ', 16, 110)).toEqual(['Frog'])
  })
})

describe('answer key and description', () => {
  it('lists blank taxa in order and blank traits by number', () => {
    expect(answerLines(settingsFor({}))).toEqual([])
    expect(answerLines(settingsFor({ taxa: 'blank' }))[0]).toBe('Taxa: Lancelet, Lamprey, Shark, Perch, Frog, Lizard, Mouse')
    expect(answerLines(settingsFor({ traits: 'blank' }))[0]).toMatch(/^Traits: 1\. Notochord, 2\. Vertebrae, 3\. Jaws.*7\. Hair$/)
  })

  it('describes the figure for a screen reader', () => {
    expect(describeFigure(settingsFor({}))).toContain('A cladogram of 7 taxa: Lancelet,')
    expect(describeFigure(settingsFor({ taxa: 'blank', style: 'rectangular' }))).toContain('A phylogenetic tree of 7 taxa with blank names.')
  })
})
