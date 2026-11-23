// Equilibrium Graph's settings, as they appear in the page address: the
// reaction setup, each species' starting concentration, K (an example value
// until the teacher types their own), when equilibrium is first established,
// and up to three stresses, each flat in the address (s1Kind, s1At…) as
// Half-Life Graph's isotopes are. The grid and axes are $shared/graph's.

import { gridFields } from '$shared/graph/axes'
import { bool, choice, defineSettings, number, text, type Field } from '$lib/shared/settings'
import { concentrationTitle, timeTitle } from '$lib/shared/concentration'
import type { Stress } from './model'
import { MADE_UP, REACTIONS, REACTION_IDS, reactionOf, signed, type Heat, type Reaction, type ReactionId } from './reactions'

/** The most stresses on one graph. */
export const MAX_STRESSES = 3
export const SLOTS = [0, 1, 2] as const
export type Slot = (typeof SLOTS)[number]

/** What a stress does: a species added or removed, the volume changed, or the temperature raised or lowered. */
export const KINDS = ['add', 'remove', 'volume', 'raise', 'lower'] as const
export type Kind = (typeof KINDS)[number]
export const KIND_NAMES: Record<Kind, string> = {
  add: 'Add a reactant or product',
  remove: 'Remove a reactant or product',
  volume: 'Change the volume',
  raise: 'Raise the temperature',
  lower: 'Lower the temperature',
}
/** The amount each kind starts from: mol/L added or removed, the volume's factor, or how many times K changes. */
export const AMOUNT_DEFAULTS: Record<Kind, number> = { add: 0.5, remove: 0.3, volume: 0.5, raise: 2, lower: 2 }

export const HEATS = ['exothermic', 'endothermic'] as const satisfies readonly Heat[]

/** A volume can be changed to between a tenth and ten times what it was. */
const VOLUME_RANGE = [0.1, 10] as const
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v))

/** A stress's own words on the figure, as key text, until the teacher types theirs: "N_2 added", "Volume halved". */
export function autoText(reaction: Reaction, kind: Kind, species: number, amount: number) {
  if (kind === 'add' || kind === 'remove') return `${reaction.species[species]?.formula ?? reaction.species[0].formula} ${kind === 'add' ? 'added' : 'removed'}`
  if (kind === 'raise') return 'Temperature raised'
  if (kind === 'lower') return 'Temperature lowered'
  const factor = clamp(amount, VOLUME_RANGE)
  if (reaction.phase === 'aqueous') return factor >= 1 ? 'Water added' : 'Water evaporated'
  return factor === 0.5 ? 'Volume halved' : factor === 2 ? 'Volume doubled' : factor < 1 ? 'Volume decreased' : 'Volume increased'
}

/** Every text this page writes for a stress, so one of them follows the stress when it changes. */
const AUTO_TEXTS = new Set([
  ...REACTIONS.flatMap((rx) => rx.species.flatMap((sp) => [`${sp.formula} added`, `${sp.formula} removed`])),
  'Temperature raised', 'Temperature lowered', 'Water added', 'Water evaporated',
  'Volume halved', 'Volume doubled', 'Volume decreased', 'Volume increased',
])

/** One stress's fields, numbered from 1 in the address: s1Kind, s1At… */
function stress<N extends 1 | 2 | 3>(n: N, kind: Kind, at: number, words: string) {
  return {
    [`s${n}Kind`]: choice(KINDS, kind),
    /** the time it happens */
    [`s${n}At`]: number({ min: 0, max: 1e6, fallback: at }),
    /** which species is added or removed: its place in the equation, from 1 */
    [`s${n}Species`]: number({ min: 1, max: 3, fallback: 1 }),
    /** mol/L added or removed, the volume's factor, or how many times K changes */
    [`s${n}Amount`]: number({ min: 0.001, max: 1000, fallback: AMOUNT_DEFAULTS[kind] }),
    /** what's written over its dashed line, as key text; empty for nothing */
    [`s${n}Text`]: text(words, 40),
  } as Record<`s${N}Kind`, Field<Kind>> &
    Record<`s${N}At` | `s${N}Species` | `s${N}Amount`, Field<number>> &
    Record<`s${N}Text`, Field<string>>
}

const first = REACTIONS[0]

