import {
  cliExecute,
  Effect,
  getWorkshed,
  haveEffect,
  itemAmount,
  mallPrice,
  myClass,
  myLevel,
  numericModifier,
  use,
  useSkill,
} from "kolmafia";
import {
  $class,
  $effect,
  $effects,
  $familiar,
  $item,
  $items,
  $skill,
  AsdonMartin,
  get,
  have,
  Mood,
  uneffect,
} from "libram";
import { baseMeat, burnLibrams, safeRestoreMpTarget, setChoice } from "./lib";
import { withStash } from "./clan";
import { usingPurse } from "./outfit";

Mood.setDefaultOptions({
  songSlots: [
    $effects`Polka of Plenty`,
    $effects`Donho's Bubbly Ballad`,
    $effects`Chorale of Companionship`,
    $effects`The Ballad of Richie Thingfinder`,
  ],
  useNativeRestores: true,
});

export function meatMood(
  moodType: "Yachtzee" | "Greg" | "Replacer" | "Barf",
  meat = baseMeat,
): Mood {
  // Reserve the amount of MP we try to restore before each fight.
  const mood = new Mood({ reserveMp: safeRestoreMpTarget() });

  mood.potion($item`resolution: be wealthier`, 0.3 * baseMeat);
  mood.potion($item`resolution: be happier`, 0.15 * 0.45 * 0.8 * 200);

  const flaskValue = usingPurse() ? 0.3 * baseMeat : 5;
  mood.potion($item`Flaskfull of Hollow`, flaskValue);

  mood.skill($skill`Blood Bond`);
  mood.skill($skill`Leash of Linguini`);
  mood.skill($skill`Empathy of the Newt`);

  mood.skill($skill`Ruthless Efficiency`);

  // Underwater only effects do not work during yachtzee
  if (moodType !== "Yachtzee") {
    // We do Gregs underwater, but not replacers
    if (moodType === "Greg") {
      mood.skill($skill`Donho's Bubbly Ballad`);
      mood.potion($item`recording of Donho's Bubbly Ballad`, 0.2 * meat);
      const familiarMultiplier = have($familiar`Robortender`)
        ? 2
        : have($familiar`Hobo Monkey`)
        ? 1.25
        : 1;
      // Assume base weight of 100 pounds. This is off but close enough.
      const assumedBaseWeight = 100;
      // Marginal value of familiar weight in % meat drop.
      const marginalValue =
        2 * familiarMultiplier +
        Math.sqrt(220 * familiarMultiplier) / (2 * Math.sqrt(assumedBaseWeight));

      // Underwater only potions
      mood.potion($item`temporary teardrop tattoo`, ((10 * marginalValue) / 100) * meat);
      mood.potion($item`sea grease`, ((5 * marginalValue) / 100) * meat);
    }

    // Don't run pressure reduction potions during embezzlers, the pressure is only 50 which is covered by Asdon + Donhos + cowskin bed
    if (moodType === "Barf") {
      mood.skill($skill`Donho's Bubbly Ballad`);
      mood.potion($item`recording of Donho's Bubbly Ballad`, 0.2 * baseMeat);
      const familiarMultiplier = have($familiar`Robortender`)
        ? 2
        : have($familiar`Hobo Monkey`)
        ? 1.25
        : 1;
      // Assume base weight of 100 pounds. This is off but close enough.
      const assumedBaseWeight = 100;
      // Marginal value of familiar weight in % meat drop.
      const marginalValue =
        2 * familiarMultiplier +
        Math.sqrt(220 * familiarMultiplier) / (2 * Math.sqrt(assumedBaseWeight));

      // Underwater only potions
      mood.potion($item`temporary teardrop tattoo`, ((10 * marginalValue) / 100) * baseMeat);
      mood.potion($item`sea grease`, ((5 * marginalValue) / 100) * baseMeat);
      // Pressure reduction potions
      // Adding all of them even though it's technically possible to go over 100% reduction and waste buffs. Doubtful to happen because Shark cartilage will always be too expensive
      mood.potion($item`Mer-kin fastjuice`, 0.1 * baseMeat);
      mood.potion($item`sea salt crystal`, 0.1 * baseMeat);
      mood.potion($item`shavin' razor`, 0.2 * baseMeat);
      mood.potion($item`shark cartilage`, 0.4 * baseMeat);
    }
  }

  if (
    !have($effect`Chorale of Companionship`) ||
    !have($effect`The Ballad of Richie Thingfinder`)
  ) {
    mood.skill($skill`Fat Leon's Phat Loot Lyric`);
  }

  mood.skill($skill`The Polka of Plenty`);
  mood.skill($skill`Disco Leer`);
  mood.skill($skill`Singer's Faithful Ocelot`);
  mood.skill($skill`The Spirit of Taking`);
  mood.skill($skill`Drescher's Annoying Noise`);
  mood.skill($skill`Pride of the Puffin`);
  mood.skill($skill`Walk: Leisurely Amble`);
  mood.skill($skill`Call For Backup`);
  mood.skill($skill`Soothing Flute`);

  const mmjCost =
    (100 -
      (have($skill`Five Finger Discount`) ? 5 : 0) -
      (have($item`Travoltan trousers`) ? 5 : 0)) *
    (200 / (1.5 * myLevel() + 5));
  const genericManaPotionCost = mallPrice($item`generic mana potion`) * (200 / (2.5 * myLevel()));
  const mpRestorerCost = Math.min(mmjCost, genericManaPotionCost);

  if (myClass() !== $class`Pastamancer` && 0.1 * meat * 10 > mpRestorerCost) {
    mood.skill($skill`Bind Lasagmbie`);
  }

  if (getWorkshed() === $item`Asdon Martin keyfob`) mood.drive(AsdonMartin.Driving.Waterproofly);

  if (have($item`Kremlin's Greatest Briefcase`)) {
    mood.effect($effect`A View to Some Meat`, () => {
      if (get("_kgbClicksUsed") < 22) {
        const buffTries = Math.ceil((22 - get("_kgbClicksUsed")) / 3);
        cliExecute(`Briefcase buff ${new Array<string>(buffTries).fill("meat").join(" ")}`);
      }
    });
  }

  if (!get("concertVisited") && get("sidequestArenaCompleted") === "fratboy") {
    cliExecute("concert winklered");
  } else if (!get("concertVisited") && get("sidequestArenaCompleted") === "hippy") {
    cliExecute("concert optimist primal");
  }

  if (itemAmount($item`Bird-a-Day calendar`) > 0) {
    if (!have($skill`Seek out a Bird`) || !get("_canSeekBirds")) {
      use(1, $item`Bird-a-Day calendar`);
    }

    if (
      have($skill`Visit your Favorite Bird`) &&
      !get("_favoriteBirdVisited") &&
      (numericModifier($effect`Blessing of your favorite Bird`, "Meat Drop") > 0 ||
        numericModifier($effect`Blessing of your favorite Bird`, "Item Drop") > 0)
    ) {
      useSkill($skill`Visit your Favorite Bird`);
    }

    if (
      have($skill`Seek out a Bird`) &&
      get("_birdsSoughtToday") < 6 &&
      (numericModifier($effect`Blessing of the Bird`, "Meat Drop") > 0 ||
        numericModifier($effect`Blessing of the Bird`, "Item Drop") > 0)
    ) {
      // Ensure we don't get stuck in the choice if the count is wrong
      setChoice(1399, 2);
      useSkill($skill`Seek out a Bird`, 6 - get("_birdsSoughtToday"));
    }
  }

  if (
    have($skill`Incredible Self-Esteem`) &&
    $effects`Always be Collecting, Work For Hours a Week`.some((effect) => have(effect)) &&
    !get("_incredibleSelfEsteemCast")
  ) {
    useSkill($skill`Incredible Self-Esteem`);
  }

  const canRecord =
    getWorkshed() === $item`warbear LP-ROM burner` ||
    have($item`warbear LP-ROM burner` || get("questG04Nemesis") === "finished");

  if (myClass() === $class`Accordion Thief` && myLevel() >= 15 && !canRecord) {
    if (have($skill`The Ballad of Richie Thingfinder`)) {
      useSkill($skill`The Ballad of Richie Thingfinder`, 10 - get("_thingfinderCasts"));
    }
    if (have($skill`Chorale of Companionship`)) {
      useSkill($skill`Chorale of Companionship`, 10 - get("_companionshipCasts"));
    }
  }

  shrugBadEffects();

  return mood;
}

