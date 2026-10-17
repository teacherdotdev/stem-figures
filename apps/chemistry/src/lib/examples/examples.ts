// Example figures: real figures from each generator, each with its own page
// (/<generator>/examples/<slug>) and a PNG in static/examples/, so search
// engines can index them as images. Each is the generator's own settings, so
// "Edit this figure" opens exactly the figure shown.
//
// After adding or changing one, redo the pictures with
// scripts/snapshot-examples.mjs (see the app's README). The first example of
// each generator is also its social card (static/og/<generator>.png).
//
// Captions say only what the figure shows; readings and answer keys come
// from the generators' own logic (./details.server.ts), never typed here.

import { CATALOG } from '$shared/catalog/index'
import { SITE_ID } from '$lib/site/config'
import sizes from './sizes.json'
import type { Example, ExampleGeneratorId, ExampleSpec } from './types'

const SIZES = sizes as Record<string, number[]>

/** A generator's examples, or none while it is turned off (see $shared/catalog). */
function examplesOf<G extends ExampleGeneratorId>(generator: G, specs: ExampleSpec<G>[]): Example[] {
  if (!CATALOG.some((g) => g.site === SITE_ID && g.id === generator)) return []
  return specs.map((spec) => {
    const image = `/examples/${generator}/${spec.slug}.png`
    const [width, height] = SIZES[image] ?? [0, 0]
    return { ...spec, generator, settings: spec.settings as Record<string, unknown>, path: `/${generator}/examples/${spec.slug}`, image, width, height }
  })
}

