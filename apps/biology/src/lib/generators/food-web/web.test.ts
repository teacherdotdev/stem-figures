import { describe, expect, it } from 'vitest'
import { GRASSLAND } from './settings'
import { chainOf, formatWeb, hasCycle, levelsOf, longestChain, MAX_ORGANISMS, parseWeb, tidyWeb, wouldCycle, type Web } from './web'

const web = (text: string) => parseWeb(text)!
const levels = (text: string) => Object.fromEntries([...levelsOf(web(text))].map(([k, p]) => [k, p.level]))

describe('the web format', () => {
  it('round-trips', () => {
    for (const text of [
      GRASSLAND,
      'grass;rabbit=grass;fox=rabbit',
      'grass;hare.rabbit:Snowshoe hare=grass;lynx!n=hare;wolf.none:Grey wolf=hare;mushroom',
      'algae;snail=algae;bird.u-3f9a1c0b2d7e:Kingfisher!b=snail;earthworm~c;robin.songbird~3=earthworm,snail',
    ]) {
      expect(formatWeb(web(text))).toBe(text)
      expect(formatWeb(web(formatWeb(web(text))))).toBe(text)
    }
  })

  it('reads every part of an organism', () => {
    const [, hare] = web('grass;hare.rabbit~3!p:Snowshoe hare=grass')
    expect(hare).toEqual({ key: 'hare', picture: 'rabbit', name: 'Snowshoe hare', mark: 3, blank: 'p', eats: ['grass'] })
  })

  it('tidies bad input', () => {
    // Capitals and spaces in keys, an unknown picture, a bad mark and blank,
    // an unknown food, a repeat, eating itself, a repeated organism.
    const tidy = web(' Grass ; Rabbit.dragon~z!q:  Bunny  rabbit ;rabbit=grass ; fox=rabbit,rabbit,wolf,fox;fox=grass')
    expect(formatWeb(tidy)).toBe('grass;rabbit:Bunny rabbit;fox=rabbit')
    expect(parseWeb('')).toBeUndefined()
    expect(parseWeb(';;=;')).toBeUndefined()
    // Names can't break the format.
    expect(formatWeb(web('grass;cow:Moo=moo;=grass'))).toBe('grass;cow:Moo')
  })

  it('caps a web at 14 organisms', () => {
    const many = Array.from({ length: 20 }, (_, i) => `o${i}`).join(';')
    expect(web(many)).toHaveLength(MAX_ORGANISMS)
  })

  it('writes nothing for what decomposers eat', () => {
    expect(formatWeb(web('grass;rabbit=grass;mushroom=rabbit;bacteria=grass,rabbit'))).toBe('grass;rabbit=grass;mushroom;bacteria')
  })
})

describe('trophic levels', () => {
  it('puts producers at level 1, and each consumer one above its highest food (the longest chain)', () => {
    expect(levels('grass;grasshopper=grass;frog=grasshopper;snake=frog;hawk=snake,grass')).toEqual({ grass: 1, grasshopper: 2, frog: 3, snake: 4, hawk: 5 })
    expect(levels(GRASSLAND)).toMatchObject({ grass: 1, rabbit: 2, mouse: 2, frog: 3, songbird: 3, fox: 3, snake: 4, hawk: 5, mushroom: null })
  })

  it('respects the level a teacher gives an omnivore', () => {
    expect(levels('grass;rabbit=grass;fox~2=rabbit,grass;wolf=fox')).toEqual({ grass: 1, rabbit: 2, fox: 2, wolf: 3 })
    // Only a consumer takes a level.
    expect(formatWeb(web('grass~4;rabbit=grass'))).toBe('grass;rabbit=grass')
  })

  it('makes decomposers a column of their own, unless kept a consumer', () => {
    expect(levelsOf(web('grass;mushroom')).get('mushroom')).toMatchObject({ role: 'decomposer', level: null })
    expect(levelsOf(web('grass;earthworm~c=grass;songbird=earthworm')).get('songbird')).toMatchObject({ role: 'consumer', level: 3 })
    expect(levelsOf(web('grass;rabbit~d=grass')).get('rabbit')).toMatchObject({ role: 'decomposer', level: null })
  })

  it('rejects cycles', () => {
    // The link that would close the cycle is dropped; the ones written first stay.
    expect(formatWeb(web('grass;a=grass,c;b=a;c=b'))).toBe('grass;a=grass,c;b=a;c')
    const cyclic: Web = [
      { key: 'a', picture: 'none', name: '', mark: '', blank: '', eats: ['b'] },
      { key: 'b', picture: 'none', name: '', mark: '', blank: '', eats: ['a'] },
    ]
    expect(hasCycle(cyclic)).toBe(true)
    expect(() => levelsOf(cyclic)).toThrow()
    expect(hasCycle(tidyWeb(cyclic))).toBe(false)
    expect(wouldCycle(web('grass;rabbit=grass;fox=rabbit'), 'grass', 'fox')).toBe(true)
    expect(wouldCycle(web('grass;rabbit=grass;fox=rabbit'), 'fox', 'grass')).toBe(false)
  })
})

describe('food chains', () => {
  it('takes the longest chain from a producer by default', () => {
    expect(longestChain(web(GRASSLAND))).toEqual(['grass', 'grasshopper', 'frog', 'snake', 'hawk'])
    expect(chainOf(web(GRASSLAND), '')).toEqual(['grass', 'grasshopper', 'frog', 'snake', 'hawk'])
  })

  it('keeps a chain as written, organisms in the web only', () => {
    expect(chainOf(web(GRASSLAND), 'grass,rabbit,fox')).toEqual(['grass', 'rabbit', 'fox'])
    expect(chainOf(web(GRASSLAND), 'grass,dragon,rabbit,rabbit')).toEqual(['grass', 'rabbit'])
    expect(chainOf(web(GRASSLAND), 'dragon')).toEqual(['grass', 'grasshopper', 'frog', 'snake', 'hawk'])
  })
})
