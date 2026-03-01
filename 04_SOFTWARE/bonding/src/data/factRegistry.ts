// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// WCD-29: The Molecule & Element Fact Registry
//
// Provides 4-tier progressive facts for elements and
// synthesized molecules.
//
// Tiers:
//   1. Willow (Sapling) — Sensory, simple, playful
//   2. Bash (Explorer) — Action, explosions, space, cool history
//   3. Teen (Alchemist) — Environmental, biological, slightly edgy
//   4. Researcher (Architect) — Quantum mechanics, historical precision
// ═══════════════════════════════════════════════════════

export interface FactTier {
  willow: string;
  bash: string;
  teen: string;
  researcher: string;
}

export interface ElementData {
  symbol: string;
  name: string;
  discovery: FactTier;
  cosmicOrigin: FactTier;
}

export interface MoleculeData {
  formula: string;
  name: string;
  category: 'basic' | 'mineral' | 'biological' | 'gas' | 'synthetic' | 'volatile';
  facts: FactTier;
}

// ==========================================
// CORE ELEMENTS (10)
// ==========================================
export const ElementRegistry: Record<string, ElementData> = {
  H: {
    symbol: "H",
    name: "Hydrogen",
    discovery: {
      willow: "People found out it makes a tiny 'pop' sound when it touches fire!",
      bash: "Scientists trapped this invisible gas and realized it was highly explosive. It powered the first zeppelins!",
      teen: "Henry Cavendish realized this 'inflammable air' wasn't just air, but a unique element that turned into pure water when burned.",
      researcher: "Identified as a distinct substance by Cavendish in 1766, Antoine Lavoisier later named it 'water-former' (hydro-gen) after proving it produces H2O upon combustion."
    },
    cosmicOrigin: {
      willow: "It is the oldest thing in the whole universe. It was there at the very beginning!",
      bash: "It was born in the Big Bang! It's the fuel that makes every single star in the sky shine.",
      teen: "It's the baseline of reality. 75% of all normal matter in the universe is just this one element waiting to be fused.",
      researcher: "Formed during the Recombination Epoch ~378,000 years after the Big Bang, when the universe cooled enough for protons to capture electrons."
    }
  },
  C: {
    symbol: "C",
    name: "Carbon",
    discovery: {
      willow: "Cavemen found it in the black soot left over from their warm campfires.",
      bash: "Ancient warriors used it to forge the first steel swords. They didn't know it was an element, they just knew it made weapons unbreakable!",
      teen: "It's been known since antiquity as soot and diamonds. Lavoisier was the one who bought a diamond, burned it in a glass jar, and proved it was just carbon.",
      researcher: "Recognized since prehistory in the form of soot, charcoal, and graphite. Its elemental nature was confirmed in 1789 by Lavoisier's combustion experiments."
    },
    cosmicOrigin: {
      willow: "It is made inside the tummy of a very old, very hot star.",
      bash: "When giant red stars are dying, they crush helium together so hard it turns into carbon. You are made of dead stars!",
      teen: "It requires three helium nuclei to smash together at exactly the right time. The universe is incredibly lucky this process even works.",
      researcher: "Synthesized via the triple-alpha process in the cores of asymptotic giant branch (AGB) stars and red supergiants at temperatures exceeding 100 million Kelvin."
    }
  },
  O: {
    symbol: "O",
    name: "Oxygen",
    discovery: {
      willow: "A man trapped this air in a jar and found out mice loved breathing it!",
      bash: "Joseph Priestley heated up a red powder with a giant magnifying glass and discovered the gas that makes fire burn brighter than ever!",
      teen: "Priestley and Scheele discovered it at the same time, but Lavoisier named it. He mistakenly thought it was required to make all acids (oxy-gen = acid-maker).",
      researcher: "Discovered independently by Carl Wilhelm Scheele (1772) and Joseph Priestley (1774). Priestley published first, calling it 'dephlogisticated air'."
    },
    cosmicOrigin: {
      willow: "It is cooked up by giant stars right before they go to sleep.",
      bash: "It's forged in the hearts of the heaviest stars in the universe right before they explode in giant supernovas!",
      teen: "It's the third most abundant element in the universe. Earth's atmosphere only has it because ancient cyanobacteria started 'polluting' the air with it 2.4 billion years ago.",
      researcher: "Primarily synthesized in the later stages of massive stars via the neon burning process and carbon burning process before core-collapse supernovae."
    }
  },
  Fe: {
    symbol: "Fe",
    name: "Iron",
    discovery: {
      willow: "People found heavy rocks that fell from the sky and made tools out of them!",
      bash: "The very first iron weapons didn't come from the ground\u2014they were forged from meteorites that crashed down from space!",
      teen: "The Iron Age changed human history. Once we figured out how to build furnaces hot enough to melt it out of rock, empires were built.",
      researcher: "Smelting of iron ores began around 3000 BCE, but the earliest known iron artifacts are meteoric, identified by their high nickel content."
    },
    cosmicOrigin: {
      willow: "It is the very last thing a star makes before it goes boom!",
      bash: "It is the star-killer! When a massive star tries to make iron, it runs out of energy and explodes in a massive supernova!",
      teen: "Iron is the most stable nucleus in the universe. Fusing it takes more energy than it creates, which is exactly why stars collapse when their core turns to iron.",
      researcher: "The ultimate endpoint of stellar nucleosynthesis. Isotope Fe-56 is produced by the radioactive decay of Nickel-56, forged in the silicon burning phase of massive stars."
    }
  },
  N: {
    symbol: "N",
    name: "Nitrogen",
    discovery: {
      willow: "A scientist found air that wouldn't let a candle stay lit.",
      bash: "Daniel Rutherford discovered this 'choking gas.' It makes up most of the air, but it extinguishes fire instantly!",
      teen: "We are swimming in it. 78% of the air is nitrogen, but it's so stable it refuses to react with almost anything unless hit by lightning.",
      researcher: "Discovered by Daniel Rutherford in 1772, who called it 'noxious air'. Antoine Lavoisier called it 'azote', meaning 'no life', because it suffocates animals."
    },
    cosmicOrigin: {
      willow: "It's made by stars that are much, much bigger than our sun.",
      bash: "It's created in a cosmic loop where stars use carbon and oxygen to smash atoms together!",
      teen: "It's the cosmic ash left over from the CNO cycle\u2014the dominant fusion process in stars heavier than our sun.",
      researcher: "Primarily synthesized during the CNO (Carbon-Nitrogen-Oxygen) cycle in massive main-sequence stars, acting as a catalyst for hydrogen fusion."
    }
  },
  S: {
    symbol: "S",
    name: "Sulfur",
    discovery: {
      willow: "Ancient people found yellow rocks near volcanoes that smelled like rotten eggs when burned.",
      bash: "Known as 'Brimstone' in ancient times. It was a secret ingredient in Greek Fire and the first gunpowder!",
      teen: "Alchemists were obsessed with it. They thought it was the principle of combustibility itself because it burns with a crazy blue flame.",
      researcher: "Known since antiquity. Antoine Lavoisier was the first to convince the scientific community that sulfur was a fundamental element in 1777, not a compound."
    },
    cosmicOrigin: {
      willow: "It was baked in the ovens of giant, ancient stars.",
      bash: "It's forged in the super-hot ashes of dying stars just before they blow up.",
      teen: "It's a byproduct of silicon burning in the final days of a massive star's life.",
      researcher: "Created in massive stars by the alpha process, where a silicon nucleus captures a helium nucleus at temperatures exceeding 2.5 billion Kelvin."
    }
  },
  P: {
    symbol: "P",
    name: "Phosphorus",
    discovery: {
      willow: "A man was playing with boiled pee and accidentally made something that glowed in the dark!",
      bash: "Hennig Brand boiled down 50 buckets of urine looking for gold, but instead he discovered a white paste that burst into green flames in the dark!",
      teen: "It was the first element discovered since antiquity. It was so highly reactive it had to be kept underwater, or it would spontaneously combust.",
      researcher: "Discovered by Hennig Brand in 1669 through the destructive distillation of urine. The glow was due to chemiluminescence as it slowly oxidized."
    },
    cosmicOrigin: {
      willow: "It was sneezed out by exploding stars.",
      bash: "When stars explode in supernovas, they blast phosphorus out into space, which eventually ended up in your DNA!",
      teen: "It's relatively rare in the universe compared to carbon or oxygen, which makes it one of the main limiting factors for life on other planets.",
      researcher: "Synthesized in massive stars through oxygen and neon burning, and distributed into the interstellar medium via core-collapse supernovae."
    }
  },
  Na: {
    symbol: "Na",
    name: "Sodium",
    discovery: {
      willow: "A scientist used lightning electricity to pull it out of soap-making ashes.",
      bash: "Sir Humphry Davy shot extreme electricity into lye and created a silver metal that explodes the second it touches water!",
      teen: "It's a metal so soft you can cut it with a butter knife, but if you drop a chunk in a lake, it will literally blow up.",
      researcher: "First isolated in 1807 by Humphry Davy via the electrolysis of caustic soda (sodium hydroxide), proving it was a distinct alkali metal."
    },
    cosmicOrigin: {
      willow: "It was made inside stars when two smaller atoms bumped together.",
      bash: "Giant stars fuse carbon atoms together so hard they create this explosive metal!",
      teen: "The sodium in your sweat and tears was forged in the carbon-burning phase of a dying red supergiant.",
      researcher: "Synthesized in stars during carbon burning, where two Carbon-12 nuclei fuse to form Neon-20 and an alpha particle, or Sodium-23 and a proton."
    }
  },
  Cl: {
    symbol: "Cl",
    name: "Chlorine",
    discovery: {
      willow: "A scientist mixed some powders and accidentally made a green gas that made him cough.",
      bash: "Carl Wilhelm Scheele discovered it, but Humphry Davy proved this heavy, pale green gas was actually a brand new element.",
      teen: "It was famously used as the first chemical weapon in WW1, but today it's what keeps swimming pools safe and tap water drinkable.",
      researcher: "Discovered in 1774 by Scheele, who thought it contained oxygen. Humphry Davy proved it was a halogen element in 1810 and named it after the Greek word for 'pale green'."
    },
    cosmicOrigin: {
      willow: "It was made deep inside the heaviest stars in space.",
      bash: "Forged during the explosive death of massive stars, then scattered across the galaxy!",
      teen: "It's an odd-numbered element, which means it's much less common in the universe than even-numbered elements like oxygen or iron.",
      researcher: "Produced in the late stages of stellar nucleosynthesis via oxygen burning, and by the r-process and s-process in supernovae and AGB stars."
    }
  },
  Ca: {
    symbol: "Ca",
    name: "Calcium",
    discovery: {
      willow: "People used to bake chalk to make a powder, until a scientist used electricity to find the shiny metal inside.",
      bash: "The Romans used its compounds to build the Colosseum! Humphry Davy finally zapped it with electricity to isolate the pure, silvery metal.",
      teen: "It's technically a metal. The stuff that makes your bones hard and teeth white is a highly reactive silvery metal when it's pure.",
      researcher: "Isolated in 1808 by Humphry Davy through the electrolysis of a mixture of lime (calcium oxide) and mercuric oxide."
    },
    cosmicOrigin: {
      willow: "It was made in the very center of a hot star.",
      bash: "When stars run out of oxygen, they start crushing atoms together to make calcium, right before they explode!",
      teen: "Every ounce of calcium in your skeleton was forged in the agonizing final moments of a dying star before a supernova.",
      researcher: "Synthesized in massive stars via the alpha process during the oxygen and silicon burning phases, directly preceding core collapse."
    }
  }
};

