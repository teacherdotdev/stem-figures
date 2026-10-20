// The words under each generator: what its figures show and how teachers use
// them, what can be set, and frequently asked questions, for the section below
// the figure (GeneratorAbout) and the page's structured data. Everything here
// should be true of the generator's code; check it when a generator changes.
// Plain text only: the same strings go into JSON-LD.

export interface Faq {
  q: string
  a: string
}

export interface GeneratorCopy {
  /** the section's visible heading */
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
  'volume-reading': {
    heading: 'Graduated cylinder, buret and beaker figures',
    intro: [
      'Volume Reading draws a graduated cylinder, a 50 mL buret or a beaker holding the volume you type, with the meniscus drawn so students read the volume at its bottom. On the cylinder and the buret, readings go one digit past the smallest mark (the estimated digit), so the same figure works for reading glassware and for significant figures. A beaker, with its coarse marks, is read to the whole mL. Each instrument starts with its usual scale; you can pick finer or coarser marks, number them more or less often or not at all, and print it in mL or cm³.',
      'Teachers use it for measurement questions on tests, worksheets and lab practicals. Add a magnified view of the scale around the meniscus so the marks stay readable in print, and turn on the answer key to print the reading under the figure for your key.',
    ],
    settings: [
      'Instrument: a 10, 25, 50, 100, 250 or 1000 mL graduated cylinder, a 50 mL buret, or a 50, 250 or 600 mL beaker',
      'The scale: how far apart the smallest marks are and how often they are numbered, from a few spacings that suit each instrument, or no numbers',
      'Unit: mL or cm³',
      'The reading, typed or picked at random, with an optional dotted line from the bottom of the meniscus to the marks',
      'Liquid color: gray, which photocopies well, or blue, red or green',
      'A magnifier beside the instrument or in place of it, spanning 1 to 6 numbered marks',
      'A chart title, and an answer key line with the reading',
    ],
    faqs: [
      {
        q: 'How do you read a graduated cylinder?',
        a: 'Read at the bottom of the meniscus, with your eye level with it. Work out what each small mark is worth, find the last mark below the meniscus, then estimate one more digit between marks. On a 100 mL cylinder marked every 1 mL, that means reading to 0.1 mL, like 43.6 mL.',
      },
      {
        q: 'Why does a buret read from the top down?',
        a: 'A buret measures the liquid let out through its stopcock, so 0 is at the top and the numbers grow downward to 50 mL. It is marked every 0.1 mL, so students read it to 0.01 mL at the bottom of the meniscus.',
      },
      {
        q: 'Can a beaker be read as precisely as a graduated cylinder?',
        a: 'No. A beaker’s usual marks are only every 10, 25 or 50 mL, depending on its size, so it is read to the whole mL. Putting a beaker and a graduated cylinder side by side makes a good question on precision.',
      },
      {
        q: 'Can I change how the scale is marked?',
        a: 'Yes. Under Scale, pick how far apart the smallest marks are and how often they are numbered, from spacings that suit the instrument: a 25 mL cylinder can be marked every 0.2, 0.5 or 1 mL and numbered every 1 or 5 mL. Choose No numbers to leave the numbered marks blank for students to work out. Readings follow the marks, one digit past the smallest.',
      },
      {
        q: 'Can it show cm³ instead of mL?',
        a: 'Yes. Under Scale, choose cm³. A cubic centimeter is the same size as a milliliter, so the reading stays the same; only the unit on the glass and in the answer key changes.',
      },
      {
        q: 'Can I show just the magnified view?',
        a: 'Yes. Under Magnifier, choose Magnifier only to show just the enlarged stretch of scale around the meniscus, or Instrument only to leave the magnifier out.',
      },
    ],
    imageAlt: 'A printable graduated cylinder figure with a magnified view of the meniscus, made with Volume Reading',
    educationalLevel: ['Middle school', 'High school'],
  },

  'volume-by-displacement': {
    heading: 'Water displacement figures for finding an object’s volume',
    intro: [
      'Volume by Displacement draws the same graduated cylinder twice, side by side: before and after an object is dropped in. You type the before and after readings, and students read both and subtract to find the displaced volume, which is the object’s volume.',
      'It suits density units and irregular-solid labs. Mass Reading can put the same marbles, rock, cube or metal cylinder on a balance, so a pair of figures gives students the mass and the volume they need to work out density. Turn on the answer key to print both readings and the object’s volume under the figure.',
    ],
    settings: [
      'Graduated cylinder: 10, 25, 50 or 100 mL',
      'The scale: how far apart the smallest marks are and how often they are numbered, or no numbers; and mL or cm³',
      'The before and after readings, typed or picked at random (the after reading is always higher), with an optional dotted line from the bottom of each meniscus to the marks',
      'The object: 1 to 5 marbles, a rock, a cube or a metal cylinder',
      'Liquid color: gray, blue, red or green',
      'A magnifier beside each cylinder, spanning 1 to 6 numbered marks',
      'The caption under each cylinder (Before and After unless you change them), a chart title, and an answer key line',
    ],
    faqs: [
      {
        q: 'How do you find an object’s volume by water displacement?',
        a: 'Read the water level before the object goes in, then after. The after reading minus the before reading is the displaced volume, which equals the object’s volume. For example, 32.0 mL before and 38.5 mL after gives 6.5 mL, or 6.5 cm³.',
      },
      {
        q: 'Is the object drawn to scale?',
        a: 'No. It is drawn at a plausible size rather than exactly to its volume, always resting on the bottom and fully under water. If there is too little water to cover it, it is drawn smaller; raising the readings fixes that.',
      },
      {
        q: 'Can I make a density question with this?',
        a: 'Yes. Make the displacement figure, then open Mass Reading and put the same object on a balance; it is drawn alike in both. Students find the volume from one figure and the mass from the other, then divide mass by volume.',
      },
      {
        q: 'Can I change the cylinders’ marks or units?',
        a: 'Yes. Under Scale, pick finer or coarser marks, number them more or less often or not at all, and choose mL or cm³. Both cylinders and the answer key follow.',
      },
      {
        q: 'Why are there no 250 mL or 1000 mL cylinders?',
        a: 'A displacement question needs the smaller cylinders, so this generator offers 10, 25, 50 and 100 mL. Volume Reading has the 250 and 1000 mL cylinders for a single reading.',
      },
    ],
    imageAlt: 'A printable water displacement figure: two graduated cylinders, before and after an object is dropped in, made with Volume by Displacement',
    educationalLevel: ['Middle school', 'High school'],
  },

  'gas-syringe': {
    heading: 'Gas syringe figures for collecting gas',
    intro: [
      'Gas Syringe draws a 50 or 100 cm³ glass gas syringe lying on its side, with the plunger pushed out to the volume of gas you type. Students read the volume at the plunger’s flat face, to 0.1 cm³, one digit past its 1 cm³ marks.',
      'Show the syringe alone, or set up to collect gas from a reaction: a conical flask with a bung and delivery tube, a rubber sleeve joining the tube to the nozzle, and a stand clamping the barrel. Teachers use it for rate of reaction questions, where students read the volume of gas collected, and for questions on reading lab apparatus.',
    ],
    settings: [
      'The syringe alone, or set up with a conical flask, delivery tube and stand',
      'Size: 50 or 100, with the scale in cm³ or mL',
      'The volume of gas, typed or picked at random',
      'A magnifier above the syringe or in place of it, spanning 1 to 6 numbered marks',
      'A chart title, and an answer key line with the volume',
    ],
    faqs: [
      {
        q: 'How do you read a gas syringe?',
        a: 'Read the scale at the flat face of the plunger, the end nearest the nozzle, not at its knob. The syringe is marked every 1 cm³ and numbered every 10, so read to the last mark and estimate one more digit, like 37.4 cm³.',
      },
      {
        q: 'Should the scale be in cm³ or mL?',
        a: 'Either: 1 cm³ is the same as 1 mL, so changing the unit relabels the scale without changing the reading. Pick whichever your course uses.',
      },
      {
        q: 'Why do the 50 and 100 cm³ syringes look the same length?',
        a: 'Both are drawn the same length so the scale stays easy to read; the 50 cm³ syringe is drawn thinner.',
      },
      {
        q: 'Can I show the syringe connected to a reaction flask?',
        a: 'Yes. Choose the setup under Syringe to draw a conical flask of liquid with a bung and delivery tube, a rubber sleeve joining the tube to the syringe’s nozzle, and a stand clamping the barrel.',
      },
    ],
    imageAlt: 'A printable gas syringe figure with a magnified view of the scale at the plunger, made with Gas Syringe',
    educationalLevel: ['Middle school', 'High school'],
  },

