// Every generator's figure, laid out from a page address, pinned as a
// snapshot: any change to what a link draws shows up here. Run
// `npx vitest run -u` after a change that is meant to move the drawing.

import { describe, expect, test } from 'vitest'
import { buildShape } from './3d-shape/layout.js'
import * as shape from './3d-shape/settings.js'
import { readShape } from './3d-shape/solve.js'
import { buildPlot } from './box-plot/boxplot.js'
import * as box from './box-plot/settings.js'
import { buildGraph } from './coordinate-grid/graph.js'
import * as grid from './coordinate-grid/settings.js'
import { buildLine } from './number-line/numberline.js'
import * as line from './number-line/settings.js'
import { buildDiagram } from './mapping-diagram/layout.js'
import * as mapping from './mapping-diagram/settings.js'
import { buildQuadrilateral } from '$lib/shapes/quadrilateral/layout.js'
import { readQuadrilateral } from '$lib/shapes/quadrilateral/settings.js'
import { family as kite } from './kite/family.js'
import { family as parallelogram } from './parallelogram/family.js'
import { family as rectangle } from './rectangle/family.js'
import { buildAngles } from './angles/layout.js'
import * as angles from './angles/settings.js'
import { buildLines, readLines } from './parallel-lines/layout.js'
import * as parallel from './parallel-lines/settings.js'
import { buildPolygon } from './regular-polygon/layout.js'
import * as polygon from './regular-polygon/settings.js'
import { family as trapezoid } from './trapezoid/family.js'
import { buildTriangle } from './triangle/layout.js'
import * as triangle from './triangle/settings.js'

const eq = (...rows: string[]) => rows.map((r) => `eq=${encodeURIComponent(r)}`).join('&')

