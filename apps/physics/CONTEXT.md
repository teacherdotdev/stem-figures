# Physics Figures

Physics Figures (physicsfigures.com) is a directory of generators that make
clean, printable physics figures for teachers to paste into tests, worksheets
and slides. It is a teacher.dev project.

## Language

### The directory

**Figure**:
A finished physics picture a teacher puts in front of students, such as a coil with a moving magnet or a block on an inclined plane.
_Avoid_: Graphic, image, visual, resource, diagram (except inside a figure's standard name, such as a free body diagram or circuit diagram, where it stays in the generator's name and search words)

**Generator**:
A page that makes one kind of figure from a teacher's settings, named "<Figure> Generator".
_Avoid_: Maker, tool, builder, app

**Directory**:
The home page, which lists every generator with a live preview of its figure. There are no generators yet, so it shows only the card for a generator request.
_Avoid_: Catalog, gallery, index

**Generator request**:
A teacher asking for a kind of figure that no generator makes yet.
_Avoid_: Feature request, suggestion

### Parts of every figure

**Object**:
A block, ball, cart or hanging mass in a figure. Its drawn size is its own setting, apart from its label, and every object starts the same size, so a 5 kg block isn't bigger than a 2 kg one unless the teacher makes it so.
_Avoid_: Mass (for the thing drawn; fine inside a label), body, item

**Mirror**:
A generator's one switch that flips its figure left to right, so a ramp rises the other way or a magnet comes from the other side. Letters and numbers stay readable, and N and S keep their meaning.
_Avoid_: Flip, reverse, direction

**Label**:
Text drawn beside a part of a figure, such as m₁, 5 kg, 30°, θ, N or S. Each one can be written text, a blank line for students to fill in, or left off.
_Avoid_: Caption, tag, annotation

**Vector**:
An arrow drawn on a figure for a force, velocity or acceleration, such as gravity on a block or the motion of a magnet. It is drawn about the right size, not to scale, looks the same in every generator, and has its own label. Forces are solid; velocity and acceleration have a dashed shaft at full weight, so they're never read as forces, even photocopied. On a Free Body Diagram the teacher sets each force's length relative to the others, so equal forces are drawn equal. On a Vector Diagram vectors are drawn to scale, and the teacher picks solid or dashed for each one.
_Avoid_: Arrow (alone), force line

**Chart title**:
The title across the top of a figure.
_Avoid_: Title (alone), heading

**Preset**:
A named set of settings for one generator, saved by the teacher in their browser. None are built in.
_Avoid_: Template, favorite

### Coil and Magnet

**Coil and Magnet**:
A figure of a coil of wire seen from the side, with a bar magnet, a battery or nothing beside it, for electromagnetic induction and electromagnets. Its generator is the Coil and Magnet Generator.
_Avoid_: Induction diagram, solenoid (fine as a search word)

**Field line**:
A curve showing the direction of a magnetic field, with arrowheads along it. Field lines follow the real shape of the field, so they never cross.
_Avoid_: Flux line, field arrow

**Meter**:
The galvanometer that can be wired to a coil, with its needle to the left, right, centered or blank.
_Avoid_: Ammeter, gauge

**Current arrow**:
A small arrow on a coil's wire showing which way the current flows. It often gives away the answer, so it can be turned off.
_Avoid_: Current direction, flow arrow

### Inclined Plane

**Inclined Plane**:
A figure of a ramp at an angle with an object on it, a block, a ball or a cart, or a row of up to three. Its generator is the Inclined Plane Generator. A ramp with a pulley on it belongs to the Pulley.
_Avoid_: Ramp (fine as a search word), slope, wedge

**Row**:
Two or three objects side by side on a slope, table or ramp, tied by strings or touching. Each one has its own gravity, normal force and friction, numbered from the back (or the foot) on. Objects touching push on each other with a pair of contact forces, move as one, and get one velocity or acceleration arrow.
_Avoid_: Train, chain, system (fine as a search word)

### Pulley

