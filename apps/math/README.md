# Math Figures

Generators for clean, printable math figures that teachers paste into tests,
worksheets and slides. Live at **https://mathfigures.com**, a teacher.dev
project. See `CONTEXT.md` for the vocabulary (figure, generator, directory…)
and `docs/adr/` for decisions.

## Pages

- `/` **Directory**: every generator as a card with a live preview, plus a
  card to request one we don't make yet.
- `/coordinate-grid` **Coordinate Grid Generator**: equations to graph (straight
  lines and points, one per row), range and numbering,
  chart and axis titles (text or a blank line for students), axis labels, and
  a Figma-style end cap for each end of each axis. Presets, undo/redo, copy
  image, PNG/SVG download and copy link.
- `/triangle` **Triangle Generator**: a triangle drawn to scale from any three
  of its sides and angles (typed with fractions or √), solved for the rest.
  Each side and angle is labeled with its measure, typed math like x, or
  nothing, with congruence marks; heights, right-angle squares, a unit,
  rounding, base side, flip and turn. Labels can be dragged on the figure.
- `/rectangle`, `/parallelogram`, `/trapezoid`, `/kite` **Rectangle,
  Parallelogram, Trapezoid and Kite Generators**: one page each, drawing its
  own kinds (rectangles and squares; parallelograms and rhombi; trapezoids,
  isosceles and right trapezoids; kites) to scale from the measures the kind
  asks for. The same labels and markings as the triangle, plus parallel arrows,
  heights to AB and diagonals with a named crossing point.
- `/regular-polygon` **Regular Polygon Generator**: a regular polygon of 3 to
  20 sides, sized by its side, radius or apothem, with the apothem, a radius or
  all the radii drawn from its center, and marks on every side and angle.
- `/mapping-diagram` **Mapping Diagram Generator**: inputs and outputs typed or
  pasted as lists (or as ordered pairs), and arrows chosen per input, so it can
  show a function or a relation that isn't one; the panel says which, and why.
  Each side is titled (Input and Output, or text, a blank line or nothing) and
  drawn in an oval, a box or nothing.
- `/bar-graph` **Bar Graph Generator**: a table typed or pasted (a category on
  each row, a series in each column), drawn as upright columns or sideways
  bars, side by side or stacked, with values on the bars, ± error bars, a key,
  color or black-and-white fills. A value left empty draws no bar.
- `/stem-and-leaf` **Stem-and-Leaf Plot Generator**: one data set, or two
  back to back, split into stems and leaves at a leaf unit (digits past it
  cut off), with split stems, negative stems, leaves in order or as typed,
  leaves in boxes and a key. With no data it draws empty rows or boxes.
- `/cumulative-frequency` **Cumulative Frequency Graph Generator**: a frequency
  table, a cumulative table or a data set binned from a start and width, drawn
  as crosses or dots at each upper bound joined by a smooth (monotone) curve or
  straight lines, over a cumulative frequency or percent axis, with dashed
  readings of the median, quartiles, a percentile or a value, each written,
  blank or left off.
- `/two-way-table` **Two-Way Table Generator**: a table of counts typed or
  pasted, totals included (a Total column, a Total row and the grand total,
  each typed or worked out), drawn as an SVG table with counts or relative
  frequencies of the grand total, each row or each column, as decimals,
  percents or fractions. An empty cell is blank on the figure and a letter is
  written as typed; the panel says which missing values can be worked out.
- `/histogram` **Histogram Generator**: a data set sorted into bins (a start
  and a width, or ones that fit the data, with values on an edge going the
  way the teacher picks), or a frequency table of bins typed like 10–20 or
  10 ≤ x < 20, equal or unequal. The vertical axis shows frequency, relative
  frequency or frequency density; a frequency polygon can go over the bars or
  alone; the horizontal axis is numbered at the bin edges or every step, with
  a zig-zag break when it starts past 0. A frequency left empty draws no bar.
- `/venn-diagram` **Venn Diagram Generator**: one, two or three sets in a box for
  the universal set (two overlapping, separate or one inside the other), with a
  number, a letter or expression, or the sorted elements of typed lists in each
  region, and regions shaded by clicking them on the figure.
- `/<generator>/examples/<slug>` **Example figures** (see below), and
  `/reuse`, how teachers may reuse them.
- `/about`, `/privacy`, `/sitemap.xml`, `/robots.txt`

Every page has the top bar: the site name, the current generator, and a
"Built by teacher.dev" link, which the footer repeats. The directory's search box filters its cards as
you type, and its last card is **Request a generator**. Generators fill the
window with no footer. The help button in the corner opens the same kind of
email dialog.

