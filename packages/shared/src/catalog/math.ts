// Math Figures' generators. See ./index.ts.

import type { CatalogEntry } from './index'

export const MATH: CatalogEntry[] = [
  {
    id: 'coordinate-grid',
    site: 'math',
    alsoOn: ['physics'],
    name: 'Coordinate Grid Generator',
    path: '/coordinate-grid',
    blurb: 'Square grids with x- and y-axes, for graphing lines, curves, piecewise and trig functions, inequalities and points.',
    description:
      'Make a printable coordinate grid (graph paper) for your class. Graph lines like y = 2x + 1, parabolas, trig, log and exponential functions, piecewise functions with open and closed circles, shade inequalities and plot labeled points, choose the range in numbers, π or degrees, then copy it into a worksheet or test.',
    keywords: [
      'graph paper', 'grid paper', 'coordinate plane', 'cartesian plane', 'cartesian coordinate plane',
      'cartesian coordinates', 'rectangular coordinates', 'xy plane', 'x-y grid', 'xy', 'axes', 'x-axis', 'y-axis',
      'quadrant', 'first quadrant', 'four quadrants', 'origin', 'ordered pairs', 'plot points', 'plotting',
      'graphing', 'linear equations', 'slope', 'grid', 'graph', 'blank graph', 'printable',
      'graphing inequalities', 'linear inequalities', 'systems of inequalities', 'shaded region', 'shading', 'bold grid', 'dark gridlines', 'no gridlines', 'thick lines',
      'function', 'functions', 'graphing functions', 'function graph', 'piecewise', 'piecewise function', 'piecewise functions',
      'step function', 'domain', 'domain and range', 'open circle', 'closed circle', 'endpoint', 'hole', 'asymptote', 'asymptotes',
      'limits', 'discontinuity', 'parabola', 'quadratic', 'vertex', 'absolute value', 'square root', 'cube root', 'rational function',
      'exponential', 'exponential function', 'exponential growth', 'exponential decay', 'logarithm', 'logarithmic', 'log', 'ln',
      'trig', 'trig graph', 'trig graphs', 'trigonometric functions', 'sine', 'sin', 'cosine', 'cos', 'tangent', 'tan', 'sinusoidal',
      'radians', 'degrees', 'pi', 'algebra 1', 'algebra 2', 'precalculus', 'calculus',
    ],
  },
  {
    id: 'composite-shape',
    site: 'math',
    kind: 'editor',
    name: 'Composite Shape Editor',
    path: '/composite-shape',
    blurb: 'Build an L-shape or any shape from rectangles, triangles and semicircles.',
    description:
      'Build composite shapes for area and perimeter problems. Start from a rectangle, triangle or semicircle, add more pieces onto any straight side, drag or type their sizes, label sides, angles and corners, and copy the finished shape into your worksheet or test.',
    keywords: [
      'composite shape', 'composite shapes', 'composite figure', 'composite figures', 'compound shape', 'compound shapes',
      'irregular shape', 'irregular shapes', 'l-shape', 'l shape', 'rectilinear', 'combined shapes', 'area', 'perimeter',
      'decompose', 'decomposing', 'semicircle', 'rectangle', 'triangle', 'shaded area', 'geometry', 'editor',
      'draw', 'build', 'printable',
    ],
  },
  {
    id: 'transformations',
    site: 'math',
    kind: 'editor',
    name: 'Transformations Editor',
    path: '/transformations',
    blurb: 'Click a polygon onto a coordinate grid, then translate, reflect, rotate or dilate it.',
    description:
      'Make transformation figures for geometry and 8th grade math. Click a polygon, path or point onto a coordinate grid, then translate, reflect, rotate or dilate it, one step after another, with A′ and A″ labels. Switch between student, question and answer key versions, and copy each into a worksheet or test.',
    keywords: [
      'transformation', 'transformations', 'geometric transformations', 'rigid transformations', 'rigid motion', 'rigid motions',
      'translation', 'translations', 'translate', 'slide', 'reflection', 'reflections', 'reflect', 'flip', 'line of reflection',
      'rotation', 'rotations', 'rotate', 'turn', 'center of rotation', 'dilation', 'dilations', 'dilate', 'scale factor',
      'center of dilation', 'enlargement', 'composition', 'composition of transformations', 'preimage', 'image',
      'prime', 'congruent', 'similar figures', 'coordinate plane', 'coordinate grid', 'polygon on a grid', 'shapes on a grid',
      'four quadrants', 'geometry', '8th grade', 'editor', 'printable',
    ],
  },
  {
    id: 'number-line',
    site: 'math',
    name: 'Number Line Generator',
    path: '/number-line',
    blurb: 'Number lines with any range, with inequalities, points and sequences on them.',
    description:
      'Make a printable number line for your class. Type the range in decimals, fractions or π, graph equations and inequalities with open and closed circles in color, and mark lettered points or the terms of a sequence, then copy it into a worksheet or test.',
    keywords: [
      'number line', 'inequality', 'inequalities', 'graph inequalities', 'compound inequality', 'compound inequalities',
      'and', 'or', 'open circle', 'closed circle', 'interval', 'interval notation', 'solution set', 'integers',
      'negative numbers', 'fractions', 'decimals', 'pi', 'radians', 'real numbers', 'one variable', 'blank number line',
      'points', 'labeled points', 'lettered points', 'plot points', 'sequence', 'sequences', 'terms', 'convergence', 'color',
      'printable',
    ],
  },
  {
    id: 'triangle',
    site: 'math',
    name: 'Triangle Generator',
    path: '/triangle',
    blurb: 'Triangles drawn to scale from their sides and angles, labeled for students.',
    description:
      'Make a printable triangle drawn to scale for your class. Give any three sides and angles, label sides and angles with their measures or with x, add heights, right-angle squares and congruence marks, then copy it into a worksheet or test.',
    keywords: [
      'triangle', 'triangles', 'right triangle', 'acute', 'obtuse', 'scalene', 'isosceles', 'equilateral', 'angle',
      'angles', 'side lengths', 'to scale', 'scaled', 'diagram', 'geometry', 'trigonometry', 'trig', 'sohcahtoa', 'sine',
      'cosine', 'tangent', 'law of sines', 'law of cosines', 'pythagorean theorem', 'hypotenuse', 'special right triangles',
      '30-60-90', '45-45-90', 'similar triangles', 'congruent', 'tick marks', 'altitude', 'height', 'area', 'sss', 'sas',
      'asa', 'aas', 'ssa', 'ambiguous case', 'labels', 'printable',
    ],
  },
  {
    id: 'rectangle',
    site: 'math',
    name: 'Rectangle Generator',
    path: '/rectangle',
    blurb: 'Rectangles and squares drawn to scale, labeled for students.',
    description:
      'Make a printable rectangle or square drawn to scale for your class. Label its sides with their lengths or with x, add diagonals, congruence marks and right-angle squares, then copy it into a worksheet or test.',
    keywords: [
      'rectangle', 'rectangles', 'square', 'squares', 'quadrilateral', 'quadrilaterals', 'length', 'width', 'side lengths',
      'diagonal', 'diagonals', 'right angles', 'area', 'perimeter', 'to scale', 'diagram', 'geometry', 'congruent',
      'tick marks', 'shapes', 'labels', 'printable',
    ],
  },
  {
    id: 'parallelogram',
    site: 'math',
    name: 'Parallelogram Generator',
    path: '/parallelogram',
    blurb: 'Parallelograms and rhombi drawn to scale, with parallel arrows.',
    description:
      'Make a printable parallelogram or rhombus drawn to scale for your class. Give its sides and angle, label sides and angles with their measures or with x, add parallel arrows, congruence marks, heights and diagonals, then copy it into a worksheet or test.',
    keywords: [
      'parallelogram', 'parallelograms', 'rhombus', 'rhombi', 'rhombuses', 'diamond', 'quadrilateral', 'quadrilaterals',
      'parallel', 'parallel sides', 'parallel arrows', 'opposite sides', 'opposite angles', 'base', 'height', 'altitude',
      'diagonal', 'diagonals', 'area', 'perimeter', 'angles', 'side lengths', 'to scale', 'diagram', 'geometry',
      'congruent', 'tick marks', 'shapes', 'labels', 'printable',
    ],
  },
  {
    id: 'trapezoid',
    site: 'math',
    name: 'Trapezoid Generator',
    path: '/trapezoid',
    blurb: 'Trapezoids, including right and isosceles ones, drawn to scale and labeled.',
    description:
      'Make a printable trapezoid drawn to scale for your class: a right, isosceles or scalene trapezoid, from its bases and height. Label sides and angles with their measures or with x, add parallel arrows, congruence marks, heights and diagonals, then copy it into a worksheet or test.',
    keywords: [
      'trapezoid', 'trapezoids', 'trapezium', 'trapeziums', 'right trapezoid', 'isosceles trapezoid', 'scalene trapezoid',
      'irregular trapezoid', 'quadrilateral', 'quadrilaterals', 'bases', 'legs', 'parallel', 'parallel sides',
      'parallel arrows', 'height', 'altitude', 'diagonal', 'diagonals', 'area', 'perimeter', 'angles', 'side lengths',
      'to scale', 'diagram', 'geometry', 'congruent', 'tick marks', 'shapes', 'labels', 'printable',
    ],
  },
  {
    id: 'kite',
    site: 'math',
    name: 'Kite Generator',
    path: '/kite',
    blurb: 'Kites drawn to scale, with their equal sides marked and labeled.',
    description:
      'Make a printable kite drawn to scale for your class. Give its short and long sides and top angle, label sides and angles with their measures or with x, add diagonals and congruence marks, then copy it into a worksheet or test.',
    keywords: [
      'kite', 'kites', 'quadrilateral', 'quadrilaterals', 'diagonal', 'diagonals', 'perpendicular diagonals',
      'line of symmetry', 'symmetry', 'adjacent sides', 'area', 'perimeter', 'angles', 'side lengths', 'to scale',
      'diagram', 'geometry', 'congruent', 'tick marks', 'shapes', 'labels', 'printable',
    ],
  },
  {
    id: 'regular-polygon',
    site: 'math',
    name: 'Regular Polygon Generator',
    path: '/regular-polygon',
    blurb: 'Regular polygons from 3 to 20 sides, with their apothem and radius.',
    description:
      'Make a printable regular polygon for your class, from an equilateral triangle to a 20-gon. Size it by its side, radius or apothem, draw and label the apothem and radius, mark equal sides and angles, then copy it into a worksheet or test.',
    keywords: [
      'regular polygon', 'regular polygons', 'polygon', 'polygons', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon',
      'decagon', 'hendecagon', 'dodecagon', 'n-gon', 'equilateral triangle', 'square', 'apothem', 'radius', 'radii', 'center',
      'central angle', 'interior angle', 'side length', 'area', 'perimeter', 'area of a regular polygon',
      'to scale', 'diagram', 'geometry', 'congruent', 'tick marks', 'shapes', 'labels', 'printable',
    ],
  },
  {
    id: 'angles',
    site: 'math',
    name: 'Angles Generator',
    path: '/angles',
    blurb: 'Rays out from one vertex, from a single angle to angles around a point, labeled right on the figure.',
    description:
      'Make a printable angle diagram for your class: a single angle of any size, adjacent angles, angles on a straight line, angles around a point or vertical angles. Set each ray’s direction from the baseline, run any ray through the vertex as a line, then click an angle to label it with its measure or an expression like 2x + 10, mark or shade it, or name points for ∠ABC, and copy it into a worksheet or test.',
    keywords: [
      'angle', 'angles', 'angle generator', 'angle relationships', 'angle pairs', 'complementary angles', 'supplementary angles',
      'vertical angles', 'adjacent angles', 'linear pair', 'angles on a straight line', 'angles around a point', 'reflex angle',
      'right angle', 'acute angle', 'obtuse angle', 'straight angle', 'angle addition', 'angle bisector', 'missing angles',
      'protractor', 'rays', 'vertex', 'naming angles', 'geometry', 'diagram', 'labels', 'printable',
    ],
  },
  {
    id: 'parallel-lines',
    site: 'math',
    name: 'Parallel Lines and Transversal Generator',
    path: '/parallel-lines',
    blurb: 'Parallel lines cut by any number of transversals, with angles you label right on the figure.',
    description:
      'Make a printable diagram of parallel lines cut by a transversal for your class. Add as many parallel lines and transversals as you need, set each transversal’s angle, then click any angle to label it with its measure or an expression like 3x + 5, shade an angle pair, or name lines and points, and copy it into a worksheet or test.',
    keywords: [
      'parallel lines', 'transversal', 'transversals', 'parallel lines cut by a transversal', 'angle pairs', 'angle relationships',
      'alternate interior angles', 'alternate exterior angles', 'corresponding angles', 'same side interior angles',
      'consecutive interior angles', 'co-interior angles', 'same side exterior angles', 'vertical angles', 'linear pair',
      'supplementary angles', 'missing angles', 'angles', 'lines', 'non-parallel lines', 'perpendicular', 'parallel arrows',
      'proving lines parallel', 'geometry', 'diagram', 'labels', 'printable',
    ],
  },
  {
    id: 'segment-addition',
    site: 'math',
    name: 'Segment Addition Generator',
    path: '/segment-addition',
    blurb: 'Points on a segment with lengths or expressions on each part, braces and congruence ticks.',
    description:
      'Make printable segment addition figures for geometry. Put points in order on a segment, ray or line, label each part with a length or an expression like 2x + 3, add a brace for the whole, mark midpoints with congruence ticks or a bisector, and copy it into a worksheet or test.',
    keywords: [
      'segment addition', 'segment addition postulate', 'segments', 'line segment', 'line segments', 'midpoint', 'midpoints',
      'segment bisector', 'bisector', 'perpendicular bisector', 'congruent segments', 'congruence marks', 'tick marks',
      'collinear points', 'between', 'betweenness', 'partition', 'solve for x', 'algebraic expressions', 'ray', 'rays', 'line',
      'brace', 'segment length', 'measuring segments', 'geometry', 'diagram', 'labels', 'printable',
    ],
  },
  {
    id: 'circle',
    site: 'math',
    name: 'Circle Generator',
    path: '/circle',
    blurb: 'A circle with points, chords, radii and tangents, its angles, arcs and areas labeled right on the figure.',
    description: 'Circles with chords, radii, tangents and secants, their angles, arcs and shaded sectors labeled on the figure.',
    keywords: [
      'circle', 'circles', 'circle theorems', 'parts of a circle', 'chord', 'chords', 'radius', 'diameter', 'tangent', 'tangents', 'secant',
      'arc', 'arcs', 'intercepted arc', 'arc measure', 'arc length', 'central angle', 'inscribed angle', 'inscribed angles',
      'angle in a semicircle', 'angles in the same segment', 'cyclic quadrilateral', 'alternate segment theorem', 'tangent and radius',
      'intersecting chords', 'inscribed polygon', 'inscribed hexagon', 'sector', 'segment', 'geometry', 'diagram', 'labels', 'printable',
    ],
  },
  {
    id: 'prism',
    site: 'math',
    name: 'Prism Generator',
    path: '/prism',
    blurb: 'Rectangular, triangular and other prisms drawn to scale, labeled for students.',
    description:
      'Make a printable prism drawn to scale for your class. Draw rectangular, triangular and regular prisms, standing or lying down, right or oblique, label lengths, widths and heights with their measures or with x, then copy it into a worksheet or test on volume and surface area.',
    keywords: [
      '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape', '3d figure', 'volume', 'surface area', 'prism', 'prisms', 'rectangular prism', 'right rectangular prism', 'cuboid', 'box', 'cube', 'triangular prism',
      'pentagonal prism', 'hexagonal prism', 'octagonal prism', 'oblique prism', 'lateral area', 'length', 'width', 'height',
      'apothem', 'hidden edges', 'dashed', 'hypotenuse', 'pythagorean theorem', 'to scale', 'diagram', 'geometry', 'labels', 'printable',
    ],
  },
  {
    id: 'cylinder',
    site: 'math',
    name: 'Cylinder Generator',
    path: '/cylinder',
    blurb: 'Right and oblique cylinders drawn to scale, with the radius and height labeled.',
    description:
      'Make a printable cylinder drawn to scale for your class. Give its radius or diameter and height, make it right or oblique, label each with its measure or with x, then copy it into a worksheet or test on volume and surface area.',
    keywords: [
      '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape', '3d figure', 'volume', 'surface area', 'cylinder', 'cylinders', 'can', 'oblique cylinder', 'radius', 'diameter', 'height', 'lateral area', 'circle',
      'hidden edges', 'dashed', 'to scale', 'diagram', 'geometry', 'labels', 'printable',
    ],
  },
  {
    id: 'pyramid',
    site: 'math',
    name: 'Pyramid Generator',
    path: '/pyramid',
    blurb: 'Square, rectangular and other pyramids with their height and slant height labeled.',
    description:
      'Make a printable pyramid drawn to scale for your class. Draw square, rectangular, triangular and regular pyramids, right or oblique, label the height and slant height with their measures or with x, then copy it into a worksheet or test on volume and surface area.',
    keywords: [
      '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape', '3d figure', 'volume', 'surface area', 'pyramid', 'pyramids', 'square pyramid', 'rectangular pyramid', 'triangular pyramid', 'tetrahedron',
      'hexagonal pyramid', 'oblique pyramid', 'height', 'slant height', 'apothem', 'lateral area', 'hidden edges', 'dashed',
      'pythagorean theorem', 'to scale', 'diagram', 'geometry', 'labels', 'printable',
    ],
  },
  {
    id: 'cone',
    site: 'math',
    name: 'Cone Generator',
    path: '/cone',
    blurb: 'Right and oblique cones with their radius, height and slant height labeled.',
    description:
      'Make a printable cone drawn to scale for your class. Give its radius or diameter and its height or slant height, make it right or oblique, label each with its measure or with x, then copy it into a worksheet or test on volume and surface area.',
    keywords: [
      '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape', '3d figure', 'volume', 'surface area', 'cone', 'cones', 'oblique cone', 'radius', 'diameter', 'height', 'slant height', 'lateral area', 'circle',
      'hidden edges', 'dashed', 'pythagorean theorem', 'to scale', 'diagram', 'geometry', 'labels', 'printable',
    ],
  },
  {
    id: 'net',
    site: 'math',
    name: 'Net Generator',
    path: '/net',
    blurb: 'Nets of cubes, prisms, pyramids, cylinders and cones, labeled for surface area.',
    description:
      'Make a printable net of a 3D shape for your class. Unfold a cube into any of its 11 nets, or a prism, pyramid, cylinder or cone drawn to scale, label its edges with their measures or with x, name the faces or write their areas, add glue tabs for cutting it out, then copy it into a worksheet or test on surface area.',
    keywords: [
      'net', 'nets', 'net of a cube', 'cube net', 'cube nets', '11 nets of a cube', 'net of a prism', 'net of a pyramid', 'net of a cylinder',
      'net of a cone', 'net of a 3d shape', 'nets of 3d shapes', 'nets of solids', 'unfold', 'unfolded', 'flattened', 'fold', 'folding',
      'surface area', 'lateral area', 'faces', 'edges', 'vertices', '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape',
      'prism', 'rectangular prism', 'triangular prism', 'cube', 'pyramid', 'square pyramid', 'triangular pyramid', 'tetrahedron', 'cylinder', 'cone',
      'polyhedra', 'polyhedron', 'slant height', 'sector', 'glue tabs', 'template', 'cut out', 'papercraft', 'to scale', 'geometry', 'printable',
    ],
  },
  {
    id: 'sphere',
    site: 'math',
    name: 'Sphere Generator',
    path: '/sphere',
    blurb: 'Spheres and hemispheres with their radius or diameter labeled.',
    description:
      'Make a printable sphere or hemisphere for your class. Give its radius or diameter, label it with its measure or with x, turn a hemisphere into a dome or a bowl, then copy it into a worksheet or test on volume and surface area.',
    keywords: [
      '3d', 'three dimensional', 'solid', 'solids', 'geometric solids', '3d shape', '3d figure', 'volume', 'surface area', 'sphere', 'spheres', 'ball', 'hemisphere', 'hemispheres', 'half sphere', 'dome', 'bowl', 'radius', 'diameter',
      'great circle', 'circle', 'hidden edges', 'dashed', 'diagram', 'geometry', 'labels', 'printable',
    ],
  },
  {
    id: 'box-plot',
    site: 'math',
    name: 'Box Plot Generator',
    path: '/box-plot',
    blurb: 'Box plots from a list of numbers, one or several over the same number line.',
    description:
      'Make a printable box plot for your class. Type or paste the data, or the five-number summary, compare several box plots on one number line, label Q1, the median or Q3 or leave them for students to find, then copy it into a worksheet or test.',
    keywords: [
      'box plot', 'box plots', 'box and whisker', 'box and whisker plot', 'box-and-whisker', 'whiskers', 'five number summary',
      'five-number summary', 'quartile', 'quartiles', 'q1', 'q3', 'median', 'minimum', 'maximum', 'range', 'interquartile range',
      'iqr', 'outlier', 'outliers', 'statistics', 'stats', 'data', 'data set', 'data display', 'compare data', 'distribution',
      'spread', 'center', 'printable',
    ],
  },
  {
    id: 'dot-plot',
    site: 'math',
    name: 'Dot Plot Generator',
    path: '/dot-plot',
    blurb: 'Dot plots and line plots from a list of values or a frequency table.',
    description:
      'Make a printable dot plot for your class. Type or paste the data, or each value with how many of it, draw dots or X’s over a number line, use fractions for line plots of measurements, and copy it into a worksheet or test.',
    keywords: [
      'dot plot', 'dot plots', 'dotplot', 'line plot', 'line plots', 'dot diagram', 'x plot', 'frequency', 'frequency table', 'tally',
      'statistics', 'stats', 'data', 'data set', 'data display', 'distribution', 'shape of data', 'mode', 'median', 'range', 'cluster',
      'gap', 'peak', 'outlier', 'skewed', 'symmetric', 'fractions', 'measurement', 'line plot with fractions', 'printable',
    ],
  },
  {
    id: 'scatter-plot',
    site: 'math',
    name: 'Scatter Plot Generator',
    path: '/scatter-plot',
    blurb: 'Scatter plots from paired data, with a line of best fit, its equation and r.',
    description:
      'Make a printable scatter plot for your class. Type or paste x and y values, let the axes fit the data with a zig-zag break, add the least-squares line of best fit or your own, write its equation and the correlation coefficient or leave blanks, and copy it into a worksheet or test.',
    keywords: [
      'scatter plot', 'scatter plots', 'scatterplot', 'scatter graph', 'scatter diagram', 'scattergram', 'scatter chart',
      'line of best fit', 'best fit line', 'trend line', 'linear regression', 'least squares', 'least squares regression line', 'lsrl',
      'regression line', 'linreg', 'correlation', 'correlation coefficient', 'r value', 'r squared', 'positive correlation',
      'negative correlation', 'no correlation', 'bivariate data', 'paired data', 'two variable data', 'association', 'outlier',
      'residual', 'prediction', 'extrapolation', 'interpolation', 'statistics', 'stats', 'data', 'data display', 'axis break', 'printable',
    ],
  },
  {
    id: 'bar-graph',
    site: 'math',
    alsoOn: ['biology'],
    name: 'Bar Graph Generator',
    path: '/bar-graph',
    blurb: 'Bar graphs and column graphs from a table, with one or several bars per category.',
    description:
      'Bar and column graphs, single, double or stacked, with error bars.',
    keywords: [
      'bar graph', 'bar graphs', 'bar chart', 'bar charts', 'column graph', 'column graphs', 'column chart',
      'vertical bar graph', 'horizontal bar graph', 'double bar graph', 'grouped bar chart', 'side-by-side bar chart',
      'comparative bar chart', 'dual bar chart', 'compound bar chart', 'composite bar chart', 'component bar chart',
      'stacked bar chart', 'stacked bar graph', 'error bars', 'standard error', 'sem', 'standard deviation',
      'categorical data', 'frequency', 'data display', 'statistics', 'stats', 'compare data', 'key', 'legend', 'printable',
    ],
  },
  {
    id: 'stem-and-leaf',
    site: 'math',
    name: 'Stem-and-Leaf Plot Generator',
    path: '/stem-and-leaf',
    blurb: 'Stem-and-leaf plots from a data set, single or back-to-back, with a key.',
    description:
      'Stem-and-leaf plots, single or back-to-back, with split stems and a key.',
    keywords: [
      'stem and leaf', 'stem-and-leaf plot', 'stem and leaf plot', 'stem and leaf diagram', 'stem-and-leaf display', 'stemplot', 'stem plot',
      'back-to-back stem and leaf', 'back to back', 'leaves', 'stems', 'key', 'ordered stem and leaf', 'split stems',
      'median', 'mode', 'range', 'quartiles', 'data set', 'statistics', 'data display', 'printable',
    ],
  },
  {
    id: 'cumulative-frequency',
    site: 'math',
    name: 'Cumulative Frequency Graph Generator',
    path: '/cumulative-frequency',
    blurb: 'Cumulative frequency curves from a frequency table, with the median and quartiles read off.',
    description:
      'Cumulative frequency graphs with the median, quartiles and percentiles read off.',
    keywords: [
      'cumulative frequency', 'cumulative frequency graph', 'cumulative frequency curve', 'cumulative frequency diagram',
      'cumulative frequency polygon', 'ogive', 'cumulative relative frequency', 'cumulative percentage', 'running total',
      'grouped data', 'grouped frequency table', 'frequency table', 'class interval', 'upper class boundary',
      'median', 'lower quartile', 'upper quartile', 'quartiles', 'interquartile range', 'iqr', 'percentile', 'percentiles',
      'estimate', 'gcse', 'statistics', 'stats', 'data display', 'printable',
    ],
  },
  {
    id: 'two-way-table',
    site: 'math',
    name: 'Two-Way Table Generator',
    path: '/two-way-table',
    blurb: 'Two-way tables with totals, cells left blank for students, and relative frequencies.',
    description:
      'Two-way tables of counts or relative frequencies, with totals.',
    keywords: [
      'two-way table', 'two way table', 'two-way tables', 'two way tables', 'two-way frequency table', 'contingency table',
      'relative frequency', 'relative frequency table', 'joint relative frequency', 'marginal relative frequency',
      'conditional relative frequency', 'row totals', 'column totals', 'totals', 'fill in the table', 'missing values',
      'probability', 'conditional probability', 'categorical data', 'frequency table', 'statistics', 'stats', '8.sp.a.4',
      'printable',
    ],
  },
  {
    id: 'histogram',
    site: 'math',
    alsoOn: ['biology'],
    name: 'Histogram Generator',
    path: '/histogram',
    blurb: 'Histograms from a data set or a frequency table, with equal or unequal bins.',
    description:
      'Histograms with equal or unequal bins, frequency density and frequency polygons.',
    keywords: [
      'histogram', 'histograms', 'frequency histogram', 'relative frequency histogram', 'frequency density',
      'unequal class widths', 'class width', 'class interval', 'class intervals', 'grouped data', 'grouped frequency table',
      'frequency table', 'frequency polygon', 'bins', 'bin width', 'continuous data', 'distribution', 'skewed', 'symmetric',
      'bimodal', 'statistics', 'stats', 'data display', 'axis break', 'printable',
    ],
  },
  {
    id: 'normal-curve',
    site: 'math',
    name: 'Normal Curve Generator',
    path: '/normal-curve',
    blurb: 'Normal distribution curves from a mean and SD, with regions shaded and their areas written.',
    description:
      'Make a printable normal distribution curve for your class. Give the mean and standard deviation, number the axis in values or z-scores, shade the area left of, right of, between or outside values, write each area or leave a blank, find a cut-off from an area as invNorm does, and mark percentile ranks, then copy it into a worksheet or test.',
    keywords: [
      'normal curve', 'normal curves', 'normal distribution', 'normal distribution curve', 'bell curve', 'bell shaped curve', 'gaussian',
      'standard normal', 'standard normal curve', 'standard normal distribution', 'z-score', 'z score', 'z-scores', 'z table',
      'standard deviation', 'mean', 'empirical rule', '68-95-99.7', '68 95 99.7 rule', 'area under the curve', 'shaded area',
      'shaded region', 'probability', 'normal probability', 'percentile', 'percentile rank', 'inverse normal', 'invnorm',
      'normalcdf', 'two tailed', 'critical value', 'ap statistics', 'statistics', 'stats', 'distribution', 'printable',
    ],
  },
  {
    id: 'venn-diagram',
    site: 'math',
    name: 'Venn Diagram Generator',
    path: '/venn-diagram',
    blurb: 'Venn diagrams of one, two or three sets, with numbers or elements in each region and regions shaded.',
    description:
      'Venn diagrams of one, two or three sets, with shaded regions.',
    keywords: [
      'venn diagram', 'venn diagrams', 'sets', 'set notation', 'union', 'intersection', 'complement', 'universal set',
      'ξ', 'subset', 'disjoint', 'mutually exclusive', 'a ∩ b', 'a ∪ b', 'a′', 'shading', 'shade the region',
      'probability', 'conditional probability', 'elements', 'factors', 'multiples', 'prime factors', 'hcf', 'lcm',
      'sorting', 'three circles', 'three set venn diagram', 'two circles', 'printable',
    ],
  },
  {
    id: 'tree-diagram',
    site: 'math',
    name: 'Tree Diagram Generator',
    path: '/tree-diagram',
    blurb: 'Probability tree diagrams of up to four stages, with probabilities on the branches, the outcomes listed and blanks for students.',
    description:
      'Probability tree diagrams with outcomes, branch probabilities and blanks.',
    keywords: [
      'tree diagram', 'tree diagrams', 'probability tree', 'probability trees', 'probability tree diagram', 'tree diagram generator',
      'sample space', 'outcomes', 'compound events', 'compound probability', 'independent events', 'dependent events',
      'conditional probability', 'with replacement', 'without replacement', 'coin', 'coin flip', 'dice', 'spinner', 'marbles',
      'branches', 'multiplication rule', 'and rule', 'probability', 'statistics', 'stats', 'ap stats', '7.sp.c.8', 'hss-cp',
      'fill in the blanks', 'printable',
    ],
  },
  {
    id: 'pie-chart',
    site: 'math',
    name: 'Pie Chart Generator',
    path: '/pie-chart',
    blurb: 'Pie charts from a table, with sectors labeled by name, value, percent or angle.',
    description:
      'Pie charts of counts, percents or degrees, with labeled sectors and a key.',
    keywords: [
      'pie chart', 'pie charts', 'pie graph', 'circle graph', 'circle graphs', 'sector', 'sectors', 'slice', 'slices',
      'angle', 'angles', 'degrees', '360', 'percentage', 'percent', 'proportion', 'fraction',
      'categorical data', 'key', 'legend', 'protractor', 'statistics', 'data display', 'printable',
    ],
  },
  {
    id: 'mapping-diagram',
    site: 'math',
    name: 'Mapping Diagram Generator',
    path: '/mapping-diagram',
    blurb: 'Mapping diagrams from a list of inputs and outputs, with arrows between them.',
    description:
      'Make a printable mapping diagram for your class. Type or paste the inputs and outputs, or ordered pairs, click to draw arrows between them for a function or a relation that isn’t one, title each side, then copy it into a worksheet or test.',
    keywords: [
      'mapping diagram', 'mapping diagrams', 'mapping', 'arrow diagram', 'function', 'functions', 'relation', 'relations',
      'is it a function', 'not a function', 'function or not', 'one-to-one', 'many-to-one', 'input', 'output', 'inputs',
      'outputs', 'domain', 'range', 'codomain', 'ordered pairs', 'pairs', 'arrows', 'ovals', 'algebra', 'printable',
    ],
  },
  {
    id: 'table-of-values',
    site: 'math',
    name: 'Table of Values Generator',
    path: '/table-of-values',
    blurb: 'Tables of x and y values from a rule or typed pairs, with blanks for students to fill in.',
    description:
      'Make a printable table of values for your class. Type a rule like y = 2x + 1 and the x-values, or type the pairs yourself, run it across or down, click any value to leave a blank, write the rule or a blank for it, and copy it into a worksheet or test.',
    keywords: [
      'table of values', 'tables of values', 'value table', 'x y table', 'xy table', 'x-y table', 'input output table', 'input-output table',
      'in out table', 'in-out table', 'function table', 'function tables', 't-chart', 't chart', 'rule', 'function rule', 'find the rule',
      'complete the table', 'linear function', 'linear equation', 'rate of change', 'slope', 'pattern', 'patterns', 'sequence',
      'quadratic', 'ordered pairs', 'input', 'output', 'function', 'functions', 'algebra', 'pre-algebra', 'printable',
    ],
  },
  {
    // Also on Chemistry and Physics Figures, as their own copies, which add a caliper and a micrometer:
    // see docs/adr/0001-a-generator-on-two-sites.md.
    id: 'length-reading',
    site: 'math',
    name: 'Length Reading Generator',
    path: '/length-reading',
    blurb: 'A metric or imperial ruler with an object lying along it, to measure.',
    description:
      'Make a printable ruler figure for your class. Pick a centimeter or inch ruler and how finely it is marked, type an object’s length, and students measure it, lined up with 0 or starting partway along, with magnified views of its ends, then copy it into a worksheet or test.',
    keywords: [
      'ruler', 'rulers', 'length', 'measure', 'measuring', 'measuring length', 'measurement', 'metric', 'imperial', 'customary',
      'meter', 'stick', 'meterstick', 'centimeters', 'cm', 'millimeters', 'mm', 'inches', 'inch', 'fraction', 'fractions',
      'fractions of an inch', 'nearest quarter inch', 'nearest eighth inch', 'line plot', 'marble', 'rock', 'cube', 'cylinder',
      'object', 'estimated', 'digit', 'units', 'printable',
    ],
  },
]
