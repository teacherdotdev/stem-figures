// The words in each generator's About drawer: what its figures show and how
// teachers use them, what can be set, and frequently asked questions, for
// GeneratorAbout and the page's structured data. Everything here should be
// true of the generator's code; check it when a generator changes.
// Plain text only: the same strings go into JSON-LD.

export interface Faq {
  q: string
  a: string
}

export interface GeneratorCopy {
  /** the drawer's visible heading */
  heading: string
  /** one or two short paragraphs */
  intro: string[]
  /** "What you can set", one line each */
  settings: string[]
  faqs: Faq[]
  /** what the generator's social card image (/og/<id>.png) shows */
  imageAlt: string
  /** schema.org educationalLevel */
  educationalLevel: string[]
}

export const COPY: Record<string, GeneratorCopy> = {
  'free-body-diagram': {
    heading: 'Free body diagrams with forces at any angle',
    intro: [
      'The Free Body Diagram Generator draws one body, a dot or a block, ball or cart, with every force on it drawn as an arrow from its middle, and nothing else around it: no floor, ramp or string. You set each force’s direction, in degrees counterclockwise from the right, and its length compared with the others, so equal forces are drawn equal and a bigger force is drawn longer.',
      'Teachers use it for Newton’s laws questions on tests, worksheets and slides: draw the forces for students to name, or leave the labels blank for them to fill in. For a force at an angle, mark its angle or show its components, for questions on resolving forces. Velocity and acceleration can go beside the body as dashed arrows, so they’re never taken for forces.',
    ],
    settings: [
      'The body: a dot, or a block, ball or cart drawn at 50% to 200% of its usual size',
      'Up to eight forces, each with its direction, length and label, added from buttons for gravity, normal, friction, tension, applied, spring and air resistance forces pointing the usual way',
      'For a force at an angle, an angle mark from the horizontal or vertical, and its horizontal and vertical components',
      'Every label written, with subscripts and Greek letters such as θ and μ, a blank line for students, or left off',
      'Vector notation: an arrow over every vector’s label or every one in bold, or \\vec{F} or \\mathbf{F} typed in one label',
      'Forces pointing the same way drawn side by side, each with its own length and label',
      'Velocity and acceleration arrows beside the body, drawn dashed',
      'Mirror, to flip the figure left to right, and color for slides',
    ],
    faqs: [
      {
        q: 'What goes on a free body diagram?',
        a: 'Only the body and the forces acting on it, each an arrow pointing the way the force acts. Forces the body exerts on other things don’t belong, and neither do the floor, ramp or rope. Velocity and acceleration aren’t forces, so the generator draws them dashed, beside the body rather than on it.',
      },
      {
        q: 'Should the body be a dot or a box?',
        a: 'Either. AP Physics asks for a dot, with every force starting from it. A block, ball or cart helps younger students see what the diagram is of; the forces still start from its middle.',
      },
      {
        q: 'How do I set which way a force points?',
        a: 'Directions are in degrees counterclockwise from the right: 0° points right, 90° up, 180° left and 270° down. The Up, Down, Left and Right buttons set those four, and the slider or the box sets any angle in between.',
      },
      {
        q: 'Are the forces drawn to scale?',
        a: 'Roughly. Each force has a length from 0.25 to 2 times the usual, measured past the body’s edge, so you can draw balanced forces equal and a bigger force longer. The lengths show which force is bigger, not an exact scale.',
      },
      {
        q: 'Which way do the normal force and friction point on a ramp?',
        a: 'The normal force points straight out of the surface, at a right angle to it, and friction points along the surface, against the way the body slides or would slide. On a ramp rising to the right at angle θ, the normal force is tilted θ from the vertical: set its direction to 90° plus θ.',
      },
      {
        q: 'Can two forces point the same way, like the normal force and tension both up?',
        a: 'Yes. Forces set to exactly the same direction are drawn side by side, as parallel arrows a small gap apart, so neither hides the other. Each keeps its own length and label, with the label beside its arrowhead. Three or more can share a direction too, such as several people pushing a box the same way.',
      },
      {
        q: 'Can the labels use vector notation, like an arrow over the F?',
        a: 'Yes. Set Vector notation to Arrow to draw an arrow over the letters of every force’s label (and its components’, and velocity and acceleration), or to Bold to set them in bold, as many textbooks do. For a single label, type it the LaTeX way: \\vec{F}_g gives F with an arrow over it and a subscript g, and \\mathbf{F}_g a bold F.',
      },
      {
        q: 'How do I show components without giving away the answer?',
        a: 'Components are off until you turn them on for a force. They’re drawn as thinner, lighter dashed arrows along the horizontal and vertical, with dotted guides from the force’s tip, and their labels can be left blank for students.',
      },
    ],
    imageAlt: 'A printable free body diagram of a block with gravity, normal, applied and friction forces, made with the Free Body Diagram Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'vector-diagram': {
    heading: 'Vector addition diagrams, drawn to scale head to tail',
    intro: [
      'The Vector Diagram Generator draws up to three vectors to scale, head to tail, on a grid where one square is a magnitude of 1, with their resultant from the first tail to the last tip. You give each vector its magnitude, from 0.5 to 12 squares, and its direction in degrees counterclockwise from the right, and the generator tells you the resultant’s magnitude and direction for your answer key.',
      'It doesn’t say what the vectors are, so the same figure works for displacement, velocity and force problems. Draw any vector or the resultant dashed, or leave it off for students to draw in, and mark angles or show components for questions on resolving vectors.',
    ],
    settings: [
      'Up to three vectors, each with its magnitude in grid squares (0.5 to 12) and its direction',
      'Each vector and the resultant drawn solid, dashed or left off, with its own label',
      'For any arrow at an angle, an angle mark from the horizontal or vertical, and its x and y components',
      'A grid, one square per unit of magnitude, and plain x and y axes through the first tail',
      'Mirror, to flip the figure left to right, and color for slides',
    ],
    faqs: [
      {
        q: 'How do you add vectors head to tail?',
        a: 'Draw the first vector, then start the second at the first one’s tip (its head), and so on. The resultant runs from the first vector’s tail to the last vector’s tip. With A 4 squares to the right and B 3 squares up, the resultant is 5 squares long, about 36.9° above the horizontal.',
      },
      {
        q: 'How do you find a vector’s components?',
        a: 'A vector of magnitude A at angle θ above the horizontal has an x-component of A cos θ and a y-component of A sin θ. Turn on Show its components to draw them as thinner dashed arrows, along the horizontal and then up or down to the tip.',
      },
      {
        q: 'Can I subtract vectors?',
        a: 'There’s no subtraction setting, but A − B is A + (−B): add B with its direction turned around 180° and label it −B. The resultant is then A − B.',
      },
      {
        q: 'Can I leave the resultant for students to draw?',
        a: 'Yes. Set the resultant’s arrow to Left off. It isn’t drawn, but the Resultant settings still show its magnitude and direction for your key. Any vector can be left off the same way, leaving a gap in the chain for students to fill in.',
      },
      {
        q: 'What does one grid square stand for?',
        a: 'A magnitude of 1. The grid has no numbers, so you say what a square is worth, like 1 m, 1 m/s or 10 N. It’s lined up with the first tail, so tips land on grid points whenever the magnitudes and angles allow.',
      },
    ],
    imageAlt: 'A printable vector diagram: two vectors head to tail on a grid with their dashed resultant, made with the Vector Diagram Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'inclined-plane': {
    heading: 'Inclined plane diagrams: a block, ball or cart on a ramp',
    intro: [
      'The Inclined Plane Generator draws a ramp at any angle from 5° to 60° with a block, ball or cart on its slope and the angle marked at its foot. Mark the slope’s length and the ramp’s height, hatch the slope to show it’s rough, and add the forces on the object: gravity straight down, the normal force out of the slope, and friction or an applied force along it.',
      'For connected objects, put two or three on the slope in a row, tied together by strings or touching. Each gets its own gravity, normal force and friction, numbered, with the tension in the strings or the contact forces where they touch.',
      'Teachers use it for Newton’s laws, friction and energy questions. Every label can be written, a blank line for students, or left off, so the same ramp works as the question and as its key. Velocity and acceleration are drawn dashed, above the object, so they’re never taken for forces.',
    ],
    settings: [
      'Up to three objects, each a block, ball or cart with its own label and size, and how far up the ramp they sit',
      'Two or three objects tied by strings or touching',
      'The ramp’s angle, 5° to 60°, and its label, like θ or 30°',
      'A smooth slope or a rough, hatched one',
      'Gravity and the normal force, and friction and an applied force up or down the slope, each with its label',
      'Tension in the strings between objects, or the contact forces where they touch',
      'Velocity and acceleration up or down the slope, drawn dashed',
      'Marks for the slope’s length and the ramp’s height',
      'Mirror, so the ramp rises to the left, and color for slides',
    ],
    faqs: [
      {
        q: 'Which way does the normal force point on an incline?',
        a: 'Straight out of the slope, at a right angle to it, not straight up. On a ramp at angle θ it is tilted θ from the vertical, and when only gravity and the normal force act across the slope, it equals mg cos θ.',
      },
      {
        q: 'Which way does friction point on a ramp?',
        a: 'Along the slope, against the way the object slides or would slide. A block sliding down, or resting on the slope and held by friction, has friction up the slope; a block pushed up the slope has friction down it. Choose Up the ramp or Down the ramp.',
      },
      {
        q: 'Can it show gravity’s components along the slope?',
        a: 'No. Gravity is drawn as one arrow straight down, the way students first draw it, and resolving it into mg sin θ down the slope and mg cos θ into it is left for them.',
      },
      {
        q: 'Is the object drawn bigger for a bigger mass?',
        a: 'No. Every object starts the same size, so a 5 kg block isn’t drawn bigger than a 2 kg one. Its size is a setting of its own, from 50% to 200%, apart from its label.',
      },
      {
        q: 'Can I put more than one object on the ramp?',
        a: 'Yes, up to three in a row, tied together by strings or touching. Each one’s gravity, normal force and friction are numbered from the foot up, like F_g1 and F_g2. Tied objects show the tension at both ends of each string (T₁ and T₂ with two strings); touching objects show the pair of contact forces where they touch. The applied force pulls the object in front of a tied row, or pushes the one at the back of a touching row, and a touching row gets one velocity and one acceleration arrow, since it moves as one.',
      },
      {
        q: 'Can the ramp rise to the left?',
        a: 'Yes. Turn on Mirror under Figure to flip the figure left to right. The labels stay readable.',
      },
    ],
    imageAlt: 'A printable inclined plane figure: a block on a rough ramp with gravity, the normal force and friction, made with the Inclined Plane Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'pulley': {
    heading: 'Pulley diagrams: Atwood machines, tables, ramps and block and tackle',
    intro: [
      'The Pulley Generator draws objects tied by string over pulleys, in four setups: an Atwood machine, with two masses hanging over one fixed pulley and, if you like, a third hanging below one of them; one or two blocks or carts on a table, tied over a pulley at its edge to a hanging mass; the same on a ramp, tied over a pulley at its top; and a block and tackle, with 1 to 4 strands holding up a load. Strings are always drawn taut.',
      'Turn on tension, gravity, the normal force and friction to draw the forces for a Newton’s second law problem, and an acceleration arrow for each object. Two blocks on a table or ramp can be tied by a string or touching, with the contact forces between them. Every label can be written, a blank line for students, or left off.',
    ],
    settings: [
      'The setup: Atwood machine, table and hanging mass, ramp and hanging mass, or block and tackle',
      'Each object’s label and size; on a table or ramp, a block or a cart; in an Atwood machine, which side hangs lower',
      'A third object: in an Atwood machine, hanging below the left or right one; on a table or ramp, a second one behind the first, tied by a string or touching',
      'The ramp’s angle, 10° to 60°, and its label, and a smooth or rough surface',
      'In a block and tackle, 1 to 4 strands holding up the load',
      'Tension along the strings, gravity on each object, the normal force and friction on each object on a table or ramp, the contact forces between objects touching, and each object’s acceleration',
      'Mirror, to flip the figure left to right, and color for slides',
    ],
    faqs: [
      {
        q: 'What is an Atwood machine?',
        a: 'Two masses hanging from one string over a fixed pulley. With a light string and a frictionless pulley, the heavier mass falls and the lighter one rises, both with acceleration a = (m₂ − m₁)g / (m₁ + m₂), where m₂ is the heavier mass.',
      },
      {
        q: 'Why are the tension arrows labeled T, or T₁ and T₂?',
        a: 'With a light string over a light, frictionless pulley, the tension is the same all along the string, so every tension arrow on it has the same label. With two strings, as in a three-mass Atwood machine or two blocks tied on a table, each string has its own tension, so they’re numbered T₁ and T₂. Change the label to a blank line if students should work that out.',
      },
      {
        q: 'Can I add a third mass?',
        a: 'Yes. In an Atwood machine, hang a third object below the left or right one on a string of its own. On a table or ramp, add a second object behind the first, tied to it by a string or touching it; then the normal force and friction on each are numbered, and objects touching can show the pair of contact forces where they touch. Up to three objects in all.',
      },
      {
        q: 'How does a block and tackle make lifting easier?',
        a: 'The load is held up by several strands of one rope, each pulling up with the same tension. With n strands holding the load, the effort at the free end is the load’s weight divided by n, ignoring friction and the pulleys’ weight, but the rope has to be pulled n times as far. That n is its ideal mechanical advantage.',
      },
      {
        q: 'Which way does friction point on the block?',
        a: 'Against the way the block slides or would slide. When the hanging mass pulls the block toward the pulley, friction points away from it. Choose Toward the pulley or Away from it.',
      },
      {
        q: 'Can I draw the forces on just one of the objects?',
        a: 'Use the Free Body Diagram Generator, which draws one body with only the forces on it, like the tension and weight on the hanging mass.',
      },
    ],
    imageAlt: 'A printable Atwood machine figure with tension, weight and acceleration arrows, made with the Pulley Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'projectile-motion': {
    heading: 'Projectile motion diagrams, from level ground or a cliff',
    intro: [
      'The Projectile Motion Generator draws a ball or dot launched to the right, from level ground at 10° to 85° or off the top of a cliff at 0° (a horizontal launch) to 85°, with the dashed path it follows until it lands. The path is the real parabola for the launch angle and cliff height, fitted to the figure, with no air resistance.',
      'Draw the launch velocity with its angle and components, the acceleration due to gravity, and marks for the maximum height, range and cliff height. The ball can be drawn again at equal time steps along the path, lettered A, B, C…, to show it moves the same distance across in each step but not the same distance down. Hide the path for “sketch the path” questions.',
    ],
    settings: [
      'Launched from level ground (10° to 85°) or off a cliff (0° to 85°), and how high the cliff is',
      'A ball, at the size you choose, or a dot',
      'The dashed path, shown or hidden',
      'The ball again at 1 to 8 equal time steps, lettered or not',
      'The launch velocity, its angle mark and its horizontal and vertical components, and g',
      'Marks for the maximum height, the range and the cliff’s height, each labeled, blank or left off',
      'Mirror, to launch to the left, and color for slides',
    ],
    faqs: [
      {
        q: 'Why is a projectile’s path a parabola?',
        a: 'Without air resistance, the ball moves across at a steady speed while gravity speeds it up downward at a steady rate. Its distance across grows evenly with time and its drop with time squared, which makes a parabola. The generator draws that exact curve for the launch angle and cliff height.',
      },
      {
        q: 'What do the equal time steps show?',
        a: 'The ball at equal times after the launch, the last where it lands. The steps are evenly spaced across, because the horizontal velocity doesn’t change, and unevenly spaced up and down, because gravity keeps changing the vertical velocity.',
      },
      {
        q: 'What launch angle gives the longest range?',
        a: 'On level ground, with no air resistance, 45°. Angles the same amount either side of 45°, like 30° and 60°, give the same range; the higher one goes higher and stays in the air longer.',
      },
      {
        q: 'Are the arrows drawn to scale?',
        a: 'No. The launch velocity, its components and g are drawn about the right size, not to scale, while the path’s shape is exact. The arrows are dashed, so they’re never taken for forces.',
      },
      {
        q: 'Can the ball be launched downward or land on a hill?',
        a: 'No. Launches are horizontal or upward, and the ball always lands on the level ground below its launch or at the cliff’s foot. Air resistance is left out.',
      },
    ],
    imageAlt: 'A printable projectile motion figure: a ball launched at an angle with its velocity components and dashed parabolic path, made with the Projectile Motion Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'motion-graphs': {
    heading: 'Position–time, velocity–time and acceleration–time graphs',
    intro: [
      'The Motion Graph Generator draws the graphs of an object moving along a line, built from up to six segments. Each segment is at rest, moving at a constant velocity forward or back, speeding up or slowing down, at a speed and for a time you type in. The rest of the numbers are worked out for you: the velocity–time graph is straight lines, and the position–time and acceleration–time graphs come from it exactly, so all three always match.',
      'Show the position–time, velocity–time or acceleration–time graph, or all three stacked on the same time axis, for questions that match one graph to another. Letter the segment ends A, B, C… for questions like “what is the cart doing between B and C?”, hide the numbers to show only the shapes, and draw a tangent on the position–time graph for instantaneous velocity.',
    ],
    settings: [
      'Up to six segments, each at rest, constant velocity forward or back, speeding up or slowing down, at a speed and for a time you type, in any order',
      'Which way a segment speeding up from rest goes, and where the motion starts',
      'The position–time, velocity–time or acceleration–time graph, or all three stacked',
      'Letters A, B, C… at the segment ends, and each segment in its own line style',
      'A tangent to the position–time graph at any time',
      'A chart title and axis titles, with superscripts and subscripts such as m/s², each written, a blank line, or left off',
      'Axes fitted to the motion, or ranges you set yourself for each graph, sharing one time axis when stacked',
      'Numbers on the axes or just the shapes, gridlines on or off, label size, and color for slides',
    ],
    faqs: [
      {
        q: 'How are the numbers worked out?',
        a: 'Each segment is a straight line on the velocity–time graph. A constant velocity is the speed you type, and speeding up or slowing down goes steadily from the velocity before it to the speed you type, over the time it lasts. The position is the area under the velocity–time graph and the acceleration is its slope, so the three graphs agree.',
      },
      {
        q: 'Why does the velocity–time graph sometimes jump?',
        a: 'Going from one constant velocity, or rest, straight into another, the velocity changes in an instant, the way textbook position–time graphs made of straight lines assume. The graph shows the jump as a dotted line. Speeding up and slowing down always start from the velocity before them, so they never jump.',
      },
      {
        q: 'What do the shapes of a position–time graph mean?',
        a: 'Flat is at rest, a straight sloped line is a constant velocity, and the steeper it is the faster it moves. A curve getting steeper is speeding up, and one leveling off is slowing down. Moving forward, speeding up curves upward (concave up) and slowing down curves downward (concave down); moving back, it’s the other way round.',
      },
      {
        q: 'Can I make graphs without numbers?',
        a: 'Yes. Turn off Numbers on the axes to show only the shapes, and turn off Gridlines for plain axes with arrows. The settings panel still lists each segment’s velocities, acceleration and positions for your answer key.',
      },
      {
        q: 'Can I make several graphs on a worksheet match?',
        a: 'Yes. The axes are fitted to each motion unless you turn on Set the ranges myself, under Axes and grid. Then you type each axis’s From, To and Count by, and every graph you make with the same ranges lines up. Stacked graphs share the time axis and each has its own range up its side. A line that runs past a range you set is cut off at the edge of the grid.',
      },
      {
        q: 'What does the tangent show?',
        a: 'Its slope is the instantaneous velocity at the time it touches the position–time graph. Where the graph is curved, students can find the velocity there from the tangent’s rise over run; the settings panel shows the answer.',
      },
    ],
    imageAlt: 'A printable position–time graph of a cart that speeds up, moves at a constant velocity, slows down and stops, with its segment ends lettered A to E, made with the Motion Graph Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },
  'motion-map': {
    heading: 'Motion maps with velocity arrows, built segment by segment',
    intro: [
      'The Motion Map Generator draws an object moving along a line as a dot at equal times, 0.5 s, 1 s or 2 s apart, along a number line in meters, with a velocity arrow above each dot. You build the motion from up to six segments, at rest, moving at a constant velocity forward or back, speeding up or slowing down, the same way as on the Motion Graph Generator, so the dots are exactly where the object is at each moment: evenly spaced at a constant velocity, spreading out as it speeds up and closing up as it slows down.',
      'When the motion turns back, the way back is drawn above the way there, so no dots sit on top of each other, and a stop is one dot labeled with the times it’s there. A button opens the same motion on the Motion Graph Generator, and back, so a worksheet can pair a motion map with its graphs, with the same letters at the segment ends on both.',
    ],
    settings: [
      'Up to six segments, each at rest, constant velocity forward or back, speeding up or slowing down, at a speed and for a time you type, and where the motion starts',
      'A dot every 0.5 s, 1 s or 2 s',
      'Times, a letter on every dot, or the motion graph’s letters at the segment ends, under the dots',
      'Velocity arrows on one scale, an acceleration arrow (or a = 0) above each segment, or dots only for students to add the arrows',
      'The total displacement as an arrow under the number line, with its label written, a blank line, or left off',
      'Numbers on the number line or just the shape, and a mark at the origin',
      'A label for the object, a chart title, an answer key, label size, and color for slides',
    ],
    faqs: [
      {
        q: 'How are the dots placed?',
        a: 'Each dot is where the object is at that moment, worked out from the segments exactly as the Motion Graph Generator works out its position–time graph. At a constant velocity the dots are evenly spaced; speeding up or slowing down steadily, the spacing grows or shrinks by the same amount from one gap to the next.',
      },
      {
        q: 'How long are the velocity arrows?',
        a: 'Every arrow is on the same scale, so equal speeds draw equal arrows and twice the speed draws twice the length. The fastest arrow is about 0.8 of the widest gap between dots, or shorter if that would take an arrow up to the next dot, as happens just before the object stops. Velocity and acceleration arrows are dashed, as on every Physics Figures generator, so they’re never read as forces.',
      },
      {
        q: 'What happens when the object stops or turns back?',
        a: 'While it’s at rest, its dots all sit at one spot, so they’re drawn as one dot with no arrow, labeled with the times it’s there, such as 12–15 s. Each time it turns back, the dots carry on above the ones before, so the way there and the way back don’t overlap.',
      },
      {
        q: 'Can I make a motion map and a motion graph of the same motion?',
        a: 'Yes. See it as a motion graph opens the Motion Graph Generator with the same segments and starting position, and See it as a motion map comes back. With letters at the segment ends on both, the letters match: the cart does the same thing between B and C on the map and on the graph.',
      },
      {
        q: 'What if a segment doesn’t last a whole number of dots?',
        a: 'Any duration works: the dots are still exactly where the object is at each moment. A segment end that falls between two dots has no dot to mark it, so the settings panel says so, and its letter is left off the map.',
      },
      {
        q: 'Can students draw the arrows themselves?',
        a: 'Yes. Turn on Dots only to leave just the dots on the number line, for questions like “draw the velocity arrows” or “describe the motion”. The answer key lists what each segment does, the total displacement and the distance traveled.',
      },
    ],
    imageAlt: 'A printable motion map of a cart that speeds up, moves at a constant velocity, slows down and stops, as dots one second apart along a number line in meters with dashed velocity arrows, made with the Motion Map Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },

  'spring-scale': {
    heading: 'Spring scale (newton meter) figures for reading force',
    intro: [
      'The Spring Scale Generator draws a lab spring scale, also called a newton meter or force meter, with its pointer at the force you type. It comes in the sizes a school lab has, 1, 2.5, 5, 10, 20, 30 and 50 N, each in its own color, and printed in newtons, grams or both. Readings go one digit past the smallest mark, the estimated digit.',
      'Hang a block or slotted masses from the hook, or nothing. Give the scale a zero offset for a zero error question, with the same scale drawn unloaded beside it, and add a magnified view of the pointer so the marks stay readable in print. Turn on the answer key to print the force under the figure.',
    ],
    settings: [
      'Capacity: 1, 2.5, 5, 10, 20, 30 or 50 N, color-coded or in black and white',
      'Printed in newtons, grams, or both',
      'The force on the hook, typed or picked at random',
      'A zero offset, with the scale also drawn unloaded beside it',
      'On the hook: nothing, a block with a short label, or 1 to 5 slotted masses',
      'A magnifier beside the scale or in place of it, spanning 1 to 6 numbered marks',
      'A chart title, and an answer key line with the force',
    ],
    faqs: [
      {
        q: 'How do you read a spring scale?',
        a: 'Hold it upright and read where the pointer sits against the marks. Work out what each small mark is worth, read the last mark the pointer has passed, and estimate one more digit between marks. On a 10 N scale marked every 0.1 N, that means reading to 0.01 N, like 3.47 N.',
      },
      {
        q: 'Why do some spring scales show grams?',
        a: 'A spring scale measures force, but many are also printed in grams so they can stand in for a balance. Like school scales, the generator puts 100 g beside every 1 N, taking g as 10 N/kg, so each gram mark lines up with a newton mark. Only the newton reading is a force.',
      },
      {
        q: 'What is a zero error?',
        a: 'With nothing hanging, a scale should read zero. If its pointer rests above or below zero instead, every reading is off by that much, so subtract the unloaded reading from the loaded one: a scale that rests at 0.20 N and reads 4.30 N with a load on it is measuring 4.10 N.',
      },
      {
        q: 'Why is each size a different color?',
        a: 'Lab spring scales are color-coded by capacity, so students can pick the right one at a glance. The generator gives each size its own color: pink for 1 N, blue for 2.5 N, green for 5 N, tan for 10 N, red for 20 N, white for 30 N and yellow for 50 N. Turn color off to draw it in black and white for photocopying.',
      },
      {
        q: 'How does the reading relate to a mass’s weight?',
        a: 'A mass hanging still from the hook pulls down with its weight, W = mg, so the scale reads its weight in newtons. A 250 g mass reads 2.45 N with g = 9.8 N/kg, or 2.5 N with g = 10 N/kg.',
      },
    ],
    imageAlt: 'A printable 10 N spring scale figure with a block on its hook and a magnified view of the pointer, made with the Spring Scale Generator',
    educationalLevel: ['Middle school', 'High school'],
  },

  'waves': {
    heading: 'Transverse and longitudinal wave diagrams to measure',
    intro: [
      'The Wave Generator draws a transverse wave, a longitudinal wave, or a longitudinal wave above its matching transverse one. You type the amplitude and the wavelength, or the period for a wave drawn against time, and choose how many cycles to draw, from half a cycle to eight. The transverse wave is the exact sine curve, starting on its rest line and rising; the longitudinal one is a row of vertical lines, bunched at its compressions and spread out at its rarefactions.',
      'Draw it on numbered axes, displacement against distance or against time, so students measure the wavelength, period and amplitude, with gridlines or just tick marks. The axes fit the wave, a whole number of blocks to a wavelength, unless you type your own ranges. Mark the wavelength (or period) and the amplitude with arrows, labeled or left blank, and label a crest, a trough, a compression and a rarefaction, or leave blank lines for students to write them in.',
    ],
    settings: [
      'A transverse wave, a longitudinal wave, or both, the longitudinal one above with its compressions over the crests',
      'A transverse wave’s displacement against distance, showing its wavelength, or against time, showing its period',
      'The amplitude, the wavelength or period, and 0.5 to 8 cycles',
      'Arrows marking the wavelength (or period) and the amplitude, each labeled, blank or unlabeled',
      'Crest, trough, compression and rarefaction labels, written, blank for students, or left off',
      'Numbered axes with gridlines or tick marks, fitted to the wave or set by hand, or no axes and a dashed rest line',
      'A chart title and axis titles, the axis numbering and end caps, minor gridlines, label size, and color for slides',
    ],
    faqs: [
      {
        q: 'How do you measure the wavelength and amplitude of a wave?',
        a: 'The wavelength is the distance from one crest to the next, or between any two points one whole cycle apart, read off the distance axis. The amplitude is the height of a crest above the rest line, the axis through the middle, not the height from a trough to a crest, which is twice the amplitude. The generator fits the axes so a wavelength is a whole number of blocks.',
      },
      {
        q: 'How do I make a wave for a frequency question?',
        a: 'Draw the transverse wave against time instead of distance. The repeat along the time axis is then the period, T, marked in place of the wavelength, and the frequency is 1/T: a period of 0.5 s is a frequency of 2 Hz. The generator shows the frequency under the period as you type it, and on the example pages’ answer keys.',
      },
      {
        q: 'How does a longitudinal wave line up with a transverse one?',
        a: 'With both drawn, the longitudinal wave’s compressions sit right above the transverse wave’s crests and its rarefactions above the troughs, the way a sound wave lines up with a graph of its pressure. The lines are spaced so the bunching rises and falls smoothly, one compression and one rarefaction per wavelength.',
      },
      {
        q: 'Can I draw a standing wave, or two waves adding up?',
        a: 'Not yet. Standing waves, with their nodes and antinodes, and superposition, two waves and their sum, are planned next.',
      },
      {
        q: 'Can I make the axes go further than the wave?',
        a: 'Yes. Untick “Fit to the cycles drawn” or type in the x-axis range, and the wave keeps its cycles from 0 while the axis runs as far as you set. The same goes for the displacement axis. Without axes, the wave is drawn the same size about a dashed rest line.',
      },
    ],
    imageAlt: 'A printable transverse wave on numbered axes of displacement against distance, with its wavelength λ and amplitude A marked, made with the Wave Generator',
    educationalLevel: ['Middle school', 'High school'],
  },

  'circuit-diagram': {
    heading: 'Series and parallel circuit diagrams with US or IEC symbols',
    intro: [
      'The Circuit Diagram Generator draws the circuits worksheets start with: a cell or a battery of two cells and one to four resistors or bulbs, all in series round one loop or all in parallel as the rungs of a ladder. Add a switch, open or closed, and an ammeter in the main line, and a voltmeter across the battery or any one part. Wires are drawn square with no crossings, and junction dots mark where parallel branches meet.',
      'Each part has a name and a value. Names number themselves, R₁, R₂ and L₁, until you type your own, and values can be shown, typed as a letter like x for students to work out, left as a blank line, or left off. Draw it in US symbols, a zigzag resistor and a looped bulb filament, or in IEC symbols as UK GCSE uses, a box resistor and a crossed bulb.',
    ],
    settings: [
      'One to four resistors or bulbs, in series or in parallel',
      'One cell or a battery of two cells, with + and − beside it if you like',
      'No switch, or a switch drawn open or closed, in the main line',
      'An ammeter in the main line, and a voltmeter across the battery or one part, each with its reading or none',
      'Every part’s name and value written, with subscripts and Ω, a blank line for students, or left off',
      'US or IEC (UK GCSE) symbols, a chart title, mirror, and color for slides',
    ],
    faqs: [
      {
        q: 'How do I make a circuit for students to solve?',
        a: 'Give the battery and the resistors their values and leave the rest for students to work out: turn on the ammeter and leave its reading blank, or type x as one resistor’s value. A voltmeter across one part, with a blank reading, asks for the potential difference across it.',
      },
      {
        q: 'What is the difference between the US and IEC symbols?',
        a: 'US textbooks draw a resistor as a zigzag and a bulb as a circle with a looped filament. IEC symbols, used in the UK, Europe and for GCSE, draw a resistor as a plain rectangle and a lamp as a circle with a cross. Cells, batteries, switches and meters look the same in both.',
      },
      {
        q: 'How are a cell and a battery drawn?',
        a: 'A cell is one long plate and one short one; the long plate is the positive terminal. A battery is two cells joined in a row. Turn on + and − to mark which side is which.',
      },
      {
        q: 'Can I draw a circuit that mixes series and parallel?',
        a: 'Not yet; an advanced circuit editor is coming soon. This generator keeps to all in series or all in parallel, the circuits most questions start with, so a figure is quick to set up and always drawn neatly.',
      },
      {
        q: 'Where do the ammeter and voltmeter go?',
        a: 'The ammeter goes in the main line beside the battery, in series, so it measures the whole current. The voltmeter goes in parallel, across the battery or across the one part you pick, with its leads joining the wire either side of it.',
      },
    ],
    imageAlt: 'A printable circuit diagram of a 12 V battery with three resistors in series, R₁, R₂ and R₃, made with the Circuit Diagram Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },
}

/** The copy for a generator; every generator on the site has some. */
export function copyFor(id: string): GeneratorCopy {
  const copy = COPY[id]
  if (!copy) throw new Error(`No page copy for the ${id} generator`)
  return copy
}