export const EXAMPLES: Example[] = [
  ...examplesOf('volume-reading', [
    {
      slug: 'graduated-cylinder-reading-34-5-ml',
      title: 'Graduated cylinder reading 34.5 mL',
      alt: 'A 100 mL graduated cylinder filled to 34.5 mL, with a magnified view of the meniscus between the 30 and 40 mL marks',
      caption:
        'A 100 mL graduated cylinder marked every 1 mL and numbered every 10 mL, holding gray liquid. The bottom of the meniscus sits halfway between the 34 and 35 mL marks, so the reading is 34.5 mL, with the tenths digit estimated. A magnified circle beside the cylinder shows the meniscus against the marks.',
      settings: { size: '100', reading: 34.5 },
    },
    {
      slug: '10-ml-graduated-cylinder-reading-7-36-ml',
      title: '10 mL graduated cylinder reading 7.36 mL',
      alt: 'A 10 mL graduated cylinder with blue liquid reading 7.36 mL, with a magnified view of the meniscus',
      caption:
        'A 10 mL graduated cylinder marked every 0.1 mL and numbered every 1 mL, holding blue liquid. The bottom of the meniscus is a little past halfway from the 7.3 to the 7.4 mL mark, read as 7.36 mL with the hundredths digit estimated. A magnified circle shows the marks around the meniscus.',
      settings: { size: '10', reading: 7.36, tint: 'blue' },
    },
    {
      slug: 'meniscus-close-up-50-ml-graduated-cylinder-26-0-ml',
      title: 'Meniscus close-up: 50 mL graduated cylinder at 26.0 mL',
      alt: 'A magnified view of a meniscus in a 50 mL graduated cylinder, its bottom resting on the 26 mL mark',
      caption:
        'Only the magnified view of a 50 mL graduated cylinder, marked every 1 mL, with the bottom of the meniscus resting exactly on the 26 mL mark. Because the liquid is on a mark, the estimated digit is 0 and the reading is 26.0 mL. Use it to show students where on the curved surface to read.',
      settings: { size: '50', reading: 26, view: 'magnifier', span: 4 },
    },
    {
      slug: '1000-ml-graduated-cylinder-reading-640-ml',
      title: '1000 mL graduated cylinder reading 640 mL',
      alt: 'A 1000 mL graduated cylinder with green liquid filled to 640 mL, marked every 10 mL',
      caption:
        'A 1 L (1000 mL) graduated cylinder marked every 10 mL and numbered every 100 mL, holding green liquid. The bottom of the meniscus is on the 640 mL mark, so the reading is 640 mL, the ones digit being the estimated one. There is no magnifier, so students read it from the whole cylinder.',
      settings: { size: '1000', reading: 640, tint: 'green', view: 'whole' },
    },
    {
      slug: 'buret-reading-12-35-ml',
      title: 'Buret reading 12.35 mL',
      alt: 'A 50 mL buret reading 12.35 mL, with a magnified view of the meniscus between the 12 and 13 mL marks',
      caption:
        'A 50 mL buret, numbered from 0 at the top down to 50 and marked every 0.1 mL, with a stopcock at the bottom. The bottom of the meniscus is halfway between the 12.3 and 12.4 mL marks, so the reading is 12.35 mL. A buret reads downward, so the numbers grow toward the bottom of the magnified view.',
      settings: { instrument: 'buret', reading: 12.35 },
    },
    {
      slug: 'beaker-reading-160-ml',
      title: '250 mL beaker reading 160 mL',
      alt: 'A 250 mL beaker with red liquid at 160 mL, between its 150 and 175 mL marks',
      caption:
        'A 250 mL beaker marked every 25 mL and numbered every 50 mL, holding red liquid a little under halfway from the 150 mL mark to the next mark, 175 mL. Beaker marks are coarse, so the volume is estimated to the whole mL: 160 mL. Use it to compare how precisely a beaker and a graduated cylinder measure.',
      settings: { instrument: 'beaker', beaker: 'medium', reading: 160, tint: 'red' },
    },
    {
      slug: '25-cm3-graduated-cylinder-reading-18-25-cm3',
      title: '25 cm³ graduated cylinder reading 18.25 cm³',
      alt: 'A 25 cm³ graduated cylinder reading 18.25 cm³, with a dotted line from the bottom of the meniscus to the marks and a magnified view',
      caption:
        'A 25 cm³ graduated cylinder marked every 0.5 cm³ and numbered every 5 cm³, with the scale printed in cm³ rather than mL. A dotted line runs from the bottom of the meniscus across to the marks, halfway between the 18.0 and 18.5 cm³ marks, so the reading is 18.25 cm³. A magnified circle shows the marks around the meniscus.',
      settings: { size: '25', unit: 'cm3', reading: 18.25, guide: true },
    },
  ]),

  ...examplesOf('volume-by-displacement', [
    {
      slug: 'water-displacement-rock-100-ml-graduated-cylinder',
      title: 'Volume of a rock by water displacement',
      alt: 'Two 100 mL graduated cylinders: water at 50.0 mL before, and at 63.5 mL after a rock is added',
      caption:
        'Two 100 mL graduated cylinders side by side, labeled Before and After. The first holds water at 50.0 mL; in the second a rock rests on the bottom and the water has risen to 63.5 mL. The rock’s volume is the difference, 13.5 mL.',
      settings: { size: '100', before: 50, after: 63.5, object: 'rock' },
    },
    {
      slug: 'water-displacement-marbles-25-ml-graduated-cylinder',
      title: 'Volume of 3 marbles by water displacement',
      alt: 'Two 25 mL graduated cylinders: water at 12.00 mL before, and at 15.50 mL after three marbles are added',
      caption:
        'Two 25 mL graduated cylinders, marked every 0.5 mL and numbered every 5 mL. Before, the water is at 12.00 mL; after three marbles are dropped in, it is at 15.50 mL. The three marbles together have a volume of 3.50 mL.',
      settings: { size: '25', before: 12, after: 15.5, object: 'marbles', marbles: 3 },
    },
    {
      slug: 'water-displacement-metal-cube-50-ml-graduated-cylinder',
      title: 'Volume of a metal cube by water displacement',
      alt: 'Two 50 mL graduated cylinders with magnified views: water at 20.0 mL before, and at 28.0 mL after a cube is added',
      caption:
        'Two 50 mL graduated cylinders, each with a magnified view of its meniscus. The water reads 20.0 mL before and 28.0 mL after a cube is dropped in, so the cube’s volume is 8.0 mL (8.0 cm³). Pair it with the cube’s mass for a density question.',
      settings: { size: '50', before: 20, after: 28, object: 'cube', view: 'both' },
    },
    {
      slug: 'water-displacement-metal-cylinder-10-ml-graduated-cylinder',
      title: 'Volume of a metal cylinder by water displacement',
      alt: 'Two 10 mL graduated cylinders: water at 5.20 mL before, and at 7.45 mL after a small metal cylinder is added',
      caption:
        'Two 10 mL graduated cylinders, marked every 0.1 mL. The water reads 5.20 mL before and 7.45 mL after a small metal cylinder is added. The metal cylinder’s volume is 2.25 mL, read to the hundredth of a mL.',
      settings: { size: '10', before: 5.2, after: 7.45, object: 'cylinder' },
    },
    {
      slug: 'water-displacement-cube-100-cm3-graduated-cylinder-2-cm3-marks',
      title: 'Volume of a cube in cm³, on a scale marked every 2 cm³',
      alt: 'Two 100 cm³ graduated cylinders marked every 2 cm³: water at 46.0 cm³ before, and at 61.0 cm³ after a cube is added',
      caption:
        'Two 100 cm³ graduated cylinders, marked every 2 cm³ and numbered every 20 cm³, so students first work out what each mark is worth. Before, the water is at 46.0 cm³; after a cube is dropped in, it is halfway between the 60 and 62 cm³ marks, at 61.0 cm³. The cube’s volume is 15.0 cm³.',
      settings: { size: '100', marks: '2', numbers: '20', unit: 'cm3', before: 46, after: 61, object: 'cube' },
    },
  ]),

  ...examplesOf('gas-syringe', [
    {
      slug: 'gas-syringe-collecting-gas-64-cm3',
      title: 'Gas syringe collecting gas: 64.0 cm³',
      alt: 'A conical flask joined by a delivery tube to a 100 cm³ gas syringe on a stand, reading 64.0 cm³, with a magnified view of the plunger',
      caption:
        'A conical flask of liquid, closed with a bung and joined by a delivery tube to a 100 cm³ gas syringe clamped on a stand. The gas has pushed the plunger out to the 64 cm³ mark, so 64.0 cm³ of gas has been collected. A magnified view above the syringe shows the plunger’s face against the marks.',
      settings: { reading: 64 },
    },
    {
      slug: '50-cm3-gas-syringe-reading-23-5-cm3',
      title: '50 cm³ gas syringe reading 23.5 cm³',
      alt: 'A 50 cm³ gas syringe on its own, its plunger at 23.5 cm³, with a magnified view',
      caption:
        'A 50 cm³ gas syringe on its own, marked every 1 cm³ and numbered every 10 cm³ from 0 at the nozzle. The plunger’s face is halfway between 23 and 24 cm³, so the reading is 23.5 cm³. A magnified view above shows the face against the marks.',
      settings: { size: '50', reading: 23.5, setup: 'syringe' },
    },
    {
      slug: 'gas-syringe-reading-in-ml-31-8-ml',
      title: 'Gas syringe reading in mL: 31.8 mL',
      alt: 'A conical flask joined by a delivery tube to a 50 mL gas syringe on a stand, its scale in mL, the plunger at 31.8 mL',
      caption:
        'A conical flask joined by a delivery tube to a 50 mL gas syringe clamped on a stand, its scale printed in mL and drawn without a magnifier. The plunger’s face is most of the way from the 31 to the 32 mL mark, read as 31.8 mL of gas. mL and cm³ are the same size, so this is also 31.8 cm³.',
      settings: { size: '50', unit: 'mL', reading: 31.8, view: 'whole' },
    },
    {
      slug: 'gas-syringe-plunger-close-up-37-6-cm3',
      title: 'Gas syringe plunger close-up: 37.6 cm³',
      alt: 'A magnified view of a gas syringe’s scale, the plunger’s face at 37.6 cm³',
      caption:
        'Only the magnified view of a 100 cm³ gas syringe, showing the plunger’s flat face between the 37 and 38 cm³ marks. It is a little past halfway, so the reading is 37.6 cm³. Use it to practice reading at the plunger’s face rather than its knob.',
      settings: { reading: 37.6, setup: 'syringe', view: 'magnifier', span: 3 },
    },
  ]),

  ...examplesOf('length-reading', [
    {
      slug: 'metric-ruler-reading-7-45-cm',
      title: 'Metric ruler reading 7.45 cm',
      alt: 'A 15 cm ruler marked in millimeters with a metal cylinder lying along it from 0 to 7.45 cm, with a magnified view of its right end',
      caption:
        'A 15 cm ruler marked every millimeter, with a metal cylinder lying along it, its left end on 0. Its right end falls halfway between 7.4 and 7.5 cm, so its length is 7.45 cm, the hundredths digit estimated. A magnified view shows the right end against the marks.',
      settings: { length: 7.45, object: 'cylinder' },
    },
    {
      slug: 'ruler-measuring-not-from-zero-rock',
      title: 'Measuring with a ruler not starting at zero',
      alt: 'A 15 cm ruler with a rock lying along it from 2.00 cm to 8.35 cm, with magnified views of both ends',
      caption:
        'A 15 cm millimeter ruler with a rock lying along it, starting at the 2 cm mark rather than 0, with dashed lines dropped from its ends to the ruler. Magnified views show its left end at 2.00 cm and its right end at 8.35 cm. Its length is the difference, 6.35 cm.',
      settings: { object: 'rock', start: 2, length: 6.35, guides: true },
    },
    {
      slug: 'centimeter-ruler-without-millimeters-5-3-cm',
      title: 'Ruler marked only in centimeters: 5.3 cm',
      alt: 'A 15 cm ruler marked only every centimeter, with a cube lying along it from 0 to 5.3 cm',
      caption:
        'A 15 cm ruler with marks only every whole centimeter and a cube lying along it from 0. Its right end is about three tenths of the way from 5 to 6 cm, so its length is 5.3 cm, with the tenths digit estimated. Compare it with a millimeter ruler to show how the marks set the significant figures.',
      settings: { metricMarks: 'cm', object: 'cube', length: 5.3 },
    },
    {
      slug: 'inch-ruler-reading-3-5-16-inches',
      title: 'Inch ruler reading 3 5/16 inches',
      alt: 'A 6 inch ruler marked in sixteenths with a row of marbles from 0 to 3 5/16 inches',
      caption:
        'A 6 inch ruler marked every sixteenth of an inch, with marks shortening from halves down to sixteenths. A row of three marbles lies along it from 0, with dashed guide lines down from its ends. Its right end is on the 3 5/16 inch mark, so the row is 3 5/16 inches long.',
      settings: { system: 'imperial', imperialMarks: '16', object: 'marbles', marbles: 3, guides: true, length: 3.3125, span: 1 },
    },
    {
      slug: 'meter-stick-reading-62-4-cm',
      title: 'Meter stick reading 62.4 cm',
      alt: 'A meter stick marked every centimeter with a long metal cylinder lying along it from 0 to 62.4 cm',
      caption:
        'A meter stick (100 cm) marked every centimeter and numbered every 5 cm, with a long metal cylinder lying along it from 0. Its right end falls between 62 and 63 cm, read as 62.4 cm with the tenths digit estimated. A magnified view shows the right end against the marks.',
      settings: { cm: '100', metricMarks: 'cm', object: 'cylinder', length: 62.4 },
    },
  ]),

  ...examplesOf('mass-reading', [
    {
      slug: 'triple-beam-balance-reading-263-47-g',
      title: 'Triple beam balance reading 263.47 g',
      alt: 'A triple beam balance with its riders at 200 g, 60 g and 3.47 g, with a magnified view of the front beam',
      caption:
        'A triple beam balance with its three riders at 200 g on the beam marked in hundreds, 60 g on the beam marked in tens, and 3.47 g on the bottom beam, marked every 0.1 g from 0 to 10. The mass is their sum, 263.47 g, with the hundredths digit estimated. A magnified view shows the bottom rider against its marks.',
      settings: { mass: 263.47 },
    },
    {
      slug: 'triple-beam-balance-rock-mass-72-35-g',
      title: 'Mass of a rock on a triple beam balance',
      alt: 'A rock on the pan of a triple beam balance with its riders reading 72.35 g',
      caption:
        'A rock sits on the pan of a triple beam balance with its riders at 70 g on the tens beam, 0 g on the hundreds beam and 2.35 g on the bottom beam. The rock’s mass is their sum, 72.35 g. Pair it with a volume by displacement figure for a density question.',
      settings: { object: 'rock', mass: 72.35, view: 'whole' },
    },
    {
      slug: 'digital-balance-reading-12-47-g',
      title: 'Digital balance reading 12.47 g',
      alt: 'A digital balance with a weigh boat on its pan, its display reading 12.47 g',
      caption:
        'A digital balance with a weigh boat on its pan, its display showing 12.47 g. A digital balance is read exactly as shown, to its two decimal places, with no estimated digit.',
      settings: { instrument: 'digital', mass: 12.47 },
    },
    {
      slug: 'analytical-balance-reading-0-2537-g',
      title: 'Analytical balance reading 0.2537 g',
      alt: 'An analytical balance inside its glass draft shield, its display reading 0.2537 g',
      caption:
        'An analytical balance inside its glass draft shield, with a weigh boat on the pan and the display reading 0.2537 g. It shows four decimal places, a tenth of a milligram, so its reading has four significant figures here.',
      settings: { instrument: 'digital', decimals: 4, mass: 0.2537 },
    },
    {
      slug: 'digital-balance-metal-cube-mass-21-6-g',
      title: 'Mass of a metal cube on a digital balance',
      alt: 'A metal cube on a digital balance showing 21.6 g',
      caption:
        'A metal cube sits on the pan of a digital balance that shows one decimal place, reading 21.6 g. With the cube’s volume from a displacement or ruler figure, students can find its density.',
      settings: { instrument: 'digital', decimals: 1, object: 'cube', mass: 21.6 },
    },
  ]),

  ...examplesOf('temperature-reading', [
    {
      slug: 'thermometer-reading-22-6-celsius',
      title: 'Thermometer reading 22.6 °C',
      alt: 'A liquid-in-glass thermometer with red liquid reading 22.6 °C, with a magnified view of the top of the column',
      caption:
        'A liquid-in-glass thermometer marked every 1 °C from −10 to 110 °C, its red liquid ending a little past halfway between 22 and 23 °C. The reading is 22.6 °C, with the tenths digit estimated. A magnified view shows the top of the column against the marks.',
      settings: { reading: 22.6 },
    },
    {
      slug: 'thermometer-reading-below-zero-minus-4-5-celsius',
      title: 'Thermometer reading below zero: −4.5 °C',
      alt: 'A liquid-in-glass thermometer with blue liquid reading −4.5 °C, below the 0 °C mark',
      caption:
        'A liquid-in-glass thermometer with blue liquid whose column ends below 0 °C, halfway between −4 and −5 °C. The reading is −4.5 °C. Use it to check that students count down from zero correctly.',
      settings: { reading: -4.5, tint: 'blue' },
    },
    {
      slug: 'fahrenheit-thermometer-reading-98-6-f',
      title: 'Fahrenheit thermometer reading 98.6 °F',
      alt: 'A liquid-in-glass thermometer in degrees Fahrenheit, marked every 2 °F, reading 98.6 °F',
      caption:
        'A liquid-in-glass thermometer scaled in degrees Fahrenheit, marked every 2 °F and numbered every 20 °F. The column ends just past the 98 °F mark, read as 98.6 °F, normal body temperature. Each mark is 2 °F, so students must count by twos.',
      settings: { unit: 'fahrenheit', reading: 98.6 },
    },
    {
      slug: 'kelvin-thermometer-reading-295-4-k',
      title: 'Kelvin thermometer reading 295.4 K',
      alt: 'A liquid-in-glass thermometer in kelvins, reading 295.4 K',
      caption:
        'A liquid-in-glass thermometer scaled in kelvins, marked every 1 K from 260 to 390 K, with gray liquid. The column ends between 295 and 296 K, read as 295.4 K (22.25 °C). Kelvin is written without a degree sign.',
      settings: { unit: 'kelvin', reading: 295.4, tint: 'gray' },
    },
    {
      slug: 'digital-thermometer-reading-78-4-celsius',
      title: 'Digital thermometer reading 78.4 °C',
      alt: 'A digital thermometer with its steel probe in a beaker, the meter reading 78.4 °C',
      caption:
        'A digital thermometer: a handheld meter wired to a steel probe standing in a beaker of liquid. The display reads 78.4 °C, about the boiling point of ethanol. A digital reading is taken exactly as displayed.',
      settings: { instrument: 'digital', reading: 78.4 },
    },
  ]),

  ...examplesOf('ph-reading', [
    {
      slug: 'ph-meter-reading-3-27',
      title: 'pH meter reading 3.27',
      alt: 'A digital pH meter with its electrode in a beaker, the display reading pH 3.27',
      caption:
        'A digital pH meter wired to a glass pH electrode standing in a beaker of solution. The display reads 3.27, so the solution is acidic. A digital meter is read exactly as shown, to two decimal places.',
      settings: { reading: 3.27 },
    },
    {
      slug: 'analog-ph-meter-reading-8-46',
      title: 'Analog pH meter reading 8.46',
      alt: 'An analog pH meter whose needle points to 8.46 on a 0 to 14 dial, with a magnified view of the needle',
      caption:
        'An analog pH meter with a needle over a dial numbered 0 to 14 and marked every 0.2. The needle sits between the 8.4 and 8.6 marks, a little past 8.4, so the reading is 8.46, with the hundredths digit estimated. A magnified view shows the needle against the marks.',
      settings: { instrument: 'analog', reading: 8.46 },
    },
    {
      slug: 'ph-paper-acid-ph-2',
      title: 'pH paper showing an acid: pH 2',
      alt: 'A strip of universal indicator paper turned red, above a pH color chart from 0 to 14, matching pH 2',
      caption:
        'A strip of universal indicator (pH) paper whose wet end has turned red-orange, above a color chart with one swatch for each whole pH from 0 to 14. The strip matches the pH 2 swatch, so the solution is strongly acidic. pH paper is read to the whole number, and the figure needs color printing.',
      settings: { instrument: 'paper', reading: 2 },
    },
    {
      slug: 'ph-paper-base-ph-11',
      title: 'pH paper showing a base: pH 11',
      alt: 'A strip of universal indicator paper turned deep blue, above a pH color chart from 0 to 14, matching pH 11',
      caption:
        'A strip of universal indicator paper whose wet end has turned deep blue, above the 0 to 14 color chart. It matches the pH 11 swatch, so the solution is basic. Pair it with the acid strip to ask which solution is which.',
      settings: { instrument: 'paper', reading: 11 },
    },
  ]),

  ...examplesOf('titration-curve', [
    {
      slug: 'weak-acid-strong-base-titration-curve',
      title: 'Weak acid–strong base titration curve',
      alt: 'Titration curve of 25.0 mL of 0.100 M acetic acid with 0.100 M NaOH, with the half-equivalence and equivalence points marked',
      caption:
        'The pH of 25.0 mL of 0.100 M acetic acid (CH₃COOH, pKa 4.76) as 0.100 M NaOH is added, up to 50 mL. The pH rises slowly through the buffer region, then steeply at the equivalence point, 25 mL, which is above pH 7. The half-equivalence point at 12.5 mL is marked too, where the pH equals the pKa.',
      settings: { halfMark: 'guides' },
    },
    {
      slug: 'strong-acid-strong-base-titration-curve',
      title: 'Strong acid–strong base titration curve',
      alt: 'Titration curve of 25.0 mL of 0.100 M HCl with 0.100 M NaOH, with the equivalence point at 25 mL and pH 7 marked',
      caption:
        'The pH of 25.0 mL of 0.100 M hydrochloric acid (HCl) as 0.100 M NaOH is added, up to 50 mL. The pH starts low, stays nearly flat, then jumps sharply through the equivalence point at 25 mL. For a strong acid and strong base, the equivalence point is at pH 7.',
      settings: { analyte: 'strong-acid' },
    },
    {
      slug: 'weak-base-strong-acid-titration-curve',
      title: 'Weak base–strong acid titration curve',
      alt: 'Titration curve of 25.0 mL of 0.100 M ammonia with 0.100 M HCl, the pH falling, with the equivalence and half-equivalence points marked',
      caption:
        'The pH of 25.0 mL of 0.100 M ammonia (NH₃, pKb 4.75) as 0.100 M HCl is added, up to 50 mL. The pH falls, slowly through the buffer region and then steeply at the equivalence point at 25 mL, which is below pH 7. The half-equivalence point at 12.5 mL, where the pH equals 14 − pKb, is marked too.',
      settings: { analyte: 'weak-base', halfMark: 'guides', xTitle: 'Volume of HCl added (mL)' },
    },
    {
      slug: 'strong-base-strong-acid-titration-curve',
      title: 'Strong base–strong acid titration curve',
      alt: 'Titration curve of 25.0 mL of 0.100 M NaOH with 0.100 M HCl, the pH falling from about 13 to about 1.5, with the equivalence point marked',
      caption:
        'The pH of 25.0 mL of 0.100 M sodium hydroxide (NaOH) as 0.100 M HCl is added, up to 50 mL. The pH starts high, stays nearly flat, then drops sharply through the equivalence point at 25 mL and pH 7.',
      settings: { analyte: 'strong-base', xTitle: 'Volume of HCl added (mL)' },
    },
    {
      slug: 'titration-curve-worksheet-label-the-equivalence-point',
      title: 'Titration curve worksheet: find the equivalence point',
      alt: 'Titration curve of a weak acid with NaOH, with the equivalence and half-equivalence points marked by dots and blank lines for students to label',
      caption:
        'The titration of 20.0 mL of 0.150 M formic acid (HCOOH, pKa 3.75) with 0.120 M NaOH, graphed to 40 mL. The equivalence and half-equivalence points are marked with dots and dashed lines to the axes, each with a blank line for students to name it. Students can read the equivalence volume and the pKa off the graph.',
      settings: {
        analyteM: 0.15, analyteMl: 20, titrantM: 0.12, pKa: 3.75,
        xTo: '40', eqLabelMode: 'blank', halfMark: 'guides', halfLabelMode: 'blank',
      },
    },
  ]),

  ...examplesOf('heating-cooling-curve', [
    {
      slug: 'heating-curve-of-water-lettered',
      title: 'Heating curve of water, lettered A to F',
      alt: 'Heating curve of water from ice at −20 °C to steam at 120 °C, with plateaus at 0 and 100 °C labeled Melting and Boiling, corners lettered A to F',
      caption:
        'The temperature of water heated steadily from ice at −20 °C to steam at 120 °C, against time. The curve rises through the solid, stays flat at 0 °C while the ice melts, rises through the liquid, stays flat at 100 °C while the water boils, then rises through the gas. Its corners are lettered A to F, the sloped segments are labeled with their states and the plateaus with the changes, and dashed lines run from the plateaus to the temperature axis, with 0 °C and 100 °C written by them.',
      settings: { letters: true },
    },
    {
      slug: 'cooling-curve-of-water',
      title: 'Cooling curve of water',
      alt: 'Cooling curve of water from steam at 120 °C to ice at −20 °C, with plateaus labeled Condensing at 100 °C and Freezing at 0 °C',
      caption:
        'The temperature of water cooled steadily from steam at 120 °C to ice at −20 °C, against time. The curve falls through the gas, stays flat at 100 °C while the steam condenses, falls through the liquid, stays flat at 0 °C while the water freezes, then falls through the solid. The sloped segments are labeled with their states and the plateaus with the changes, and the temperatures are written by the dashed lines.',
      settings: { direction: 'cooling', startT: 120, endT: -20 },
    },
    {
      slug: 'heating-curve-of-ethanol',
      title: 'Heating curve of ethanol',
      alt: 'Heating curve of ethanol from −140 °C to 100 °C, with plateaus at its melting point, −114.1 °C, and boiling point, 78.3 °C, written by the temperature axis',
      caption:
        'The temperature of ethanol heated steadily from −140 °C to 100 °C, against time. It melts at −114.1 °C and boils at 78.3 °C, each written by the temperature axis above the dashed line from its plateau. The sloped segments are labeled with their states and the plateaus with the changes.',
      settings: { substance: 'ethanol', startT: -140, endT: 100, yFrom: '-140', yTo: '100', yStep: '20', yEvery: 1 },
    },
    {
      slug: 'heating-curve-of-water-to-scale-heat-added',
      title: 'Heating curve of water to scale, against heat added',
      alt: 'Heating curve of 100 g of water against heat added in kJ, its boiling plateau much longer than its melting plateau, with blank lines to label each segment',
      caption:
        'The temperature of 100 g of water heated from ice at −20 °C to steam at 120 °C, against the heat added in kJ, drawn to scale from water’s specific heats and enthalpies of fusion and vaporization. The boiling plateau at 100 °C is almost seven times as long as the melting plateau at 0 °C, each temperature written by its dashed line. Each segment has a blank line for students to name its state.',
      settings: { source: 'properties', xQuantity: 'heat', xTo: '320', xStep: '20', xTitle: 'Heat added (kJ)', segmentLabels: 'blank' },
    },
    {
      slug: 'cooling-curve-with-supercooling',
      title: 'Cooling curve with supercooling',
      alt: 'Cooling curve of water from 80 °C to −20 °C that dips 5 °C below the freezing point before rising back to 0 °C and freezing, corners lettered A to D',
      caption:
        'The temperature of water cooled steadily from 80 °C to −20 °C, against time. The liquid cools past its freezing point to −5 °C before ice starts to form, then the heat given out as it freezes warms it back up to 0 °C, written by the dashed line, where it stays until it has frozen. Its corners are lettered A to D.',
      settings: { direction: 'cooling', startT: 80, endT: -20, supercool: true, letters: true, xTo: '10', xEvery: 1, yTo: '100' },
    },
    {
      slug: 'heating-curve-worksheet-substance-x',
      title: 'Heating curve worksheet: label the melting and boiling points',
      alt: 'Heating curve of an unknown substance from 0 °C to 160 °C, its corners lettered A to F, with blank lines for the segment labels and by the temperature axis at each plateau',
      caption:
        'The temperature of an unknown substance, Substance X, heated steadily from 0 °C to 160 °C, against time, with plateaus at 40 °C and 120 °C. Its corners are lettered A to F, and every segment and both plateaus’ dashed lines have blank lines, for students to name each state and change and to mark the melting and boiling points.',
      settings: {
        substance: 'x', startT: 0, endT: 160, letters: true, segmentLabels: 'blank', pointLabels: 'blank',
        yFrom: '0', yTo: '160', yStep: '10',
      },
    },
  ]),

  ...examplesOf('potential-energy-diagram', [
    {
      slug: 'potential-energy-diagram-exothermic-reaction',
      title: 'Potential energy diagram of an exothermic reaction',
      alt: 'Potential energy diagram of an exothermic reaction: reactants at 50 kJ/mol, a transition state at 150 kJ/mol and products at 20 kJ/mol, with arrows labeled Ea = 100 kJ/mol and ΔH = −30 kJ/mol',
      caption:
        'The potential energy of an exothermic reaction against the reaction coordinate. The curve runs flat at the reactants, 50 kJ/mol, rises to the transition state at 150 kJ/mol and falls to the products at 20 kJ/mol. The activation energy arrow runs up from the reactants to the peak and the ΔH arrow down from the reactants to the products, each labeled with its value, and a dashed line carries the reactants’ energy across to both.',
      settings: { eaLabel: 'value', dhLabel: 'value' },
    },
    {
      slug: 'potential-energy-diagram-endothermic-reaction',
      title: 'Potential energy diagram of an endothermic reaction',
      alt: 'Potential energy diagram of an endothermic reaction: products higher than the reactants, with arrows for Ea, the reverse Ea and ΔH',
      caption:
        'The potential energy of an endothermic reaction: the reactants at 20 kJ/mol, the transition state at 150 kJ/mol and the products higher than the reactants, at 80 kJ/mol. Arrows mark the forward activation energy from the reactants, the reverse activation energy from the products, and ΔH, pointing up from the reactants to the products.',
      settings: { levels: [20, 150, 80], revEaArrow: true },
    },
    {
      slug: 'potential-energy-diagram-with-and-without-a-catalyst',
      title: 'Potential energy diagram with and without a catalyst',
      alt: 'Potential energy diagram of an exothermic reaction with a dashed catalysed path over a lower transition state, the activation energies of both paths marked, and a key',
      caption:
        'An exothermic reaction with and without a catalyst. The uncatalysed path, solid, rises to a transition state at 150 kJ/mol; the catalysed path, dashed, to one at 100 kJ/mol. Both start at the same reactants and end at the same products, so ΔH is the same, but the catalysed activation energy is 50 kJ/mol lower. A key under the graph names the two paths.',
      settings: { catalyst: true, catTs: 100 },
    },
    {
      slug: 'two-step-reaction-energy-profile-with-intermediate',
      title: 'Two-step reaction energy profile with an intermediate',
      alt: 'Reaction energy profile of a two-step mechanism: two transition states with an intermediate in the dip between them, each step’s Ea marked, and ΔH',
      caption:
        'The energy profile of a reaction that happens in two steps. Each step has its own transition state, a peak, at 120 and 100 kJ/mol, with an intermediate in the dip between them at 70 kJ/mol. Each step’s activation energy runs up from the level before it, so the first step, with the larger activation energy, is the rate-determining step. ΔH runs from the reactants to the products.',
      settings: { levels: [40, 120, 70, 100, 10], yTo: '160' },
    },
    {
      slug: 'activation-energy-with-and-without-an-enzyme',
      title: 'Activation energy with and without an enzyme',
      alt: 'Energy diagram with no numbers on its axes: a reaction’s path without an enzyme and a lower dashed path with an enzyme, each activation energy marked',
      caption:
        'A reaction with and without an enzyme, as biology courses draw it: the shape matters, so the potential energy axis has no numbers. With the enzyme, dashed, the transition state is lower, so the activation energy is smaller, while the reactants and products stay where they are. A key names the two paths.',
      settings: {
        catalyst: true, catTs: 90, uncatName: 'Without enzyme', catName: 'With enzyme', axes: 'shape', dhArrow: false,
        xEndCap: 'triangle', yEndCap: 'triangle', yTitle: 'Potential energy',
      },
    },
    {
      slug: 'potential-energy-diagram-worksheet-label-the-arrows',
      title: 'Potential energy diagram worksheet: which arrow shows ΔH?',
      alt: 'Potential energy diagram of an exothermic reaction with three arrows lettered A, B and C for the activation energy, ΔH and the reverse activation energy',
      caption:
        'An exothermic reaction with its three arrows lettered for a question: A, the activation energy, from the reactants up to the transition state; B, ΔH, from the reactants down to the products; and C, the reverse activation energy, from the products up to the transition state. Students say which arrow shows which energy and read the values from the numbered axis.',
      settings: { eaLabel: 'mark', dhLabel: 'mark', revEaArrow: true, revEaLabel: 'mark' },
    },
    {
      slug: 'enthalpy-level-diagram-haber-process',
      title: 'Enthalpy level diagram for the Haber process',
      alt: 'Energy level diagram with N₂ + 3H₂ on a line at 0 kJ and 2NH₃ on a lower line at −92 kJ, with an arrow labeled ΔH = −92 kJ between them',
      caption:
        'An energy level diagram for the Haber process, N₂ + 3H₂ → 2NH₃: no curve, just the reactants and products as lines, with the ΔH arrow pointing down from the reactants at 0 kJ to the products at −92 kJ. The reaction gives out 92 kJ of heat, so it is exothermic.',
      settings: {
        style: 'levels', levels: [0, 100, -92], reactantsLabel: 'N_2 + 3H_2', productsLabel: '2NH_3', dhLabel: 'value', unit: 'kj',
        yFrom: '-100', yTo: '20', yStep: '10', yTitle: 'Potential energy (kJ)',
      },
    },
  ]),

  ...examplesOf('particle-diagram', [
    {
      slug: 'particle-diagram-mixture-of-two-elements',
      title: 'Particle diagram of a mixture of two elements',
      alt: 'A box of scattered particles: single large dark gray atoms mixed with pairs of small white atoms joined as diatomic molecules',
      caption:
        'A box of particles scattered at random: five single large dark gray atoms and five diatomic molecules, each two small white atoms joined together. Each kind is made of only one type of atom, so each is an element, and the box is a mixture of two elements (like neon and hydrogen gas).',
      settings: {
        seed: 7,
        particles: [
          { count: 5, shape: 'single', look: { size: 'l', shade: 'dark', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } },
          { count: 5, shape: 'pair', look: { size: 's', shade: 'white', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } },
        ],
      },
    },
    {
      slug: 'particle-diagram-pure-compound-water-molecules',
      title: 'Particle diagram of a pure compound (water molecules)',
      alt: 'A box of eight bent molecules, each a large gray atom with two small white atoms, like water',
      caption:
        'A box of eight identical bent molecules, each one large gray atom joined to two small white atoms, drawn like H₂O. Every particle is the same molecule made of two kinds of atom, so the box shows a pure compound.',
      settings: {
        seed: 3,
        particles: [{ count: 8, shape: 'bent', look: { size: 'l', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } }],
      },
    },
    {
      slug: 'particle-diagram-pure-element-diatomic-molecules',
      title: 'Particle diagram of a pure element (diatomic molecules)',
      alt: 'A box of seven diatomic molecules, each two medium gray atoms joined together',
      caption:
        'A box of seven identical diatomic molecules, each two medium gray atoms of the same kind joined together, as in O₂ or N₂ gas. Only one kind of atom appears, so the box shows a pure element even though its particles are molecules.',
      settings: {
        seed: 11,
        particles: [{ count: 7, shape: 'pair', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 'm', shade: 'gray', charge: '' } }],
      },
    },
    {
      slug: 'particle-diagram-mixture-of-element-and-compound',
      title: 'Particle diagram of a mixture of an element and a compound',
      alt: 'A box with linear molecules of one black atom between two light gray atoms, mixed with diatomic molecules of two light gray atoms',
      caption:
        'A box of two kinds of molecule scattered together: four linear molecules, each a black atom between two light gray atoms (like CO₂), and four diatomic molecules of two light gray atoms (like O₂). The diatomic molecules are an element and the linear ones a compound, so the box is a mixture of an element and a compound.',
      settings: {
        seed: 5,
        particles: [
          { count: 4, shape: 'line', look: { size: 'm', shade: 'black', charge: '' }, outer: { size: 'm', shade: 'light', charge: '' } },
          { count: 4, shape: 'pair', look: { size: 'm', shade: 'light', charge: '' }, outer: { size: 'm', shade: 'light', charge: '' } },
        ],
      },
    },
    {
      slug: 'particle-diagram-before-and-after-reaction-hydrogen-and-oxygen',
      title: 'Particle diagram before and after a reaction (hydrogen and oxygen)',
      alt: 'Two boxes with an arrow between: before, pairs of small white atoms and pairs of gray atoms; after, bent molecules of one gray and two white atoms and one pair of gray atoms left over, with a key naming H₂, O₂ and H₂O',
      caption:
        'Two boxes joined by an arrow show a reaction at the particle level. Before: four H₂ molecules (pairs of small white atoms) and three O₂ molecules (pairs of gray atoms). After: four H₂O molecules and one O₂ molecule left over. Every atom before is still there after, so mass is conserved, and O₂ is in excess: H₂ is the limiting reactant.',
      settings: {
        seed: 3, boxes: 'two',
        particles: [
          { count: 4, after: 0, shape: 'pair', look: { size: 's', shade: 'white', charge: '' }, outer: { size: 's', shade: 'white', charge: '' }, name: 'H_2 molecule' },
          { count: 3, after: 1, shape: 'pair', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 'm', shade: 'gray', charge: '' }, name: 'O_2 molecule' },
          { count: 0, after: 4, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' }, name: 'H_2O molecule' },
        ],
        show: 'both',
      },
    },
    {
      slug: 'particle-diagram-key-of-each-atom-water-and-carbon-dioxide',
      title: 'Particle diagram with a key of each atom (H₂O and CO₂)',
      alt: 'A box of bent molecules of one gray and two white atoms and linear molecules of one black and two gray atoms, with a key listing a gray O atom, a white H atom and a black C atom',
      caption:
        'A box of four bent molecules, each a gray atom with two small white atoms, and four linear molecules, each a black atom between two gray atoms. The key lists each atom on its own rather than each molecule: gray is O, white is H and black is C, with O listed once though it is in both. Students can write the formulas H₂O and CO₂ from the box.',
      settings: {
        seed: 4,
        particles: [
          { count: 4, shape: 'bent', look: { size: 'm', shade: 'gray', charge: '' }, outer: { size: 's', shade: 'white', charge: '' } },
          { count: 4, shape: 'line', look: { size: 'm', shade: 'black', charge: '' }, outer: { size: 'm', shade: 'gray', charge: '' } },
        ],
        show: 'both', keyList: 'atoms',
        atomNames: [
          { look: { size: 'm', shade: 'gray', charge: '' }, name: 'O atom' },
          { look: { size: 's', shade: 'white', charge: '' }, name: 'H atom' },
          { look: { size: 'm', shade: 'black', charge: '' }, name: 'C atom' },
        ],
      },
    },
    {
      slug: 'particle-diagram-ionic-solid-lattice-nacl',
      title: 'Particle diagram of an ionic solid (NaCl lattice)',
      alt: 'A lattice of alternating large light gray negative ions and small dark gray positive ions, with a key naming them Cl⁻ and Na⁺',
      caption:
        'A square lattice of 4 rows and 6 columns in which large light gray negative ions alternate with small dark gray positive ions, as in solid sodium chloride. The key beside it names them Cl⁻ and Na⁺ ions. Each ion is surrounded by ions of the opposite charge.',
      settings: {
        layout: 'lattice', pattern: 'alternate', rows: 4, columns: 6,
        main: { size: 'l', shade: 'light', charge: '-' }, second: { size: 's', shade: 'dark', charge: '+' },
        mainName: 'Cl⁻ ion', secondName: 'Na⁺ ion', show: 'both',
      },
    },
    {
      slug: 'particle-diagram-interstitial-alloy-steel',
      title: 'Particle diagram of an interstitial alloy (steel)',
      alt: 'A lattice of large gray iron atoms with small black carbon atoms in some of the gaps, with a key',
      caption:
        'A lattice of large gray atoms, labeled iron in the key, with six small black carbon atoms sitting in the gaps between them. This is an interstitial alloy like steel: the small atoms fit between the metal atoms rather than replacing them.',
      settings: {
        layout: 'lattice', pattern: 'interstitial', rows: 5, columns: 6,
        main: { size: 'l', shade: 'gray', charge: '' }, second: { size: 'xs', shade: 'black', charge: '' }, secondCount: 6,
        mainName: 'Fe atom', secondName: 'C atom', show: 'both',
      },
    },
    {
      slug: 'particle-diagram-substitutional-alloy-brass',
      title: 'Particle diagram of a substitutional alloy (brass)',
      alt: 'A lattice of light gray copper atoms with some replaced by dark gray zinc atoms of similar size, with a key',
      caption:
        'A lattice of light gray atoms, labeled copper in the key, in which eight have been replaced by dark gray zinc atoms of about the same size. This is a substitutional alloy like brass: atoms of the second metal take the places of the first.',
      settings: {
        layout: 'lattice', pattern: 'substitute', rows: 5, columns: 6,
        main: { size: 'l', shade: 'light', charge: '' }, second: { size: 'l', shade: 'dark', charge: '' }, secondCount: 8,
        mainName: 'Cu atom', secondName: 'Zn atom', show: 'both',
      },
    },
  ]),

  ...examplesOf('bohr-model', [
    {
      slug: 'bohr-model-of-sodium',
      title: 'Bohr model of sodium (Na)',
      alt: 'Bohr model of a sodium atom: a nucleus of 11 protons and 12 neutrons, with 2, 8 and 1 electrons on three shells',
      caption:
        'A Bohr model of a neutral sodium atom. The nucleus is drawn as 11 red protons and 12 gray neutrons, and 11 blue electrons sit on three rings: 2 on the first shell, 8 on the second and 1 on the third. The single outer electron is sodium’s one valence electron.',
      settings: { protons: 11, neutrons: 12, electrons: [2, 8, 1] },
    },
    {
      slug: 'bohr-model-of-carbon',
      title: 'Bohr model of carbon (C)',
      alt: 'Bohr model of a carbon atom: 6 protons and 6 neutrons in the nucleus, 2 and 4 electrons on two shells, with a key',
      caption:
        'A Bohr model of a neutral carbon-12 atom: 6 protons and 6 neutrons in the nucleus, and 6 electrons, 2 on the first shell and 4 on the second. A key beside it shows which dot is a proton, a neutron and an electron.',
      settings: { key: true },
    },
    {
      slug: 'bohr-model-of-oxygen',
      title: 'Bohr model of oxygen (O)',
      alt: 'Bohr model of an oxygen atom: 8 protons and 8 neutrons, with 2 electrons on the first shell and 6 on the second drawn in pairs',
      caption:
        'A Bohr model of a neutral oxygen atom with 8 protons and 8 neutrons in the nucleus. Its 8 electrons are 2 on the first shell and 6 on the second, drawn in pairs at the four compass points as in a Lewis structure, so the two unpaired valence electrons stand out. The shells are labeled n = 1 and n = 2.',
      settings: { protons: 8, neutrons: 8, electrons: [2, 6], placement: 'paired', shellLabels: true },
    },
    {
      slug: 'bohr-model-of-calcium',
      title: 'Bohr model of calcium (Ca)',
      alt: 'Bohr model of a calcium atom: a nucleus labeled 20 protons and 20 neutrons, with 2, 8, 8 and 2 electrons on four shells',
      caption:
        'A Bohr model of a neutral calcium atom, with its nucleus written as text: 20 protons and 20 neutrons. Its 20 electrons fill four shells as 2, 8, 8 and 2. The two electrons on the outer shell are calcium’s valence electrons.',
      settings: { protons: 20, neutrons: 20, electrons: [2, 8, 8, 2], nucleus: 'text' },
    },
    {
      slug: 'bohr-model-of-sodium-ion-na-plus',
      title: 'Bohr model of a sodium ion (Na⁺)',
      alt: 'Bohr model of a sodium ion in brackets with a + charge: 11 protons, 12 neutrons and 2 and 8 electrons, the lost third-shell electron drawn as an empty dashed spot',
      caption:
        'A Bohr model of the sodium ion Na⁺, in square brackets with its 1+ charge at the top right. It has 11 protons and 12 neutrons but only 10 electrons, 2 and 8. The electron it lost from the third shell is drawn as an empty dashed spot on the third ring, and a key explains the symbols.',
      settings: { protons: 11, neutrons: 12, electrons: [2, 8], gainedLost: true, brackets: true, key: true },
    },
    {
      slug: 'bohr-model-of-chloride-ion-cl-minus',
      title: 'Bohr model of a chloride ion (Cl⁻)',
      alt: 'Bohr model of a chloride ion in brackets with a − charge: 17 protons, 18 neutrons, and 2, 8 and 8 electrons with the gained electron in green',
      caption:
        'A Bohr model of the chloride ion Cl⁻, in square brackets with its 1− charge. It has 17 protons, 18 neutrons and 18 electrons on three shells as 2, 8 and 8. The one electron gained to complete the outer shell is drawn in green, and a key explains the colors.',
      settings: { protons: 17, neutrons: 18, electrons: [2, 8, 8], gainedLost: true, brackets: true, key: true },
    },
    {
      slug: 'blank-bohr-model-aluminum',
      title: 'Blank Bohr model to fill in (aluminum)',
      alt: 'Bohr model of aluminum with 13 protons and 14 neutrons in the nucleus and three empty rings labeled n = 1 to n = 3',
      caption:
        'A Bohr model worksheet figure for aluminum: the nucleus shows 13 protons and 14 neutrons, and three empty rings labeled n = 1, n = 2 and n = 3. Students draw the electrons themselves: 2, 8 and 3.',
      settings: { protons: 13, neutrons: 14, electrons: [2, 8, 3], nucleus: 'text', emptyRings: true, shellLabels: true },
    },
  ]),

  ...examplesOf('nuclide-notation', [
    {
      slug: 'carbon-14-nuclide-symbol',
      title: 'Carbon-14 nuclide symbol (¹⁴₆C)',
      alt: 'The nuclide symbol for carbon-14: C with mass number 14 at the top left and atomic number 6 at the bottom left, with carbon-14 written under it',
      caption:
        'The nuclide symbol for carbon-14, the isotope used in radiocarbon dating: the symbol C with its mass number, 14, at the top left and its atomic number, 6, at the bottom left, right-aligned against the symbol. Its hyphen notation, carbon-14, is written under it.',
      settings: { mass: 14, notation: 'both' },
    },
    {
      slug: 'chlorine-37-ion-symbol-cl-minus',
      title: 'Chlorine-37 ion symbol (³⁷Cl⁻)',
      alt: 'The symbol of the chlorine-37 ion: Cl with mass number 37 at the top left and a minus charge at the top right, with an answer key under it',
      caption:
        'The isotope symbol of a chloride ion of chlorine-37: Cl with its mass number, 37, at the top left and its 1− charge, written as a minus sign, at the top right. The atomic number is left off, as many textbooks write it. The answer key under it gives the ion’s protons, neutrons and electrons.',
      settings: { z: 17, mass: 37, charge: -1, zPart: 'off', answerKey: true },
    },
    {
      slug: 'uranium-235-find-the-atomic-number',
      title: 'Uranium-235 with the atomic number blank',
      alt: 'The nuclide symbol for uranium-235: U with mass number 235 at the top left and an empty box at the bottom left for the atomic number',
      caption:
        'The nuclide symbol for uranium-235, the isotope used in nuclear reactors, with its atomic number left as an empty box at the bottom left. Students look up uranium’s atomic number, 92, and write it in.',
      settings: { z: 92, mass: 235, zPart: 'blank' },
    },
    {
      slug: 'alpha-particle-symbol',
      title: 'Alpha particle symbol (⁴₂He)',
      alt: 'The symbol for an alpha particle: He with mass number 4 at the top left and 2 at the bottom left',
      caption:
        'An alpha particle written as in a nuclear decay equation: the symbol He with a mass number of 4 at the top left and an atomic number of 2 at the bottom left, since an alpha particle is a helium-4 nucleus of 2 protons and 2 neutrons.',
      settings: { kind: 'particle' },
    },
    {
      slug: 'beta-particle-symbol',
      title: 'Beta particle symbol (⁰₋₁β)',
      alt: 'The symbol for a beta particle in a serif font: the Greek letter beta with 0 at the top left and −1 at the bottom left',
      caption:
        'A beta particle written with the Greek letter β, in Times New Roman: a mass number of 0 at the top left and −1 at the bottom left, the charge of the electron it is. The bottom numbers balance in a decay equation, so a nucleus that gives off a beta particle goes up one atomic number.',
      settings: { kind: 'particle', particle: 'beta', particleSymbol: 'beta', font: 'serif' },
    },
    {
      slug: 'identify-the-element-x',
      title: 'Identify the element: a made-up symbol X',
      alt: 'A nuclide symbol with the made-up symbol X: mass number 79, atomic number 34 and a 2− charge, with an answer key under it',
      caption:
        'A nuclide symbol with the element hidden behind the letter X, for an “identify the element” question: mass number 79, atomic number 34 and a 2− charge. Students find the element with 34 protons and work out its neutrons and electrons, which the answer key under it gives.',
      settings: { kind: 'custom', z: 34, mass: 79, charge: -2, answerKey: true },
    },
    {
      slug: 'oxygen-18-hyphen-notation-blank',
      title: 'Hyphen notation with the mass number blank (oxygen-18)',
      alt: 'The hyphen notation oxygen- followed by a blank line for the mass number',
      caption:
        'Hyphen notation for an isotope of oxygen with its mass number left as a line to write on, for students to work out from the protons and neutrons they’re given. The isotope is oxygen-18.',
      settings: { z: 8, mass: 18, notation: 'hyphen', massPart: 'blank', blank: 'line' },
    },
  ]),

  ...examplesOf('lewis-structures', [
    {
      slug: 'lewis-structure-of-co2',
      title: 'Lewis structure of CO₂ (carbon dioxide)',
      alt: 'Lewis structure of CO2: O=C=O with two double bonds and two lone pairs on each oxygen',
      caption:
        'The Lewis structure of carbon dioxide, CO₂: a carbon atom in the middle joined to each oxygen by a double bond. Each oxygen has two lone pairs and the carbon none, for 16 valence electrons in all, and every atom has an octet.',
      settings: { formula: 'CO2' },
    },
    {
      slug: 'lewis-structure-of-h2o',
      title: 'Lewis structure of H₂O (water)',
      alt: 'Lewis structure of water drawn bent: an oxygen with two lone pairs single-bonded to two hydrogens',
      caption:
        'The Lewis structure of water, H₂O: an oxygen atom single-bonded to two hydrogen atoms, with two lone pairs on the oxygen. It is drawn bent, hinting at the molecule’s real shape, and shows all 8 valence electrons.',
      settings: { formula: 'H2O', shape: 'shaped' },
    },
    {
      slug: 'lewis-structure-of-nh3',
      title: 'Lewis structure of NH₃ (ammonia)',
      alt: 'Lewis structure of ammonia: a nitrogen with one lone pair single-bonded to three hydrogens spread below it',
      caption:
        'The Lewis structure of ammonia, NH₃: a nitrogen atom single-bonded to three hydrogen atoms, with one lone pair on top. The hydrogens are spread below the nitrogen to hint at its trigonal pyramidal shape. It shows all 8 valence electrons.',
      settings: { formula: 'NH3', shape: 'shaped' },
    },
    {
      slug: 'lewis-dot-structure-of-ch4',
      title: 'Lewis dot structure of CH₄ (methane)',
      alt: 'Lewis dot structure of methane: a carbon with a pair of dots to each of four hydrogens',
      caption:
        'The Lewis dot structure of methane, CH₄, with each bond drawn as a pair of dots rather than a line. The carbon shares one pair of electrons with each of four hydrogen atoms, 8 valence electrons in all, and has no lone pairs.',
      settings: { formula: 'CH4', bondStyle: 'dots' },
    },
    {
      slug: 'lewis-structure-of-hcn',
      title: 'Lewis structure of HCN (hydrogen cyanide)',
      alt: 'Lewis structure of HCN: H single-bonded to C, triple-bonded to N with one lone pair',
      caption:
        'The Lewis structure of hydrogen cyanide, HCN: hydrogen single-bonded to a central carbon, which is triple-bonded to nitrogen. The nitrogen has one lone pair, for 10 valence electrons in all.',
      settings: { formula: 'HCN' },
    },
    {
      slug: 'lewis-dot-diagram-of-nitride-ion-n3',
      title: 'Lewis dot diagram of the nitride ion (N³⁻)',
      alt: 'Lewis dot diagram of the nitride ion: N with a pair of dots on each of its four sides, in square brackets with a 3− charge',
      caption:
        'The Lewis dot diagram of the nitride ion, N³⁻. A nitrogen atom has 5 valence electrons and gains 3 to fill its octet, so the symbol has a pair of dots on each of its four sides, 8 electrons in all. It is drawn in square brackets with its 3− charge.',
      settings: { formula: 'N 3-' },
    },
    {
      slug: 'resonance-structures-of-nitrate-no3',
      title: 'Resonance structures of nitrate (NO₃⁻)',
      alt: 'The three resonance structures of the nitrate ion in brackets, joined by double-headed arrows, with formal charges',
      caption:
        'The three resonance structures of the nitrate ion, NO₃⁻, side by side and joined by double-headed arrows. In each, nitrogen has one double bond and two single bonds to oxygen, and only the position of the double bond changes. Each is in square brackets with the ion’s 1− charge, and formal charges are shown.',
      settings: { formula: 'NO3-', resonance: 'all', formalCharges: true },
    },
    {
      slug: 'lewis-structure-of-sulfate-so4-2',
      title: 'Lewis structure of sulfate (SO₄²⁻)',
      alt: 'Lewis structure of the sulfate ion: sulfur single-bonded to four oxygens, each with three lone pairs, in brackets with a 2− charge and formal charges',
      caption:
        'The Lewis structure of the sulfate ion, SO₄²⁻, following the octet rule: sulfur single-bonded to four oxygen atoms, each oxygen with three lone pairs. The structure is in square brackets with the 2− charge, and formal charges are shown (+2 on sulfur, −1 on each oxygen).',
      settings: { formula: 'SO4 2-', formalCharges: true },
    },
  ]),

  ...examplesOf('dot-and-cross', [
    {
      slug: 'dot-and-cross-diagram-of-water',
      title: 'Dot-and-cross diagram of water (H₂O)',
      alt: 'Dot-and-cross diagram of water: an oxygen circle overlapping two hydrogen circles, a dot and a cross in each overlap, and two lone pairs of dots on the oxygen',
      caption:
        'A dot-and-cross diagram of a water molecule, H₂O, outer shells only. The oxygen atom’s circle overlaps each hydrogen atom’s, and each overlap holds one shared pair: a dot from the oxygen and a cross from the hydrogen. The oxygen’s two lone pairs of dots sit on its own circle, so it has 8 electrons and each hydrogen 2.',
      settings: { formula: 'H2O' },
    },
    {
      slug: 'dot-and-cross-diagram-of-methane',
      title: 'Dot-and-cross diagram of methane (CH₄)',
      alt: 'Dot-and-cross diagram of methane: a carbon circle overlapped by four hydrogen circles above, below, left and right, each overlap holding a dot and a cross',
      caption:
        'A dot-and-cross diagram of methane, CH₄. The carbon atom’s outer shell overlaps the shells of four hydrogen atoms on its four sides, and each overlap holds one shared pair, a dot from the carbon and a cross from the hydrogen. The carbon has no lone pairs and ends with 8 electrons.',
      settings: { formula: 'CH4' },
    },
    {
      slug: 'dot-and-cross-diagram-of-carbon-dioxide',
      title: 'Dot-and-cross diagram of carbon dioxide (CO₂)',
      alt: 'Dot-and-cross diagram of carbon dioxide: a carbon circle between two oxygen circles, each overlap holding two dots and two crosses, and two lone pairs of crosses on each oxygen',
      caption:
        'A dot-and-cross diagram of carbon dioxide, CO₂, with a double bond to each oxygen: each overlap holds two shared pairs, two dots from the carbon and two crosses from the oxygen. Each oxygen also has two lone pairs of crosses on its own circle.',
      settings: { formula: 'CO2' },
    },
    {
      slug: 'dot-and-cross-diagram-of-nitrogen-n2',
      title: 'Dot-and-cross diagram of nitrogen (N₂)',
      alt: 'Dot-and-cross diagram of a nitrogen molecule: two overlapping circles with three dots and three crosses in the overlap and one lone pair on each atom',
      caption:
        'A dot-and-cross diagram of a nitrogen molecule, N₂, with its triple bond: three shared pairs in the overlap, each a dot from one nitrogen and a cross from the other. Each nitrogen has one lone pair on the far side of its circle.',
      settings: { formula: 'N2' },
    },
    {
      slug: 'dot-and-cross-diagram-of-ethanol',
      title: 'Dot-and-cross diagram of ethanol (C₂H₅OH)',
      alt: 'Dot-and-cross diagram of ethanol: two carbon circles and an oxygen circle in a row, overlapped by six smaller hydrogen circles, each overlap holding one shared pair, with two lone pairs on the oxygen',
      caption:
        'A dot-and-cross diagram of ethanol, C₂H₅OH. Each carbon’s electrons and the oxygen’s have their own mark, dots, open circles and open squares, and the hydrogens’ are crosses, so every shared pair shows which atom gave each electron. The hydrogen circles are drawn a little smaller so the hydrogens on the two carbons don’t overlap each other.',
      settings: { formula: 'C2H5OH' },
    },
    {
      slug: 'dot-and-cross-diagram-of-ethene-for-students',
      title: 'Dot-and-cross diagram of ethene (C₂H₄) for students to complete',
      alt: 'The overlapping outer shells of ethene, two carbons and four hydrogens, with no electrons drawn, and an answer key under them',
      caption:
        'The outer shells of ethene, C₂H₄, drawn with no electrons, for students to add them: two overlapping carbon circles, each overlapped by two hydrogen circles. The answer key under it gives each atom’s bonding pairs, four for each carbon, including the double bond, and one for each hydrogen.',
      settings: { formula: 'C2H4', blank: true, answerKey: true },
    },
    {
      slug: 'dot-and-cross-diagram-of-sodium-chloride',
      title: 'Dot-and-cross diagram of sodium chloride (NaCl)',
      alt: 'Dot-and-cross diagram of sodium chloride: a sodium ion with 8 crosses and a chloride ion with 7 dots and 1 cross, each in square brackets with its charge',
      caption:
        'A dot-and-cross diagram of sodium chloride, NaCl. The sodium ion, Na⁺, is drawn with the full shell it is left with, 8 crosses, and the chloride ion, Cl⁻, with its own 7 electrons as dots and the one it gained from sodium as a cross. Each ion is in square brackets with its charge at the top right.',
      settings: { formula: 'NaCl' },
    },
    {
      slug: 'dot-and-cross-diagram-of-magnesium-chloride',
      title: 'Dot-and-cross diagram of magnesium chloride (MgCl₂)',
      alt: 'Dot-and-cross diagram of magnesium chloride: a magnesium ion with 8 crosses between two chloride ions, each with 7 dots and 1 cross, in brackets with their charges, and an answer key',
      caption:
        'A dot-and-cross diagram of magnesium chloride, MgCl₂, with every ion drawn: Cl⁻ Mg²⁺ Cl⁻, the magnesium ion in the middle. Each chloride ion has the cross it gained from magnesium on the side facing it. The answer key under it says how the electrons moved and gives each ion’s electron arrangement.',
      settings: { formula: 'MgCl2', answerKey: true },
    },
    {
      slug: 'dot-and-cross-diagram-of-aluminum-oxide',
      title: 'Dot-and-cross diagram of aluminum oxide (Al₂O₃)',
      alt: 'Dot-and-cross diagram of aluminum oxide: 2 in front of a bracketed Al³⁺ ion with 8 crosses, and 3 in front of a bracketed O²⁻ ion with 6 dots and 2 crosses',
      caption:
        'A dot-and-cross diagram of aluminum oxide, Al₂O₃, drawn as one of each ion with its number in front: 2[Al]³⁺ and 3[O]²⁻. Each aluminum ion has 8 crosses on its outer shell, and each oxide ion its own 6 electrons as dots and the 2 it gained as crosses.',
      settings: { formula: 'Al2O3' },
    },
    {
      slug: 'dot-and-cross-diagram-of-a-calcium-atom',
      title: 'Dot-and-cross diagram of a calcium atom (2, 8, 8, 2)',
      alt: 'A calcium atom drawn as four shells around the symbol Ca, with 2, 8, 8 and 2 electrons as dots',
      caption:
        'A calcium atom, Ca, with every shell drawn as a circle around its symbol and its 20 electrons as dots: 2, 8, 8 and 2 from the inside out. The electrons are paired at the top, right, bottom and left of each ring, as students are taught to draw an electron arrangement.',
      settings: { formula: 'Ca' },
    },
    {
      slug: 'dot-and-cross-diagram-mistake-sodium-chloride',
      title: 'Find the mistake: dot-and-cross diagram of sodium chloride (NaCl)',
      alt: 'A deliberately wrong dot-and-cross diagram of sodium chloride: a sodium ion with 8 crosses and a chloride ion with only 7 dots, its gained electron missing, each in square brackets with its charge',
      caption:
        'A deliberately wrong dot-and-cross diagram of sodium chloride, NaCl, for a “find the mistake” question. The chloride ion is drawn with only its own 7 electrons as dots, so the electron it gained from sodium is missing: Cl⁻ should have 8 electrons on its outer shell, 7 dots and 1 cross, to match its 1− charge.',
      settings: { formula: 'NaCl', edits: 'e15n' },
    },
  ]),
  ...examplesOf('orbital-diagram', [
    {
      slug: 'orbital-diagram-of-oxygen',
      title: 'Orbital diagram of oxygen (O)',
      alt: 'Orbital diagram of oxygen: 1s and 2s boxes each with a pair of arrows, and three 2p boxes with one pair and two single up arrows',
      caption:
        'The orbital diagram of an oxygen atom, 1s² 2s² 2p⁴, with each electron an arrow in a box. The 1s and 2s orbitals each hold a pair; in 2p, one orbital holds a pair and the other two hold one electron each, following Hund’s rule.',
      settings: {},
    },
    {
      slug: 'orbital-diagram-of-iron',
      title: 'Orbital diagram of iron (Fe)',
      alt: 'Orbital diagram of iron with boxes from 1s to 3d: 3d has one pair and four single up arrows',
      caption:
        'The full orbital diagram of an iron atom, 1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶, with the sublevels in filling order. Every sublevel is full except 3d, where one orbital holds a pair and the other four hold one electron each, giving iron four unpaired electrons.',
      settings: { z: 26 },
    },
    {
      slug: 'orbital-diagram-of-chromium-exception',
      title: 'Orbital diagram of chromium (an exception)',
      alt: 'Orbital diagram of chromium with an argon core: 4s has one up arrow and all five 3d boxes have one up arrow',
      caption:
        'The orbital diagram of chromium, an exception to the filling order: [Ar] 4s¹ 3d⁵ rather than 4s² 3d⁴. The argon noble gas core is written instead of drawn, then 4s holds one electron and each of the five 3d orbitals holds one, a half-filled d sublevel.',
      settings: { z: 24, core: true },
    },
    {
      slug: 'orbital-diagram-of-fe3-plus-ion',
      title: 'Orbital diagram of the Fe³⁺ ion',
      alt: 'Orbital diagram of Fe3+ with an argon core: an empty 4s box and five 3d boxes each with one up arrow',
      caption:
        'The orbital diagram of the iron(III) ion, Fe³⁺: [Ar] 3d⁵. Iron loses its two 4s electrons first and then one 3d electron, so 4s is drawn empty and each of the five 3d orbitals holds one electron.',
      settings: { z: 26, charge: 3, core: true },
    },
    {
      slug: 'orbital-diagram-and-electron-configuration-of-sulfur',
      title: 'Orbital diagram and electron configuration of sulfur (S)',
      alt: 'Orbital diagram of sulfur from 1s to 3p with its electron configuration 1s2 2s2 2p6 3s2 3p4 written underneath',
      caption:
        'The orbital diagram of a sulfur atom, with its electron configuration, 1s² 2s² 2p⁶ 3s² 3p⁴, written underneath. In 3p, one orbital holds a pair and two hold one electron each, so sulfur has two unpaired electrons.',
      settings: { z: 16, configLine: 'text' },
    },
    {
      slug: 'orbital-diagram-hunds-rule-mistake-nitrogen',
      title: 'Find the mistake: orbital diagram breaking Hund’s rule (nitrogen)',
      alt: 'Orbital diagram of nitrogen drawn wrong: the 2p sublevel has a pair of arrows in one box, one arrow in the next and an empty third box',
      caption:
        'A deliberately wrong orbital diagram of nitrogen for a “find the mistake” question. Its 2p sublevel has a pair in the first orbital, one electron in the second and none in the third, which breaks Hund’s rule: in the ground state, 1s² 2s² 2p³, each 2p orbital holds one electron.',
      settings: { z: 7, changes: { '2p': ['ud', 'u', ''] } },
    },
  ]),
  ...examplesOf('line-spectrum', [
    {
      slug: 'emission-spectra-hydrogen-helium-sodium-unknown-mixture',
      title: 'Emission spectra of hydrogen, helium and sodium with an unknown to identify',
      alt: 'Bright-line emission spectra of hydrogen, helium and sodium stacked on one 400–700 nm wavelength scale, with an unknown spectrum under them made of two of the three',
      caption:
        'Three bright-line emission spectra, hydrogen, helium and sodium, drawn as colored lines on black and stacked on one wavelength scale from 400 to 700 nm, so a line at the same wavelength sits at the same place in every strip. The fourth strip, labeled Unknown, is a mixture: it shows every line of hydrogen and of sodium, for students to match against the three above.',
      settings: {
        strips: [
          { type: 'element', id: 1, element: 'H' },
          { type: 'element', id: 2, element: 'He' },
          { type: 'element', id: 3, element: 'Na' },
          { type: 'mixture', id: 4, name: 'Unknown', of: [1, 3] },
        ],
      },
    },
    {
      slug: 'hydrogen-emission-spectrum-balmer-series',
      title: 'Hydrogen emission spectrum: the Balmer series',
      alt: 'The bright-line emission spectrum of hydrogen from 400 to 700 nm: four lines, violet, blue-violet, cyan and red',
      caption:
        'The visible emission spectrum of hydrogen, the Balmer series, as four colored lines on black on a 400 to 700 nm scale: a violet line, a blue-violet line, a cyan line and a red line. Each is light given off as hydrogen’s electron falls to the second energy level, the lines students connect to the Bohr model.',
      settings: { strips: [{ type: 'element', id: 1, element: 'H' }] },
    },
    {
      slug: 'absorption-spectra-hydrogen-helium',
      title: 'Absorption spectra of hydrogen and helium',
      alt: 'Absorption spectra of hydrogen and helium: dark lines across a continuous rainbow from 400 to 700 nm',
      caption:
        'The absorption spectra of hydrogen and helium, each a continuous rainbow from violet at 400 nm to red at 700 nm crossed by black lines where the gas absorbs light. The dark lines sit at exactly the wavelengths of each element’s bright emission lines, the way elements are identified in the light of stars.',
      settings: {
        style: 'absorption',
        strips: [
          { type: 'element', id: 1, element: 'H' },
          { type: 'element', id: 2, element: 'He' },
        ],
      },
    },
    {
      slug: 'flame-test-metals-emission-spectra-lithium-sodium-strontium-copper',
      title: 'Emission spectra of flame test metals: lithium, sodium, strontium and copper',
      alt: 'Bright-line emission spectra of lithium, sodium, strontium and copper on one wavelength scale, with an unknown made of two of them',
      caption:
        'Bright-line emission spectra of four metals used in flame tests, lithium, sodium, strontium and copper, each with a few of its strongest visible lines, on one 400 to 700 nm scale. Under them, an unknown shows every line of sodium and of strontium for students to identify.',
      settings: {
        strips: [
          { type: 'element', id: 1, element: 'Li' },
          { type: 'element', id: 2, element: 'Na' },
          { type: 'element', id: 3, element: 'Sr' },
          { type: 'element', id: 4, element: 'Cu' },
          { type: 'mixture', id: 5, name: 'Unknown', of: [2, 3] },
        ],
      },
    },
    {
      slug: 'identify-the-element-line-spectra-black-and-white',
      title: 'Identify the element: black-and-white line spectra with blank labels',
      alt: 'Three line spectra drawn as black lines on white, each with a blank line in place of the element’s name',
      caption:
        'Three line spectra, mercury, neon and helium, printed as black lines on white for a black-and-white copier, each with a blank line where the element’s name would be. Students match the line positions on the 400 to 700 nm scale to a reference chart to name each element.',
      settings: {
        style: 'print',
        labels: 'blank',
        strips: [
          { type: 'element', id: 1, element: 'Hg' },
          { type: 'element', id: 2, element: 'Ne' },
          { type: 'element', id: 3, element: 'He' },
        ],
      },
    },
    {
      slug: 'made-up-elements-line-spectra-unknown-mixture',
      title: 'Line spectra of made-up elements X, Y and Z with an unknown',
      alt: 'Emission spectra of three made-up elements, X, Y and Z, each with three lines, and an unknown made of two of them',
      caption:
        'Emission spectra of three made-up elements, X, Y and Z, each drawn with three lines typed in by the teacher, so students can’t look the answer up. The Unknown strip under them shows every line of Element X and Element Z, and students identify it by matching lines.',
      settings: {
        strips: [
          { type: 'custom', id: 1, name: 'Element X', lines: '425, 510, 630' },
          { type: 'custom', id: 2, name: 'Element Y', lines: '455, 545, 600' },
          { type: 'custom', id: 3, name: 'Element Z', lines: '480, 575, 665' },
          { type: 'mixture', id: 4, name: 'Unknown', of: [1, 3] },
        ],
      },
    },
  ]),
  ...examplesOf('photoelectron-spectrum', [
    {
      slug: 'photoelectron-spectrum-of-sodium',
      title: 'Photoelectron spectrum (PES) of sodium',
      alt: 'The photoelectron spectrum of sodium: four peaks labeled 1s², 2s², 2p⁶ and 3s¹, binding energy in MJ/mol decreasing from left to right on a logarithmic axis',
      caption:
        'The photoelectron spectrum of a sodium atom, as in AP Chemistry: one peak for each sublevel, labeled 1s², 2s², 2p⁶ and 3s¹, each as tall as its number of electrons, so the 2p peak is three times as tall as the 1s. Binding energy in MJ/mol falls from left to right on a logarithmic axis, so the tightly held 1s electrons are at the far left and the single valence 3s electron at the far right.',
      settings: { z: 11, counts: true },
    },
    {
      slug: 'photoelectron-spectrum-of-neon-with-binding-energies',
      title: 'PES of neon with binding energies',
      alt: 'The photoelectron spectrum of neon with three peaks, 1s², 2s² and 2p⁶, each labeled with its binding energy in MJ/mol',
      caption:
        'The photoelectron spectrum of neon: three peaks, 1s², 2s² and 2p⁶, with each peak’s binding energy in MJ/mol written over it. The 2p peak is three times as tall as the others because it holds six electrons, and the 1s peak is far to the left because those electrons are held most tightly.',
      settings: { z: 10, counts: true, energies: true },
    },
    {
      slug: 'pes-comparing-sodium-and-magnesium',
      title: 'PES comparing magnesium and sodium',
      alt: 'Photoelectron spectra of magnesium, solid, and sodium, dashed and gray behind it, with a key naming each',
      caption:
        'The photoelectron spectrum of magnesium drawn solid, with sodium’s dashed and gray behind it and a key naming each. Every magnesium peak sits to the left of the matching sodium peak, because magnesium’s extra proton holds each sublevel’s electrons more tightly, and its 3s peak is twice as tall, holding two electrons to sodium’s one.',
      settings: { z: 12, compare: 11 },
    },
    {
      slug: 'identify-the-element-from-its-photoelectron-spectrum',
      title: 'Identify the element from its photoelectron spectrum',
      alt: 'An unnamed element’s photoelectron spectrum with five peaks and blank lines in place of the sublevel labels',
      caption:
        'The photoelectron spectrum of an unnamed element, for students to identify: five peaks with blank lines where the sublevel labels go, on a numbered electrons axis so each peak’s height can be read. The peaks hold 2, 2, 6, 2 and 5 electrons from left to right, 17 in all, which is chlorine.',
      settings: { z: 17, names: false, sublevels: 'blank' },
    },
    {
      slug: 'photoelectron-spectrum-of-calcium-broken-axis-ev',
      title: 'Photoelectron spectrum of calcium on a broken axis, in eV',
      alt: 'The photoelectron spectrum of calcium drawn as bars on a broken binding energy axis in eV, with six sublevel labels',
      caption:
        'The photoelectron spectrum of calcium, 1s² 2s² 2p⁶ 3s² 3p⁶ 4s², drawn as bars. The binding energy axis, in electronvolts, is broken into a linear stretch for each group of nearby peaks, with break marks between them, so the core and valence peaks can all be read.',
      settings: { z: 20, unit: 'eV', scale: 'broken', peaks: 'bars' },
    },
    {
      slug: 'photoelectron-spectrum-of-iron',
      title: 'Photoelectron spectrum of iron',
      alt: 'The photoelectron spectrum of iron with seven peaks from 1s² to 4s², the 3d⁶ peak just left of the 4s² peak',
      caption:
        'The photoelectron spectrum of an iron atom, 1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s², on a broken binding energy axis in MJ/mol, each group of nearby peaks given its own stretch. The 3d peak sits just to the left of the 4s peak: although 4s fills first, its electrons are held less tightly, which is why iron loses its 4s electrons first when it forms ions.',
      settings: { z: 26, counts: true, scale: 'broken' },
    },
  ]),
  ...examplesOf('mass-spectrum', [
    {
      slug: 'mass-spectrum-of-magnesium',
      title: 'Mass spectrum of magnesium',
      alt: 'The mass spectrum of magnesium: three peaks at m/z 24, 25 and 26 labeled 78.99%, 10.00% and 11.01%',
      caption:
        'The mass spectrum of magnesium: one peak for each of its three natural isotopes, at m/z 24, 25 and 26, each as tall as its percent abundance and labeled with it. Magnesium-24 makes up nearly four fifths of natural magnesium, which is why its relative atomic mass is close to 24.',
      settings: { element: 'Mg' },
    },
    {
      slug: 'mass-spectrum-of-chlorine-relative-atomic-mass',
      title: 'Mass spectrum of chlorine with its relative atomic mass',
      alt: 'The mass spectrum of chlorine: a peak at m/z 35 labeled 75.76% and a peak at m/z 37 labeled 24.24%, with an answer key under the graph',
      caption:
        'The mass spectrum of chlorine, with peaks at m/z 35 and 37 for its two isotopes, chlorine-35 at 75.76% and chlorine-37 at 24.24%, about three to one. The answer key under the graph gives chlorine’s relative atomic mass, the average of the two isotopes’ masses weighted by their abundances.',
      settings: { element: 'Cl', answerKey: true },
    },
    {
      slug: 'identify-the-element-from-its-mass-spectrum',
      title: 'Identify the element from its mass spectrum',
      alt: 'An unnamed element’s mass spectrum with two nearly equal peaks at m/z 79 and 81, labeled 50.69% and 49.31%',
      caption:
        'The mass spectrum of an unnamed element, for students to identify: two nearly equal peaks at m/z 79 and 81, labeled with their percent abundances. The weighted average mass is about 79.9, which is bromine.',
      settings: { element: 'Br', names: false },
    },
    {
      slug: 'draw-the-missing-peak-silicon-mass-spectrum',
      title: 'Draw the missing peak: silicon mass spectrum',
      alt: 'The mass spectrum of silicon with peaks at m/z 28 and 30 and the peak at m/z 29 left out, with an answer key under the graph',
      caption:
        'The mass spectrum of silicon with its peak at m/z 29 left out, for students to draw in. The peaks at m/z 28 (92.22%) and 30 (3.09%) are shown, so the missing isotope’s abundance is what’s left of 100%. The answer key names the missing peak and gives silicon’s relative atomic mass.',
      settings: { element: 'Si', leaveOut: 29, answerKey: true },
    },
    {
      slug: 'mass-spectrum-of-a-made-up-element',
      title: 'Mass spectrum of a made-up element',
      alt: 'The mass spectrum of Element Q: a peak at m/z 20 labeled 90% and a peak at m/z 22 labeled 10%, with an answer key under the graph',
      caption:
        'The mass spectrum of a made-up Element Q with two isotopes typed in by the teacher: mass 20 at 90% and mass 22 at 10%, so students can’t look the answer up. They work out its relative atomic mass, 20 × 0.90 + 22 × 0.10, which the answer key under the graph gives.',
      settings: { source: 'custom', name: 'Element Q', isotopes: [{ mass: 20, pct: 90 }, { mass: 22, pct: 10 }], answerKey: true },
    },
    {
      slug: 'mass-spectrum-of-zirconium-relative-abundance',
      title: 'Mass spectrum of zirconium, relative abundance',
      alt: 'The mass spectrum of zirconium with five peaks from m/z 90 to 96, the tallest at m/z 90 scaled to 100',
      caption:
        'The mass spectrum of zirconium, its five natural isotopes from m/z 90 to 96, drawn with the tallest peak, zirconium-90, scaled to 100 and the others against it, as many textbooks and instruments show a spectrum.',
      settings: { element: 'Zr', scale: 'relative' },
    },
  ]),

  ...examplesOf('half-life-graph', [
    {
      slug: 'carbon-14-half-life-graph',
      title: 'Carbon-14 half-life graph',
      alt: 'Decay curve of carbon-14, percent remaining against time in years, with dashed guide lines at 5,730, 11,460 and 17,190 years',
      caption:
        'The percent of carbon-14 remaining against time in years, from 100% at the start, on an axis numbered every 4,000 years up to 30,000. Dashed guide lines run from 50%, 25% and 12.5% across to the curve and down to the time axis, each labeled with its time: 5,730, 11,460 and 17,190 years, one, two and three half-lives.',
      settings: { guides: 3 },
    },
    {
      slug: 'identify-the-isotope-from-its-half-life',
      title: 'Identify the isotope from its half-life: three decay curves',
      alt: 'Three decay curves, solid, dashed and dotted, named Isotope A, Isotope B and Isotope C in a key, against time in years from 0 to 160',
      caption:
        'Three radioactive isotopes decaying on one graph, percent remaining against time in years. The curves are solid, dashed and dotted so they read apart in black and white, and the key calls them only Isotope A, B and C. Students read each half-life off the curve where it crosses 50% and match the isotopes to a table of half-lives.',
      settings: { count: 3, iso1: 'h3', iso2: 'cs137', iso3: 'co60', names: false, xTo: '160', xStep: '10', xEvery: 2 },
    },
    {
      slug: 'carbon-14-decaying-to-nitrogen-14',
      title: 'Carbon-14 decaying to nitrogen-14: parent and daughter',
      alt: 'Carbon-14 falling and nitrogen-14 rising as percent of atoms against time in years, crossing at 50% at one half-life, marked T½',
      caption:
        'Carbon-14, the parent, falls from 100% of the atoms while its stable daughter, nitrogen-14, rises from 0%, the daughter dashed and both named in a key. The two always add up to 100%, so they cross at 50% after one half-life, where a dashed guide line labeled T½ runs down to the time axis.',
      settings: { daughter: true, guides: 1, guideLabels: 'halves' },
    },
    {
      slug: 'iodine-131-mass-remaining',
      title: 'Iodine-131 decay: mass remaining over 45 days',
      alt: 'Decay curve of an 80 g sample of iodine-131, mass remaining in grams against time in days, with a dot at the start and at each half-life',
      caption:
        'An 80 g sample of iodine-131 decaying over 45 days, its mass remaining in grams against time in days. A dot marks the start and each half-life along the curve, at 80, 40, 20, 10, 5 and 2.5 g, for questions on how much is left after a given time.',
      settings: { iso1: 'i131', xUnit: 'd', quantity: 'mass', start: 80, dots: true, xTo: '45', xStep: '5', xEvery: 1, yTo: '80' },
    },
    {
      slug: 'technetium-99m-activity-read-the-half-life',
      title: 'Technetium-99m activity: read the half-life',
      alt: 'Activity of technetium-99m in becquerels from 800 Bq against time in hours, with dashed guide lines from 400 and 200 Bq and blank lines by the time axis',
      caption:
        'The activity of a technetium-99m sample, the medical tracer, falling from 800 Bq, against time in hours. Dashed guide lines run from 400 Bq and 200 Bq across to the curve and down to the time axis, each with a blank line for students to write the time, one and two half-lives.',
      settings: {
        iso1: 'tc99m', xUnit: 'h', quantity: 'activity', start: 800, guides: 2, guideLabels: 'blank',
        xTo: '32', xStep: '2', yTo: '800', yStep: '100',
      },
    },
    {
      slug: 'plot-the-decay-curve-isotope-x',
      title: 'Plot the decay curve: Isotope X, half-life 10 years',
      alt: 'Dots at 100, 50, 25, 12.5, 6.25 and 3.125 percent every 10 years on an empty grid, for students to join into a decay curve',
      caption:
        'The points of a made-up Isotope X with a half-life of 10 years, its percent remaining at the start and after each half-life, 100%, 50%, 25%, 12.5% and so on, with the curve left off. Students join the dots with a smooth curve and see that it never reaches zero.',
      settings: { iso1: 'x', curve: false, dots: true, xTo: '50', xStep: '5', xEvery: 1 },
    },
  ]),
]

/** A generator's examples, in order; the first is its best. */
export const examplesFor = (generator: string) => EXAMPLES.filter((e) => e.generator === generator)

export const findExample = (generator: string, slug: string) => EXAMPLES.find((e) => e.generator === generator && e.slug === slug)

/** Generators with examples. */
export const EXAMPLE_GENERATORS = [...new Set(EXAMPLES.map((e) => e.generator))]

/** The generator's social card image (static/og/<generator>.png), made from its first example. */
export const ogImage = (generator: string) => `/og/${generator}.png`
