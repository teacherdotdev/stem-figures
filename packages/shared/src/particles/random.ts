// The random numbers particle layouts are drawn from. They come only from a
// seed kept in a generator's settings, so a link redraws the same figure and
// the server draws what the browser will (Chemistry's ADR 0002).

/** A small seeded random number generator (mulberry32): the same seed always
 *  gives the same numbers, from 0 up to 1. */
export function seededRandom(seed: number) {
  let a = Math.floor(seed) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
