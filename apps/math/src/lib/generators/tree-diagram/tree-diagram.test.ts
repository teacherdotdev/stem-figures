import { describe, expect, test } from 'vitest'
import { buildTree } from './layout'
import {
  DEFAULT_SETTINGS, addOutcome, addStage, cleanSettings, product, readProb, readTree, removeOutcome, removeStage, setSame,
  settingsFromParams, settingsToQuery, type RawSettings,
} from './settings'

const tree = (s: RawSettings) => cleanSettings(s)
const marbles = () =>
  tree({
    stages: [
      { outcomes: ['R', 'B'], probs: [['3/5', '2/5']] },
      { outcomes: ['R', 'B'], same: false, probs: [['2/4', '2/4'], ['3/4', '1/4']] },
    ],
  })

describe('settings', () => {
  test('the defaults make an empty address, and back', () => {
    expect(settingsToQuery(DEFAULT_SETTINGS)).toBe('')
    expect(settingsFromParams(new URLSearchParams(''))).toEqual(DEFAULT_SETTINGS)
  })

  test('a tree survives its address', () => {
    const s = tree({ ...marbles(), stageTitles: true, start: 'Bag', direction: 'down', blanks: ['p1-0', 'q0-1'] })
    expect(settingsFromParams(new URLSearchParams(settingsToQuery(s)))).toEqual(s)
  })

  test('stages past 36 paths are dropped, and top to bottom stops at 12', () => {
    const six = { outcomes: ['1', '2', '3', '4', '5', '6'] }
    const s = tree({ stages: [six, six, six], direction: 'down' })
    expect(s.stages).toHaveLength(2)
    expect(s.direction).toBe('right')
  })

  test('outcomes are kept between two and six', () => {
    const s = tree({ stages: [{ outcomes: ['A'] }, { outcomes: ['1', '2', '3', '4', '5', '6', '7'] }] })
    expect(s.stages.map((st) => st.outcomes.length)).toEqual([2, 6])
  })

  test('blanks for labels that are gone are dropped', () => {
    expect(tree({ blanks: ['p0-1', 'p5', 'q0', 'n1-1'] }).blanks).toEqual(['p0-1', 'n1-1'])
  })

  test('a space typed in a name is kept until it’s used', () => {
    const s = tree({ stages: [{ outcomes: ['Not ', 'Red'] }] })
    expect(s.stages[0].outcomes[0]).toBe('Not ')
    expect(readTree(s).nodes[0][0].outcome).toBe('Not')
  })
})

describe('reading probabilities', () => {
  test('fractions, decimals, percents and letters', () => {
    expect(readProb('3/7')).toEqual({ kind: 'fraction', n: 3, d: 7 })
    expect(readProb('1')).toEqual({ kind: 'fraction', n: 1, d: 1 })
    expect(readProb('.4')).toEqual({ kind: 'decimal', v: 0.4 })
    expect(readProb('40%')).toEqual({ kind: 'decimal', v: 0.4 })
    expect(readProb('x')).toEqual({ kind: 'letter' })
    expect(readProb(' ')).toEqual({ kind: 'empty' })
  })

  test('a path’s probability is in lowest terms when every branch is a fraction', () => {
    expect(product([readProb('3/5'), readProb('2/4')])).toEqual({ text: '3/10', fraction: true })
    expect(product([readProb('1/2'), readProb('2')])).toEqual({ text: '1', fraction: false })
  })

  test('otherwise it’s a decimal, without float noise', () => {
    expect(product([readProb('0.3'), readProb('1/2')])).toEqual({ text: '0.15', fraction: false })
    expect(product([readProb('0.1'), readProb('0.2')])).toEqual({ text: '0.02', fraction: false })
  })

  test('a blank or a letter on the path leaves its probability blank', () => {
    expect(product([readProb('0.3'), readProb('')])).toBeNull()
    expect(product([readProb('x'), readProb('0.5')])).toBeNull()
  })
})