export function freeFightMood(...additionalEffects: Effect[]): Mood {
  const mood = new Mood();

  for (const effect of additionalEffects) {
    mood.effect(effect);
  }

  if (haveEffect($effect`Blue Swayed`) < 50) {
    use(Math.ceil((50 - haveEffect($effect`Blue Swayed`)) / 10), $item`pulled blue taffy`);
  }
  mood.potion($item`white candy heart`, 30);

  mood.skill($skill`Curiosity of Br'er Tarrypin`);

  shrugBadEffects(...additionalEffects);

  if (getWorkshed() === $item`Asdon Martin keyfob`) mood.drive(AsdonMartin.Driving.Waterproofly);

  return mood;
}

/**
 * Use buff extenders like PYEC and Bag o Tricks
 */
export function useBuffExtenders(): void {
  withStash($items`Platinum Yendorian Express Card, Bag o' Tricks`, () => {
    if (have($item`Platinum Yendorian Express Card`) && !get("expressCardUsed")) {
      burnLibrams();
      use($item`Platinum Yendorian Express Card`);
    }
    if (have($item`Bag o' Tricks`) && !get("_bagOTricksUsed")) {
      use($item`Bag o' Tricks`);
    }
  });
  if (have($item`License to Chill`) && !get("_licenseToChillUsed")) {
    burnLibrams();
    use($item`License to Chill`);
  }
}

const stings = [
  ...$effects`Apoplectic with Rage, Barfpits, Berry Thorny, Biologically Shocked, Bone Homie, Boner Battalion, Coal-Powered, Curse of the Black Pearl Onion, Dizzy with Rage, Drenched With Filth, EVISCERATE!, Fangs and Pangs, Frigidalmatian, Gummi Badass, Haiku State of Mind, It's Electric!, Jabañero Saucesphere, Jalapeño Saucesphere, Little Mouse Skull Buddy, Long Live GORF, Mayeaugh, Permanent Halloween, Psalm of Pointiness, Pygmy Drinking Buddy, Quivering with Rage, Scarysauce, Skeletal Cleric, Skeletal Rogue, Skeletal Warrior, Skeletal Wizard, Smokin', Soul Funk, Spiky Frozen Hair, Stinkybeard, Stuck-Up Hair, Can Has Cyborger, Feeling Nervous`,
  $effect`Burning, Man`,
  $effect`Yes, Can Haz`,
];
const textAlteringEffects = $effects`Can Has Cyborger, Dis Abled, Haiku State of Mind, Just the Best Anapests, O Hai!, Robocamo`;
export const teleportEffects = $effects`Teleportitis, Feeling Lost, Funday!`;
const otherwiseBadEffects = $effects`Temporary Blindness`;
export function shrugBadEffects(...exclude: Effect[]): void {
  [...stings, ...textAlteringEffects, ...teleportEffects, ...otherwiseBadEffects].forEach(
    (effect) => {
      if (have(effect) && !exclude.includes(effect)) {
        uneffect(effect);
      }
    },
  );
}