Each generator's settings column opens with a card saying what it makes and
a Start from an example button, which loads an example figure's settings
(`src/lib/site/GeneratorLead.svelte`); the top bar's About button opens a
drawer with what its figures are for, what can be set, its examples and
frequently asked questions, from `src/lib/site/generatorCopy.ts`, which also
goes into the page's structured data.

A generator's settings live in the page address, so a link opens the same
figure, and the server renders that figure on first load (see ADR 0001).
Saved presets stay in the browser's localStorage.

## Code layout

```
src/routes/            SvelteKit pages
src/lib/site/          top bar, directory dialogs, Help, footer, SEO, each
                       generator's About drawer and its words (generatorCopy.ts)
src/lib/examples/      example figures, their answer keys and gallery
src/lib/shared/        pieces Math's generators use: math fields and their
                       SVG layout, sections, help tips, end-cap and row-style pickers
$shared/               ../../packages/shared: pieces shared with the other sites,
                       including the generator page, figure card and toolbar,
                       undo history, presets and the generator catalog
src/lib/shapes/        the shape layer the triangle, quadrilaterals and regular
                       polygon share:
                       laying out and drawing a shape's parts, labels and
                       markings, the label popup and extra-line options;
                       quadrilateral/ holds the kinds and the page all four
                       quadrilateral generators use, each generator's folder
                       only naming its family (its kinds and opening figure)
src/lib/generators/    index.ts lists every generator; one folder each
```

A shape generator works out where its corners go and what each part says,
and hands that to `shapes/layout.ts`; every mark and label is placed there.
Every part has an id (a corner "B", a side "AB", an extra line "hB" or
"dAC"), which a future click-to-label canvas can use to pick parts out.

To add a generator: make a folder under `src/lib/generators/` with its
builder and preview, add its entry to `$shared/catalog/math.ts` and its preview
to `generators/index.ts`, add its route under `src/routes/`, and retake the
preview pictures (see `packages/shared/README.md`). The directory, search and
sitemap pick it up from the list.

## Example figures

Each generator has a handful of example figures, so search engines have real
pictures to index. Each one has:

- its settings, title, alt text and caption in `src/lib/examples/examples.ts`
  (the first of each generator is its best);
- a static page at `/<generator>/examples/<slug>`, built by
  `src/routes/[generator=examplegenerator]/examples/[slug]/`, with the picture,
  its answer key (worked out by the generator's own code in
  `src/lib/examples/details.server.ts`), an "Edit this figure" link that opens
  the generator with those settings, and a PNG download;
- its picture at `static/examples/<generator>/<slug>.png`, listed in
  `sitemap.xml` as an image of both its page and its generator's page.

A generator's first example is also its social card, `static/og/<generator>.png`
(1200×630). `src/lib/examples/ExampleGallery.svelte` shows a generator's
examples as a grid of thumbnails. Who may reuse the pictures, and how, is in
`src/lib/examples/license.ts` and the `/reuse` page.

The build fails if an example's settings aren't ones its generator keeps as
written (a misspelled choice, measures that make no triangle), so a picture
can't show a different figure than its page describes.

### Redoing the pictures

After adding or changing an example, or changing how a generator draws, take
the pictures again. With the site running:

```sh
./scripts/agent-dev.mjs stemfigures/apps/math                          # from the workspace root; prints its address
node scripts/snapshot-examples.mjs --app=math http://localhost:10003/  # from stemfigures/, with that address
node scripts/snapshot-examples.mjs --app=math http://localhost:10003/ triangle   # just the examples whose page matches "triangle"
```

It opens each example's generator, exports the figure as the Download buttons
do (about 1600 pixels on its longest side, on white), saves it and the social
cards under `static/`, and records each picture's size in
`src/lib/examples/sizes.json`. It needs the Chromium Playwright installs
(`npx playwright install chromium`). Look at the pictures before committing
them, and delete the PNG of an example you removed or renamed.

## Development

```bash
npm install   # once, from the stemfigures repo root (npm workspaces)
../../../scripts/agent-dev.mjs stemfigures/apps/math   # from the workspace, never npm run dev directly
npm run check   # svelte-check: strict TypeScript across .ts and .svelte files
npm test        # unit tests and figure snapshots
npm run build
```

Deployed on Vercel with `@sveltejs/adapter-vercel`. The Cloudflare Web
Analytics token is read from `CF_BEACON_TOKEN`, which is set only in
Vercel's production environment.
