// What can be set on an angle, a point or a length, wherever a figure lets the
// teacher click a part of it to label it: the Parallel Lines and Transversal,
// the Angles Generator and the Composite Shape Editor.

/** How an angle or a length is labeled: not at all, with its measure, or with typed text. */
export const ANGLE_LABELS = ['none', 'measure', 'text'] as const
export type AngleLabel = (typeof ANGLE_LABELS)[number]

/** Shading: none, or a light color that still prints in grayscale. */
export const SHADES = [
  { name: 'None', fill: '' },
  { name: 'Blue', fill: '#bfdbfe' },
  { name: 'Red', fill: '#fecaca' },
  { name: 'Green', fill: '#bbf7d0' },
  { name: 'Yellow', fill: '#fde68a' },
]

/**
 * The mark drawn in an angle: nothing, one to three congruence arcs, or a
 * right-angle square (drawn as one arc if the angle stops being 90°).
 */
export const MARKS = ['none', '1', '2', '3', 'right'] as const
export type Mark = (typeof MARKS)[number]
export const MARK_NAMES: Record<Mark, string> = { none: 'None', '1': 'One arc', '2': 'Two arcs', '3': 'Three arcs', right: 'Right-angle square' }

export type AngleStyle = { label: AngleLabel; text: string; mark: Mark; shade: number }
export const ANGLE_DEFAULTS: AngleStyle = { label: 'none', text: '', mark: 'none', shade: 0 }

/** Choosing a label gives an unmarked angle its usual mark (a square at a right angle), shown so it can be taken off. */
export function labelPatch(a: AngleStyle, label: AngleLabel, right: boolean): Partial<AngleStyle> {
  return label !== 'none' && a.mark === 'none' ? { label, mark: right ? 'right' : '1' } : { label }
}