describe('reading the tree', () => {
  test('marbles without replacement: each path and its probability', () => {
    const read = readTree(marbles())
    expect(read.paths.map((p) => [p.name, p.prob?.text])).toEqual([
      ['R, R', '3/10'],
      ['R, B', '3/10'],
      ['B, R', '3/10'],
      ['B, B', '1/10'],
    ])
    expect(read.problems).toEqual({ sums: null, overOne: null })
  })

  test('branches that don’t add up to 1 are named', () => {
    const s = marbles()
    s.stages[1].probs[1] = ['3/4', '2/4']
    expect(readTree(s).problems.sums).toBe('The branches from B add up to 5/4, not 1.')
    expect(readTree(tree({ stages: [{ outcomes: ['A', 'B'], probs: [['0.3', '0.6']] }] })).problems.sums).toBe('The branches from the start add up to 0.9, not 1.')
  })

  test('branches with a blank or a letter aren’t checked', () => {
    expect(readTree(tree({ stages: [{ outcomes: ['A', 'B'], probs: [['0.3', '']] }] })).problems.sums).toBeNull()
  })

  test('path names joined', () => {
    expect(readTree(tree({ pathStyle: 'joined' })).paths.map((p) => p.name)).toEqual(['HH', 'HT', 'TH', 'TT'])
  })
})

describe('changing the tree', () => {
  test('an outcome added in the first stage adds an empty row to a later stage that differs by branch', () => {
    const s = marbles()
    const next = addOutcome(s, 0)
    expect(next.stages[1].probs).toEqual([['2/4', '2/4'], ['3/4', '1/4'], ['', '']])
  })

  test('an outcome removed takes its rows and blanks with it, and moves the rest', () => {
    const s = tree({ ...marbles(), blanks: ['p1-0', 'p0-1', 'q1-1'] })
    const next = removeOutcome(s, 0, 0)
    expect(next.stages[0]).toMatchObject({ outcomes: ['B'], probs: [['2/5']] })
    expect(next.stages[1].probs).toEqual([['3/4', '1/4']])
    expect(next.blanks).toEqual(['p0-0', 'q0-1'])
  })

  test('a new stage, then removing it', () => {
    const s = tree({ blanks: ['q0-0', 'p0'] })
    const added = addStage(s)
    expect(added.stages).toHaveLength(3)
    expect(added.blanks).toEqual(['p0'])
    expect(removeStage({ ...s, ...added }).stages).toHaveLength(2)
  })

  test('untick Same on every branch copies its row to every node', () => {
    const stages = setSame(tree({}), 1, false)
    expect(stages[1].probs).toEqual([['0.5', '0.5'], ['0.5', '0.5']])
    expect(setSame({ ...tree({}), stages }, 1, true)[1].probs).toEqual([['0.5', '0.5']])
  })
})

describe('layout', () => {
  test('no two labels overlap', () => {
    for (const s of [marbles(), tree({ direction: 'down' }), tree({ stages: [{ outcomes: ['H', 'T'], probs: [['1/2', '1/2']] }, { outcomes: ['1', '2', '3', '4', '5', '6'], probs: [Array(6).fill('1/6')] }] })]) {
      const g = buildTree(s)
      const boxes = g.picks
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i], boxes[j]]
          const meet = a.x + 3 < b.x + b.w - 3 && b.x + 3 < a.x + a.w - 3 && a.y + 3 < b.y + b.h - 3 && b.y + 3 < a.y + a.h - 3
          expect(meet, `${a.key} and ${b.key}`).toBe(false)
        }
      }
    }
  })

  test('a clicked blank is a blank line, and an empty probability is one that can’t be clicked', () => {
    const s = tree({ stages: [{ outcomes: ['A', 'B'], probs: [['0.3', '']] }], blanks: ['o0'], showNames: 'hide', showPathProbs: 'hide' })
    const g = buildTree(s)
    expect(g.blankLines).toHaveLength(2)
    expect(g.picks.map((p) => p.key).sort()).toEqual(['o0', 'o1', 'p0'])
  })

  test('everything is inside the figure', () => {
    const g = buildTree(tree({ start: 'Start', stageTitles: true, stages: [{ title: 'First', outcomes: ['A', 'B'] }, { title: 'Second', outcomes: ['C', 'D'] }] }))
    for (const t of g.texts) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.x + t.box.w).toBeLessThanOrEqual(g.width)
      expect(t.y - t.box.asc).toBeGreaterThanOrEqual(0)
      expect(t.y + t.box.desc).toBeLessThanOrEqual(g.height)
    }
  })
})
