// Radioactive decay, as Half-Life Graph draws it: N = N₀ · (½)^(t / T½),
// which is N₀ · e^(−λt) with the decay constant λ = ln 2 / T½. Activity and
// mass fall along the same curve as the number of nuclei, so one curve
// serves any of them. A stable daughter grows as N₀ − N, and the two cross
// at one half-life.

/** The share of the parent left after time t, for half-life `half` (in the same unit). */
export const remaining = (t: number, half: number) => 0.5 ** (t / half)

/** The share of the starting nuclei that have become the (stable) daughter by time t. */
export const daughter = (t: number, half: number) => 1 - remaining(t, half)

/** The decay constant λ = ln 2 / T½, per unit of the half-life's time. */
export const decayConstant = (half: number) => Math.LN2 / half

/** The time at each of the first n half-lives: T½, 2T½, 3T½… */
export const halfLifeTimes = (half: number, n: number) => Array.from({ length: n }, (_, k) => (k + 1) * half)

/** "T½", "2T½", "3T½"… for the kth half-life, from 1. */
export const halvesText = (k: number) => `${k === 1 ? '' : k}T½`

/** "50%", "25%", "12.5%", "6.25%": what's left after k half-lives, as a percent. */
export const percentText = (k: number) => `${Number((100 * 0.5 ** k).toPrecision(6))}%`
