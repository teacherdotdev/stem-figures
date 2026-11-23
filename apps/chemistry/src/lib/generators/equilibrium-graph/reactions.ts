// The reaction setups an equilibrium graph can show: each one's species in
// the order of its equation (reactants, then products), their coefficients,
// whether it's a gas mixture or a solution, and whether the forward reaction
// gives out heat or takes it in (the real direction, cited beside each).
//
// The K and starting concentrations are EXAMPLE VALUES, chosen so the graph
// reads well: the lines level off well apart and none lies along the axis.
// They are not the reactions' measured equilibrium constants, and the page
// says so under the K box and in the answer key.

import { formulaText } from '$lib/shared/concentration'

export type Heat = 'exothermic' | 'endothermic'
export type Phase = 'gas' | 'aqueous'

export interface Species {
  /** the formula as key text: "N_2", "Fe^{3+}" */
  formula: string
  /** its coefficient in the equation, 1 or more */
  coef: number
  side: 'reactant' | 'product'
}

export interface Reaction {
  id: string
  /** what the reaction is called in the picker, after its equation */
  name: string
  species: Species[]
  phase: Phase
  /** the forward reaction's heat; the made-up reaction's is the teacher's to choose */
  heat: Heat
  /** what the page says backs `heat` up: the forward reaction's ΔH°, or what's seen, as plain text */
  evidence?: string
  /** an example K, chosen for the picture, not measured */
  k: number
  /** example starting concentrations in mol/L, one per species */
  start: number[]
}

const r = (formula: string, coef = 1): Species => ({ formula, coef, side: 'reactant' })
const p = (formula: string, coef = 1): Species => ({ formula, coef, side: 'product' })

export const REACTIONS = [
  {
    id: 'ammonia',
    name: 'Haber process',
    species: [r('N_2'), r('H_2', 3), p('NH_3', 2)],
    phase: 'gas',
    // ΔH° = −92 kJ/mol (2 × ΔHf° of NH₃(g), −46.1 kJ/mol; NIST Chemistry WebBook)
    heat: 'exothermic',
    evidence: 'ΔH° = −92 kJ/mol',
    k: 0.5,
    start: [1, 3, 0],
  },
  {
    id: 'hi',
    name: 'Hydrogen iodide',
    species: [r('H_2'), r('I_2'), p('HI', 2)],
    phase: 'gas',
    // ΔH° = −9.5 kJ/mol with I₂ as a gas (2 × 26.5 − 62.4; NIST Chemistry WebBook)
    heat: 'exothermic',
    evidence: 'ΔH° = −9.5 kJ/mol, with I₂ as a gas',
    k: 10,
    start: [1, 0.8, 0],
  },
  {
    id: 'n2o4',
    name: 'Dinitrogen tetroxide',
    species: [r('N_2O_4'), p('NO_2', 2)],
    phase: 'gas',
    // ΔH° = +57 kJ/mol (2 × 33.2 − 9.2; NIST Chemistry WebBook)
    heat: 'endothermic',
    evidence: 'ΔH° = +57 kJ/mol',
    k: 0.2,
    start: [1, 0],
  },
  {
    id: 'so3',
    name: 'Contact process',
    species: [r('SO_2', 2), r('O_2'), p('SO_3', 2)],
    phase: 'gas',
    // ΔH° = −198 kJ/mol (2 × (−395.7 + 296.8); NIST Chemistry WebBook)
    heat: 'exothermic',
    evidence: 'ΔH° = −198 kJ/mol',
    k: 10,
    start: [1, 0.8, 0],
  },
  {
    id: 'pcl5',
    name: 'Phosphorus pentachloride',
    species: [r('PCl_5'), p('PCl_3'), p('Cl_2')],
    phase: 'gas',
    // ΔH° = +88 kJ/mol (−287.0 + 374.9; NIST Chemistry WebBook)
    heat: 'endothermic',
    evidence: 'ΔH° = +88 kJ/mol',
    k: 0.5,
    start: [1, 0, 0.3],
  },
  {
    id: 'fescn',
    name: 'Iron(III) thiocyanate',
    species: [r('Fe^{3+}'), r('SCN^-'), p('FeSCN^{2+}')],
    phase: 'aqueous',
    // Exothermic: the red colour fades on warming, the standard Le Châtelier
    // demonstration (e.g. Flinn Scientific, "Le Châtelier's Principle and the
    // Iron(III) Thiocyanate Equilibrium").
    heat: 'exothermic',
    evidence: 'the red color fades on warming',
    k: 5,
    start: [1, 0.6, 0],
  },
  {
    id: 'abc',
    name: 'Made-up reaction',
    species: [r('A'), r('B'), p('C')],
    phase: 'gas',
    // made up: the teacher chooses
    heat: 'exothermic',
    k: 5,
    start: [1, 0.6, 0],
  },
] as const satisfies readonly Reaction[]

export type ReactionId = (typeof REACTIONS)[number]['id']
export const REACTION_IDS = REACTIONS.map((x) => x.id) as ReactionId[]

/** The made-up reaction, whose K and heat are the teacher's own. */
export const MADE_UP: ReactionId = 'abc'

export const reactionOf = (id: ReactionId): Reaction => REACTIONS.find((x) => x.id === id)!

/** A species' coefficient as the reaction's extent moves it: reactants minus, products plus. */
export const signed = (s: Species) => (s.side === 'reactant' ? -s.coef : s.coef)

const sideText = (rx: Reaction, side: Species['side'], formula: (f: string) => string) =>
  rx.species.filter((s) => s.side === side).map((s) => `${s.coef > 1 ? s.coef : ''}${formula(s.formula)}`).join(' + ')

/** The equation in plain characters: "N₂ + 3H₂ ⇌ 2NH₃". */
export const equationText = (rx: Reaction) => `${sideText(rx, 'reactant', formulaText)} ⇌ ${sideText(rx, 'product', formulaText)}`

/** Moles of products less moles of reactants: what a volume change acts on. */
export const moleChange = (rx: Reaction) => rx.species.reduce((n, s) => n + signed(s), 0)
