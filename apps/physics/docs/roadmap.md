# Roadmap

The first generators are **Coil and Magnet**, **Inclined Plane** and **Pulley**
(see `CONTEXT.md` and ADR 0002), followed by the **Free Body Diagram**, the
figure teachers search for most. The ones below came from the same teacher
request and are planned next, in this order. Each still needs its own design
questions before it is built.

## Free Body Diagram (built)

One body, a dot or an Object, with up to eight forces at any angle, drawn at
relative lengths, with optional angle marks, components, and velocity or
acceleration beside it. Left out on purpose, until teachers ask: tilted
(along-the-slope) axes, plain x/y axes, a net force arrow, more than one body
per figure, and placing a label by hand. Its force list is the settings `list`
field, which the Torque Generator uses for its loads.

## Projectile Motion (built)

A ball or dot launched from level ground or off a cliff, with its real
parabolic path, the launch velocity, its angle and components, g, the ball at
equal time steps (lettered or not), and marks for the maximum height, range
and cliff height. Kept simple on purpose, next to the textbook figure it came
from: no formulas on the figure, no axes, no velocity arrows along the path,
no downward launches, no landing on a raised or sloped surface, and no air
resistance, until teachers ask.

## Vector Diagram (built)

Up to three vectors drawn to scale head to tail, each set by its magnitude
(in grid squares) and direction, and their resultant. Every vector and the
resultant can be drawn solid, dashed or left off, and each can show an angle
mark and its components. A grid (no tick marks) is on by default; plain x and
y axes through the first tail are optional. Left out on purpose, until
teachers ask: vector subtraction, tail-to-tail (parallelogram) addition,
setting a vector by its components, tick marks or a scale, and more than
three vectors.

## Wave (built)

A transverse wave against distance or time, a longitudinal wave as vertical
lines bunched at its compressions, or the longitudinal one above its matching
transverse one, on numbered axes fitted to the wave (gridlines or tick
marks), or with no axes about a dashed rest line. The amplitude, wavelength
or period, and cycles are set; λ (or T) and A are marked with arrows, and a
crest, trough, compression and rarefaction can be labeled. Next, in the same
generator: standing waves (harmonic n, nodes and antinodes) and
superposition (two waves and their sum). Left for later: sound waves (loud
and quiet, high and low pitch), the Doppler effect, the EM spectrum,
diffraction and interference.

## Lever (built)

A class 1, 2 or 3 lever: a weightless beam on a fulcrum, drawn to scale from
its two arms, with one load (a block or a force arrow, in N, lb, kg or g),
an effort arrow worked out so the lever balances, and the two arms marked
from the fulcrum. Any of the four values can be the unknown, and the parts'
names can be blank lines; the answer key gives the mechanical advantage and
the effort. Left out on purpose, until teachers ask: wedges, screws and the
wheel and axle (each would be its own generator), named real levers
(wheelbarrow, crowbar, tweezers, forearm), a tilted lever, work in and out,
efficiency, compound levers, distances between neighbours rather than from
the fulcrum, and other values of g.

## Circular Motion (built)

An object going round a circle in one of three setups: the Top view (a
dashed circle from above with the object at 1 to 8 positions, on its own, on
a string, on a turntable, with a second object halfway out, or on a flat
road), the Vertical circle (the top, side or bottom on a string or inside a
loop, or the top of a hill or the bottom of a dip), and the Conical pendulum.
Velocity and centripetal acceleration are dashed; an inward force (Top view),
or gravity with the tension or normal force (side views), are solid, the
Conical pendulum's to scale with its tension's components. Marks: radius or
diameter, angular speed ω, an angle mark, and letters at the positions.
Left out, in order: a banked curve as a fourth setup (seen from behind the
car, with friction up or down the bank and the velocity into the page);
values and an answer key (m, r, v giving a_c and F_c); then non-uniform
motion, arc length, a top and side view together, a sagging horizontal
string, a rotor or a car on a wall, any angle on the vertical circle, and
more than two objects on a turntable. Circular orbits go to a future orbits
and gravitation generator.

## Roller Coaster (built)

