// The nuclear particles Nuclide Notation draws, each a fixed symbol with its
// mass number over its atomic number, as they're written in decay equations
// (CONTEXT.md "Nuclear particle"). Their bottom number is the particle's
// charge, so a beta particle's is −1.

export const PARTICLES = ['alpha', 'beta', 'positron', 'neutron', 'proton', 'gamma'] as const
export type Particle = (typeof PARTICLES)[number]

/** Every symbol a particle can be written with, by its name in the address. */
export const PARTICLE_SYMBOLS = ['He', 'alpha', 'e', 'beta', 'n', 'p', 'H', 'gamma'] as const
export type ParticleSymbol = (typeof PARTICLE_SYMBOLS)[number]

/** How each symbol is written. */
export const SYMBOL_TEXT: Record<ParticleSymbol, string> = { He: 'He', alpha: 'α', e: 'e', beta: 'β', n: 'n', p: 'p', H: 'H', gamma: 'γ' }

export interface ParticleInfo {
  /** "Alpha particle" */
  name: string
  /** what it is, for the answer key: "a helium-4 nucleus", or nothing */
  what: string
  mass: number
  /** the bottom number: its atomic number, or its charge */
  z: number
  /** the bottom number as written: "−1", and "+1" for a positron so it can't be read as a beta particle */
  zText: string
  /** the symbols it can be written with, the usual one first */
  symbols: readonly ParticleSymbol[]
}

export const PARTICLE_INFO: Record<Particle, ParticleInfo> = {
  alpha: { name: 'Alpha particle', what: 'a helium-4 nucleus', mass: 4, z: 2, zText: '2', symbols: ['He', 'alpha'] },
  beta: { name: 'Beta particle', what: 'an electron', mass: 0, z: -1, zText: '−1', symbols: ['e', 'beta'] },
  positron: { name: 'Positron', what: 'a positive electron', mass: 0, z: 1, zText: '+1', symbols: ['e', 'beta'] },
  neutron: { name: 'Neutron', what: '', mass: 1, z: 0, zText: '0', symbols: ['n'] },
  proton: { name: 'Proton', what: 'a hydrogen-1 nucleus', mass: 1, z: 1, zText: '1', symbols: ['p', 'H'] },
  gamma: { name: 'Gamma ray', what: 'a high-energy photon', mass: 0, z: 0, zText: '0', symbols: ['gamma'] },
}

/** The symbol a particle is written with: the one asked for if it can be, or its usual one. */
export const particleSymbol = (particle: Particle, symbol: ParticleSymbol): ParticleSymbol =>
  PARTICLE_INFO[particle].symbols.includes(symbol) ? symbol : PARTICLE_INFO[particle].symbols[0]
