# @stemfigures/shared

Components and helpers used by more than one STEM Figures site, imported as
`$shared/...` (the alias is set in each app's `svelte.config.js`).

| File                                                                                        | Used by                                   |
| ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `catalog/`, `GeneratorDirectory`                                                            | math, physics, chemistry, biology, engineering |
| `request.svelte.ts`                                                                         | math, physics, chemistry, biology, engineering |
| `Modal`                                                                                     | math, chemistry, physics, biology, engineering |
| `LabelField`                                                                                | math, chemistry, biology, engineering     |
| `GeneratorPage`, `generatorState`, and through them `FigureCanvas`, `Presets`, `presetStore`, `history`, `exporting`, `license` | math, chemistry, physics, biology (`license` also in each one's `/reuse` page and example pages) |
| `labelSize`                                                                                 | math, chemistry (Titration Curve, Heating and Cooling Curve), biology (Cell Diagram, Population Growth, Punnett Square, Mitosis & Meiosis, Predator–Prey Cycles, Enzyme Activity, DNA and Protein Synthesis, Photosynthesis Rate), physics (Wave) |
| `graph/`: `Grid`, `grid`, `axes`, `AxisSettings`, `TitleSettings`, `GridlineSettings`       | math (Coordinate Grid), chemistry (Titration Curve, Heating and Cooling Curve), biology (Population Growth, Predator–Prey Cycles, Enzyme Activity, Photosynthesis Rate), physics (Wave, all but `Grid`) |
| `graph/`: `numbering`, `caps`, `CapPicker`, `colors`                                        | math, chemistry (Titration Curve, Heating and Cooling Curve), biology (Population Growth, Predator–Prey Cycles, Enzyme Activity, Photosynthesis Rate), physics (Wave) |
| `graph/labels`: the label placer (`placer`, `besidePoint`, `alongCurve`), curve `DASHES` and `layoutKey` | biology (Population Growth, Enzyme Activity, Photosynthesis Rate) |
| `Section`                                                                                   | math, physics (Spring Scale), chemistry (Titration Curve, Heating and Cooling Curve), biology (every generator) |
| `HelpTip`                                                                                   | math, biology (Population Growth, Predator–Prey Cycles, Enzyme Activity, Photosynthesis Rate) |
| `FigureFrame`, `figureAlign`, `settings`, `figureText`, `FigureTextSettings`                | physics (Spring Scale), math (Length Reading), biology (`settings` in every generator, `FigureFrame` in all but the two graphs, `FigureTextSettings` in Micropipette Reading) |
| `Magnifier`, `MagnifierSettings`, `magnify`                                                 | physics (Spring Scale), math (Length Reading), biology (Micropipette Reading: `Magnifier`, `magnify`) |
| `marks`, `ReadingField`                                                                     | physics (Spring Scale), biology (Microscope Field of View: `ReadingField`) |
| `particles/`: `particles`, `layout`, `random`, `key`, `keyText`, `Discs`, `KeyDrawing`, `LookSettings` | chemistry (Particle Diagram; Bohr Model's `random`), biology (Osmosis and Tonicity) |

`catalog/` lists every generator on every site. Each lives on one site
(`site`), the only address it has; `alsoOn` names other sites whose
directories list it after their own generators. `GeneratorDirectory` is each
site's directory: its own generators with live previews, then those it lists
from other sites, and, while searching, matches from every other site under
their site's name. A site can only draw its own previews, so the others show
pictures from `catalog/previews/`. Retake a site's pictures after changing its
previews: start it with `./scripts/agent-dev.mjs`, then run
`node scripts/snapshot-previews.mjs <its address>` from the monorepo root.

A generator can instead be copied onto a second site, with an entry on each
under the same id, so each site has it at its own address; each directory
then shows only its own copy. Length Reading, on Math and Chemistry, is the
one so far. Its two copies are kept in step by hand (see
`docs/adr/0001-a-generator-on-two-sites.md`).

To add a generator: its entry in its site's `catalog/` file, its preview in
that app's `src/lib/generators/index.ts`, and a snapshot.

An editor (`kind: 'editor'`: Chemistry's Organic Structure Editor and Math's
Composite Shape Editor) is
listed the same way, and its directory card is tagged Editor. The teacher
draws its figure by hand, so there are no settings in its address, and
Chemistry's link parameter docs (`/linking`, `llms.txt`) leave it out.

`GeneratorPage` is the page every generator is meant to use: presets and
settings down the left, the figure card on the right. Its `settingsWidth` is
the settings column's width in rem on wide screens (24 unless a generator
passes its own), so each generator can decide how the page is split. Its
other options:

- `inputs`: a card of its own between the presets and the settings groups,
  for what the teacher types first (Math's equations and measures).
- `labelSize`: bound to a generator's label size setting, it adds the label
  size picker to the figure card's toolbar.
- `printWidth` and `printHeight`: the printed figure's size in inches. It
  prints 7.5in wide unless a generator says otherwise; with a height too, the
  figure is fitted into that box.
- `svg`: the figure to export. Without it, the first `<svg>` in the figure
  card is exported.

`generatorState` takes the browser storage names for undo history and
presets as a third argument, for a site whose teachers already have them
saved under other names (Math and Physics do).

`graph/` is a graph on a square grid, the one Math's Coordinate Grid and
Chemistry's Titration Curve and Heating and Cooling Curve draw on. `axes` holds its settings: each
axis's range as typed (read by `readAxes` with the site's number reader, since
Math's are typed in Caret and can be 3π/2), numbering, labels, end caps,
titles and minor gridlines, plus `gridFields` for a generator using
`defineSettings`. `layoutGrid` lays the grid out and gives `px`, which places
a point of the graph on the drawing (its axes cross at 0 when 0 is on the
grid, unless it's given `{ edges: true }`, as for temperatures below 0 °C); `Grid.svelte` draws it with the
generator's own marks as its children. `AxisSettings`, `TitleSettings` and
`GridlineSettings` are its settings groups; `AxisSettings` takes a `field` for
the range boxes (a plain text box unless given) and children for fields of the
generator's own. `clipPath` cuts a line to the grid.
`labels` places labels on a graph where they touch no line and no other
label: each offers places to go, best first (`besidePoint` and `alongCurve`
make some), and takes the first that's clear. It also has `DASHES`, solid,
dashed and dotted, which tell up to three curves apart in black and white,
and `layoutKey`, the key naming them in rows under the graph. Physics'
Motion Graphs keeps an older copy of the placer of its own.

`particles/` is Chemistry's Particle Diagram's particles: particle kinds and
their looks (`particles`), scattering, pouring and stacking them in a box
from a seed (`layout`, with `random`'s seeded random numbers, Chemistry's
ADR 0002), the bordered key with subscripts in its names (`key`, `keyText`,
`KeyDrawing`), the discs as drawn (`Discs`) and the look pickers
(`LookSettings`, which needs the `.chip` class from the app's `app.css`).
Where the box and key sit in a Particle Diagram figure stays in Chemistry
(`figureLayout.ts`). A change to how particles are placed moves every
Particle Diagram example, so Chemistry's `examples-unchanged.test.ts` checks
each one still draws as it did.

Every site keeps the rest in its own `src/lib/`, except Physics' Spring Scale,
Math's Length Reading and Biology's Micropipette Reading, which use the
instrument-reading pieces above.
Chemistry keeps its own copies of those reading pieces (the magnifier, marks,
reading box, figure frame and title settings) for now; they started as copies
of its files and match them. When changing a file here, run `npm run check`
and `npm run build` in every app that imports it.