const GRID = [
  '',
  'xFrom=-6&xTo=6&yFrom=-6&yTo=6&xEvery=2&yEvery=2',
  `xFrom=-10&xTo=10&yFrom=-10&yTo=10&${eq('y=2x+1', '2x+3y=6|color=red|line=dashed', 'x=4|arrows=none', 'y=-3|arrows=left|line=dotted')}`,
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&${eq('y=x^2-4|color=blue', 'y=2^x|arrows=right', 'y=sqrt(x)|color=green', 'y=1/x|color=purple')}`,
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&${eq('(1, 2), (3, 4)', '(-2, -3)|point=cross|color=orange', '(9, 9)')}`,
  `xFrom=0&xTo=2pi&xStep=pi%2F4&yFrom=-2&yTo=2&yStep=1%2F2&${eq('y=sin(x)')}`,
  `xFrom=-6&xTo=6&yFrom=-6&yTo=6&${eq('y>x-2|color=blue|fill=hatch', 'y<=-x+3|color=red|fill=hatch|barrows=both', '-1<x<=1|color=green', 'y>1/x|color=purple')}`,
  'xFrom=0&xTo=1&xStep=1%2F4&yFrom=-1&yTo=1&yStep=0.25',
  'title=Distance%20over%20time&titleMode=text&xTitle=Time%20(hours)&xTitleMode=text&yTitle=Distance%20(km)&yTitleMode=text',
  'titleMode=blank&xTitleMode=blank&yTitleMode=blank&xLabelMode=none&yLabel=distance',
  'xStartCap=circle&xEndCap=line&yStartCap=none&yEndCap=triangle&xEvery=5&yEvery=0',
  'xFrom=-3&xTo=4.5&yFrom=2&yTo=7&yStep=0.5&xEvery=10',
  'xStart=-2&xBlocks=7&yStart=-1&yBlocks=14&yStep=0.5&arrows=0',
  'xFrom=abc&xTo=1&xStep=0&yFrom=5&yTo=1',
  'xFrom=0&xTo=100&xStep=1',
  `${eq('y<2x', 'y=z+1', 'x^2+y^2=4', '0=0', '1=2', 'x^2=4', 'hello')}`,
  `xFrom=-2pi&xTo=2pi&xStep=pi%2F2&yFrom=-3&yTo=3&${eq('y=tan(x)', 'y=2sin(x)|color=red', 'y=sin(x)/x|color=blue')}`,
  `xFrom=0%C2%B0&xTo=360%C2%B0&xStep=90%C2%B0&yFrom=-2&yTo=2&angle=degrees&${eq('y=sin(x)', 'y=cos(2x)|color=blue')}`,
  `xFrom=-2&xTo=8&yFrom=-4&yTo=6&${eq('y=ln(x)', 'y=log_2(x)|color=blue', 'y=e^x|color=red', 'y=|x-3|-2|color=green', 'y=sin')}`,
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&${eq('y=-x-1, x<0', 'y=x^2, 0≤x≤2|color=blue', 'y=4, x>2|color=red|arrows=right', 'x=-3, -4≤y<-1|color=green', 'y=x, -4≤x≤-2|ends=hidden|line=dashed')}`,
  `xFrom=-6&xTo=6&yFrom=-6&yTo=6&${eq('y=(x^2+1)/(x-1)|asym=shown', 'y=2^x-3|asym=shown|color=blue', 'y=ln(x+4)|asym=shown|color=green', 'y=1/x|color=red')}`,
  'xFrom=0&xTo=4&yFrom=0&yTo=3&minor=5',
  'minor=10',
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&labelSize=large&titleMode=text&title=Big&${eq('A(1, 2)')}`,
  'labelSize=small',
  'labelSize=huge',
  'xFrom=-2&xTo=2&yFrom=-2&yTo=2&minor=4',
  'minor=3',
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&${eq("A(1, 2), B'(-3, 4), (0, -1)", 'P(1/2, -2)|names=coords|color=blue')}`,
  `xFrom=0&xTo=2pi&xStep=pi%2F2&yFrom=-2&yTo=2&${eq('Q(pi/2, 1)|names=coords')}`,
  `xFrom=-5&xTo=5&yFrom=-5&yTo=5&${eq('y=(2x+1)/(3x^2-1)', 'y=(x^2-1)/(x-1)|color=blue', 'y=x^(1/3)|color=green', 'y=1/(x+3)^2|color=red')}`,
]

const LINE = [
  '',
  'from=-5&to=5&eq=-2%20%3C%20x%20%3C%3D%203',
  `${eq('x<-1 or x>=3', 'x!=2', 'x=4', 'all real numbers', 'no solution')}`,
  `from=0&to=2pi&step=pi%2F4&${eq('pi/2<x<=3pi/2')}`,
  `from=0&to=2&step=1%2F4&every=2&${eq('x>3/4')}`,
  `from=-3&to=3&points=cross&${eq('-1, 2.5', '0', '1/3')}`,
  `${eq('3', '-1, 2.5, pi/2')}`,
  'every=5&from=-20&to=20',
  'every=0',
  'from=x&to=-20&step=-1',
  'from=0&to=1000&step=1',
  `${eq('x<20', 'y>2 and x<3', '(1, 2)', 'x<y', 'x+')}`,
  'inequality=x%3E%3D2',
  `${eq('x<2|color=red', 'x>=2|color=blue', 'x>6|color=red', '-5, 0|color=green|point=cross')}`,
  `from=0&to=1&step=1%2F10&${eq('a_n=1/n|last=6')}`,
  `from=0&to=10&${eq('u_n=2n+1|first=0|last=8|color=purple|values=hidden')}`,
  `from=-3&to=3&${eq('A(-2.5), 1, C(1.25)', 'P(0.5)|point=cross|labels=coords|color=red', '-1.5|values=hidden')}`,
  `${eq('a_n=a_{n-1}+3', 'a_n=2k', '1/n|first=4|last=2')}`,
  'points=cross&eq=3&eq=x%3C1',
  `from=0&to=10&${eq('1/3, 1/2, 2/3, Q_1(4.5)')}`,
  `labelSize=large&from=0&to=2&step=1%2F4&${eq('x>3/4')}`,
]

const TRIANGLE = [
  '',
  'A=60&B=60&C=60&AB=5&ALabel=measure&BLabel=measure&CLabel=measure&ABTicks=1&BCTicks=1&CATicks=1',
  'AB=3&BC=4&CA=5&unit=cm&round=2',
  'A=30&BC=4&CA=6&other=1',
  'A=30&BC=4&CA=6',
  'A=110&AB=7&CA=5&hB=1&hBLabel=measure&hBFoot=D&hC=1&hCStyle=dotted',
  'A=40&B=70&C=&AB=&BCLabel=text&BCText=2y%2B1&hA=1&hAStyle=solid&hALabel=text&hAText=h',
  'nameA=P&nameB=Q&nameC=R&base=BC&flip=1&rotate=45&AArcs=2&BArcs=3&square=0',
  'moved=AB%3A4%2C-6%3BvC%3A0%2C3&rotate=-90',
  'AB=3sqrt(2)&BC=5%2F2&CA=3&ABLabel=measure&BCLabel=measure&round=0',
  'A=100&B=100',
  'labelSize=large',
  'labelSize=small&hB=1&hBLabel=measure&hBFoot=D',
  'AB=1&BC=1&CA=5',
  'A=abc',
  'A=20',
]

const QUADRILATERALS = {
  rectangle: [
    '',
    'unit=cm&BCLabel=measure&dAC=1&dACLabel=measure',
    'kind=square&ABTicks=1&BCTicks=1&CDTicks=1&DATicks=1',
    'kind=square&AB=x',
    'ABTicks=1&CDTicks=1&labelSize=large&moved=AB%3A4%2C-6%3BvC%3A0%2C3',
  ],
  parallelogram: [
    '',
    'AArcs=1&CArcs=1&hD=1&hDFoot=E',
    'kind=rhombus&dAC=1&dBD=1&cross=E&ABTicks=1&BCTicks=1&CDTicks=1&DATicks=1',
    'nameA=P&nameB=Q&nameC=R&nameD=S&unit=cm&ALabel=measure&BLabel=text&BText=2x%2B1&hD=1&hDLabel=measure&base=CD&flip=1&rotate=20',
  ],
  trapezoid: [
    '',
    'kind=trapezoid',
    'kind=trapezoid&AB=4&CD=9&h=3&A=30&hD=1&hC=1&hDLabel=text&hDText=h&hDFoot=E&hCFoot=F',
    'kind=trapezoid&ALabel=measure&ABArrows=2&CDArrows=2&dAC=1&dBD=1&cross=E&hDFoot=F',
    'kind=isosceles-trapezoid&DATicks=1&BCTicks=1&AArcs=1&BArcs=1&round=2',
    'base=BC&flip=1&rotate=45&hC=1&hCStyle=dotted',
    'ABTicks=1&ABArrows=2&CDTicks=1&labelSize=large',
    'kind=trapezoid&AB=7&CD=7',
  ],
  kite: [
    '',
    'dAC=1&dBD=1&cross=E&BLabel=measure',
    'base=AB&square=0&dAC=1&dBD=1',
    'DA=2',
  ],
}

const POLYGON = [
  '',
  'n=3&sideLabel=measure&angleLabel=measure&angleArcs=1&sideTicks=1',
  'n=4&apothem=0&radii=1&centerName=O',
  'n=5&radius=1&radiusLabel=text&radiusText=r&apothemLabel=measure&centerName=O&letters=1',
  'n=8&sizeBy=apothem&size=6&radius=1&radiusLabel=measure&apothemLabel=measure&sideLabel=measure&unit=cm',
  'n=12&sizeBy=radius&size=4sqrt(2)&dot=0&apothem=0&sideTicks=2&rotate=15',
  'n=20&letters=1&labelSize=large&moved=apothem%3A4%2C-6',
  'size=x',
]

const lines = (...rows: [string, string][]) => new URLSearchParams(rows).toString()

const PARALLEL = [
  '',
  lines(['t', 't1|name=t|angle=90|pos=0']),
  lines(['a', 'p1+~t1+|label=measure'], ['a', 'p1-~t1+|label=text|text=3x+5|mark=2'], ['a', 'p2+~t1+|label=text|text=x|shade=1']),
  lines(['p', 'p1|name=m'], ['t', 't1|name=n|angle=12|pos=0'], ['t', 't2|name=t|angle=65|pos=1'], ['a', 'p1+~t2+|label=measure']),
  lines(['p', 'p1|name=m|arrows=2'], ['p', 'p2|name=n|arrows=2'], ['p', 'p3|name=o|arrows=2'], ['t', 't1|name=t|angle=70|pos=0'], ['t', 't2|name=s|angle=110|pos=2']),
  lines(['t', 't1|name=t|angle=60|pos=0'], ['t', 't2|name=s|angle=120|pos=0'], ['pt', 'p1.t1.t2|name=A'], ['pt', 'p2.t1|name=B'], ['pt', 'p2.t2|name=C']),
  lines(['turn', '30'], ['labelSize', 'large'], ['p', 'p1|name=m|startCap=none|endCap=none'], ['p', 'p2|name=n|style=dashed|endCap=line'], ['t', 't1|name=t|angle=65|pos=0|startCap=circle'], ['pt', 'p1:start|name=A'], ['pt', 'p1:end|name=B']),
  lines(['t', 't1|name=t|angle=5|pos=0']),
]

const ANGLES = [
  '',
  lines(['r', 'r1|dir=0|twoSided=1'], ['r', 'r2|dir=90'], ['r', 'r3|dir=32'], ['r', 'r4|dir=148'], ['a', 'r1+~r3+|label=text|text=y°'], ['a', 'r3+~r2+|label=measure'], ['a', 'r2+~r4+|label=text|text=x°'], ['a', 'r4+~r1-|mark=1'], ['pt', 'v|name=G']),
  lines(['r', 'r1|dir=0|twoSided=1'], ['r', 'r2|dir=90'], ['a', 'r1+~r2+|label=measure|mark=right'], ['a', 'r2+~r1-|label=text|text=x°|mark=right']),
  lines(['r', 'r1|dir=0|twoSided=1'], ['r', 'r2|dir=50|twoSided=1'], ['a', 'r1+~r2+|label=text|text=2x+10|mark=2'], ['a', 'r1-~r2-|label=measure|mark=2'], ['a', 'r2+~r1-|shade=1']),
  lines(['r', 'r1|dir=0|endCap=circle'], ['r', 'r2|dir=45|endCap=circle'], ['a', 'r2+~r1+|label=measure|shade=4'], ['pt', 'v|name=G'], ['pt', 'r1:end|name=F'], ['pt', 'r2:end|name=H']),
  lines(['turn', '30'], ['labelSize', 'large'], ['r', 'r1|dir=0'], ['r', 'r2|dir=40'], ['r', 'r3|dir=80|style=dashed'], ['a', 'r1+~r2+|mark=1'], ['a', 'r2+~r3+|mark=1']),
  lines(['r', 'r1|dir=0'], ['r', 'r2|dir=180'], ['a', 'r1+~r2+|label=measure']),
  lines(['r', 'r1|dir=0|twoSided=1'], ['r', 'r2|dir=180']),
]

const data = (...rows: string[]) => rows.map((r) => `data=${encodeURIComponent(r)}`).join('&')

const BOX = [
  '',
  data('11, 14, 15, 18, 20, 21, 24, 27, 30, 35, 42'),
  data('4, 7, 9, 12, 20'),
  data('55, 60, 62, 70, 71, 75, 80|name=Period 1', '40, 58, 66, 69, 72, 90, 95|name=Period 2'),
  `outliers=1&${data('1, 10, 11, 12, 13, 14, 15, 40')}`,
  `minLabel=measure&q1Label=measure&medianLabel=measure&q3Label=text&q3Text=x&maxLabel=measure&${data('10, 11, 12, 13, 30')}`,
  `title=Test%20scores&titleMode=text&axisTitle=Score&axisTitleMode=text&startCap=none&endCap=circle&${data('70, 75, 80, 85, 90')}`,
  'titleMode=blank&axisTitleMode=blank',
  `from=0&to=1&step=1%2F4&${data('0.1, 0.3, 0.5, 0.6, 0.9')}`,
  `from=0&to=100&step=1&every=10&${data('12, 40, 55, 90')}`,
  `from=abc&step=-1&${data('1, 2, x', '3, 400')}`,
]

const arrows = (...pairs: [string, string][]) => pairs.map(([a, b]) => `arrow=${encodeURIComponent(`${a}→${b}`)}`).join('&')

const MAPPING = [
  '',
  `inputs=-2%2C+-1%2C+0%2C+1%2C+2&outputs=0%2C+1%2C+4&${arrows(['-2', '4'], ['-1', '1'], ['0', '0'], ['1', '1'], ['2', '4'])}`,
  `inputs=4%2C+9&outputs=-3%2C+-2%2C+2%2C+3&${arrows(['4', '-2'], ['4', '2'], ['9', '-3'], ['9', '3'])}`,
  'inputs=1%2C+2%2C+3&outputs=a%2C+b',
  `inputs=Ana%0ABo%0ACy&outputs=red%0Ablue&inputTitle=Student&outputTitle=Favorite+color&${arrows(['Ana', 'red'], ['Bo', 'blue'], ['Cy', 'red'])}`,
  `inputs=x%2C+2x%2C+1%2F2&outputs=sqrt(2)%2C+x%5E2&shape=box&title=Relation+R&titleMode=text&${arrows(['x', 'x^2'], ['1/2', 'sqrt(2)'])}`,
  'inputs=1%2C+2&outputs=3&shape=none&inputTitleMode=blank&outputTitleMode=none&titleMode=blank&labelSize=large',
  `inputs=1&outputs=2&${arrows(['1', '2'], ['5', '2'])}`,
]

const SHAPE = [
  '',
  'depth=left&names=1',
  'hidden=0&unit=in&labelSize=large',
  'oblique=1&height=4&lean=3&edgeLabel=measure',
  'oblique=1&leanTo=left&height=&lean=3&edge=5',
  'base=right',
  'base=right&pose=stand&oblique=1',
  'base=isosceles&triHeightLabel=text&triHeightText=h&hypLabel=measure&names=1',
  'base=regular&sides=6&side=3&height=6&apothemLabel=measure',
  'base=regular&sides=5&pose=lie&names=1&depth=left&nameList=P+Q',
  'shape=pyramid&slantLabel=measure&names=1',
  'shape=pyramid&base=regular&sides=3&side=4&height=&slant=5&apothemLabel=measure',
  'shape=pyramid&oblique=1&lean=3&square=0',
  'shape=cylinder',
  'shape=cylinder&oblique=1&leanTo=left&edgeLabel=measure',
  'shape=cylinder&diameter=1&radius=6&radiusLabel=text&radiusText=d',
  'shape=cone&slantLabel=measure&showHeight=0',
  'shape=cone&oblique=1&lean=4',
  'shape=cone&radius=10&height=1',
  'shape=sphere',
  'shape=hemisphere&diameter=1&radius=8',
  'shape=hemisphere&bowl=1&hidden=0',
  'length=1&width=1&height=100',
  'moved=length%3A4%2C-6%3BvC%3A0%2C3&names=1',
  'length=abc',
  'oblique=1&height=4&lean=3&edge=9',
]

const params = (q: string) => new URLSearchParams(q)

describe('coordinate grid', () => {
  test.each(GRID)('%s', (q) => {
    const s = grid.settingsFromParams(params(q))
    expect({ query: grid.settingsToQuery(s), problems: grid.readAxes(s).problems, graph: buildGraph(s) }).toMatchSnapshot()
  })
})

describe('number line', () => {
  test.each(LINE)('%s', (q) => {
    const s = line.settingsFromParams(params(q))
    const { rows } = line.readLine(s)
    expect({ query: line.settingsToQuery(s), rows, line: buildLine(s) }).toMatchSnapshot()
  })
})

describe('box plot', () => {
  test.each(BOX)('%s', (q) => {
    const s = box.settingsFromParams(params(q))
    const { rows, problems } = box.readPlot(s)
    expect({ query: box.settingsToQuery(s), rows, problems, plot: buildPlot(s) }).toMatchSnapshot()
  })
})

describe('mapping diagram', () => {
  test.each(MAPPING)('%s', (q) => {
    const s = mapping.settingsFromParams(params(q))
    const { verdict, repeated } = mapping.readMapping(s)
    expect({ query: mapping.settingsToQuery(s), verdict, repeated, diagram: buildDiagram(s) }).toMatchSnapshot()
  })
})

describe('triangle', () => {
  test.each(TRIANGLE)('%s', (q) => {
    const s = triangle.settingsFromParams(params(q))
    const read = triangle.readTriangle(s)
    const figure = read.triangle ? buildTriangle(s, read.triangle, read.given) : null
    expect({ query: triangle.settingsToQuery(s), read, figure }).toMatchSnapshot()
  })
})

describe('regular polygon', () => {
  test.each(POLYGON)('%s', (q) => {
    const s = polygon.settingsFromParams(params(q))
    const read = polygon.readPolygon(s)
    const figure = read.polygon ? buildPolygon(s, read.polygon) : null
    expect({ query: polygon.settingsToQuery(s), read, figure }).toMatchSnapshot()
  })
})

describe('parallel lines and a transversal', () => {
  test.each(PARALLEL)('%s', (q) => {
    const s = parallel.settingsFromParams(params(q))
    const figure = buildLines(s)
    expect({ query: parallel.settingsToQuery(s), problems: readLines(s).problems, figure }).toMatchSnapshot()
  })
})

describe('angles', () => {
  test.each(ANGLES)('%s', (q) => {
    const s = angles.settingsFromParams(params(q))
    const figure = buildAngles(s)
    expect({ query: angles.settingsToQuery(s), problems: angles.readRays(s).problems, figure }).toMatchSnapshot()
  })
})

describe('3D shape', () => {
  test.each(SHAPE)('%s', (q) => {
    const kind = shape.settingsFor(shape.kindOf(params(q).get('shape')))
    const s = kind.settingsFromParams(params(q))
    const read = readShape(s)
    const figure = read.values ? buildShape(s, { ...read, values: read.values }) : null
    expect({ query: kind.settingsToQuery(s), read, figure }).toMatchSnapshot()
  })
})

const FAMILIES = { rectangle, parallelogram, trapezoid, kite }

describe.each(Object.keys(FAMILIES) as (keyof typeof FAMILIES)[])('%s', (name) => {
  const family = FAMILIES[name]
  test.each(QUADRILATERALS[name])('%s', (q) => {
    const s = family.settingsFromParams(params(q))
    const read = readQuadrilateral(s)
    const figure = read.shape ? buildQuadrilateral(s, read.shape, read.given) : null
    expect({ query: family.settingsToQuery(s), read, figure }).toMatchSnapshot()
  })
})
