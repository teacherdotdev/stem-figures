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
        a: 'Yes. See it as a motion graph opens the Motion Graph Generator with the same segments and starting position, and See it as a motion map comes back. To turn a graph you already made into a motion map, copy its link with Share link and paste it into Start from a motion graph, at the top of the settings. With letters at the segment ends on both, the letters match: the cart does the same thing between B and C on the map and on the graph.',
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

  'length-reading': {
    heading: 'Ruler, caliper and micrometer figures for measuring length',
    intro: [
      'The Length Reading Generator draws the instrument a length is read from: a centimeter or inch ruler with an object lying along it, a 150 mm caliper with its jaws open to the reading you type, or a 0–25 mm micrometer. Close-ups of the scales keep every mark readable in print.',
      'The caliper reads to 0.1, 0.05 or 0.02 mm, and exactly one mark on its sliding scale lines up with the main scale. The micrometer reads to 0.01 mm at its marks, or to an estimated 0.001 mm between them, with its thimble’s marks bunching toward its edges as on a real one. Hold a block, cylinder, ball or wire in the jaws, give the instrument a zero error for a correction question, and turn on the answer key to print the reading.',
    ],
    settings: [
      'The instrument: a ruler, a caliper or a micrometer',
      'A metric ruler, 15 to 100 cm long, or an inch ruler, 6 to 20 in long, how finely it is marked, and lengths read to one estimated digit or to the nearest mark',
      'The object on the ruler, its length and where its left end sits, with magnifiers on its ends',
      'The caliper’s least count: 0.1 mm (10 divisions over 9 mm), 0.05 mm (20 over 39 mm) or 0.02 mm (50 over 49 mm), printed on the slider or left off',
      'The micrometer read to its marks, 0.01 mm, or to one estimated digit past them, 0.001 mm',
      'The caliper or micrometer reading, typed or picked at random, and a zero error, with the instrument also drawn closed',
      'In the jaws: nothing, a block, a cylinder, a ball or a wire, drawn to size, with a short label',
      'The instrument with its close-up, the close-up alone, or the instrument alone',
      'A chart title, and an answer key line with the reading and any correction',
    ],
    faqs: [
      {
        q: 'How do you read a caliper?',
        a: 'Read the main scale at the sliding scale’s zero: the last millimeter mark before it. Then find the one mark on the sliding scale that lines up exactly with a main-scale mark, and add that many least counts. With the zero just past 23 mm and the 9th mark of a 0.05 mm scale lined up, the reading is 23 + 9 × 0.05 = 23.45 mm.',
      },
      {
        q: 'What is the least count of a caliper?',
        a: 'The smallest length it can read: one main-scale division less one division of the sliding scale. Ten divisions over 9 mm are 0.9 mm each, so the least count is 1 − 0.9 = 0.1 mm. Twenty over 39 mm (1.95 mm each, against 2 mm on the main scale) give 0.05 mm, and fifty over 49 mm give 0.02 mm.',
      },
      {
        q: 'How do you read a micrometer?',
        a: 'Read the last mark showing on the sleeve: whole millimeters above the datum line, and the half-millimeter mark below it if it has appeared. Then add the thimble mark on the datum line, 0.01 mm each. A sleeve showing 7 mm and thimble mark 38 read 7.38 mm; with the 7.5 mark showing as well, 7.88 mm. When the datum line falls between two thimble marks, estimate how far, in tenths of a mark, for one more digit: 0.4 of the way from mark 38 to mark 39 reads 7.384 mm.',
      },
      {
        q: 'What is a zero error?',
        a: 'With its jaws closed, a caliper or micrometer should read zero. If it doesn’t, the reading it shows closed is the zero error, positive or negative, and you subtract it from every reading: an instrument that reads +0.10 mm closed and 23.45 mm on a block measures 23.35 mm. Turn on Also show it closed to draw the closed instrument above the measuring one.',
      },
      {
        q: 'How do you measure with a ruler to the right number of significant figures?',
        a: 'Read to the smallest mark, then estimate one more digit. On a ruler marked in millimeters, that means reading to 0.01 cm, like 4.37 cm. On a ruler marked only every centimeter, read to 0.1 cm.',
      },
    ],
    imageAlt: 'A printable caliper holding a block, with close-ups of its main scale and 0.05 mm sliding scale, made with the Length Reading Generator',
    educationalLevel: ['Middle school', 'High school', 'GCSE', 'IGCSE', 'IB Physics'],
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

  'ray-diagram': {
    heading: 'Ray diagrams for lenses and mirrors, drawn to scale',
    intro: [
      'The Ray Diagram Generator draws a converging or diverging lens, or a concave, convex or plane mirror, on its principal axis with its focal points marked, an arrow for the object, the principal rays from the object’s tip, and the image where they meet. You type the focal length, the object’s distance and its height in cm, or put the object beyond 2F, at 2F, between F and 2F, at F or inside F with one click. The figure is drawn to scale, and the image is exactly where the thin lens and mirror equation, 1/f = 1/dₒ + 1/dᵢ, puts it.',
      'Real images are drawn solid. For a virtual image, the rays’ dashed extensions run back to it, and the image itself is dashed. Show the setup alone, for students to draw the rays, the rays without the image, or everything. Label F, F′, 2F and 2F′ (or F and C on a mirror), the object and the image, add dimension arrows for the distances and heights, and a numbered cm scale for measuring.',
    ],
    settings: [
      'A converging or diverging lens, drawn as a lens shape or the line symbol, or a concave, convex or plane mirror, hatched on its back',
      'The focal length, the object’s distance and its height in cm, with quick places beyond 2F, at 2F, between F and 2F, at F and inside F',
      'The object arrow pointing up or down',
      'Each principal ray on or off: parallel, through the center or through C, through F, and to a mirror’s vertex',
      'The setup alone, the rays too, or the rays and the image',
      'Labels for F, F′, 2F, 2F′ or C, the object and the image, written, blank for students, or left off',
      'Arrows marking the object and image distances, the focal length and the object and image heights, and a numbered cm scale under the figure',
      'A chart title, an answer key line, label size, and color for slides',
    ],
    faqs: [
      {
        q: 'What are the three principal rays for a lens?',
        a: 'A ray parallel to the principal axis bends through the focal point on the far side, F′ (a diverging lens spreads it out as if it came from F, on the object’s side). A ray through the center of the lens goes straight on. A ray through F on the object’s side leaves parallel to the axis (for a diverging lens, a ray heading for F′). Where the rays meet, or where their dashed extensions meet, is the tip of the image.',
      },
      {
        q: 'Which sign convention does the answer key use?',
        a: 'Real is positive, as AP and most US textbooks use: an image distance is negative for a virtual image, and a focal length is negative for a diverging lens or a convex mirror. The answer key also says the image is real or virtual, upright or inverted, magnified or diminished, and which side it is on, so it reads right in any convention.',
      },
      {
        q: 'Why do the rays bend at a line through the middle of the lens, and reflect at a straight line on a curved mirror?',
        a: 'That is the thin-lens convention textbooks draw. A real lens bends light at both of its faces, and a curved mirror reflects off its curve, but drawing the bend at the line through the lens’s middle, or the mirror’s vertex, makes the rays meet exactly where the lens and mirror equation puts the image. The mirror is still drawn as a shallow arc so it looks like a curved mirror.',
      },
      {
        q: 'What happens when the object is at the focal point?',
        a: 'The rays leave the lens or mirror parallel to each other, so they never meet and no image is drawn. The answer key says “No image (at infinity)”. Just outside F, the image is very far away and very large: past six focal lengths the figure stops widening, the rays run off its edge, and the answer key still gives the image distance.',
      },
      {
        q: 'How do I make a blank ray diagram for students?',
        a: 'Set Show to Setup. The figure has the lens or mirror, the principal axis, the focal points and the object, laid out exactly as the completed one, so you can print both. Turn on the numbered cm scale so students can measure the image distance, and leave the image label as a blank line.',
      },
      {
        q: 'Can I draw refraction at a flat surface, or Snell’s law?',
        a: 'Not on this generator. Reflection and refraction at a boundary, with angles, materials and total internal reflection, is planned as its own generator.',
      },
    ],
    imageAlt: 'A printable ray diagram of a converging lens with the object beyond 2F, three principal rays and the real, inverted, smaller image, made with the Ray Diagram Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },

  'roller-coaster': {
    heading: 'Roller coaster figures for conservation of energy: hills, dips and a loop',
    intro: [
      'The Roller Coaster Generator draws a track from a short list of points, left to right, each with a height. A smooth curve runs through them: a point higher than its neighbours is the top of a hill, a lower one is the bottom of a dip, and two points at the same height make a level stretch. Each point can have a dot and a label on the track, and a mark from the ground up to it with its height.',
      'Add a loop at any point, a cart, ball or block at a point or upside down at the top of the loop, a dashed velocity arrow, and friction on part of the track, hatched with its length marked under the ground. Teachers use it for potential and kinetic energy, conservation of mechanical energy, work done by friction, and the least speed at the top of a loop.',
      'The heights and the loop’s radius are drawn to scale with each other. Nothing is worked out from them: no speeds and no energies, so the figure can go with any question, including a hill the cart can’t reach.',
    ],
    settings: [
      'Two to eight points, each with a height from 0 to 100, evenly spaced from left to right',
      'Each point’s label, like A, PE_g or KE = 0, a blank line, or none for a point that only shapes the track',
      'Each point’s height mark, like 40 m, h or h/2, a blank line, or none',
      'A loop at one point, its radius in the same units as the heights, a label for the radius and one for the top of the loop',
      'A cart, ball or block with its label and size, at any point or at the top of the loop',
      'Velocity forward or back along the track, drawn dashed',
      'A rough stretch from any point to the next, hatched, with a friction label and a length mark like d or 12 m',
      'The ground line on or off, Mirror, so the track runs right to left, and color for slides',
    ],
    faqs: [
      {
        q: 'Is the roller coaster drawn to scale?',
        a: 'Up and down, yes: the heights and the loop’s radius share one scale, and the tallest fills the figure, so a 40 m hill is drawn twice as high as a 20 m one. Across, no: the points are evenly spaced, with extra room at the loop for its circle. If a loop is too big for the room between its neighbours it is drawn smaller, and a note under its radius says so.',
      },
      {
        q: 'Does it work out the speed or the energy at each point?',
        a: 'No. It draws the track, the heights and the labels, and leaves the numbers to you, so nothing on the figure gives an answer away. It doesn’t check that the cart can reach a point either, since a hill the cart can’t climb makes a good question.',
      },
      {
        q: 'How do I make a hill, a dip, a level stretch or a cliff?',
        a: 'Type the heights in order. A point higher than both its neighbours is the top of a hill, and a lower one is the bottom of a dip. Two points at the same height make a level stretch between them. A last point above the ground leaves the track ending in the air. The curve never goes higher than a hill’s height or lower than a dip’s.',
      },
      {
        q: 'How do I show friction on part of the track?',
        a: 'Turn on Rough at the point where the friction starts, and the track from there to the next point is hatched along its underside. Its length mark is drawn under the ground and is always horizontal: on a level stretch it is the stretch’s length, and on a sloping one it is the distance along the ground, not along the slope. Leave the next rough stretch’s length mark off and one mark spans both.',
      },
      {
        q: 'Can it draw energy bar charts, a spring launcher or more than one loop?',
        a: 'Not yet. A track has one loop, and the figure is the track only. If you need one of these, use Request a generator on the home page and tell us what it should draw.',
      },
    ],
    imageAlt: 'A printable roller coaster figure with a cart at the top of the first hill, a dip, a second lower hill and four lettered points with their heights marked, made with the Roller Coaster Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },

  'electric-and-magnetic-fields': {
    heading: 'Electric and magnetic field lines, drawn from the real field',
    intro: [
      'The Electric and Magnetic Field Generator draws the field lines of six setups textbooks use again and again: one point charge, a positive and a negative charge, two like charges, a pair of parallel plates, a bar magnet, and a straight wire seen end-on carrying a current into or out of the page. Pick one, and the field lines are drawn with arrows showing their direction.',
      'Lines around charges are traced through the real field, so they curve the way they should and never cross: from a positive charge into the negative one, or bending away from each other between like charges. Turn the lines off to leave just the charges, plates, magnet or wire for students to draw the field themselves.',
    ],
    settings: [
      'One point charge, positive or negative',
      'A positive and a negative charge, or two positive or two negative charges, side by side',
      'Two parallel plates, positive on top, with a uniform field between them',
      'A bar magnet, with field lines from north round to south',
      'A straight wire seen end-on, with its current out of the page (a dot) or into it (a cross), and circular field lines around it',
      'Fewer, normal or more field lines, with or without arrows, or none at all, and color for slides',
    ],
    faqs: [
      {
        q: 'Are the field lines accurate?',
        a: 'Around charges, yes: each line is traced step by step through the combined field of the charges, each falling off with the square of the distance, so the lines bend the way the real field does and never cross. Lines start evenly spaced around each charge. The bar magnet’s lines are traced the same way, and the wire’s are circles, further apart further out, because the field weakens with distance from the wire.',
      },
      {
        q: 'Which way do the arrows point?',
        a: 'Electric field lines point away from positive charges and toward negative ones, and from the positive plate to the negative plate. Magnetic field lines run from the magnet’s north pole round to its south pole outside it. Around a wire with its current out of the page they run counterclockwise, and clockwise with the current into the page, as the right-hand rule says.',
      },
      {
        q: 'Can students draw the field lines themselves?',
        a: 'Yes. Turn off Draw the field lines to leave just the charges, plates, magnet or wire, or keep the lines and turn off the arrows, so students add the direction.',
      },
      {
        q: 'Can I make the charges different sizes, add more charges or show equipotential lines?',
        a: 'Not yet. The generator keeps to the setups teachers ask for most, with equal charges. If you need another setup, use Request a generator on the home page and tell us what it should draw.',
      },
    ],
    imageAlt: 'A printable electric field diagram of a positive and a negative point charge side by side, with curved field lines running from the positive charge to the negative one, made with the Electric and Magnetic Field Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },

  'circular-motion': {
    heading: 'Circular motion diagrams with velocity, acceleration and forces',
    intro: [
      'The Circular Motion Generator draws an object going round a circle in one of three setups. The Top view shows the circle from above, with the object at one to eight positions: on its own, on a string, on a turntable or on a flat curved road. The Vertical circle shows it from the side at the top, side or bottom: on a string, inside a loop, over a hill or through a dip. The Conical pendulum is a bob on a string from a ceiling, going round a level circle.',
      'Each figure can show the velocity along the tangent, the centripetal acceleration toward the center, and the forces: one inward force in the Top view, or gravity with the tension or the normal force in the side views. Velocity and acceleration are dashed and forces are solid, so they are never mixed up, even photocopied. Turn any of them off for students to draw, or rename any label.',
    ],
    settings: [
      'The setup: Top view, Vertical circle or Conical pendulum',
      'Top view: nothing, a string, a turntable or a road around the object, 1 to 8 positions, where the first one is, and clockwise or counterclockwise',
      'A second object halfway out on a turntable, with a velocity arrow half as long',
      'Vertical circle: a string, a loop, a hill or a dip, with the object at the top, the bottom, the side, or several of them',
      'Conical pendulum: the string’s angle from the vertical, 15° to 60°, its angle and length labels, and the velocity into or out of the page',
      'Velocity, centripetal acceleration, an inward force, gravity, tension and the normal force, each on or off with its own label',
      'The tension’s horizontal and vertical components on the conical pendulum',
      'A radius or diameter, the angular speed ω, an angle mark, and letters A, B, C… at the positions',
      'A ball or a block with its own label, vector notation (an arrow over each label, or bold), and color for slides',
    ],
    faqs: [
      {
        q: 'Which way do the velocity and the acceleration point?',
        a: 'The velocity is along the tangent to the circle, the way the object is going round. The centripetal acceleration points from the object straight at the center of the circle. In the Top view both are drawn on the object; in the side views the acceleration is drawn beside the object, so it is not read as one of the forces.',
      },
      {
        q: 'Are the arrows drawn to scale?',
        a: 'The motion is uniform, so every velocity arrow in a figure is the same length, and so is every acceleration arrow. On a turntable the second object, halfway out, has arrows half as long, because v = ωr. On the Vertical circle gravity is the same length everywhere, and the tension or normal force is shorter than gravity at the top and longer at the bottom, so the net force points to the center there. The speed is steady, so the net force is the same size at the top, the side and the bottom: the tension at the bottom is two gravities longer than at the top. The Conical pendulum’s forces are to scale: the tension’s vertical component is exactly as long as gravity.',
      },
      {
        q: 'Is there an arrow for the centripetal force?',
        a: 'In the Top view, turn on Inward force. It is one solid arrow toward the center, labeled F_c until you rename it for the force that supplies it: T for a string, F_f for friction on a road or turntable, F_g for gravity. The side views draw the real forces instead (gravity, and the tension or the normal force), since the centripetal force there is their sum.',
      },
      {
        q: 'Can it draw a car going over a hill or through a dip?',
        a: 'Yes. Choose Vertical circle, then Hill or Dip, and Block for the object. Gravity and the normal force are drawn on it, with the centripetal acceleration beside it, and the radius can be marked with the center of the curve dashed below the hill or above the dip.',
      },
      {
        q: 'Can it draw a banked curve, or work out the forces from a mass and a speed?',
        a: 'Not yet. A flat curve seen from above is the Top view’s road. Labels are text you type, so no values are worked out. If you need a banked curve or worked values, use Request a generator on the home page and tell us what it should draw.',
      },
    ],
    imageAlt: 'A printable circular motion diagram of a ball at four points of a dashed circle seen from above, each with a velocity arrow along the tangent and a centripetal acceleration arrow pointing at the center, made with the Circular Motion Generator',
    educationalLevel: ['High school', 'AP Physics'],
  },

  'lever': {
    heading: 'Class 1, 2 and 3 levers, drawn to scale',
    intro: [
      'The Lever Generator draws a beam on a triangular fulcrum with a load, an effort arrow, and the two arms marked underneath: the effort arm and the load arm, each measured from the fulcrum. Pick a class 1, 2 or 3 lever and type the two arms and the load. The beam is drawn to scale, and the effort is worked out for you, because an ideal lever balances: effort × effort arm = load × load arm.',
      'Teachers use it for simple machines and mechanical advantage questions on bellringers, homework, tests and lab instructions. All four values start on the figure; blank one, or type ? or a symbol over it, and that is the one students find. Name the fulcrum, load and effort, leave blank lines for students to label the parts, or turn the arms off and ask which class of lever it is.',
    ],
    settings: [
      'A class 1, 2 or 3 lever: the fulcrum, the load or the effort in the middle',
      'The effort arm and the load arm, in cm, m, in or ft, drawn to scale',
      'The load, as a force in N or lb or a mass in kg or g, drawn as a block on the beam or a force arrow',
      'The effort, worked out from the load and the arms, to 3 significant figures',
      'Labels for the load, the effort and each arm: its value, your own text such as F_E or ?, a blank line for students, or left off',
      'Names for the effort, load and fulcrum, written, a blank line for students to label, or left off',
      'The two arms’ dimension lines on or off',
      'A chart title, an answer key with the mechanical advantage, label size, mirror, and color for slides',
    ],
    faqs: [
      {
        q: 'What are the three classes of lever?',
        a: 'They differ in what is in the middle. A class 1 lever has the fulcrum between the load and the effort, like a seesaw, a crowbar or scissors. A class 2 lever has the load in the middle, like a wheelbarrow or a nutcracker, so the effort is always smaller than the load. A class 3 lever has the effort in the middle, like tweezers, a fishing rod or a forearm, so the effort is always bigger than the load, but the load moves farther.',
      },
      {
        q: 'How is the effort worked out?',
        a: 'The lever is ideal: it balances, there is no friction, and the beam has no weight. So effort × effort arm = load × load arm, and the effort is the load × the load arm ÷ the effort arm. When it doesn’t come out even it is rounded to 3 significant figures, so 0.03003 N is 0.0300 N, and the label, the form and the answer key all show the same rounded value.',
      },
      {
        q: 'How is mechanical advantage worked out?',
        a: 'Mechanical advantage is the effort arm ÷ the load arm, which for an ideal lever is also the load ÷ the effort. A lever with a 1.5 m effort arm and a 0.5 m load arm has a mechanical advantage of 3, so a 300 N load is lifted by a 100 N effort. Turn on the answer key to print the working under the figure.',
      },
      {
        q: 'What if the load is a mass in kg or g?',
        a: 'Then it is drawn as a block labeled with its mass, and its weight is its mass × 9.8 N/kg, so a 30 kg load weighs 294 N, and a weight that doesn’t come out even is rounded to 3 significant figures, like the effort. The effort is always a force in newtons. The answer key shows the weight first. A load in N or lb is already a force, and can be drawn as a block or as an arrow pointing down.',
      },
      {
        q: 'How do I make one value the unknown?',
        a: 'Each of the four values, the load, the effort and the two arms, has its own label. Leave it empty and it shows its value; type ? or a symbol such as F_E or d_1 to replace it, or pick a blank line for students to write on. The answer key is the same whichever one you hide.',
      },
      {
        q: 'Is the lever drawn to scale?',
        a: 'Yes. The beam is split in the ratio of the two arms, so a 1.5 m arm is drawn three times as long as a 0.5 m one. The one exception is a very short arm: no arm is drawn shorter than 15% of the beam, so its label and dimension line still fit, and the form says when that happens. The longer force arrow is the bigger force.',
      },
      {
        q: 'Can I draw a seesaw with several masses, a beam with its own weight, or a beam that doesn’t balance?',
        a: 'Not on this generator. A lever here has one load, one effort and a weightless beam, and always balances. Moments about a pivot with several weights, a heavy beam or two supports are a torque figure: use the Torque Generator.',
      },
    ],
    imageAlt: 'Three printable lever diagrams side by side, a class 1, a class 2 and a class 3 lever, each a beam on a fulcrum with its load, effort and arms labeled, made with the Lever Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },
  'torque': {
    heading: 'Torque and moments diagrams, worked out',
    intro: [
      'The Torque Generator draws a level beam held up by a pivot, by two supports, or by a wall, with up to six loads on it: objects hanging from it or resting on it, and force arrows pushing down or pulling up. Every load is at a set distance along the beam, drawn to scale, with its distance marked from the pivot, from support A or from the wall. A Torque section beside the figure works out each torque, the clockwise and counterclockwise totals, the forces on two supports, or a cable’s tension and the wall’s force.',
      'Teachers use it for the principle of moments, seesaws and beam balances, planks on two trestles, hanging signs and cantilevers, on tests, worksheets and slides. Every weight and distance shows its value until you type over it: type ? or a symbol such as m_1 or x, or pick a blank line, and that is the unknown students find. The Balance with this load button sets a load to the value that balances the beam, so a “find the missing weight” question takes a moment to write.',
    ],
    settings: [
      'What holds the beam up: a pivot anywhere along it, two supports A and B, or a wall with a cable at 15° to 75° (a hanging sign) or with none (a cantilever)',
      'The beam’s length in m or cm, drawn to scale, and its own weight or mass at its middle, or a light beam',
      'Up to six loads: a block or ball hanging from the beam or resting on it, or a force arrow down or up, each at its own place along the beam',
      'Values in N, or masses in kg or g with g = 9.8, 9.81 or 10 N/kg',
      'A label for every load and distance: its value, your own text such as m_1, x or ?, a blank line for students, or left off',
      'Distance marks from the pivot, support A or the wall, the beam’s whole length, weight arrows on objects, and the forces holding the beam up',
      'The torques, support forces or tension worked out step by step, and a button that balances the beam with any load',
      'Mirror, to put the wall on the right, and color for slides',
    ],
    faqs: [
      {
        q: 'Is the figure drawn to scale?',
        a: 'Along the beam, yes: a load 0.4 m from the pivot is drawn twice as far from it as one 0.2 m away, on whatever length of beam you set. Up and down, nothing is to scale: objects, strings and force arrows are drawn at fixed sizes, so a 6 N block is no bigger than a 3 N one and every force arrow is the same length. A beam held by a cable is drawn shorter when the cable is steep, so the cable reaches the wall at its true angle.',
      },
      {
        q: 'Why doesn’t the beam tilt when it isn’t balanced?',
        a: 'Exam figures draw the beam level whether it balances or not, since the question is usually whether it does, or what would make it. A tilted beam would give the answer away, and would change every distance. The Torque section says whether it balances, and if not, the net torque and which way it turns.',
      },
      {
        q: 'How do I make one weight or distance the unknown?',
        a: 'Each load has a label and a distance label. Left empty they show their values, such as 6 N and 0.2 m. Type ? or a symbol such as W, m_1 or d to replace one, or pick a blank line for students to write on. The load still counts at its real value in the working, so set it to the right answer first: with a pivot, Balance with this load sets it to the value that balances the beam.',
      },
      {
        q: 'Should I use kg or N?',
        a: 'Either. Values in N are weights, drawn as they are. Values in kg or g are masses, and the working turns each into a weight with g = 9.8, 9.81 or 10 N/kg, whichever your course uses, before taking moments. Every load and the beam’s own weight use the same unit.',
      },
      {
        q: 'How are the forces on two supports worked out?',
        a: 'By taking moments about support A: the force at B times the distance from A to B equals the sum of each weight times its distance from A. Then the forces up equal the forces down, which gives the force at A. If either comes out negative, the beam would tip over the other support, and the generator says so.',
      },
      {
        q: 'How is a hanging sign’s cable tension worked out?',
        a: 'By taking moments about the wall, where the beam is hinged: T sin θ times the cable’s distance from the wall equals the sum of each weight times its distance from the wall, so T = Σ(W d) ÷ (d sin θ). The wall’s force on the beam is then T cos θ along the beam and the rest of the weight up the wall. With no cable, the beam is a cantilever fixed into the wall, which holds up all of its weight and supplies the torque, drawn with the support forces as a curved arrow M round the beam’s end.',
      },
      {
        q: 'Is a moment the same as a torque?',
        a: 'Yes. Torque and moment (or moment of a force, or turning effect) are names for the same thing: a force times its perpendicular distance from the pivot, in N·m. British and IGCSE courses tend to say moment; American and AP courses say torque. The generator says torque, clockwise and counterclockwise (anticlockwise).',
      },
      {
        q: 'Where are levers, effort and mechanical advantage?',
        a: 'On the Lever Generator, which draws a class 1, 2 or 3 lever with its fulcrum, load and effort named, and works out the mechanical advantage. A balanced seesaw can be drawn on either; this one is for several loads, a heavy beam, two supports or a wall.',
      },
    ],
    imageAlt: 'Three printable torque diagrams side by side: a balanced beam on a pivot with two hanging weights, a beam on two supports A and B with its weight at its middle, and a hanging sign on a beam held at a wall by a cable, each with its distances marked, made with the Torque Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics', 'IGCSE', 'A level'],
  },

  'pendulum': {
    heading: 'Pendulum diagrams for energy, forces and simple harmonic motion',
    intro: [
      'The Pendulum Generator draws a bob on a string hanging from a pivot under a hatched ceiling, swung out θ from the vertical. The Swing shows the bob at its release point, at the bottom and at the same height on the far side, with its dashed path between them, the angle θ, the string’s length L and the height h it drops: the figure for energy conversion problems. The bottom and far-side bobs are drawn lighter, with dashed strings, so the release point stands out.',
      'One bob shows the pendulum at one angle, with the tension and its weight, or with weight split into its components along the string (mg cos θ) and along the path (mg sin θ). The arrows are drawn at the release point, where the bob is momentarily at rest, so the tension is drawn as long as mg cos θ. Rename any label, leave it blank for students to fill in, or turn it off.',
    ],
    settings: [
      'The picture: the Swing (release point, bottom and far side) or One bob',
      'The angle from the vertical, 5° to 75° (at least 15° in the Swing, so its three bobs stand apart), and the side the bob is on',
      'The bob’s dashed path, the angle mark θ, the string length L and the height mark h, each with its own label',
      'Letters A, B and C at the release point, the bottom and the far side of the Swing, each editable',
      'The velocity at the bottom of the Swing, with its label',
      'On One bob: no forces, the tension and weight, or those with weight’s components along the string and the path',
      'The bob’s label, a chart title, and color for slides',
    ],
    faqs: [
      {
        q: 'How do I make a figure for a pendulum energy problem?',
        a: 'Keep the Swing, the default. It shows the bob at its release point, at the bottom and at the far side, the height h from the lowest point up to the release point, and the angle θ and string length L. Turn on Letter the three bobs to name them A, B and C for questions like “find the speed at B”. The far-side bob is at the same height as the release point, as energy conservation says it should be without friction.',
      },
      {
        q: 'Why is there no velocity arrow at the ends of the swing?',
        a: 'At the release point and at the far side the bob stops for a moment before swinging back, so its velocity there is zero. The velocity arrow is drawn only on the bottom bob, along the path toward the far side, where the bob is fastest.',
      },
      {
        q: 'Are the force arrows drawn to scale?',
        a: 'They are drawn to scale with each other: the components along the string and along the path are weight’s true components, mg cos θ and mg sin θ, with dotted lines from weight’s tip to theirs. At a wide angle every arrow is drawn longer, so mg cos θ still shows past the bob; at a small angle mg sin θ is drawn a little longer than to scale, so it shows at all. The tension is drawn as long as mg cos θ, which is right at the release point, where the bob is momentarily at rest. Lower in the swing the tension is larger, so the forces are only drawn on One bob, at its release point.',
      },
      {
        q: 'Can it draw a pendulum for simple harmonic motion?',
        a: 'Yes: the Swing with its dashed path and the velocity at the bottom is the usual figure, with θ as the amplitude angle. Turn off the height mark if you don’t need it. Values like the period are not worked out; type them into the labels or the chart title.',
      },
      {
        q: 'Can it work out the height, the speed or the period?',
        a: 'Not yet. Labels are text you type, so nothing is worked out from θ and L. If you would like values and an answer key (h = L(1 − cos θ) and the speed at the bottom, for example), or a conical, double or ballistic pendulum, use Request a generator on the home page and tell us what it should draw. A conical pendulum is on the Circular Motion Generator.',
      },
    ],
    imageAlt: 'A printable pendulum diagram of a bob on a string from a hatched ceiling, released at an angle θ from the vertical, drawn again lighter at the bottom and at the same height on the far side, with its dashed path, the string length L and the height h it drops, made with the Pendulum Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },

  'spring': {
    heading: 'Spring diagrams for Hooke’s law, simple harmonic motion, and springs in series and parallel',
    intro: [
      'The Spring Generator draws a spring fixed to a support, hanging from a ceiling or lying on a floor from a wall, with a block, a ball or slotted masses on its free end. Draw it once; before and after, at its natural length beside the same spring stretched or squashed, for Hooke’s law; or at three positions, −A, equilibrium and +A, for simple harmonic motion.',
      'The coil is redrawn at every length with the same number of turns and the same line, so a stretched spring looks like the same spring pulled out, not a picture stretched. Mark the extension x, the natural length L₀ and the equilibrium line, add an applied force, or draw two or three springs in series or in parallel.',
    ],
    settings: [
      'Hanging from a ceiling, or horizontal from a wall with the object on a floor',
      'One spring; before and after; or three positions for simple harmonic motion',
      'One spring, or two or three in series or in parallel, each labeled k or numbered k₁, k₂, k₃',
      'The extension, up to the natural length again, or squashed by up to half of it on a floor; in three positions, the amplitude A',
      'Zigzag or looped coils',
      'A block, a ball or slotted masses, with its own label',
      'The extension and the natural length as dimension lines, a dashed equilibrium line, and an applied force pulling or pushing',
      'In three positions, the velocity at equilibrium and the acceleration at each end, with the way the object is moving',
      'Every label written, a blank line for students, or left off; a chart title; and color for slides',
    ],
    faqs: [
      {
        q: 'How do I draw a Hooke’s law figure?',
        a: 'Keep the default, Before and after: the spring at its natural length with nothing on it, and beside it the same spring stretched by the object, with a dashed line at the natural length running across both and the extension x marked between it and the stretched end. Change the extension to stretch it more or less, or turn on the natural length L₀.',
      },
      {
        q: 'Can it draw a compressed spring?',
        a: 'Yes, on a floor. Choose Horizontal and move the extension below 0; the spring is squashed by up to half its natural length, and the applied force pushes the object toward the wall. A hanging spring with a mass on it is always stretched.',
      },
      {
        q: 'How does it show simple harmonic motion?',
        a: 'Choose Three positions. The same spring is drawn at −A, at equilibrium and at +A, side by side when hanging or in three rows on a floor, with a dashed equilibrium line. At each end the velocity is zero and the acceleration, pointing back to equilibrium, is greatest; at equilibrium the velocity is greatest and the acceleration is zero, so each copy has at most one arrow. A hanging spring oscillates about the point where it rests stretched by the object, not about its natural length.',
      },
      {
        q: 'Do springs in series stretch by different amounts?',
        a: 'Not in the figure. The spring constants are labels you type, so springs in series are drawn stretching equally, and springs in parallel all have the same extension, as they do in real life. If your springs have different k, say so in the question.',
      },
      {
        q: 'Can it work out the extension from the mass and k?',
        a: 'Not yet. Labels are text you type, so nothing is worked out or drawn to scale. If you would like values and an answer key, a spring on a ramp or between blocks, or a force–extension graph, use Request a generator on the home page and tell us what it should draw.',
      },
    ],
    imageAlt: 'A printable Hooke’s law diagram of a spring hanging from a hatched ceiling at its natural length beside the same spring stretched by a block labeled m, with a dashed line at the natural length and the extension x marked, made with the Spring Generator',
    educationalLevel: ['Middle school', 'High school', 'AP Physics'],
  },
}

/** The copy for a generator; every generator on the site has some. */
export function copyFor(id: string): GeneratorCopy {
  const copy = COPY[id]
  if (!copy) throw new Error(`No page copy for the ${id} generator`)
  return copy
}