  'length-reading': {
    heading: 'Ruler, caliper and micrometer figures for measuring length',
    intro: [
      'Length Reading draws the instrument a length is read from: a centimeter or inch ruler with an object lying along it (marbles, a rock, a cube or a metal cylinder), a 150 mm caliper with its jaws open to the reading you type, or a 0–25 mm micrometer. On the ruler, students measure the object lined up with 0 or starting partway along, so they read both ends and subtract.',
      'Metric ruler lengths can go one estimated digit past the smallest mark, for significant figures practice. The caliper reads to 0.1, 0.05 or 0.02 mm, with exactly one mark on its sliding scale lined up with the main scale, and the micrometer reads to 0.01 mm at its marks, or to an estimated 0.001 mm between them. Give a caliper or micrometer a zero error for a correction question. Close-ups of the scales keep the marks readable in print, and the answer key prints the reading.',
    ],
    settings: [
      'The instrument: a ruler, a caliper or a micrometer',
      'A metric ruler, 15, 20, 30, 50 or 100 cm long, marked every 1 mm, 0.5 cm or 1 cm (or 5 or 10 cm on the long ones), read to one estimated digit or to the nearest mark',
      'An inch ruler, 6, 8, 12 or 20 in long, marked every 1, 1/2, 1/4, 1/8 or 1/16 in',
      'The object on the ruler, its length and left end, typed, picked at random, or set by dragging it along the ruler, with dashed lines down from its ends if you like',
      'The caliper’s least count: 0.1 mm (10 divisions over 9 mm), 0.05 mm (20 over 39 mm) or 0.02 mm (50 over 49 mm), printed on the slider or left off',
      'The micrometer read to its marks, 0.01 mm, or to one estimated digit past them, 0.001 mm',
      'The caliper or micrometer reading, typed or picked at random, and a zero error, with the instrument also drawn closed',
      'In the jaws: nothing, a block, a cylinder, a ball or a wire, drawn to size, with a short label',
      'Magnifiers or close-ups of the scales, a chart title, and an answer key line',
    ],
    faqs: [
      {
        q: 'How do you measure with a ruler to the right number of significant figures?',
        a: 'Read to the smallest mark, then estimate one more digit. On a ruler marked in millimeters, that means reading to 0.01 cm, like 4.37 cm. On a ruler marked only every centimeter, read to 0.1 cm.',
      },
      {
        q: 'Can the object start somewhere other than 0?',
        a: 'Yes. Type where its left end sits, or drag the object along the ruler in the figure. Students then read both ends and subtract, and the answer key gives both ends as well as the length.',
      },
      {
        q: 'What are the dashed lines at the object’s ends for?',
        a: 'A marble or a rock touches the ruler below its widest point, so its ends sit above the marks they line up with. The dashed lines drop from each end down to the ruler to show where to read.',
      },
      {
        q: 'How do you read a caliper?',
        a: 'Read the main scale at the sliding scale’s zero: the last millimeter mark before it. Then find the one mark on the sliding scale that lines up exactly with a main-scale mark, and add that many least counts. With the zero just past 23 mm and the 9th mark of a 0.05 mm scale lined up, the reading is 23 + 9 × 0.05 = 23.45 mm.',
      },
      {
        q: 'How do you read a micrometer?',
        a: 'Read the last mark showing on the sleeve: whole millimeters above the datum line, and the half-millimeter mark below it if it has appeared. Then add the thimble mark on the datum line, 0.01 mm each. A sleeve showing 7 mm and thimble mark 38 read 7.38 mm; with the 7.5 mark showing as well, 7.88 mm. When the datum line falls between two thimble marks, estimate how far, in tenths of a mark, for one more digit: 0.4 of the way from mark 38 to mark 39 reads 7.384 mm.',
      },
      {
        q: 'What is a zero error?',
        a: 'With its jaws closed, a caliper or micrometer should read zero. If it doesn’t, the reading it shows closed is the zero error, positive or negative, and you subtract it from every reading: an instrument that reads +0.10 mm closed and 23.45 mm on a block measures 23.35 mm.',
      },
      {
        q: 'Can I make inch ruler questions with fractions?',
        a: 'Yes. Choose Imperial (in). Lengths land on a mark and are read as fractions of an inch, down to 1/16 in on the finest ruler.',
      },
    ],
    imageAlt: 'A printable ruler figure with an object lying along it and magnified views of its ends, made with Length Reading',
    educationalLevel: ['Middle school', 'High school'],
  },

  'mass-reading': {
    heading: 'Triple beam balance and digital balance figures',
    intro: [
      'Mass Reading draws a triple beam balance or a digital balance showing the mass you type. On the triple beam balance the three riders are placed for that mass, and students add up the 100 g, 10 g and 0–10 g beams, reading to 0.01 g. A digital balance shows the mass to 1, 2, 3 or 4 decimal places; at 3 or 4 places it is drawn as an analytical balance inside a draft shield.',
      'Put a weigh boat or a beaker on the digital balance’s pan, or one of the objects from Volume by Displacement (marbles, a rock, a cube or a metal cylinder) on either balance, so a mass figure and a volume figure together make a density question. The answer key prints the reading under the figure.',
    ],
    settings: [
      'A triple beam balance, weighing up to 610 g and read to 0.01 g',
      'A digital balance showing 1 decimal place (up to 1000 g), 2 places (up to 400 g), or 3 or 4 places as an analytical balance (up to 200 g)',
      'On the pan: nothing, a weigh boat or a beaker (digital balance), or 1 to 5 marbles, a rock, a cube or a metal cylinder',
      'The mass, typed or picked at random',
      'For the triple beam balance, a magnifier on its front beam, or the beams alone',
      'A chart title, and an answer key line with the mass',
    ],
    faqs: [
      {
        q: 'How do you read a triple beam balance?',
        a: 'Add the positions of the three riders: one on a beam marked in 100 g steps, one on a beam marked in 10 g steps, and one that slides along a beam marked every 0.1 g from 0 to 10 g. Estimate one more digit on that last beam, so a reading looks like 347.26 g.',
      },
      {
        q: 'Why does the balance look different at 3 and 4 decimal places?',
        a: 'A balance that reads to 0.001 g or 0.0001 g is an analytical balance, which sits inside a glass draft shield so air currents don’t disturb the reading. The generator draws one when you pick 3 or 4 decimal places.',
      },
      {
        q: 'Is the last digit on a digital balance estimated?',
        a: 'No. A digital balance’s reading is exactly what its display shows, so students copy every digit, including trailing zeros. On the triple beam balance the last digit is estimated.',
      },
      {
        q: 'Can I weigh the same object I used in a displacement figure?',
        a: 'Yes. Pick the same marbles, rock, cube or metal cylinder under On the pan. It is drawn alike in both generators, so students can find its mass here and its volume in Volume by Displacement, then work out its density.',
      },
    ],
    imageAlt: 'A printable triple beam balance figure with its riders placed for a mass, made with Mass Reading',
    educationalLevel: ['Middle school', 'High school'],
  },

  'temperature-reading': {
    heading: 'Thermometer figures in °C, K and °F',
    intro: [
      'Temperature Reading draws a liquid-in-glass thermometer or a digital thermometer showing the temperature you type, in Celsius, Kelvin or Fahrenheit. On the liquid-in-glass thermometer students read the flat top of the colored column against marks every 1 °C, 1 K or 2 °F, estimating to 0.1, with an optional magnified view of the scale around the reading.',
      'The digital thermometer is a handheld meter wired to a steel probe standing in a beaker, showing 0, 1 or 2 decimal places. Changing the unit converts the reading, so the same temperature can be shown in °C, K and °F for unit conversion practice, alongside questions on reading instruments in labs.',
    ],
    settings: [
      'A liquid-in-glass thermometer from −10 to 110 °C, 260 to 390 K, or 10 to 230 °F, with red, blue or gray liquid',
      'A digital probe thermometer from −50 to 150 °C (or the same range in K or °F), showing 0 to 2 decimal places',
      'The temperature, typed or picked at random',
      'A magnifier beside the liquid-in-glass thermometer or in place of it',
      'A chart title, and an answer key line with the temperature',
    ],
    faqs: [
      {
        q: 'How do you read a liquid-in-glass thermometer?',
        a: 'Read at the flat top of the liquid column, with your eye level with it. Find the last mark below the top, then estimate one more digit: on a thermometer marked every 1 °C, read to 0.1 °C, like 23.4 °C.',
      },
      {
        q: 'Why is the Fahrenheit thermometer marked every 2 °F?',
        a: 'There isn’t room for 1 °F marks over the thermometer’s range, so it is marked every 2 °F. Readings are still estimated to 0.1 °F.',
      },
      {
        q: 'Why is Kelvin written K and not °K?',
        a: 'The kelvin is an absolute unit, written K with no degree sign. The generator writes it that way on the scale and in the answer key.',
      },
      {
        q: 'Does changing the unit change the temperature?',
        a: 'No. Changing between °C, K and °F converts the reading you typed, so the thermometer shows the same temperature in the new unit.',
      },
    ],
    imageAlt: 'A printable liquid-in-glass thermometer figure with a magnified view of the scale, made with Temperature Reading',
    educationalLevel: ['Middle school', 'High school'],
  },

