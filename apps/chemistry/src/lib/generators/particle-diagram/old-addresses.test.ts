// Links made before the key could list each atom, before subscripts in key
// names, before and after boxes and states of matter, open the same figure.
// old-addresses.json was written by the generator as it was then: each
// address with what it drew (the box, the key and where they sat).

import { describe, expect, it } from 'vitest'
import { keyLayout } from '$shared/particles/key'
import { boxesSize, figureLayout } from './figureLayout'
import { boxContents, keyKinds, particleSettings } from './settings'
import old from './old-addresses.json'

describe('an address from before these settings', () => {
  for (const { query, box, key, figure } of old) {
    it(`draws as it did: ${query.slice(0, 60) || '(the defaults)'}`, () => {
      const s = particleSettings.fromParams(new URLSearchParams(query))
      // nothing new is written back into the address
      expect([...new URLSearchParams(particleSettings.toQuery(s)).keys()]).toEqual([...new URLSearchParams(query).keys()])
      const drawn = boxContents(s)
      expect(drawn).toEqual(box)
      const k = keyLayout(keyKinds(s, drawn), s.keyNote)
      const note = k.note && { text: k.note.text, x: k.note.x, y: k.note.y }
      expect({ ...k, lines: k.lines.map(({ name, discs, nameX, nameY }) => ({ name, discs, nameX, nameY })), note }).toEqual(key)
      // each name and the note is still one piece, as before subscripts
      for (const line of k.lines) expect(line.spans.length).toBeLessThanOrEqual(1)
      expect(k.note?.spans.length ?? 1).toBe(1)
      expect(figureLayout(s.show, k, boxesSize(drawn))).toEqual(figure)
    })
  }
})