**Pulley**:
A figure of objects connected by string over one or more pulleys, in one of its setups. Its generator is the Pulley Generator. Every figure with a pulley is a Pulley figure; objects tied in a row on a slope with no pulley are an Inclined Plane.
_Avoid_: Pulley system, rope diagram

**Setup**:
One arrangement a Pulley figure can take: Atwood machine (two hanging objects over one fixed pulley, and maybe a third hanging below one of them), table and hanging mass, ramp and hanging mass (each with one object, or a row of two, on the table or ramp), or block and tackle (one load held by 1 to 4 strands).
_Avoid_: Mode, type, scenario

**String**:
One piece of string between two objects, over any pulleys between them. When a figure has more than one, each has its own tension, numbered T₁, T₂.
_Avoid_: Rope (fine in a block and tackle), cord, segment

### Free Body Diagram

**Free Body Diagram**:
A figure of one body alone, a dot or an Object, with every force on it drawn from its middle and nothing around it: no ramp, string or floor. Its generator is the Free Body Diagram Generator. The ramp or pulley a problem is about is an Inclined Plane or Pulley figure; its free body diagram is this one.
_Avoid_: Force diagram (fine as a search word), FBD (fine as a search word)

**Body**:
What a Free Body Diagram is of: a dot (the usual AP convention) or a block, ball or cart. It has no label.
_Avoid_: Particle, point mass

**Force list**:
The forces on a Free Body Diagram, up to eight, each with its own angle (counterclockwise from the right), length relative to the others, and label. Starter buttons add the usual ones (gravity, normal, friction, tension, applied, spring, air resistance) pointing the usual way.
_Avoid_: Force slots

**Angle mark**:
An arc on a Free Body Diagram between an angled force and a dashed horizontal or vertical reference line, with its own label, measured from the nearer half of that line.
_Avoid_: Angle arc (alone)

**Component**:
One of the two thinner, dashed, lighter arrows along the horizontal and vertical that add up to an angled force. Components often give away the answer, so each force's are off unless turned on.
_Avoid_: Projection, part

### Projectile Motion

**Projectile Motion**:
A figure of a ball or dot launched to the right from level ground or off the top of a cliff, with the path it follows until it lands on the ground. The ground is a plain line, like an axis, not a hatched floor, and on it the ball's middle sits on the line at the launch and the landing. Its generator is the Projectile Motion Generator. The path is the real parabola for the launch angle and cliff height, drawn to fit, while its vectors are drawn about the right size, not to scale.
_Avoid_: Trajectory diagram (fine as a search word), projectile (alone, for the figure), cannon

**Launch**:
Where the ball starts and how: from level ground at 10° to 85°, or from a cliff at 0° (a horizontal launch) to 85°, with the launch velocity, its angle mark and components drawn there. Air resistance is never drawn.
_Avoid_: Throw, kick, fire

**Path**:
The dashed curve the ball's middle follows from the launch to the ground. It can be hidden for "sketch the path" questions.
_Avoid_: Trajectory (fine as a search word), arc (that's an angle mark's), curve

**Time step**:
The ball drawn again along the path at equal times after the launch, the last one where it lands, so its even spacing across and uneven spacing down show. They can be lettered A, B, C… from the launch.
_Avoid_: Snapshot, frame, strobe (fine as a search word), point (that's a circuit's)

### Vector Diagram

**Vector Diagram**:
A figure of up to three vectors drawn to scale head to tail, each set by its magnitude and direction, with their resultant, for vector addition and components. Its generator is the Vector Diagram Generator. It has no body and says nothing about what the vectors are, so it serves displacement, velocity and force problems alike. Forces on one body drawn from its middle are a Free Body Diagram. There is no vector subtraction: a teacher who wants −B sets B's direction the other way.
_Avoid_: Vector addition diagram (fine as a search word), head-to-tail diagram

**Magnitude**:
How long a vector on a Vector Diagram is, in grid squares, from 0.5 to 12.
_Avoid_: Length, size

