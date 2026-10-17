// Every Particle Diagram and Bohr Model example draws as it did before the
// particles, their layout and the key moved to $shared/particles (for
// Biology's Osmosis and Tonicity). examples-unchanged.json was written by
// the generators as they were then: each example's box, key and figure, and
// each Bohr model's nucleus.

import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '$lib/examples/examples'
import { nucleusBalls } from '../bohr-model/model'
import { bohrSettings } from '../bohr-model/settings'
import { arrowLayout, boxesSize, figureLayout, keyLayout } from './key'
import { boxContents, keyKinds, particleSettings } from './settings'
import recorded from './examples-unchanged.json'

/** What a Particle Diagram example draws. */
function particleDrawing(settings: Record<string, unknown>) {
  const s = particleSettings.tidy({ ...particleSettings.defaults, ...settings })
  const box = boxContents(s)
  const key = keyLayout(keyKinds(s, box), s.keyNote)
  return { box, key, figure: figureLayout(s.show, key, boxesSize(box, arrowLayout(s.arrowLabel).gap)) }
}

/** The balls of a Bohr Model example's nucleus. */
function bohrDrawing(settings: Record<string, unknown>) {
  const s = bohrSettings.tidy({ ...bohrSettings.defaults, ...settings })
  return { balls: nucleusBalls(s.protons, s.neutrons, s.seed) ?? null }
}

/** Every example's drawing, as JSON would keep it. */
const drawings = () =>
  JSON.parse(
    JSON.stringify(
      EXAMPLES.flatMap((e): { slug: string }[] =>
        e.generator === 'particle-diagram'
          ? [{ slug: e.slug, ...particleDrawing(e.settings) }]
          : e.generator === 'bohr-model'
            ? [{ slug: e.slug, ...bohrDrawing(e.settings) }]
            : [],
      ),
    ),
  ) as typeof recorded

describe('the particle diagram and Bohr model examples', () => {
  const now = drawings()

  it('are the ones recorded', () => {
    expect(now.map((d) => d.slug)).toEqual(recorded.map((d) => d.slug))
  })

  for (const [i, before] of recorded.entries()) {
    it(`draw as they did: ${before.slug}`, () => {
      expect(now[i]).toEqual(before)
    })
  }
})
