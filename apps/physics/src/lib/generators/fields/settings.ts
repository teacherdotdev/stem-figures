// Every choice the teacher makes on the Electric and Magnetic Field Generator,
// with its default: the classic picture, a + and a − charge side by side with
// the field lines running from one to the other. One setup choice picks what's
// drawn; the rest are a few switches that suit every setup.

import { bool, choice, defineSettings } from '$lib/shared/settings'

export const SETUPS = ['charge', 'opposite', 'like', 'plates', 'magnet', 'wire'] as const
export type Setup = (typeof SETUPS)[number]

export const SETUP_NAMES: Record<Setup, string> = {
  charge: 'One charge',
  opposite: 'Opposite charges',
  like: 'Like charges',
  plates: 'Parallel plates',
  magnet: 'Bar magnet',
  wire: 'Wire',
}

export const fieldSettings = defineSettings({
  setup: choice<Setup>('opposite', SETUPS),
  /** The sign of one charge, or of both like charges. */
  sign: choice('+', ['+', '-']),
  /** Which way the wire's current flows: out of the page (a dot) or into it (a cross). */
  current: choice('out', ['out', 'in']),
  /** Off leaves just the charges, plates, magnet or wire, for students to draw the field. */
  fieldLines: bool(true),
  lines: choice('normal', ['fewer', 'normal', 'more']),
  /** Off draws the lines without arrowheads, for students to add the direction. */
  arrows: bool(true),
  color: bool(false),
})

export type FieldSettings = typeof fieldSettings.defaults