A track through 2 to 8 points, evenly spaced from left to right, each with a
height from 0 to 100: a smooth curve that never overshoots, so a point higher
than its neighbours is the top of a hill and a lower one the bottom of a dip.
Each point can have a dot and label and a height mark; one loop, to scale with
the heights; a cart, ball or block at a point or upside down at the top of the
loop, with a dashed velocity arrow; rough stretches, hatched, with a friction
label and horizontal length marks under the ground. Nothing is worked out
from the heights. Left out, in order: energy bar charts (their own generator,
which could start from a roller coaster point); speeds, energies and an answer
key worked out from the heights (with a mass, a starting speed and a
coefficient typed in); a spring launcher or a spring at the end, once the
Spring Generator's coil exists; then more than one loop, uneven spacing
between points, length marks on stretches that aren't rough or along a slope,
the object drawn at every point, force arrows on it (the Free Body Diagram's),
solid ground under the track, supports, a projectile path off the end, and
dragging points on the figure. Radius marks on single hills and dips stay with
Circular Motion.

## Torque (built)

A level beam on a pivot, on two supports A and B, or at a wall with a cable
(a hanging sign) or fixed into it (a cantilever), with up to six loads:
objects hanging from it or resting on it, and force arrows down or up, in N,
kg or g (g = 9.8, 9.81 or 10 N/kg). Places are to scale along the beam; the
beam can have its own weight at its middle. Distance marks stack in rows above
the beam; support forces (with a cantilever's wall moment as a curved arrow),
tension and weight arrows can be drawn. The panel
works out the torques, the forces at A and B (warning when one comes out
negative), or the tension and the wall's force, and "Balance with this load"
sets a load to the value that balances a pivot. It reuses the Lever's beam,
fulcrum, forces and distance marks (`src/lib/shared/beam.ts` and
`Beam.svelte`), with the wall hatching in `src/lib/shared/support.ts`. Of the
old open questions, a beam with its own weight and two pivots are in; a spring
scale holding the beam is a Force up arrow for now; meter-stick markings are
left for later. Left out, in order: ladders against a wall, with and without
friction (the first follow-up); forces at other angles, a second cable, a
strut or a crane; meter-stick markings, distances between neighbouring loads,
and a tilted beam; people on a seesaw, a wrench or a door; a drawn spring
scale, a title and printed answer key, center-of-mass problems.

## Pendulum (built)

A bob on a string from a pivot under a hatched ceiling, 5° to 75° from the
vertical, to the left or right. The Swing (the default, for energy problems)
draws the bob at its release point and, lighter, at the bottom and at the same
height on the far side (θ at least 15°), with letters A, B, C and a velocity
arrow at the bottom; One bob can show the tension and weight, or weight's
components along the string and the path, drawn at the release point. Marks:
the dashed path, θ, the string length L, and the height h on the far side. The
string is one fixed length, and nothing is worked out. Left out, in order:
values and an answer key (L and θ giving h = L(1 − cos θ) and the speed at the
bottom, √(2gh)), the first follow-up if teachers ask; then forces at other
points of the swing (the tension at the bottom bigger than mg), acceleration
arrows (centripetal at the bottom, tangential at the ends), energy bar charts
at A, B and C (with the roller coaster's), and conical (on Circular Motion
already), double, physical and ballistic pendulums, and a pendulum hitting a
block.

## Spring (built)

A spring fixed to a hatched ceiling, or to a wall with the object on a floor,
with a block, a ball or slotted masses on its free end. Three choices shape
it: the orientation; the picture (one spring, Before and after for Hooke's
law, or Three positions at −A, equilibrium and +A for simple harmonic
motion); and one spring, or two or three in series or in parallel. The
extension runs from −50% (squashed, on a floor only) to 100% of the natural
length; marks are the extension x, the natural length L₀, a dashed
equilibrium line and an applied force; Three positions adds velocity and
acceleration arrows. The coil, zigzag or loops, is redrawn at every length
with the same turns (`src/lib/shared/spring.ts`, ready for other generators)
and the hatching is `src/lib/shared/support.ts`. Labels are text, so springs
in series stretch equally. Left out, in order: springs inside other setups (on
a ramp, between blocks, on a cart: options on Inclined Plane and Pulley using
`coilPath`), and a spring launcher on the Roller Coaster; values and an answer
key (k in N/m and m in kg, the extension worked out as mg/k and drawn to
scale), the first follow-up if teachers ask; then a thicker spring for a
bigger k, unequal extensions in series, force–extension graphs, energy bar
charts, springs launching projectiles, and pistons.

## Magnetic Field

Field figures that don't belong to Coil and Magnet (ADR 0002 keeps that one to
"a coil and what's next to it"). The Electric and Magnetic Field Generator
draws a bar magnet, a wire seen end-on, point charges and parallel plates,
with the Coil and Magnet's magnet field lines. Left for it, or for later:

- Equipotential lines, unequal charges (+2q and −q) and three or more charges
- Charges with values and distances, for Coulomb's law problems
- A uniform field into or out of the page, as dots and crosses
- Two bar magnets attracting or repelling
- A horseshoe magnet
- Iron filings instead of field lines
- A loop seen end-on

## Circuits

The Circuit Diagram Generator draws a cell or battery with 1 to 4 resistors
or bulbs, all in series or all in parallel, with a switch, an ammeter and a
voltmeter (ADR 0005). Anything else is left to a Circuit Editor, planned but
not built yet, where a teacher would draw a circuit by hand; until then the
generator page says it's coming soon. Left for later:

- A pictorial style (drawn bulbs, D-cells, real-looking wires) for middle
  school, drawn from the same tree
- Capacitors, variable resistors, fuses, diodes and inductors
- Bridge circuits, which a series/parallel tree can't describe

## Atomic Models

Atomic modeling for introductory courses, such as Bohr models with electron
shells, energy level diagrams, and nuclei with protons and neutrons. Last,
because introductory physics uses it least.

## Later ideas

- **Copy description**: a toolbar button that copies a short written
  description of the figure, built from its settings, for alt text in Docs or
  Slides. Blank labels would be described as blank so the description never
  gives an answer away. Not now.
