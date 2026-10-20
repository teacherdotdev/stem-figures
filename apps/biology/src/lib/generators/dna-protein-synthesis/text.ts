// Text sizes without measuring, since the figure is drawn on the server too.
// The same estimate as Cell Diagram's (cell-diagram/labels.ts), copied so
// the generators stay apart.

/** Roughly how wide text is in Arial, which every figure is set in. */
export function textWidth(text: string, size: number) {
  let em = 0
  for (const ch of text) {
    if ('iljI.,:;|!\'′'.includes(ch)) em += 0.24
    else if ('frt()-/ '.includes(ch)) em += 0.31
    else if ('mwMW–'.includes(ch)) em += 0.84
    else if (/[A-Z]/.test(ch)) em += 0.68
    else if (/[0-9]/.test(ch)) em += 0.56
    else em += 0.54
  }
  return em * size
}

/** Text broken at spaces into lines no wider than `max` (a single long
 *  word keeps its own line). */
export function wrap(text: string, size: number, max: number): string[] {
  const lines: string[] = []
  for (const word of text.split(' ')) {
    const last = lines.at(-1)
    if (last !== undefined && textWidth(`${last} ${word}`, size) <= max) lines[lines.length - 1] = `${last} ${word}`
    else lines.push(word)
  }
  return lines
}
