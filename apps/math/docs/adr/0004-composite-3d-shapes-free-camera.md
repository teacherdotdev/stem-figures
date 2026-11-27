# Composite 3D shapes: built with a free camera, printed as textbook line drawings

The Composite 3D Shape Editor works like Tinkercad: the figure is built in a shaded 3D view whose camera turns freely (drag to turn, right-drag to move, scroll to zoom), and pieces are dragged in from a palette and snapped onto flat faces. Beside it, the figure that prints is drawn as a textbook line drawing (white, thin black lines, hidden edges dashed, labels), in one of two ways the teacher picks: **as the 3D view**, a parallel projection from the camera's own direction (no perspective), or **textbook front**, the 3D shape generators' oblique view with the front face square-on. Both come from one general parallel projection, so hidden edges, seams and labels work the same in each.

An earlier version of this decision fixed the view to the oblique front, then to two fixed styles, with no free camera, because textbooks draw composite solids front-on or from a corner. In use, building a figure without being able to turn it round was confusing, and adding a piece by hovering a face for a hidden + was hard to find. Editing and printing want different things: the teacher needs to see and reach every face while building, and the printed figure needs to look like a textbook's.

## Considered Options

- **A fixed oblique view, or two fixed styles (front and corner), for building and printing**: always textbook-looking, but the figure can't be turned to reach its back or sides, and building it was hard to follow.
- **Perspective in the 3D view**: how Tinkercad and modelling tools look, but the printed figure would then not match what the teacher sees, and lengths on the page stop matching their labels. The 3D view uses an orthographic camera instead, so it matches the figure "as the 3D view" exactly.

## Consequences

- The 3D view needs WebGL (three.js), loaded only on this page. The printed figure doesn't: it's still drawn as SVG from the model, so it exports and prints as before.
- Holes show in the 3D view as see-through grey solids, as Tinkercad shows them; only the printed figure shows them taken away.
- A figure "as the 3D view" can be drawn from any angle, including views where no face is square-on and right angles don't look square; the textbook front view stays one click away.