// ==========================================
// MOLECULE REGISTRY
// ==========================================
export const MoleculeRegistry: Record<string, MoleculeData> = {
  // ── Minerals & Metallurgy ──
  "FeS": {
    formula: "FeS",
    name: "Iron Sulfide",
    category: "mineral",
    facts: {
      willow: "It looks like a dark rock, but it's made of the same stuff as magnets and stinky eggs!",
      bash: "Ancient blacksmiths thought this was gold! The sparks you see when you strike steel? That's iron sulfide!",
      teen: "It's highly pyrophoric in powder form, meaning it can spontaneously catch fire in the air. Nature's flashbang.",
      researcher: "Iron(II) sulfide often adopts a nickel arsenide structure and occurs naturally as the mineral troilite, frequently found in meteorites."
    }
  },
  "FeS2": {
    formula: "FeS2",
    name: "Pyrite",
    category: "mineral",
    facts: {
      willow: "It's super shiny and gold, but it's playing a trick on you! It's not real gold.",
      bash: "This is Fool's Gold! Pirates and miners used to think they were rich, but it's just iron and sulfur. You can use it to strike sparks to start a fire!",
      teen: "In the 16th century, this was used to ignite gunpowder in wheel-lock firearms before flint became popular.",
      researcher: "It forms isometric crystals (often perfect cubes) and creates a highly acidic runoff known as Acid Mine Drainage when exposed to water and oxygen."
    }
  },
  "Fe2O3": {
    formula: "Fe2O3",
    name: "Iron(III) Oxide",
    category: "mineral",
    facts: {
      willow: "This is the red stuff on old bikes that got left out in the rain.",
      bash: "This is RUST! It's literally iron slowly burning up because oxygen is attacking it. It's also what makes the planet Mars look red!",
      teen: "It's not just decay. Mixed with aluminum powder, it creates Thermite\u2014a mixture that burns so hot it melts through solid engine blocks.",
      researcher: "Naturally occurring as the mineral hematite, its paramagnetic properties shift to antiferromagnetic below the Morin transition temperature (250 K)."
    }
  },
  "SiO2": {
    formula: "SiO2",
    name: "Silicon Dioxide",
    category: "mineral",
    facts: {
      willow: "If you've ever built a sandcastle at the beach, you were playing with a giant pile of this!",
      bash: "Melt this sand in a super hot furnace, and you make glass! It's also the exact same thing quartz crystals are made of.",
      teen: "Inside every computer, tablet, and phone is a tiny slice of this material acting as an insulator for billions of microscopic transistors.",
      researcher: "Exhibits piezoelectricity in its alpha-quartz chiral structure, which is why it is used as the primary oscillator for timekeeping in electronics."
    }
  },

  // ── Basics & Gases ──
  "H2O": {
    formula: "H2O",
    name: "Water",
    category: "basic",
    facts: {
      willow: "This is what you drink, what makes up the ocean, and what turns into snow!",
      bash: "Water is actually an alien! A lot of Earth's water was delivered by giant ice comets crashing into the planet billions of years ago.",
      teen: "Water is weird. It's one of the only substances that expands when it freezes, which is why ice floats instead of crushing everything at the bottom of the ocean.",
      researcher: "The high specific heat capacity and high heat of vaporization, driven by its extensive hydrogen bonding, are the primary thermal buffers regulating Earth's climate."
    }
  },
  "CO2": {
    formula: "CO2",
    name: "Carbon Dioxide",
    category: "gas",
    facts: {
      willow: "This is the invisible air you breathe out when you sigh or blow out candles.",
      bash: "It makes the bubbles in your soda! If you freeze it super cold, it turns into Dry Ice, which makes awesome spooky fog.",
      teen: "It's the ultimate double-edged sword: plants need it to survive, but humans pumping too much of it into the sky is trapping the sun's heat.",
      researcher: "A linear triatomic molecule. Because it has no dipole moment, it only absorbs infrared radiation through its asymmetric stretching and bending vibrational modes."
    }
  },
  "O3": {
    formula: "O3",
    name: "Ozone",
    category: "gas",
    facts: {
      willow: "It smells sharp and clean, like the air right after a big thunderstorm!",
      bash: "It's a giant invisible shield in the sky that blocks the sun's deadly laser beams (UV rays) from burning us up!",
      teen: "Up high, it protects the planet. Down low, it's a toxic pollutant created by car exhaust that damages your lungs.",
      researcher: "A highly reactive allotrope of oxygen. In the stratosphere, it undergoes the Chapman cycle, absorbing UV-B and UV-C radiation."
    }
  },
  "CH4": {
    formula: "CH4",
    name: "Methane",
    category: "volatile",
    facts: {
      willow: "This is the invisible gas that cows burp out when they eat grass!",
      bash: "It's rocket fuel! Companies like SpaceX freeze it into a liquid to power the massive Raptor engines on the Starship!",
      teen: "It's the main ingredient in natural gas used for stoves, but as a greenhouse gas, it traps 80 times more heat than carbon dioxide over 20 years.",
      researcher: "The simplest alkane. Extensive deposits exist on the ocean floor as methane clathrates, posing a massive feedback-loop risk for global warming."
    }
  },
  "N2O": {
    formula: "N2O",
    name: "Nitrous Oxide",
    category: "gas",
    facts: {
      willow: "Dentists use this to make people feel happy and sleepy when they get a cavity fixed.",
      bash: "This is NOS! Racecar drivers inject it right into their engines to make the cars go incredibly fast!",
      teen: "It's known as 'laughing gas', but it's actually a severe greenhouse gas that stays in the atmosphere for over 100 years.",
      researcher: "Acts as a potent oxidizer at high temperatures, which is why it significantly increases power output in internal combustion engines."
    }
  },

  // ── Biologicals ──
  "C6H12O6": {
    formula: "C6H12O6",
    name: "Glucose",
    category: "biological",
    facts: {
      willow: "This is the sweet energy that makes plants grow and helps you run fast!",
      bash: "It's nature's ultimate battery! Your brain burns through 400 calories of this stuff every day just thinking.",
      teen: "Every single plant on earth acts like a solar panel, using sunlight to mash carbon dioxide and water into this exact sugar.",
      researcher: "The central aldohexose in biology. It is the primary substrate for glycolysis, yielding pyruvate, ATP, and NADH."
    }
  },
  "C10H16N5O13P3": {
    formula: "C10H16N5O13P3",
    name: "Adenosine Triphosphate (ATP)",
    category: "biological",
    facts: {
      willow: "It's like a tiny, invisible battery that lives inside all of your muscles!",
      bash: "When you jump, blink, or breathe, your body literally snaps a piece off this molecule to cause an explosion of energy!",
      teen: "You recycle your own body weight in ATP every single day. If your body stopped making it, you would die in less than three minutes.",
      researcher: "The universal energy currency of the cell. Energy is released via the hydrolysis of the terminal phosphoanhydride bond, yielding ADP and inorganic phosphate."
    }
  },
  "C8H10N4O2": {
    formula: "C8H10N4O2",
    name: "Caffeine",
    category: "biological",
    facts: {
      willow: "This is the invisible thing in coffee that makes grown-ups wake up in the morning!",
      bash: "Plants originally evolved this chemical as a deadly poison to paralyze bugs that tried to eat their leaves!",
      teen: "It doesn't actually give you energy; it just plugs up the receptors in your brain that tell you you're tired.",
      researcher: "A methylxanthine class central nervous system stimulant. It acts primarily as a reversible antagonist of adenosine receptors A1 and A2A."
    }
  },
  "C10H14N2": {
    formula: "C10H14N2",
    name: "Nicotine",
    category: "biological",
    facts: {
      willow: "A chemical that some plants make to keep hungry caterpillars away.",
      bash: "It's a chemical weapon built by tobacco plants! It overloads a bug's nervous system if they take a bite.",
      teen: "It is one of the most addictive substances on earth, hijacking the brain's reward system to make you crave it constantly.",
      researcher: "A parasympathomimetic alkaloid that acts as a receptor agonist at most nicotinic acetylcholine receptors (nAChRs), severely altering dopaminergic pathways."
    }
  },
  "C8H11NO2": {
    formula: "C8H11NO2",
    name: "Dopamine",
    category: "biological",
    facts: {
      willow: "This is the tiny chemical in your brain that makes you feel happy when you get a hug!",
      bash: "This is the 'Level Up' molecule! Your brain shoots this out every time you win a game or do something awesome.",
      teen: "It's the motivation molecule. It's the reason scrolling on your phone feels so addictive, but also what drives you to achieve your goals.",
      researcher: "A catecholamine neurotransmitter. It functions via G protein-coupled receptors to modulate reward-motivated behavior, motor control, and hormone release."
    }
  },

  // ── Acids & Volatiles ──
  "HCl": {
    formula: "HCl",
    name: "Hydrochloric Acid",
    category: "volatile",
    facts: {
      willow: "This is a super sour juice that lives inside your tummy to help dissolve your food!",
      bash: "It's a brutal acid! It can eat through solid metal, but your stomach makes it every day. Your stomach has to grow a new lining so it doesn't digest itself!",
      teen: "If you throw up and it burns your throat, that's HCl. It drops the pH of your stomach to between 1.5 and 3.5.",
      researcher: "A strong monoprotic acid. In the gastric lumen, parietal cells secrete hydrogen and chloride ions separately via the H+/K+ ATPase pump."
    }
  },
  "H2SO4": {
    formula: "H2SO4",
    name: "Sulfuric Acid",
    category: "volatile",
    facts: {
      willow: "A dangerous liquid that can burn your skin. You should never touch it!",
      bash: "It is the king of acids! It's so aggressive it literally rips the water out of sugar, turning it into a giant, steaming pillar of black carbon.",
      teen: "It's the most widely produced industrial chemical in the world, mostly used to make fertilizer. Venus's clouds are made of this stuff.",
      researcher: "A highly corrosive, diprotic acid. Its hydration reaction is extremely exothermic, capable of boiling water instantly if mixed incorrectly."
    }
  },
  "NaCl": {
    formula: "NaCl",
    name: "Sodium Chloride",
    category: "basic",
    facts: {
      willow: "This is salt! It makes French fries taste yummy and makes the ocean taste gross.",
      bash: "It's made of a metal that explodes in water, and a gas that is highly toxic. But smash them together, and you get tasty table salt!",
      teen: "In ancient times, this was so valuable that Roman soldiers were sometimes paid in it. That's where the word 'salary' comes from.",
      researcher: "An ionic compound forming a face-centered cubic lattice. It is essential for generating action potentials in neurons via sodium-potassium pumps."
    }
  },
  "C3H5N3O9": {
    formula: "C3H5N3O9",
    name: "Nitroglycerin",
    category: "volatile",
    facts: {
      willow: "A very unstable liquid. If you drop it, boom!",
      bash: "The explosive core of Dynamite! Alfred Nobel figured out how to mix this super-sensitive liquid with clay so it wouldn't blow up randomly on trains.",
      teen: "Weirdly, if someone is having a heart attack, paramedics will give them a tiny dose of this explosive to force their blood vessels to open up.",
      researcher: "A heavy, colorless, oily, explosive liquid. In medicine, it acts as a prodrug, releasing nitric oxide (NO) to cause vasodilation."
    }
  },

  // ── Everyday Molecules ──
  "NaHCO3": {
    formula: "NaHCO3",
    name: "Sodium Bicarbonate",
    category: "basic",
    facts: {
      willow: "This is baking soda! It makes cookies fluffy.",
      bash: "Mix this with vinegar, and it explodes into a massive foam volcano!",
      teen: "It's the ultimate household cheat code. It puts out grease fires, gets smells out of your fridge, and settles an upset stomach.",
      researcher: "An amphoteric compound. It reacts rapidly with acetic acid to yield carbon dioxide gas, water, and sodium acetate in a classic acid-base neutralization."
    }
  },
  "C2H4": {
    formula: "C2H4",
    name: "Ethylene",
    category: "gas",
    facts: {
      willow: "This invisible gas is a secret message plants send to each other.",
      bash: "It's the ripening ray! If you put a brown banana next to a green avocado, the banana shoots out this gas to force the avocado to ripen faster.",
      teen: "It is the most produced organic compound in the world because it's the building block for polyethylene\u2014the plastic used in almost every shopping bag.",
      researcher: "A gaseous plant hormone containing a carbon-carbon double bond, regulating fruit ripening, senescence, and the abscission of leaves."
    }
  }
};

/**
 * Fetch the proper fact tier based on the current player's profile settings.
 */
export const getFactForProfile = (
  entity: MoleculeData | ElementData,
  profileTier: 'willow' | 'bash' | 'teen' | 'researcher',
  context: 'discovery' | 'cosmicOrigin' | 'facts' = 'facts'
): string => {
  if ('formula' in entity) {
    // It's a molecule
    return entity.facts[profileTier];
  } else {
    // It's an element
    return entity[context as 'discovery' | 'cosmicOrigin'][profileTier];
  }
};
