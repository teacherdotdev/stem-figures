// Every bundled picture must be ours (ADR 0002 in packages/shared): a figure
// can't carry a credit line, so nothing drawn by anyone else may be bundled,
// and no picture may load anything from elsewhere.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SETUPS } from '../setups'
import { GRASSLAND } from '../settings'
import { parseWeb } from '../web'
import * as manifest from './manifest'

const DIR = join(import.meta.dirname)
const { ORGANISMS, PICTURE_BOX } = manifest

describe('the bundled organisms', () => {
  it('are every one ours: no source, licence or credit of anyone else’s', () => {
    expect(Object.keys(manifest).sort()).toEqual(['GROUPS', 'ORGANISMS', 'ORGANISM_BY_ID', 'PICTURE_BOX'])
    for (const o of ORGANISMS) expect(Object.keys(o).sort(), o.id).toEqual(['group', 'id', 'name', 'role', 'scale'])
    for (const f of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
      expect(readFileSync(join(DIR, f), 'utf8'), f).not.toMatch(/phylopic|creativecommons|license|licence|attribution|©/i)
    }
  })

  it('each have one picture, at a 128 × 128 viewBox, drawing nothing from elsewhere, and nothing else is bundled', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.svg'))
    expect(files.sort()).toEqual(ORGANISMS.map((o) => `${o.id}.svg`).sort())
    for (const f of files) {
      const svg = readFileSync(join(DIR, f), 'utf8')
      expect(svg, f).toMatch(new RegExp(`^<svg [^>]*viewBox="0 0 ${PICTURE_BOX} ${PICTURE_BOX}"`))
      expect(svg, f).not.toMatch(/<(image|script|foreignObject|use)\b|href=|url\((?!#)|@import/i)
    }
  })

  it('have unique ids, and a size between half and all of their box', () => {
    expect(new Set(ORGANISMS.map((o) => o.id)).size).toBe(ORGANISMS.length)
    for (const o of ORGANISMS) {
      expect(o.scale, o.id).toBeGreaterThanOrEqual(0.5)
      expect(o.scale, o.id).toBeLessThanOrEqual(1)
    }
  })

  it('include every organism the setups use', () => {
    const ids = new Set(ORGANISMS.map((o) => o.id))
    for (const setup of SETUPS) {
      const web = parseWeb(setup.settings.web ?? GRASSLAND)!
      for (const e of web) expect(ids.has(e.picture), `${setup.id}: ${e.key}`).toBe(true)
      // A setup's web is kept exactly as written.
      expect(web.length, setup.id).toBe((setup.settings.web ?? GRASSLAND).split(';').length)
    }
  })
})