  'ph-reading': {
    heading: 'pH meter and pH paper figures',
    intro: [
      'pH Reading draws a pH meter wired to a glass electrode standing in a beaker, or a strip of pH paper above its color chart, showing the pH you type. A digital pH meter shows 1 or 2 decimal places. An analog meter swings a needle over a dial from 0 to 14, marked every 0.2 and read to 0.01, with an optional magnified view of the dial.',
      'The pH paper is universal indicator paper: its wet end turns the color of the reading, and students match it to the chart’s swatch for each whole pH from 0 to 14. Teachers use these figures in acids and bases units, indicator labs, and questions comparing how precisely each instrument reads.',
    ],
    settings: [
      'Instrument: a digital pH meter, an analog pH meter, or pH paper with its color chart',
      'Decimal places on the digital meter: 1 or 2',
      'The pH, from 0 to 14, typed or picked at random',
      'A magnifier beside the analog meter’s dial or in place of it',
      'A chart title, and an answer key line with the pH',
    ],
    faqs: [
      {
        q: 'Is pH paper the same as litmus paper?',
        a: 'No. Litmus only tells an acid from a base. Universal indicator paper, which this figure shows, turns a range of colors, so the pH can be read to the whole number from its color chart.',
      },
      {
        q: 'Will the pH paper figure work in black and white?',
        a: 'No. Students match the strip’s color to the chart, so print it in color or show it on a slide. The pH meters are read from numbers and a needle, not color.',
      },
      {
        q: 'How do you read an analog pH meter?',
        a: 'The dial is numbered every 1 and marked every 0.2. Find the last mark the needle has passed, then estimate where it sits in the next 0.2 and read to 0.01, like 6.47.',
      },
      {
        q: 'How precise is each instrument?',
        a: 'The digital meter shows 1 or 2 decimal places, the analog meter is read to 0.01 with the last digit estimated, and pH paper is read to the whole number.',
      },
    ],
    imageAlt: 'A printable pH meter figure with its electrode in a beaker, made with pH Reading',
    educationalLevel: ['Middle school', 'High school'],
  },

  'titration-curve': {
    heading: 'Acid–base titration curves',
    intro: [
      'Titration Curve graphs the pH in the flask against the volume of titrant added, for a strong or weak acid titrated with NaOH, or a strong or weak base titrated with HCl. Give it the molarities, the volume in the flask and the pKa or pKb, and it solves the pH at every volume exactly, so a weak acid’s half-equivalence point lands on its pKa. Or type just the starting pH, the equivalence point’s volume and pH, and the ending pH, and it draws a real titration curve bent to pass through them.',
      'Teachers use it for AP Chemistry and general chemistry questions on equivalence points, buffers and pKa. Mark the equivalence and half-equivalence points with a dot, with dashed lines to the axes, and with a label or a blank line for students to fill in, then set the titles, axes and gridlines to match the rest of your test.',
    ],
    settings: [
      'What’s titrated: a strong acid, weak acid, strong base or weak base',
      'A common titration in one step: HCl, CH₃COOH, HCOOH or HF with NaOH, or NaOH or NH₃ with HCl (25.0 mL of 0.100 M, with 0.100 M)',
      'The curve from concentrations (molarities, volume, and pKa or pKb) or from key points (starting, equivalence and ending pH)',
      'The equivalence and half-equivalence points marked with a dot, a dot with lines to the axes, or not at all, each with a label, a blank line or nothing',
      'The curve’s color, the chart and axis titles (or blank lines), the axis ranges and numbering, gridlines, and label size',
    ],
    faqs: [
      {
        q: 'Where is the half-equivalence point on a titration curve?',
        a: 'Halfway to the equivalence point’s volume. For a weak acid, the pH there equals the pKa; for a weak base, it equals 14 − pKb. The generator marks it only for weak acids and bases.',
      },
      {
        q: 'Why isn’t the equivalence point at pH 7 for a weak acid?',
        a: 'At the equivalence point of a weak acid with NaOH, the flask holds the acid’s conjugate base, which makes the solution basic, so the pH is above 7. For a weak base with HCl it is below 7. Only a strong acid with a strong base reaches pH 7 there.',
      },
      {
        q: 'Can I draw a curve through the pH values from a textbook or lab?',
        a: 'Yes. Choose Key points and type the starting pH, the equivalence point’s volume and pH, and the ending pH. The curve is the real titration that comes closest, stretched to pass through your points, and a note says if it misses one.',
      },
      {
        q: 'What’s the difference between the equivalence point and the end point?',
        a: 'The equivalence point is where the titrant added has exactly neutralized the analyte, in the middle of the steep part of the curve. The end point is where an indicator changes color, which should be close to it. The generator marks the equivalence point.',
      },
      {
        q: 'Can it draw polyprotic acids?',
        a: 'No. It draws one monoprotic acid or base titrated with a strong base or acid, so each curve has one equivalence point.',
      },
    ],
    imageAlt: 'A printable acid–base titration curve with its equivalence point marked, made with Titration Curve',
    educationalLevel: ['High school', 'AP Chemistry'],
  },

  'heating-cooling-curve': {
    heading: 'Heating and cooling curves',
    intro: [
      'Heating and Cooling Curve graphs a substance’s temperature as it is heated or cooled steadily, through its melting and boiling points. Each phase warms or cools in a sloped segment and each phase change is a flat plateau, and the curve has only the segments its starting and ending temperatures pass through. Pick water, ethanol, acetone, mercury, sodium chloride or a made-up Substance X, or type your own melting and boiling points. Segments are schematic, in tidy textbook proportions you can change, or worked out to scale from the substance’s specific heats and enthalpies of fusion and vaporization for the mass and heating rate you choose, with the heat each segment takes listed for your answer key.',
      'Teachers use it for questions on phase changes, heat and temperature: what is happening between B and C, why the temperature doesn’t change while ice melts, which plateau is longer and why. Letter the corners A to F, label each segment with its state or phase change or leave a blank line for students. The dashed lines from the plateaus to the temperature axis have the melting and boiling points written by them, so they can be read on any axis; write m.p. and b.p. instead, or leave blank lines for students.',
    ],
    settings: [
      'Heating or cooling, and the starting and ending temperatures',
      'The substance: water, ethanol, acetone, mercury, sodium chloride, a made-up Substance X, or your own melting and boiling points',
      'Segment lengths schematic (typed) or to scale, from the mass and the substance’s specific heats and enthalpies of fusion and vaporization (typed for your own substance)',
      'Time or the heat added or removed along the x-axis, at a heating rate you choose',
      'Letters at the corners, segment labels (states, the phase change, or blank lines), dashed lines at the plateaus with the temperatures (the default), m.p. and b.p., blank lines or nothing by the axis, and supercooling on a cooling curve',
      'The curve’s color, the chart and axis titles (or blank lines), the axis ranges and numbering, gridlines, and label size',
    ],
    faqs: [
      {
        q: 'Why is the temperature flat during a phase change?',
        a: 'While a substance melts or boils, the heat added goes into pulling its particles apart (raising their potential energy) instead of making them move faster, so the temperature stays at the melting or boiling point until the change is complete. On a cooling curve the same heat comes back out while it freezes or condenses.',
      },
      {
        q: 'Why is the boiling plateau longer than the melting plateau?',
        a: 'Boiling separates the particles completely, which takes much more energy than loosening them into a liquid. For water the enthalpy of vaporization, 40.67 kJ/mol, is about 6.8 times the enthalpy of fusion, 6.01 kJ/mol, so drawn to scale its boiling plateau is about 6.8 times as long.',
      },
      {
        q: 'Can I make a curve for a substance other than water?',
        a: 'Yes. Pick ethanol, acetone, mercury, sodium chloride or a made-up Substance X, or choose Custom and type its melting and boiling points. For your own substance drawn to scale, type its specific heats, enthalpies of fusion and vaporization and molar mass too.',
      },
      {
        q: 'Is the curve drawn to scale?',
        a: 'Only if you want it to be. Schematic, the default, draws the segments in tidy textbook proportions, which you can change. To scale works out how long each takes from q = m·c·ΔT and q = n·ΔH, for the mass and heating rate you choose. The specific heats are each phase’s near the temperatures its segment covers where that’s known, otherwise at 25 °C, so a curve to scale is close but not exact.',
      },
      {
        q: 'Can I show supercooling?',
        a: 'Yes, on a cooling curve that freezes: tick Supercooled and type how far below the freezing point the liquid cools before it starts to freeze. The curve dips below the freezing point and climbs back to it, and the rest of the curve stays where it was.',
      },
    ],
    imageAlt: 'A printable heating curve of water from ice to steam, its corners lettered A to F and each segment labeled with its state or phase change, made with Heating and Cooling Curve',
    educationalLevel: ['Middle school', 'High school', 'AP Chemistry'],
  },

