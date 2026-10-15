// News: "What's new on Math Figures", a window shown once to teachers who
// were using the site before the change (anyone with something of the site's
// saved in their browser). Closing it counts as having seen it, kept in this
// browser only. `?news` shows every piece of news again.
// Add new news at the end of `NEWS`.

export type News = {
  id: string
  /** Heads this news when it's shown along with older news the teacher hasn't seen. */
  title: string
  /**
   * Each change. One with `art` (a generator's id, drawn by its directory
   * preview) gets a big row beside it; one without is a short row.
   */
  items: { title: string; text: string; art?: string; link?: { label: string; href: string } }[]
  /** Smaller changes, in one short line under the list. */
  also?: string
}

export const NEWS: News[] = [
  {
    id: '2026-10-15-composite-shapes-and-inequalities',
    title: 'Composite shapes and inequalities',
    items: [
      {
        title: 'Build composite shapes',
        text: 'The new Composite Shape Editor builds L-shapes, houses, arches and more from rectangles, triangles, semicircles and quarter circles. Draw heights, diagonals and rays, label sides, angles and points, then copy the shape into your worksheet or test.',
        art: 'composite-shape',
        link: { label: 'Open the editor', href: '/composite-shape' },
      },
      {
        title: 'Shade inequalities',
        text: 'Type y > 2x + 1 or x ≤ 3 on the Coordinate Grid and the side that’s true is shaded, with a dashed or solid boundary. Give each inequality its own row to show a system.',
        link: { label: 'Coordinate Grid', href: '/coordinate-grid' },
      },
      {
        title: 'Line thickness and gridlines',
        text: 'Draw each graph thin, medium or thick, and pick light, standard, bold or no gridlines, so graphs stay clear on a photocopy.',
      },
      {
        title: 'Piecewise, trig and log graphs',
        text: 'They already work on the Coordinate Grid. There are new examples for each, with open and closed circles, holes and asymptotes.',
      },
    ],
  },
]

export const SEEN_KEY = 'math-news-seen'

export function unseenNews(seen: Record<string, string>) {
  return NEWS.filter((each) => !seen[each.id])
}
