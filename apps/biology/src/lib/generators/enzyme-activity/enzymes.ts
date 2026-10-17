// The enzymes teachers pick from (the setups), each with the optimum
// temperature and pH biology courses give it, or an unknown enzyme with an
// optimum and width of the teacher's own.
//
// Optima as school and college texts give them: enzymes of the human body
// work best at body temperature, about 37 °C; pepsin at about pH 2 in the
// stomach, salivary amylase at about pH 7 in the mouth and trypsin at about
// pH 8 in the small intestine (Campbell Biology graphs a human enzyme
// against a thermophile's, and pepsin against trypsin, the same way).
// Taq polymerase, from Thermus aquaticus in hot springs, works best at
// 75–80 °C (Chien, Edgar and Trela, J. Bacteriol. 127, 1976, found 80 °C);
// its reaction buffer is about pH 8.3. Catalase, from liver or potato in the
// hydrogen peroxide practical, works best near pH 7. The widths are drawn to
// look like the textbook curves, not measured.

export type Enzyme = {
  id: string
  /** as it's listed, and named in the key */
  name: string
  /** the optimum temperature (°C) and how many degrees the rate takes to double as it warms */
  temperature: { opt: number; width: number }
  /** the optimum pH and how far either side the enzyme still works */
  ph: { opt: number; width: number }
}

export const ENZYMES: Enzyme[] = [
  { id: 'human', name: 'Human enzyme', temperature: { opt: 37, width: 10 }, ph: { opt: 7, width: 3 } },
  { id: 'taq', name: 'Taq polymerase', temperature: { opt: 75, width: 12 }, ph: { opt: 8.3, width: 2.5 } },
  { id: 'pepsin', name: 'Pepsin', temperature: { opt: 37, width: 10 }, ph: { opt: 2, width: 2.5 } },
  { id: 'amylase', name: 'Salivary amylase', temperature: { opt: 37, width: 10 }, ph: { opt: 7, width: 3 } },
  { id: 'trypsin', name: 'Trypsin', temperature: { opt: 37, width: 10 }, ph: { opt: 8, width: 3 } },
  { id: 'catalase', name: 'Catalase', temperature: { opt: 37, width: 10 }, ph: { opt: 7, width: 3.5 } },
]

/** An enzyme of the teacher's own, its optimum and width typed in. */
export const UNKNOWN = 'unknown'
export const ENZYME_IDS = [...ENZYMES.map((e) => e.id), UNKNOWN]

export const enzymeOf = (id: string) => ENZYMES.find((e) => e.id === id)

/** The names unknown enzymes get in the key, by curve: Enzyme A, B and C, as exam questions name them. */
export const unknownName = (curve: number) => `Enzyme ${'ABC'[curve]}`
