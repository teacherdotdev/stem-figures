// Every organism picture Food Webs and Energy Pyramids bundles, one line
// each: its id (also its picture's file, <id>.svg, beside this file), name,
// group in the picker, usual role in a web, and size in its box. Every
// picture is drawn for this site, so a figure is ours to dedicate to the
// public domain with no credit line (ADR 0002 in packages/shared). Each is
// an SVG with a 128 × 128 viewBox, standing on its bottom edge.

export const GROUPS = {
  producers: 'Plants and algae',
  invertebrates: 'Invertebrates',
  fish: 'Fish, amphibians and reptiles',
  birds: 'Birds',
  mammals: 'Mammals',
  decomposers: 'Decomposers',
} as const
export type Group = keyof typeof GROUPS

/** Its usual place in a web: decomposers go in a column of their own;
 *  anything else is placed by what it eats. */
export type Role = 'producer' | 'consumer' | 'decomposer'

/** The side of every picture's square viewBox. */
export const PICTURE_BOX = 128

export interface Organism {
  id: string
  name: string
  group: Group
  role: Role
  /** how much of its box it fills, so a krill doesn't dwarf a whale */
  scale: number
}

const organism = (id: string, name: string, group: Group, role: Role, scale: number): Organism => ({ id, name, group, role, scale })

export const ORGANISMS: Organism[] = [
  organism('grass', 'Grass', 'producers', 'producer', 0.75),
  organism('flower', 'Flower', 'producers', 'producer', 0.8),
  organism('oak', 'Oak tree', 'producers', 'producer', 1),
  organism('pine', 'Pine tree', 'producers', 'producer', 1),
  organism('berries', 'Berry bush', 'producers', 'producer', 0.8),
  organism('cactus', 'Cactus', 'producers', 'producer', 0.95),
  organism('kelp', 'Kelp', 'producers', 'producer', 0.95),
  organism('algae', 'Algae', 'producers', 'producer', 0.7),
  organism('phytoplankton', 'Phytoplankton', 'producers', 'producer', 0.7),
  organism('grasshopper', 'Grasshopper', 'invertebrates', 'consumer', 0.7),
  organism('caterpillar', 'Caterpillar', 'invertebrates', 'consumer', 0.65),
  organism('butterfly', 'Butterfly', 'invertebrates', 'consumer', 0.7),
  organism('bee', 'Bee', 'invertebrates', 'consumer', 0.6),
  organism('beetle', 'Beetle', 'invertebrates', 'consumer', 0.6),
  organism('spider', 'Spider', 'invertebrates', 'consumer', 0.65),
  organism('snail', 'Snail', 'invertebrates', 'consumer', 0.65),
  organism('earthworm', 'Earthworm', 'invertebrates', 'decomposer', 0.7),
  organism('scorpion', 'Scorpion', 'invertebrates', 'consumer', 0.7),
  organism('zooplankton', 'Zooplankton', 'invertebrates', 'consumer', 0.7),
  organism('krill', 'Krill', 'invertebrates', 'consumer', 0.75),
  organism('shrimp', 'Shrimp', 'invertebrates', 'consumer', 0.7),
  organism('crab', 'Crab', 'invertebrates', 'consumer', 0.75),
  organism('small-fish', 'Small fish', 'fish', 'consumer', 0.75),
  organism('large-fish', 'Large fish', 'fish', 'consumer', 0.9),
  organism('shark', 'Shark', 'fish', 'consumer', 1),
  organism('frog', 'Frog', 'fish', 'consumer', 0.7),
  organism('snake', 'Snake', 'fish', 'consumer', 0.85),
  organism('lizard', 'Lizard', 'fish', 'consumer', 0.75),
  organism('turtle', 'Turtle', 'fish', 'consumer', 0.8),
  organism('songbird', 'Songbird', 'birds', 'consumer', 0.7),
  organism('duck', 'Duck', 'birds', 'consumer', 0.8),
  organism('heron', 'Heron', 'birds', 'consumer', 0.95),
  organism('owl', 'Owl', 'birds', 'consumer', 0.85),
  organism('hawk', 'Hawk', 'birds', 'consumer', 0.9),
  organism('mouse', 'Mouse', 'mammals', 'consumer', 0.6),
  organism('lemming', 'Lemming', 'mammals', 'consumer', 0.7),
  organism('squirrel', 'Squirrel', 'mammals', 'consumer', 0.7),
  organism('rabbit', 'Rabbit', 'mammals', 'consumer', 0.75),
  organism('raccoon', 'Raccoon', 'mammals', 'consumer', 0.8),
  organism('fox', 'Fox', 'mammals', 'consumer', 0.85),
  organism('arctic-fox', 'Arctic fox', 'mammals', 'consumer', 0.8),
  organism('coyote', 'Coyote', 'mammals', 'consumer', 0.9),
  organism('wolf', 'Wolf', 'mammals', 'consumer', 0.95),
  organism('deer', 'Deer', 'mammals', 'consumer', 1),
  organism('caribou', 'Caribou', 'mammals', 'consumer', 1),
  organism('cow', 'Cow', 'mammals', 'consumer', 1),
  organism('bear', 'Bear', 'mammals', 'consumer', 1),
  organism('polar-bear', 'Polar bear', 'mammals', 'consumer', 1),
  organism('seal', 'Seal', 'mammals', 'consumer', 0.9),
  organism('orca', 'Orca', 'mammals', 'consumer', 1),
  organism('whale', 'Baleen whale', 'mammals', 'consumer', 1),
  organism('human', 'Human', 'mammals', 'consumer', 1),
  organism('mushroom', 'Mushroom', 'decomposers', 'decomposer', 0.7),
  organism('bacteria', 'Bacteria', 'decomposers', 'decomposer', 0.65),
]

export const ORGANISM_BY_ID: ReadonlyMap<string, Organism> = new Map(ORGANISMS.map((o) => [o.id, o]))
