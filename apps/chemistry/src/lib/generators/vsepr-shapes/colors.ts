// Ball-and-stick atom colors: the usual model-kit (CPK) colors, as most
// textbooks and molecule viewers use them, and their grays for printing.

const CPK: Record<string, string> = {
  H: '#f4f4f4',
  He: '#d9ffff',
  Li: '#cc80ff',
  Be: '#c2ff00',
  B: '#ffb5b5',
  C: '#505050',
  N: '#3050f8',
  O: '#ff0d0d',
  F: '#90e050',
  Ne: '#b3e3f5',
  Al: '#bfa6a6',
  Si: '#f0c8a0',
  P: '#ff8000',
  S: '#ffd630',
  Cl: '#1ff01f',
  Ar: '#80d1e3',
  Ga: '#c28f8f',
  Ge: '#668f8f',
  As: '#bd80e3',
  Se: '#ffa100',
  Br: '#a62929',
  Kr: '#5cb8d1',
  In: '#a67573',
  Sn: '#668080',
  Sb: '#9e63b5',
  Te: '#d47a00',
  I: '#940094',
  Xe: '#429eb0',
}
const OTHER = '#c58cd8'

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

/** How light a color looks, 0 to 1. */
export const lightness = (hex: string) => {
  const [r, g, b] = channels(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Grays for printing, set apart by hand so atoms that often share a
 *  molecule (C and O, N and H, S and F) don't print alike. */
const GRAYS: Record<string, number> = { H: 0.97, C: 0.28, N: 0.5, O: 0.68, F: 0.86, Cl: 0.8, Br: 0.42, I: 0.36, S: 0.6, P: 0.55, B: 0.75, Xe: 0.46 }

/** The atom's color, or its gray. */
export function atomColor(element: string, grayscale: boolean): string {
  const hex = CPK[element] ?? OTHER
  if (!grayscale) return hex
  const l = GRAYS[element] ?? 0.35 + lightness(hex) * 0.5
  return toHex([l * 255, l * 255, l * 255])
}

/** The color mixed toward white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const c = channels(hex)
  return toHex(c.map((v) => (amount > 0 ? v + (255 - v) * amount : v * (1 + amount))))
}