  'potential-energy-diagram': {
    heading: 'Potential energy diagrams and reaction energy profiles',
    intro: [
      'Potential Energy Diagram draws a reaction energy profile from the energies you type: the reactants, the transition state and the products, or for a mechanism of two or three steps, each transition state and the intermediates between them. Type Eₐ or ΔH instead and the transition state or the products move to match. The curve runs flat at the reactants, rises to each transition state and falls to the products, its peaks exactly at the energies typed. Add a catalysed path, dashed, with a lower transition state and a key naming both, or draw a level diagram: the reactants and products as lines with the ΔH arrow between them.',
      'Teachers use it for questions on exothermic and endothermic reactions, activation energy, catalysts and enzymes, and reaction mechanisms. The Eₐ, ΔH and reverse Eₐ arrows can each be labeled with the symbol, the value, a letter or number for “which arrow shows…?” questions, or a blank line for students to work it out. The energy axis is numbered with light gridlines, or shape only, and the answer key gives ΔH, each activation energy and, for a mechanism, the rate-determining step.',
    ],
    settings: [
      'Setups: exothermic, endothermic, exothermic with a catalyst, two steps with an intermediate, and with and without an enzyme for biology',
      'The energy of each level, or Eₐ and ΔH, for one, two or three steps, in kJ/mol, kJ mol⁻¹ or kJ',
      'A catalysed path with its own transition state, dashed, and the names in its key',
      'The energy profile, or a level diagram of the reactants and products alone',
      'Eₐ, catalysed Eₐ, ΔH and reverse Eₐ arrows, each labeled with the symbol, the value, a letter or number, a blank line or nothing, with arrowheads at one end or both, and dashed lines from the levels',
      'Labels on the reactants, products, transition states and intermediates: the usual word, your own text with subscripts (N_2 + 3H_2), a blank line or nothing',
      'The colors, the chart and axis titles (or blank lines), a numbered or shape-only energy axis, gridlines, arrow ends and label size',
    ],
    faqs: [
      {
        q: 'How do you find ΔH and the activation energy from a potential energy diagram?',
        a: 'ΔH is the products’ energy less the reactants’: products at 20 kJ/mol and reactants at 50 kJ/mol give ΔH = −30 kJ/mol, an exothermic reaction. The activation energy is the transition state’s energy less the reactants’: a transition state at 150 kJ/mol gives Eₐ = 100 kJ/mol. The reverse reaction’s activation energy is measured from the products, 130 kJ/mol here.',
      },
      {
        q: 'How does a catalyst change a potential energy diagram?',
        a: 'A catalyst gives the reaction a path with a lower transition state, so the peak is lower. The reactants and products stay where they are, so ΔH doesn’t change, and the forward and reverse activation energies drop by the same amount. Tick Catalysed path and type its transition state or its Eₐ; it is drawn dashed, with a key. An enzyme does the same for a biological reaction, which is what the enzyme setup shows.',
      },
      {
        q: 'Can it draw a reaction mechanism with more than one step?',
        a: 'Yes, up to three steps. Each step has its own transition state, a peak, with an intermediate in the dip between steps, and each step’s Eₐ arrow runs up from the level before it. The answer key gives each step’s Eₐ and names the rate-determining step when the step with the highest Eₐ is also the one whose transition state is highest above the lowest point before it, as it is in most textbook profiles.',
      },
      {
        q: 'Can I hide values for students to work out?',
        a: 'Yes. Label any arrow with a blank line, a letter or a number instead of its value, and leave the level labels blank too. Values left off the figure aren’t in its description for screen readers either; they’re only in the answer key.',
      },
      {
        q: 'Why is the reaction coordinate not numbered?',
        a: 'The reaction coordinate shows how far the reaction has gone, from reactants to products, not a time or any quantity with units, so it has no scale. Only the energy axis has numbers, and you can turn those off for a shape-only diagram.',
      },
    ],
    imageAlt: 'A printable potential energy diagram of an exothermic reaction with its Eₐ and ΔH arrows labeled with their values, made with Potential Energy Diagram',
    educationalLevel: ['High school', 'AP Chemistry', 'IB Chemistry'],
  },

  'particle-diagram': {
    heading: 'Particle diagrams of atoms, ions and molecules',
    intro: [
      'Particle Diagram draws the particulate-level pictures used in AP Chemistry: atoms, ions and molecules in a box, spread out as a gas or solution, close together as a liquid or in rows as a solid, or packed in a lattice for an ionic solid or alloy. Choose up to four kinds of particle and how many of each, or draw a before box and an after box with an arrow between them for a reaction or a change of state. Each atom has a size and a gray shade, an ion carries its charge written in its middle, and a molecule is a center atom with outer atoms touching it, in shapes like Cl₂, H₂O or CCl₄.',
      'The box of particles is always the same size, so four answer choices made one at a time line up on the page. A key beside the box shows each kind with the name you type, and it can go with the box, be left off, or be shown alone, so several answer choices can share one key.',
    ],
    settings: [
      'Layout: particles in a box as a gas, liquid or solid, before and after boxes, or a lattice of up to 12 rows and 12 columns',
      'Up to four kinds of particle, 0 to 60 of each, each alone or joined as a pair, bent, in a line, three around or four around',
      'Each atom’s size (XS to XL), shade (white to black) and charge (+, −, 2+, 2−, 3+ or 3−)',
      'Lattice patterns: one kind (a pure metal), alternating (an ionic solid), substitutional or interstitial (alloys), touching or spaced',
      'A key with your names and a note line, listing each kind whole or each atom once, the box’s border (single, double or none), and a chart title',
    ],
    faqs: [
      {
        q: 'What is a particle diagram in chemistry?',
        a: 'A drawing of the atoms, ions or molecules in a sample, showing how many there are and how they are arranged. AP Chemistry uses them to ask students to represent a gas, a solution or a solid, or to pick which picture matches a substance.',
      },
      {
        q: 'How do I make four answer choices that line up?',
        a: 'Make each choice one at a time and copy it into your document. Particles always go in the same square box, whatever their state, so the choices come out the same size. Set the key to Key only to make one shared key for all of them.',
      },
      {
        q: 'Can I show a reaction, before and after?',
        a: 'Yes. Set Boxes to Before and after and give each kind a count for each box: 4 H₂ and 3 O₂ before, say, and 4 H₂O and 1 O₂ after. The two boxes are the same size with an arrow between them, which can have a short label such as “heat”, and share one key, so they work for conservation of mass and limiting reactant questions. Each box has its own state, so the same particles can also show a change of state, like a solid melting.',
      },
      {
        q: 'Can it show solids, liquids and gases?',
        a: 'Yes. Pick the box’s state: Gas spreads the particles out at random, Liquid settles them close together but jumbled at the bottom, and Solid packs them in rows at the bottom, all turned the same way. Keep the same particles and change only the state to compare the three.',
      },
      {
        q: 'Can I show an ionic solid or an alloy?',
        a: 'Yes. Choose Lattice, then Alternating for an ionic solid like NaCl, Substitutional for an alloy like brass, or Interstitial for one like steel, with small atoms in some of the gaps.',
      },
      {
        q: 'Can I put element symbols on the atoms?',
        a: 'No. Atoms are drawn as plain shaded discs, and ions show only their charge. Put names like “Na⁺ ion” or “CCl₄ molecule” in the key instead.',
      },
      {
        q: 'How do I type subscripts and superscripts in the key?',
        a: 'Type _ before a subscript and ^ before a superscript, with braces around more than one character: H_2O for H₂O, SO_4^{2-} for SO₄²⁻, Na^+ for Na⁺. They work in the key’s names and its note line, and in a link to the figure.',
      },
      {
        q: 'Can the key show each atom on its own, for writing formulas?',
        a: 'Yes. Set the key’s List to Each atom instead of Each particle and it shows every different atom once, drawn alone with its own name, rather than each molecule whole. An atom in two kinds of molecule, like the O in H₂O and CO₂, is listed once. Students can then work out each molecule’s formula from the box.',
      },
      {
        q: 'Can a kind of particle appear in the key but not in the box?',
        a: 'Yes. Give it a count of 0 and it is listed in the key only. The key’s note line can say what isn’t drawn, like “H₂O molecules are not shown”.',
      },
    ],
    imageAlt: 'A printable particle diagram of atoms and molecules in a box, with a key, made with Particle Diagram',
    educationalLevel: ['High school', 'AP Chemistry'],
  },

