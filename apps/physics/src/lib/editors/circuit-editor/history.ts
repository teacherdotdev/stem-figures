// The Circuit Editor's undo history: the drawing now, the drawings before it
// (up to 100) and those undone since. Every change goes through `commit`, so
// it can be undone. A drag shows each step with `replace`, then `settle`
// makes the whole drag one step back to where it started.

export const HISTORY_LIMIT = 100

export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export const startHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] })

/** A change that can be undone. Redoing what was undone is no longer possible. */
export const commit = <T>(h: History<T>, next: T): History<T> => ({ past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] })

/** The drawing changed without a step of its own: part of a drag, or more typing in the same label. */
export const replace = <T>(h: History<T>, next: T): History<T> => ({ ...h, present: next })

/** A drag finished: one step back to how things were before it began. */
export const settle = <T>(h: History<T>, before: T): History<T> => ({ past: [...h.past, before].slice(-HISTORY_LIMIT), present: h.present, future: [] })

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h
  return { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}