**Resultant**:
The vector from the first vector's tail to the last one's tip: the sum. It is drawn solid, dashed or left off like any other vector, and the generator shows its magnitude and direction for the answer key.
_Avoid_: Net vector, sum vector, total

**Arrow style**:
Whether a vector on a Vector Diagram is drawn solid, drawn dashed, or left off. A vector left off still takes its place in the chain, so the gap is there for students to draw it in.
_Avoid_: Line style, visibility

**Grid**:
Light squares behind a Vector Diagram, one per unit of magnitude, lined up with the first tail. It has no tick marks or numbers. On by default.
_Avoid_: Graph paper (fine as a search word)

**Axes**:
Plain x and y axes through the first tail of a Vector Diagram, with an arrowhead at each end and x and y at the positive ends, but no tick marks. Off by default.
_Avoid_: Coordinate system

On a Vector Diagram, an **angle mark** is drawn at the arrow's tail and a **component** pair runs head to tail from it (along the horizontal, then the vertical to the tip), for any vector or the resultant. Both are off by default.

### Wave

**Wave**:
A figure of a transverse wave, a longitudinal wave, or a longitudinal wave above the transverse wave it matches, for measuring wavelength, period and amplitude. Its generator is the Wave Generator. The transverse wave is the exact sine curve, starting on its rest line at 0 and rising.
_Avoid_: Wave diagram (fine as a search word), sine wave (fine as a search word), oscillation

**Rest line**:
The line a transverse wave swings about: the x-axis on numbered axes, or a dashed line without them. The amplitude is measured from it.
_Avoid_: Equilibrium line (fine in captions), center line, midline

**Longitudinal wave**:
A row of vertical lines, bunched at each **compression** and spread out at each **rarefaction**. Drawn with a transverse wave, its compressions sit over the crests.
_Avoid_: Slinky, density diagram

**Mark**:
On a Wave figure, an arrow with a head at each end measuring the wavelength (or the period, against time) or the amplitude, with its own label.
_Avoid_: Dimension, measurement, bracket
### Motion Graph

**Motion Graph**:
A figure of one motion along a line: its position–time, velocity–time or acceleration–time graph, or all three stacked on the same time axis. Its generator is the Motion Graph Generator. Every graph is worked out from the velocity–time graph, so they always match.
_Avoid_: Kinematics graph, x–t graph, distance–time graph (all fine as search words)

**Segment**:
One stretch of the motion, up to six in a row: at rest, constant velocity forward or back, speeding up or slowing down, with its speed (the one it moves at, or speeds up or slows down to) and how long it lasts typed in. It is a straight line on the velocity–time graph. Speeding up and slowing down carry on from the velocity before them, and slowing down stops at rest rather than turning around.
_Avoid_: Section, phase, interval

**Segment end**:
Where a segment starts or ends, lettered A, B, C… from the start, for questions like "what is the cart doing between B and C?". The letters are the same on every graph.
_Avoid_: Point (that's a circuit's), node

**Tangent**:
A dashed line touching the position–time graph at a chosen time. Its slope is the instantaneous velocity there.
_Avoid_: Slope line

**Ranges**:
Each axis's From, To and Count by. They are fitted to the motion unless the teacher sets them, to make several graphs on a worksheet match. Stacked graphs share the time axis's range; each has its own up its side.
_Avoid_: Scale, window, zoom

### Circuit Diagram

**Circuit Diagram**:
A schematic of a cell or battery with 1 to 4 resistors or bulbs, all in series or all in parallel, for current and resistance problems. Its generator is the Circuit Diagram Generator. It is drawn from a series/parallel tree built from its settings, not placed by hand (ADRs 0004 and 0005). Any other circuit is left to a Circuit Editor, planned but not built yet.
_Avoid_: Circuit (alone, for the figure), schematic (fine as a search word), wiring diagram

**Arrangement**:
How a Circuit Diagram's resistors and bulbs are joined: all in series round one loop, or all in parallel as the rungs of a ladder. A switch and an ammeter are always in the main line.
_Avoid_: Layout, topology, mode