  'bohr-model': {
    heading: 'Bohr model diagrams of atoms and ions',
    intro: [
      'Bohr Model draws one atom or ion as a nucleus with its electrons as dots on rings. Pick any of the 118 elements and it sets the protons, the neutrons from the mass number, and the electrons on each shell; set a charge and the shells change to that ion’s ground state, so Na⁺ is drawn 2, 8 and Cl⁻ 2, 8, 8. You can also set every count by hand. Nothing is checked, so a wrong model for a “what’s wrong?” question draws exactly as set.',
      'For questions students complete, leave the nucleus blank or draw the rings without electrons. An ion can show its gained electrons in their own color and its lost electrons as empty dashed spots, and can go in square brackets with its charge. Every model with the same number of shells is drawn the same size, so answer choices line up.',
    ],
    settings: [
      'The element and charge, or the protons and neutrons (0 to 200 each) and 1 to 7 shells of up to 32 electrons, set by hand',
      'Fill, which sets the neutral atom’s real ground-state shells',
      'The nucleus drawn as proton and neutron balls (up to 40 in all), as written counts, or blank',
      'Electrons evenly spaced or paired at the four sides as in Lewis structures, or empty rings',
      'Gained and lost electrons, and each particle’s color and symbol (such as p⁺, n⁰ and e⁻)',
      'A key, n = 1, n = 2… shell labels, brackets for an ion, and a chart title',
    ],
    faqs: [
      {
        q: 'How many electrons go in each shell of a Bohr model?',
        a: 'Fill uses each element’s real ground state. For the first 20 elements that means shells of up to 2, 8, 8 and 2 (potassium is 2, 8, 8, 1). Past calcium the third shell keeps filling after the fourth has started, so iron is 2, 8, 14, 2.',
      },
      {
        q: 'How does it work out the number of neutrons?',
        a: 'From the mass number, the element’s atomic mass rounded to a whole number, minus its atomic number: chlorine’s 35.45 rounds to 35, giving 18 neutrons. For an element with no stable isotope it uses the bracketed mass number on periodic tables, like [98] for technetium. Change the neutron count to draw another isotope.',
      },
      {
        q: 'Can I draw a Bohr model of an ion?',
        a: 'Yes. Set the charge and the shells change to that ion’s ground state. Turn on Gained and lost electrons to mark how it differs from the neutral atom, and Brackets to put it in square brackets with its charge.',
      },
      {
        q: 'Can I make a blank Bohr model for students to fill in?',
        a: 'Yes. Set the nucleus to Blank for a “how many protons?” question, or turn on Empty rings to draw the shells without electrons for students to add them.',
      },
      {
        q: 'Is there an answer key?',
        a: 'Not a separate line. Use the chart title to name the atom, like “Carbon-12”, or leave it off so students identify it.',
      },
    ],
    imageAlt: 'A printable Bohr model diagram of an atom, with its nucleus and electrons on shells, made with Bohr Model',
    educationalLevel: ['Middle school', 'High school'],
  },

  'nuclide-notation': {
    heading: 'Nuclide symbols for isotopes, ions and nuclear particles',
    intro: [
      'Nuclide Notation draws an element’s symbol with its mass number at the top left, its atomic number at the bottom left and its charge at the top right, typeset as in a textbook: ²³⁵₉₂U, ³⁷₁₇Cl⁻. Pick any of the 118 elements and set any mass number from its atomic number up to 300, so unusual isotopes are fine, and a charge from −8 to 8, or type the protons, neutrons and electrons and let it work out the numbers. Use your own symbol, such as X, for “identify the element” questions, or pick an alpha, beta, positron, neutron, proton or gamma particle as it is written in decay equations.',
      'Leave any position as an empty box or a line for students to fill in, or leave it off, as in ¹⁴C. It can also write hyphen notation, carbon-14 or C-14, alone or under the symbol. Copy the picture straight into Google Docs, Slides or Kahoot, where these super- and subscripts are hard to type, and turn on the answer key for the name, the protons, neutrons and electrons, and the value of each blank.',
    ],
    settings: [
      'An element and its mass number and charge, with buttons for its natural isotopes, or the protons, neutrons and electrons',
      'Your own symbol of up to three characters, with any atomic number, mass number and charge',
      'An alpha particle (He or α), beta particle (e or β), positron, neutron, proton (p or H) or gamma ray',
      'The mass number, atomic number, symbol and charge each shown, blank or left off, with blanks as boxes or lines',
      'Symbol notation, hyphen notation (carbon-14 or C-14), or both',
      'A sans-serif (Arial) or serif (Times New Roman) font, in small, medium or large text',
      'A chart title, and an answer key',
    ],
    faqs: [
      {
        q: 'How do you write nuclide notation?',
        a: 'Write the element’s symbol with its mass number (protons plus neutrons) at the top left and its atomic number (protons) at the bottom left. An ion’s charge goes at the top right, written 2+ or 3−, with just + or − for a charge of one. Chlorine-37 with one extra electron is ³⁷₁₇Cl⁻: 17 protons, 20 neutrons and 18 electrons.',
      },
      {
        q: 'Can I leave a number blank for students?',
        a: 'Yes. Under Positions, set the mass number, atomic number, symbol or charge to Blank and it is drawn as an empty box, or as a line if you choose Line. A blank’s value never appears in the figure; it is only in the answer key, if you turn it on.',
      },
      {
        q: 'Can I make an isotope that doesn’t exist?',
        a: 'Yes. Any mass number from the atomic number up to 300 is drawn. For elements from hydrogen to xenon, and platinum, gold, mercury, lead and uranium, the page notes when a mass number isn’t one of the element’s naturally abundant isotopes, such as carbon-14, which is only a trace, but draws it anyway. A mass number below the atomic number would mean fewer than 0 neutrons, so it isn’t taken.',
      },
      {
        q: 'Does it write nuclear particles for decay equations?',
        a: 'Yes, one at a time: alpha ⁴₂He or ⁴₂α, beta ⁰₋₁e or ⁰₋₁β, positron ⁰₊₁e, neutron ¹₀n, proton ¹₁p or ¹₁H and gamma ⁰₀γ. Whole equations with arrows and a balance check aren’t drawn yet.',
      },
      {
        q: 'Why use this instead of typing it in Google Docs?',
        a: 'Docs and Kahoot can’t stack a superscript over a subscript before a symbol, so the numbers end up side by side. This draws them stacked and right-aligned against the symbol in Arial or Times New Roman at the size you pick, and copies as a picture you can paste anywhere.',
      },
    ],
    imageAlt: 'A printable nuclide symbol, carbon-14 with its mass number 14 and atomic number 6, made with Nuclide Notation',
    educationalLevel: ['Middle school', 'High school'],
  },