export const equilibriumSettings = defineSettings(
  {
    reaction: choice(REACTION_IDS, first.id),
    /** each species' concentration at time 0, in mol/L, in the order of the equation */
    start1: number({ min: 0, max: 1000, fallback: first.start[0] }),
    start2: number({ min: 0, max: 1000, fallback: first.start[1] }),
    start3: number({ min: 0, max: 1000, fallback: first.start[2] }),
    /** Kc before any temperature change: an example value until the teacher types their own */
    k: number({ min: 1e-6, max: 1e6, fallback: first.k }),
    /** the made-up reaction's heat; a real setup has its own */
    heat: choice(HEATS, 'exothermic'),
    /** the time equilibrium is first reached (within 1%), which sets how fast the whole graph runs */
    established: number({ min: 0.001, max: 1e5, fallback: 4 }),
    /** how many stresses there are, 0 to 3 */
    count: number({ min: 0, max: MAX_STRESSES, fallback: 0 }),
    ...stress(1, 'add', 8, autoText(first, 'add', 0, 0.5)),
    ...stress(2, 'volume', 16, autoText(first, 'volume', 0, 0.5)),
    ...stress(3, 'raise', 24, autoText(first, 'raise', 0, 2)),
    /** each line's formula beside it; off, students work out which line is which */
    speciesLabels: bool(true),
    color: bool(true),
    ...gridFields({
      xFrom: '0', xTo: '8', xStep: '0.5', xEvery: 2,
      yFrom: '0', yTo: '3.2', yStep: '0.2', yEvery: 2,
      title: '', titleMode: 'none',
      xTitle: timeTitle('min'), xTitleMode: 'text',
      yTitle: concentrationTitle(), yTitleMode: 'text',
      xLabel: 'x', xLabelMode: 'none', yLabel: 'y', yLabelMode: 'none',
      xStartCap: 'none', xEndCap: 'none', yStartCap: 'none', yEndCap: 'none',
      minor: 0,
    }),
  },
  (s) => {
    const reaction = reactionOf(s.reaction)
    const fixed = { ...s, count: Math.round(s.count) }
    for (const n of [1, 2, 3] as const) {
      const species = Math.min(reaction.species.length, Math.round(s[`s${n}Species`]))
      fixed[`s${n}Species`] = species
      // A stress's words, if they're still ones this page wrote, follow the stress.
      if (AUTO_TEXTS.has(s[`s${n}Text`])) fixed[`s${n}Text`] = autoText(reaction, s[`s${n}Kind`], species - 1, s[`s${n}Amount`])
    }
    return fixed
  },
)

export type EquilibriumSettings = typeof equilibriumSettings.defaults

const field = <K extends string>(name: K, i: Slot) => `s${i + 1}${name}` as `s${1 | 2 | 3}${K}`

/** One stress as the teacher set it. */
export type Drawn = { slot: Slot; kind: Kind; at: number; species: number; amount: number; text: string }

/** The stress in a slot (0 to 2), whether it's on the graph or not; its species counts from 0. */
export function stressIn(s: EquilibriumSettings, i: Slot): Drawn {
  const kind = s[field('Kind', i)]
  const amount = s[field('Amount', i)]
  return {
    slot: i, kind, at: s[field('At', i)], species: s[field('Species', i)] - 1, text: s[field('Text', i)].trim(),
    // How many times K changes is 1 or more: 0.5 says the same as 2, and which way it goes is the reaction's heat's to say.
    amount: kind === 'volume' ? clamp(amount, VOLUME_RANGE) : kind === 'raise' || kind === 'lower' ? (amount < 1 ? 1 / amount : amount) : amount,
  }
}

/** The stresses on the graph, in order of time. */
export const stressesOf = (s: EquilibriumSettings): Drawn[] =>
  SLOTS.slice(0, s.count).map((i) => stressIn(s, i)).sort((a, b) => a.at - b.at || a.slot - b.slot)

/** Whether the forward reaction gives out heat: the setup's own, or the teacher's choice for the made-up reaction. */
export const heatOf = (s: Pick<EquilibriumSettings, 'reaction' | 'heat'>): Heat => (s.reaction === MADE_UP ? s.heat : reactionOf(s.reaction).heat)

/** How many times bigger K is after a temperature stress: heating an exothermic reaction makes it smaller. */
export function kFactorOf(heat: Heat, d: Pick<Drawn, 'kind' | 'amount'>) {
  const rises = (d.kind === 'raise') === (heat === 'endothermic')
  return rises ? d.amount : 1 / d.amount
}

/** A stress as the model takes it. */
export function modelStress(heat: Heat, d: Drawn): Stress {
  if (d.kind === 'add' || d.kind === 'remove') return { kind: d.kind, at: d.at, species: d.species, amount: d.amount }
  if (d.kind === 'volume') return { kind: 'volume', at: d.at, factor: d.amount }
  // Heating also speeds the approach, cooling slows it.
  return { kind: 'temperature', at: d.at, kFactor: kFactorOf(heat, d), speed: d.kind === 'raise' ? d.amount : 1 / d.amount }
}

/** The starting concentrations of the reaction's species, in the order of its equation. */
export const startsOf = (s: EquilibriumSettings) => [s.start1, s.start2, s.start3].slice(0, reactionOf(s.reaction).species.length)

/** Everything the model needs to solve the graph. */
export function specOf(s: EquilibriumSettings) {
  const reaction = reactionOf(s.reaction)
  const heat = heatOf(s)
  return {
    coefs: reaction.species.map(signed),
    start: startsOf(s),
    k: s.k,
    established: s.established,
    stresses: stressesOf(s).map((d) => modelStress(heat, d)),
  }
}

/** The settings a reaction setup brings: its example starting concentrations and K. */
export function setupFields(id: ReactionId) {
  const rx = reactionOf(id)
  return { reaction: id, start1: rx.start[0], start2: rx.start[1], start3: rx.start[2] ?? 0, k: rx.k }
}
