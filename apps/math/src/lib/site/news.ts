// News: "What's new on Math Figures", a window shown once to teachers who
// were using the site before the change (anyone with something of the site's
// saved in their browser). Closing it counts as having seen it, kept in this
// browser only. `?news` shows every piece of news again.
// Add new news at the end of `NEWS`.

export type News = {
  id: string
  /** Heads this news when it's shown along with older news the teacher hasn't seen. */
  title: string
  /** When it went out, as YYYY-MM-DD, shown above it. */
  date: string
  /** Each change, as a card: a picture of it (in static/), a title, one short line, and where it is. */
  items: { title: string; text: string; image: string; href: string }[]
}

export const NEWS: News[] = [
  {
    id: '2026-10-15-composite-shapes-and-inequalities',
    title: 'Composite shapes and inequalities',
    date: '2026-10-15',
    items: [
      {
        title: 'Composite Shape Editor',
        text: 'Build shapes from rectangles, triangles and circles, then label them.',
        image: '/news/composite-shapes.png',
        href: '/composite-shape',
      },
      {
        title: 'Shaded inequalities',
        text: 'Type y > 2x + 1 and the true side is shaded.',
        image: '/news/shaded-inequalities.png',
        // The same system, cross-hatched, open in the grid.
        href: '/coordinate-grid?xFrom=-6&xTo=6&yFrom=-6&yTo=6&eq=y%3Ex-2%7Ccolor%3Dblue%7Cfill%3Dhatch&eq=y%3C%3D-x%2B3%7Ccolor%3Dred%7Cfill%3Dhatch',
      },
      {
        title: 'Line thickness and gridlines',
        text: 'Thin to thick lines, and light to bold gridlines.',
        image: '/news/line-thickness-and-gridlines.png',
        href: '/coordinate-grid',
      },
      {
        title: 'Piecewise, trig and log graphs',
        text: 'New examples, with open and closed circles.',
        image: '/examples/coordinate-grid/piecewise-function-graph-with-open-and-closed-circles.png',
        href: '/coordinate-grid/examples/piecewise-function-graph-with-open-and-closed-circles',
      },
    ],
  },
]

export const SEEN_KEY = 'math-news-seen'

export function unseenNews(seen: Record<string, string>) {
  return NEWS.filter((each) => !seen[each.id])
}