  'lewis-structures': {
    heading: 'Lewis dot structures for molecules, ions and single atoms',
    intro: [
      'Lewis Structures draws the Lewis structure of a molecule or polyatomic ion from its formula. Type H2O, CH4, NO3- or SO4 2- and it builds the correct structure around the central atom, with lone electrons as dots, formal charges if you want them, and its resonance structures. Molecules with more than one central atom, like ethanol, acetic acid, HNO₃ or N₂H₄, come from a list you can pick from or type by name or formula. Type one atom or ion, like N, Cl- or Ca 2+, for its Lewis dot diagram.',
      'Teachers use it for three kinds of question: draw the structure, complete it from the skeleton or from the bonds, or find the mistakes in a wrong one. Change a bond, an atom’s lone electrons or its formal charge by clicking the figure, and the generator checks the result and lists its mistakes as sentences, like “O has 10 electrons around it”, for the answer key.',
    ],
    settings: [
      'The formula or name: main-group elements through period 5 with one central atom, a single atom or monatomic ion, or a molecule from the list',
      'A flat, textbook-style drawing, or shaped to hint at the real shape (like bent H₂O)',
      'Bonds as lines or as pairs of dots, and formal charges shown or not',
      'The octet rule or fewest formal charges, for ions like SO₄²⁻ where textbooks disagree',
      'One resonance structure, or all of them joined by ↔',
      'The question: the full structure, bonds only, or the skeleton, or changes for a find-the-mistake question; a chart title and an answer key',
    ],
    faqs: [
      {
        q: 'How do I type a formula with a charge?',
        a: 'Put a space or ^ before a charge of 2 or more, like SO4 2- or PO4^3-, or N 3- for the nitride ion: N3- is three N atoms, the azide ion. A charge of 1 can go straight after the formula, like NO3- or NH4+.',
      },
      {
        q: 'Can it draw a single atom or ion?',
        a: 'Yes. Type N or P for the atom’s Lewis dot diagram, with its valence electrons placed one to a side and then paired. For an ion like N 3-, Cl- or Ca 2+, it adds the electrons an anion gains or leaves off the ones a cation loses, and puts the ion in square brackets with its charge. Changes work on these too, for a wrong number of dots or missing brackets.',
      },
      {
        q: 'Which structure does it draw for SO₄²⁻?',
        a: 'Textbooks disagree, so you choose. The octet rule, the default, gives every atom eight electrons, with formal charges where needed. Fewest formal charges lets atoms in period 3 and lower have more than eight, adding double bonds until the formal charges are as small as they can be. The mistake check follows whichever rule you pick.',
      },
      {
        q: 'Can it draw resonance structures?',
        a: 'Yes. For a molecule or ion like O₃ or NO₃⁻, show one resonance structure and pick which, or show all of them in a row joined by ↔.',
      },
      {
        q: 'How do I make a find-the-mistake question?',
        a: 'Open Changes, then click an atom or bond in the figure, or use the list, to change a bond’s order, an atom’s lone electrons or formal charge, the brackets or the central atom. The generator lists what is now wrong, and the answer key prints those mistakes under the figure. A change that leaves the structure correct, such as one that makes another resonance structure, isn’t a mistake.',
      },
      {
        q: 'What can’t it draw?',
        a: 'Transition metals, and ionic compounds like NaCl, which aren’t one Lewis structure, though each ion (Na+, Cl-) can be drawn on its own. A molecule with more than one central atom has to be on the list; if yours isn’t, the Request it button asks us to add it.',
      },
    ],
    imageAlt: 'A printable Lewis dot structure of a molecule, with bonds and lone electrons, made with Lewis Structures',
    educationalLevel: ['High school', 'AP Chemistry'],
  },

  'dot-and-cross': {
    heading: 'Dot-and-cross diagrams for covalent and ionic bonding',
    intro: [
      'Dot-and-Cross Diagram draws the bonding diagrams UK, GCSE and Cambridge IGCSE courses use. Each atom’s shell is a circle with its element symbol in the middle, and each electron is a dot or a cross, depending on which atom it came from. Type a molecule like H2O, CH4, CO2 or ethene and the bonded atoms’ circles overlap, with each shared pair in the overlap, one electron from each atom. Type an ionic compound like NaCl, MgCl2 or Al2O3 and each ion is drawn in square brackets with its charge, the electrons the non-metal gained in the metal’s mark. Type one element, like Na or Cl-, for its atom or ion with every shell.',
      'Teachers use it for “draw the dot-and-cross diagram” questions and their answers: leave the electrons off so students draw them, leave the charges blank, and print an answer key with each atom’s bonding and lone pairs, or the electrons moved and each ion’s arrangement, like Mg²⁺ 2,8 and Cl⁻ 2,8,8. For a “find the mistake” question, click an electron, symbol or charge in the figure to change it.',
    ],
    settings: [
      'The formula or name: a covalent molecule, a binary ionic compound of Li, Na, K, Rb, Mg, Ca, Sr or Al with N, O, F, S, Cl, Br or I, or one atom or ion from H to Ca',
      'Outer shells only, or every shell',
      'An ionic compound with every ion drawn, or one of each with its number in front, as 2[Cl]⁻',
      'Dots and crosses swapped, and each kind of mark in its own color or all in black',
      'The electrons drawn or left blank, and each ion’s charge shown, blank or left off',
      'Electrons, symbols and charges changed by clicking them in the figure',
      'A chart title and an answer key',
    ],
    faqs: [
      {
        q: 'Which electrons are dots and which are crosses?',
        a: 'In a molecule the central atom’s electrons are dots and the outer atoms’ crosses; a third kind of atom, like the O in CH₃OH or the N in HCN, gets open circles. When two atoms of one element bond, as in Cl₂ or N₂, one has dots and the other crosses. In an ionic compound the metal’s electrons are crosses and the non-metal’s dots, so the electrons a non-metal gains are crosses. Swap trades dots and crosses if your class does it the other way round.',
      },
      {
        q: 'How is a metal ion drawn?',
        a: 'With the full shell it’s left with after losing its outer electrons, as most mark schemes draw it: Na⁺ is a ring of 8 crosses, or 2 and 8 with every shell drawn. A non-metal ion has a full outer shell of its own electrons and the ones it gained. Each ion goes in square brackets with its charge at the top right.',
      },
      {
        q: 'How are compounds like MgCl₂ and Al₂O₃ laid out?',
        a: 'With up to three ions, every ion is drawn, the single ion in the middle: Cl⁻ Mg²⁺ Cl⁻. Bigger compounds are drawn as one of each ion with its number in front, as 2[Al]³⁺ 3[O]²⁻. You can switch either to the other layout.',
      },
      {
        q: 'Which molecules can it draw?',
        a: 'Every molecule on the Cambridge IGCSE list, H₂, Cl₂, HCl, H₂O, CH₄, NH₃, O₂, N₂, CO₂, C₂H₄ and CH₃OH, and most others where each atom shares one electron per bond, like HCN, PCl₃, H₂S or BF₃. Molecules with two carbons, like ethane and ethanol, draw too. Molecules that need a dative bond, like CO, SO₂ and O₃, polyatomic ions like NH₄⁺, and atoms with more than eight electrons, like SF₆, aren’t drawn yet; the Request it button asks us to add one.',
      },
      {
        q: 'Why are the H circles smaller in ethane?',
        a: 'Every circle is the same size wherever that fits, as mark schemes draw them. In ethane, ethanol and a few others, the H atoms on neighboring atoms would overlap each other, so every H circle in that molecule is drawn a little smaller, just enough to keep them apart, with each shared pair still inside its overlap.',
      },
      {
        q: 'Why does it refuse MgCl?',
        a: 'An ionic compound’s charges must balance. Each ion’s charge comes from its group, so Mg²⁺ needs two Cl⁻ ions. The page says what would balance: MgCl₂.',
      },
      {
        q: 'Can I make a diagram with a mistake for students to find?',
        a: 'Yes. Click an electron in the figure to make it a dot, a cross, an open circle, an open square or nothing, click an element symbol to leave it blank, or click an ion’s charge to show it, leave a blank box or leave it off. Reset edits puts it back. The answer key still describes the correct diagram, with a line saying the figure was edited by hand. Changing the formula, the layout or the shells clears the edits, but Swap and color keep them.',
      },
      {
        q: 'Can it draw a single atom’s electron arrangement?',
        a: 'Yes. Type an element from H to Ca, like Na, for its atom with every shell (2, 8, 1), or its ion, like Na+ or Cl-, in brackets with its charge. An anion’s gained electrons are crosses.',
      },
    ],
    imageAlt: 'A printable dot-and-cross diagram of a water molecule, with overlapping shells and the electrons as dots and crosses, made with Dot-and-Cross Diagram',
    educationalLevel: ['Middle school', 'High school', 'GCSE', 'IGCSE'],
  },