**Part**:
One symbol on a circuit diagram: a battery, resistor, bulb, switch or ammeter. Each has a name label (R₁) and a value label (4 Ω). Names are numbered automatically until the teacher types one. On the Circuit Diagram a voltmeter is not a part: it goes across the battery or one part.
_Avoid_: Component, element, device

**Group**:
Parts joined in series or in parallel inside a circuit. A parallel group holds two or more branches.
_Avoid_: Block, cluster, sub-circuit

**Branch**:
A run of wire that carries one current: the main loop, or one branch of a parallel group. A current arrow belongs to a branch.
_Avoid_: Path, leg, rung (except for the drawing of a ladder)

**Point**:
A lettered dot on a wire (A, B…), for questions like "the potential difference between A and B". Points sit in the gaps between parts. The tree holds them, but the generator doesn't offer them for now.
_Avoid_: Node, junction (a junction is where wires meet, drawn as a dot with no letter), terminal

**Symbol style**:
US symbols (a zigzag resistor, a bulb with a looped filament) or IEC symbols, as UK GCSE uses (a box resistor, a bulb with a cross).
_Avoid_: Standard, notation

### Ray Diagram

**Ray Diagram**:
A figure of one lens or mirror on its principal axis, an object in front of it, the principal rays from the object's tip and the image they make, for optics. Its generator is the Ray Diagram Generator. It is drawn to scale in cm, the same across as up, and the image is exactly where the thin lens and mirror equation, 1/f = 1/d_o + 1/d_i, puts it. The light always comes from the left, so it has no Mirror (flip) switch: on this page a mirror is only ever the optical one.
_Avoid_: Optics diagram (fine as a search word), lens diagram

**Element**:
The one lens or mirror a Ray Diagram is of: a converging or diverging lens (drawn as its shape or as the line symbol), or a concave, convex or plane mirror (a shallow arc or a line, hatched on its back). Rays bend at the vertical line through a lens's middle, and reflect at the vertical line through a mirror's vertex, the thin-lens convention textbooks draw.
_Avoid_: Optic, device, part (that's a circuit's)

**Principal axis**:
The horizontal line through the middle of the element. The object stands on it, and the focal points are marked on it.
_Avoid_: Optical axis (fine as a search word), center line

**Focal point**:
A point marked on the principal axis with a dot and a label: F, F′, 2F and 2F′ on a lens (F and 2F on the object's side), F and C on a mirror (in front of a concave mirror, behind a convex one). A plane mirror has none.
_Avoid_: Focus (fine as a search word)

**Principal ray**:
One of the rays from the object's tip that a rule says where to draw: on a lens, parallel then through F′, through the center undeviated, and through F then parallel; on a mirror, parallel then through F, through F then parallel, through C and back on itself, and to the vertex and back at the same angle. A plane mirror has two rays from the tip, one to the mirror level with the object's foot and one above the tip. Each can be turned off, and each has small arrowheads showing which way the light goes. In color, each has its own color.
_Avoid_: Light ray (fine in captions), beam, line

On a Ray Diagram the **object** is always an arrow, upright or pointing down, standing on the principal axis, its distance and height set in cm.

**Image**:
The arrow where the principal rays from the object's tip meet. A real image is solid, where the rays themselves meet. A virtual image is dashed, where the rays' dashed extensions meet. The object at F of a converging lens or concave mirror has no image: its rays leave parallel. An image more than six focal lengths away is left off and the rays run off the figure's edge.
_Avoid_: Picture, reflection

**Shown**:
How much of a Ray Diagram is drawn: the setup (the element, principal axis, focal points and object, for students to draw the rays), the rays too, or everything, the rays and the image. All three are laid out alike, so a blank setup and its completed figure line up.
_Avoid_: Mode, stage, view

**Scale**:
A numbered cm ruler under a Ray Diagram, with 0 under the element, for students to measure distances.
_Avoid_: Ruler (fine as a search word), grid

The **answer key** gives the image distance and magnification, real is positive (an image distance is negative for a virtual image), with the words too: real or virtual, upright or inverted, magnified, diminished or the same size, and which side the image is on.
