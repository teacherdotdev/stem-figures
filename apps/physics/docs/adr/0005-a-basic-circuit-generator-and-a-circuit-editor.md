# A basic Circuit Diagram Generator, and a Circuit Editor for the rest

Circuits are the figure teachers ask for most (43 requests by October 2026). The Circuit Diagram Generator built for ADR 0004 had an outline editor for any series/parallel tree, and it was switched off before launch: a settings column that edits a tree is slow for the common case and still can't draw a bridge, a second loop, or a part in the place the teacher wants. We split the job in two. The generator keeps to the circuits worksheets start with, a cell or battery and 1 to 4 resistors or bulbs, all in series or all in parallel, with an optional switch, an ammeter in the main line and a voltmeter across one part, set in flat settings like every other generator. Anything else is left to a **Circuit Editor**, planned but not built yet: a page modelled on Chemistry's Organic Structure Editor, with parts dragged from a tray onto a grid and joined by wires that route themselves at right angles, kept in the browser. An **Edit by hand** button on the generator would open its circuit in the editor, so a teacher could start from a generated circuit and add what it can't do. Until the editor ships, the generator says in plain text that one is coming, with no link.

## Update — 2026-11

The Circuit Diagram Generator now has a **Build a circuit** mode alongside quick setup. It edits the existing series/parallel tree directly, supports nested groups and up to eight parts, and can draw either a closed loop or an open two-terminal network. The tree remains in the shareable page address. This covers mixed worksheet diagrams without introducing the free-positioned grid editor described above; bridges and multiple independent loops remain outside the tree model.

ADR 0002 turned down a design canvas as the way into the site; this is not that. Each figure still has its generator, and the editor would be the one place a teacher draws by hand, for the figure no settings form can cover.

## Considered Options

- **Keep the outline editor in the generator**: covers combination circuits, but most teachers want series or parallel, and the outline was the slowest part of the page to use.
- **Only an editor**: any circuit at all, but every figure is drawn by hand, even the three-resistor loop most questions need.

## Consequences

The generator's settings are flat and live in the page address; it builds the series/parallel tree of ADR 0004 from them and lays it out with the same code, so its figures still never cross wires. The rest of the tree code (nested groups, points, current arrows, the address string) stays, unused by the generator for now, because the planned hand-off would draw the editor's circuit from the generator's layout. The editor would have no settings in its address and keep its drawing in localStorage, like the Structure Editor, whose scaffolding (grid, tray, undo, export) would be copied into this app rather than shared, so each site stays independent.
