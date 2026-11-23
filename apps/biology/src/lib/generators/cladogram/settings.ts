// Cladogram's settings, as they appear in the page address.

import { figureTextFields } from '$shared/figureText'
import { bool, choice, defineSettings, type Field } from '$shared/settings'
import { SETUPS } from './setups'
import { tidyTree, type Clade } from './tree'

/** Straight 45° branches with the taxa along the top, the classic
 *  cladogram, or square elbows with the taxa down the right, the usual
 *  phylogenetic tree. */
export const STYLES = ['diagonal', 'rectangular'] as const
export type Style = (typeof STYLES)[number]

/** Taxon names written, or blank lines for students. */
export const TAXA_LABELS = ['names', 'blank'] as const

/** Traits written beside their ticks, blank lines beside them, ticks
 *  alone, or nothing. */
export const TRAIT_LABELS = ['names', 'blank', 'ticks', 'none'] as const

/** A field holding JSON in the address, read back through `tidy`. */
function json<T>(fallback: T, tidy: (v: unknown) => T | undefined): Field<T> {
  return {
    fallback,
    accept: tidy,
    parse: (text) => {
      try {
        return tidy(JSON.parse(text))
      } catch {
        return undefined
      }
    },
    format: (v) => JSON.stringify(v),
  }
}

// The tree is copied whenever settings are read, so editing it never changes
// the defaults or a setup it came from.
export const cladogramSettings = defineSettings(
  {
    tree: json<Clade>(SETUPS[0].tree, tidyTree),
    style: choice(STYLES, 'diagonal'),
    taxa: choice(TAXA_LABELS, 'names'),
    traits: choice(TRAIT_LABELS, 'names'),
    nodeNumbers: bool(false),
    ...figureTextFields(),
  },
  (s) => ({ ...s, tree: structuredClone(s.tree) }),
)

export type CladogramSettings = typeof cladogramSettings.defaults