  'orbital-diagram': {
    heading: 'Orbital diagrams and electron configurations',
    intro: [
      'Orbital Diagram draws an atom or ion’s electrons as up and down arrows in orbital boxes, with each sublevel labeled underneath, following the aufbau principle, Pauli exclusion and Hund’s rule. Pick any element and charge. Exceptions like Cr and Cu are drawn as they really are unless you switch to the filling order, and a noble gas core like [Ar] can stand in for the inner electrons.',
      'For students to complete, the symbol, the sublevel labels or the written configuration can be blank lines, or the orbitals can be drawn empty. For a “which rule is broken?” question, click an orbital to change its electrons: the generator says whether the result is an excited state or not allowed and names the rule it breaks, and the answer key prints that with the configuration.',
    ],
    settings: [
      'The element (hydrogen to oganesson) and charge',
      'A noble gas core, and sublevels in filling order (4s before 3d) or by shell',
      'Exceptions drawn as they really are, or as the filling order predicts',
      'Full or half arrows, in squares or on lines',
      'The symbol, sublevel labels and configuration line shown, as blank lines, or left off, and electrons shown or orbitals empty',
      'Changed orbitals, extra empty sublevels, a chart title, and an answer key line',
    ],
    faqs: [
      {
        q: 'How do you fill in an orbital diagram?',
        a: 'Fill sublevels in aufbau order (1s, 2s, 2p, 3s, 3p, 4s, 3d…). An orbital holds at most two electrons, with opposite spins (Pauli exclusion), and within a sublevel each orbital gets one electron before any gets a second (Hund’s rule).',
      },
      {
        q: 'Why are chromium and copper different?',
        a: 'Their real ground states don’t follow the filling order: Cr is [Ar] 4s¹ 3d⁵ and Cu is [Ar] 4s¹ 3d¹⁰. The generator draws them as they really are, or as the filling order predicts (Cr as [Ar] 4s² 3d⁴) if your class doesn’t teach exceptions.',
      },
      {
        q: 'Which electrons does a transition metal ion lose first?',
        a: 'Its 4s electrons, before any 3d, so Fe²⁺ is [Ar] 3d⁶ rather than [Ar] 4s² 3d⁴. Set the charge and the generator draws the ion this way.',
      },
      {
        q: 'Can I make a diagram with a mistake for students to find?',
        a: 'Yes. Click any orbital to make it empty, one up, one down, a pair, or two with the same spin. The generator calls the result an excited state, not allowed, or the wrong number of electrons, and names each mistake, like “Hund’s rule: 2p has a pair while one of its orbitals is empty”.',
      },
      {
        q: 'Should 4s be written before 3d?',
        a: 'Both are used. Choose Filling order to put 4s before 3d, in the order they fill, or By shell to put 3d with the other n = 3 sublevels.',
      },
    ],
    imageAlt: 'A printable orbital diagram with electrons as arrows in orbital boxes, made with Orbital Diagram',
    educationalLevel: ['High school', 'AP Chemistry'],
  },
  'line-spectrum': {
    heading: 'Bright-line emission and absorption spectra',
    intro: [
      'Line Spectrum stacks the visible line spectra of elements on one wavelength scale in nanometers, so a line at the same wavelength sits at the same place in every strip. Each element shows a few of its strongest visible lines (three to eight) from the NIST Atomic Spectra Database, not every line it has, so the spectra stay easy to read and compare. Type your own lines instead for a made-up Element X, or edit an element’s lines to trim them.',
      'For an “identify the unknown” question, add a mixture strip: it shows every line of the strips you tick, labeled Unknown or whatever you call it, and the answer key names what it is made of. Draw the spectra as colored lines on black, as dark lines across a rainbow, or as black lines on white for a black-and-white copier, and leave the element names blank for students to fill in.',
    ],
    settings: [
      'Up to 8 strips: an element (hydrogen, helium, lithium, sodium, potassium, calcium, strontium, barium, copper, zinc, cadmium, mercury, neon, argon or krypton), lines you type, or a mixture of the other strips',
      'Emission (bright lines on black), absorption (dark lines across a rainbow) or print (black lines on white)',
      'Every line equally bright, or as bright as NIST’s relative intensities',
      'Element names, symbols, blank lines for students, or no labels',
      'The wavelength range (anywhere from 380 to 780 nm), tick and number spacing, and the scale under the last strip, under every strip, or left off',
      'A chart title, and an answer key naming what’s in each mixture',
    ],
    faqs: [
      {
        q: 'Why does each element give off its own lines?',
        a: 'An atom’s electrons can only have certain energies. When an electron falls from a higher energy level to a lower one, the atom gives off light of exactly the energy difference, which is one exact wavelength. Each element has its own energy levels, so its lines are a fingerprint.',
      },
      {
        q: 'How do you identify the elements in an unknown spectrum?',
        a: 'A mixture’s spectrum has every line of every element in it. Match each line of the unknown to a reference spectrum: an element is present if all of its lines appear in the unknown. The generator’s mixture strip is made exactly this way, from the strips you tick.',
      },
      {
        q: 'What’s the difference between an emission and an absorption spectrum?',
        a: 'An emission (bright-line) spectrum is light given off by a hot gas: colored lines on black. An absorption spectrum is what’s left when white light passes through a cool gas: a rainbow with dark lines missing. An element’s dark absorption lines are at the same wavelengths as its bright emission lines.',
      },
      {
        q: 'Why doesn’t each element show all of its lines?',
        a: 'Real spectra have many lines, some very faint (iron has thousands), which makes worksheets hard to read. Each element here has its strongest few visible lines, the ones textbooks usually show. If you want different lines, edit the element’s lines or type your own.',
      },
      {
        q: 'Where do the wavelengths come from?',
        a: 'The NIST Atomic Spectra Database, for neutral atoms, as wavelengths in air rounded to 0.1 nm. Some lines of helium, potassium, strontium, neon and argon are past 700 nm, so widen the range to see them.',
      },
    ],
    imageAlt: 'Printable bright-line emission spectra of several elements and an unknown mixture on one wavelength scale, made with Line Spectrum',
    educationalLevel: ['High school', 'AP Chemistry'],
  },
  'photoelectron-spectrum': {
    heading: 'Photoelectron spectra (PES) for AP Chemistry',
    intro: [
      'Photoelectron Spectrum draws the photoelectron spectrum of any neutral atom from hydrogen to xenon: one peak for each sublevel of its ground-state electron configuration, as tall as that sublevel’s electrons, at its binding energy. Binding energy falls from left to right, as AP Chemistry draws it, in MJ/mol or eV. Exceptions like chromium and copper are drawn with their real configurations.',
      'Core electrons are held a thousand times more tightly than valence electrons, so the energy axis is logarithmic, or broken into a stretch for each group of peaks, or linear if you want the crowding to show. Label peaks with their sublevels, electron counts and energies, or leave the labels blank; hide the element for “which element is this?”, and draw a second element dashed behind the first to ask why its peaks have moved.',
    ],
    settings: [
      'The element, hydrogen to xenon, and a second element to compare, drawn dashed behind it',
      'Binding energy in MJ/mol or eV, on a logarithmic, broken or linear axis',
      'Peaks drawn as smooth peaks or as bars',
      'Sublevel labels written, as blank lines, or left off, with electron counts and binding energies over the peaks',
      'A numbered electrons axis and gridlines, element names shown or hidden, and the label size',
      'A chart title, and an answer key line with each element’s electron configuration',
    ],
    faqs: [
      {
        q: 'How do you read a photoelectron spectrum?',
        a: 'Each peak is one sublevel. Its height is the number of electrons in that sublevel, and its position is how much energy it takes to remove one of them. The peak furthest left is 1s; the one furthest right holds the valence electrons.',
      },
      {
        q: 'Why is binding energy higher on the left?',
        a: 'That’s how AP Chemistry and most textbooks draw photoelectron spectra, with the axis running from high energy to low. The generator follows it, so its figures match what students see on the exam.',
      },
      {
        q: 'Why do one element’s peaks sit to the left of another’s?',
        a: 'An element with more protons pulls its electrons more tightly, so its core peaks are always at a higher binding energy, further left. Compare magnesium with sodium to show it. A valence peak can go the other way: oxygen’s 2p peak sits just right of nitrogen’s, because oxygen’s fourth 2p electron shares an orbital and is pushed away by its partner.',
      },
      {
        q: 'Why is the axis logarithmic or broken?',
        a: 'A 1s electron can be held thousands of times more tightly than a valence electron (calcium’s 1s is about 390 MJ/mol, its 4s about 0.6), so on an even axis the valence peaks crowd together at the right. A logarithmic or broken axis keeps every peak readable.',
      },
      {
        q: 'Where do the binding energies come from?',
        a: 'Hydrogen to calcium use the textbook table AP materials quote (neon: 84.0, 4.68 and 2.08 MJ/mol). Scandium to xenon use Lotz’s 1970 table of electron binding energies in free atoms, converted from eV.',
      },
    ],
    imageAlt: 'A printable photoelectron spectrum with a peak for each sublevel and binding energy falling from left to right, made with Photoelectron Spectrum',
    educationalLevel: ['High school', 'AP Chemistry'],
  },
  'mass-spectrum': {
    heading: 'Mass spectra of elements and their isotopes',
    intro: [
      'Mass Spectrum draws the mass spectrum of an element: one peak for each of its naturally occurring isotopes, at its mass number on the mass-to-charge (m/z) axis, as tall as its percent abundance or its abundance against the tallest peak. Pick any element from hydrogen to xenon, or platinum, gold, mercury, lead or uranium, or type up to six isotopes of your own for a made-up element.',
      'Teachers use it for isotope and average atomic mass questions. Write each peak’s abundance over it or leave it off, hide the element’s name so students identify it from the peaks, or leave one peak out for students to draw in. The answer key prints the element and its relative atomic mass, worked out from the isotopes’ exact masses.',
    ],
    settings: [
      'An element’s natural isotopes, or 1 to 6 isotopes you type, each with its mass and % abundance, and a name such as Element X',
      'Peak heights as percent abundance, adding up to 100, or relative to the tallest peak as 100',
      'Each peak’s abundance written over it, or not',
      'The element’s name shown or hidden, and one peak left out for students to draw',
      'Chart and axis titles, the x-axis fitted to the peaks or typed, the y-axis range, gridlines and the label size',
      'An answer key line with the element, its relative atomic mass and the peak left out',
    ],
    faqs: [
      {
        q: 'How do you find the relative atomic mass from a mass spectrum?',
        a: 'Multiply each isotope’s mass by its percent abundance, add them up and divide by 100. For magnesium, (24 × 78.99 + 25 × 10.00 + 26 × 11.01) ÷ 100 is about 24.32; with the isotopes’ exact masses it is 24.31, the value on the periodic table. The answer key uses the exact masses.',
      },
      {
        q: 'Why are the peaks at whole numbers?',
        a: 'The x-axis is the mass-to-charge ratio, and each peak is drawn at its isotope’s mass number, as most school mass spectra show it. The exact isotope masses, such as 34.969 for chlorine-35, are used only to work out the relative atomic mass.',
      },
      {
        q: 'Where does the isotope data come from?',
        a: 'Abundances are the IUPAC Commission on Isotopic Abundances and Atomic Weights’ representative isotopic compositions (2024). Where IUPAC now gives only a range, as for hydrogen, boron, carbon, chlorine and bromine, the generator uses its 2009 single values, which lie within the range. Isotope masses are from NIST. Every element’s values average to its standard atomic weight.',
      },
      {
        q: 'Can I make a spectrum for a made-up element?',
        a: 'Yes. Choose Custom isotopes and type up to six masses with their percent abundances, and give the element a name. If the abundances don’t add up to 100%, the page says so and averages them as if they did.',
      },
      {
        q: 'Can it draw the mass spectrum of a molecule?',
        a: 'Not yet. It draws the isotopes of single elements, so molecules such as Cl₂ and their fragments aren’t drawn.',
      },
    ],
    imageAlt: 'A printable mass spectrum of magnesium with a peak for each isotope and its percent abundance, made with Mass Spectrum',
    educationalLevel: ['High school', 'AP Chemistry'],
  },
  'half-life-graph': {
    heading: 'Half-life graphs of radioactive decay',
    intro: [
      'Half-Life Graph draws the decay curve of a radioactive isotope: how much is left against time, halving every half-life, so half remains after one half-life, a quarter after two and an eighth after three. Pick carbon-14, hydrogen-3, fluorine-18, phosphorus-32, cobalt-60, strontium-90, technetium-99m, iodine-131, cesium-137, radon-222, radium-226, polonium-210, uranium-238, potassium-40, plutonium-239, americium-241 or a made-up Isotope X, or type your own name and half-life. Show the percent or fraction remaining, the mass from a starting mass, the number of nuclei or the activity in Bq or counts per minute, against time in the unit you choose.',
      'Teachers use it for reading a half-life off a graph and working out how much is left. The x-axis counts in round steps, so students find the half-life from the curve; add dashed guide lines at the first one to four half-lives, labeled with their times, as T½, 2T½…, or with blank lines. Put up to three isotopes on one graph with their names hidden, for students to identify from their half-lives, draw a stable daughter rising as the parent falls, or leave only the dots for students to draw the curve. The answer key gives each half-life and decay constant.',
    ],
    settings: [
      'Up to three isotopes: 16 real ones with their half-lives, a made-up Isotope X, or your own name, half-life and unit',
      'Up the side: percent remaining, fraction remaining, mass, number of nuclei, or activity in Bq or counts per minute, from the starting amount you type',
      'Time in seconds, minutes, hours, days, years, thousand years or billion years, with the axes fitted to five half-lives in round steps',
      'Dashed guide lines at the first 1 to 4 half-lives, labeled with their times, T½, 2T½…, blank lines or nothing',
      'Dots at each half-life, the curves hidden for students to plot, a stable daughter curve, and names hidden as Isotope A, B and C',
      'Color or black and white curves, chart and axis titles (or blank lines), the axis ranges and numbering, gridlines, and label size',
    ],
    faqs: [
      {
        q: 'How do you find the half-life from a graph?',
        a: 'Find half the starting amount on the y-axis (50% on a percent graph), go across to the curve and down to the time axis: that time is the half-life. Going from 50% to 25%, or 25% to 12.5%, takes the same time again. The guide lines draw exactly this, for one to four half-lives.',
      },
      {
        q: 'Why is carbon-14’s half-life 5,730 years and not 5,700?',
        a: 'Most textbooks and exam boards use 5,730 years, so the generator does too. The current evaluated value, in the National Nuclear Data Center’s NuDat 3, is 5,700 ± 30 years. To use it, choose Custom, name it carbon-14 and type 5700 years.',
      },
      {
        q: 'Where do the half-lives come from?',
        a: 'From NuDat 3, the National Nuclear Data Center’s database, rounded to three significant figures as textbooks give them: iodine-131 8.02 days, cesium-137 30.1 years, uranium-238 4.47 billion years. Carbon-14 uses the textbook 5,730 years.',
      },
      {
        q: 'Can it show the daughter isotope?',
        a: 'Yes, for one isotope whose daughter is stable, such as carbon-14 to nitrogen-14 or uranium-238 to lead-206, shown as a percent, fraction or number of nuclei. The daughter rises as the parent falls, and the two cross at one half-life. Strontium-90, radon-222, radium-226 and potassium-40 decay to radioactive daughters, so they don’t get one.',
      },
      {
        q: 'Can I compare isotopes on one graph?',
        a: 'Yes, up to three, drawn solid, dashed and dotted so they read apart in black and white, with a key under the graph. Hide the names and the key calls them Isotope A, B and C, for students to identify from their half-lives; the answer key names them.',
      },
      {
        q: 'Does the curve ever reach zero?',
        a: 'No. Each half-life leaves half of what was there, so the curve gets closer and closer to zero without reaching it: after ten half-lives about 0.1% is left.',
      },
    ],
    imageAlt: 'A printable half-life graph of carbon-14, percent remaining against time in years, with dashed guide lines at its first three half-lives, made with Half-Life Graph',
    educationalLevel: ['Middle school', 'High school', 'AP Chemistry', 'AP Physics'],
  },
}

/** The copy for a generator; every generator on the site has some. */
export function copyFor(id: string): GeneratorCopy {
  const copy = COPY[id]
  if (!copy) throw new Error(`No page copy for the ${id} generator`)
  return copy
}
