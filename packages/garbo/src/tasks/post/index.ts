import {
  adv1,
  availableChoiceOptions,
  canAdventure,
  cliExecute,
  haveEffect,
  inebrietyLimit,
  isBanished,
  itemAmount,
  mallPrice,
  myAdventures,
  myInebriety,
  myLevel,
  putCloset,
  reverseNumberology,
  runChoice,
  totalFreeRests,
  use,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $effect,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  AutumnAton,
  BurningLeaves,
  CinchoDeMayo,
  clamp,
  FloristFriar,
  get,
  getRemainingStomach,
  have,
  haveInCampground,
  JuneCleaver,
  realmAvailable,
  set,
  undelay,
  uneffect,
  withProperty,
} from "libram";
import { GarboStrategy, Macro } from "../../combat";
import { globalOptions } from "../../config";
import { computeDiet, consumeDiet } from "../../diet";
import {
  bestJuneCleaverOption,
  freeRest,
  juneCleaverChoiceValues,
  valueJuneCleaverOption,
} from "../../lib";
import { teleportEffects } from "../../mood";
import { Quest } from "grimoire-kolmafia";
import { bestAutumnatonLocation } from "../../resources";
import { estimatedGarboTurns, remainingUserTurns } from "../../turns";
import { acquire } from "../../acquire";
import { garboAverageValue } from "../../garboValue";
import workshedTasks from "./worksheds";
import { GarboPostTask } from "./lib";
import { GarboTask } from "../engine";
import { getRequiredFishyTurns } from "../fishyPrep";

const STUFF_TO_CLOSET = $items`bowling ball, funky junk key`;
function closetStuff(): GarboPostTask {
  return {
    name: "Closet Stuff",
    completed: () => STUFF_TO_CLOSET.every((i) => itemAmount(i) === 0),
    do: () => STUFF_TO_CLOSET.forEach((i) => putCloset(itemAmount(i), i)),
  };
}

const BARF_PLANTS = [
  FloristFriar.Crookweed,
  FloristFriar.Snori,
  FloristFriar.ElectricEelgrass,
];
function floristFriars(): GarboPostTask {
  return {
    name: "Florist Plants",
    completed: () => FloristFriar.isFull($location`The Coral Corral`),
    ready: () =>
      get("lastAdventure") === $location`The Coral Corral` &&
      FloristFriar.have() &&
      BARF_PLANTS.some((flower) =>
        flower.available($location`The Coral Corral`),
      ),
    do: () =>
      BARF_PLANTS.filter((flower) =>
        flower.available($location`The Coral Corral`),
      ).forEach((flower) => flower.plant()),
    available: () =>
      FloristFriar.have() &&
      BARF_PLANTS.some((flower) =>
        flower.available($location`The Coral Corral`),
      ),
  };
}

function fillPantsgivingFullness(): GarboPostTask {
  return {
    name: "Fill Pantsgiving Fullness",
    ready: () => !globalOptions.nodiet && get("_shivRanchoFishyPrepped", false),
    completed: () => getRemainingStomach() <= 0,
    do: () => consumeDiet(computeDiet().pantsgiving(), "PANTSGIVING"),
    available: () => have($item`Pantsgiving`),
  };
}

function setFishyPrepPref(): GarboPostTask {
  return {
    name: "Set Fishy Prep Preference",
    ready: () =>
      haveEffect($effect`Fishy`) >= getRequiredFishyTurns() &&
      isBanished($monster`sea cowboy`),
    completed: () => get("_shivRanchoFishyPrepped", false),
    do: () => set("_shivRanchoFishyPrepped", true),
  };
}

function fillSweatyLiver(): GarboPostTask {
  return {
    name: "Fill Sweaty Liver",
    ready: () =>
      have($item`designer sweatpants`) &&
      !globalOptions.nodiet &&
      get("_shivRanchoFishyPrepped", false) &&
      get("sweat") >= 25 * clamp(3 - get("_sweatOutSomeBoozeUsed"), 0, 3),
    completed: () => get("_sweatOutSomeBoozeUsed") >= 3,
    do: () => {
      while (get("_sweatOutSomeBoozeUsed") < 3) {
        useSkill($skill`Sweat Out Some Booze`);
      }
      consumeDiet(computeDiet().sweatpants(), "SWEATPANTS");
    },
    available: () =>
      have($item`designer sweatpants`) &&
      !globalOptions.nodiet &&
      get("_sweatOutSomeBoozeUsed") < 3,
  };
}

function numberology(): GarboPostTask {
  return {
    name: "Numberology",
    ready: () => Object.keys(reverseNumberology()).includes("69"),
    completed: () => get("_universeCalculated") >= get("skillLevel144"),
    do: () => cliExecute("numberology 69"),
    available: () => get("_universeCalculated") < get("skillLevel144"),
  };
}

let juneCleaverSkipChoices: (typeof JuneCleaver.choices)[number][] | null;

function getJuneCleaverskipChoices(): (typeof JuneCleaver.choices)[number][] {
  if (JuneCleaver.skipsRemaining() > 0) {
    if (!juneCleaverSkipChoices) {
      juneCleaverSkipChoices = [...JuneCleaver.choices]
        .sort(
          (a, b) =>
            valueJuneCleaverOption(
              juneCleaverChoiceValues[a][bestJuneCleaverOption(a)],
            ) -
            valueJuneCleaverOption(
              juneCleaverChoiceValues[b][bestJuneCleaverOption(b)],
            ),
        )
        .splice(0, 3);
    }
    return [...juneCleaverSkipChoices];
  }
  return [];
}

const juneCleaverChoices = () =>
  Object.fromEntries(
    JuneCleaver.choices.map((choice) => [
      choice,
      getJuneCleaverskipChoices().includes(choice)
        ? 4
        : bestJuneCleaverOption(choice),
    ]),
  );

function juneCleaver(): GarboPostTask {
  return {
    name: "June Cleaver",
    ready: () =>
      JuneCleaver.have() &&
      teleportEffects.every((e) => !have(e)) &&
      myAdventures() > 0,
    completed: () => get("_juneCleaverFightsLeft") > 0,
    do: () => {
      const location =
        myInebriety() > inebrietyLimit()
          ? $location`Drunken Stupor`
          : $location`Noob Cave`;
      withProperty("recoveryScript", "", () => adv1(location, 1));
    },
    outfit: { weapon: $item`June cleaver` },
    combat: new GarboStrategy(() =>
      Macro.abortWithMsg(
        `Expected June Cleaver non-combat but ended up in combat.`,
      ),
    ),
    choices: juneCleaverChoices,
    available: () => JuneCleaver.have(),
    post: () => {
      if (
        ["Poetic Justice", "Lost and Found"].includes(get("lastEncounter")) &&
        have($effect`Beaten Up`)
      ) {
        useSkill($skill`Tongue of the Walrus`);
      }
    },
  };
}

function fallbot(): GarboPostTask {
  return {
    name: "Autumn-Aton",
    completed: () => !AutumnAton.available(),
    ready: () =>
      globalOptions.ascend ||
      AutumnAton.turnsForQuest() < estimatedGarboTurns() + remainingUserTurns(),
    do: () => {
      AutumnAton.sendTo(bestAutumnatonLocation);
    },
    available: () => AutumnAton.have(),
  };
}

function refillCinch(): GarboPostTask {
  return {
    name: "Refill Cinch",
    ready: () => CinchoDeMayo.have() && totalFreeRests() > get("timesRested"),
    completed: () => get("_cinchUsed") < CinchoDeMayo.cinchRestoredBy(),
    do: () => {
      const missingCinch = () => {
        return 100 - CinchoDeMayo.currentCinch();
      };
      // Only rest if we'll get full value out of the cinch
      // If our current cinch is less than the total available, it means we have free rests left.
      while (
        missingCinch() >= CinchoDeMayo.cinchRestoredBy() &&
        CinchoDeMayo.currentCinch() < CinchoDeMayo.totalAvailableCinch()
      ) {
        if (!freeRest()) break;
      }
    },
    available: () =>
      CinchoDeMayo.have() && totalFreeRests() > get("timesRested"),
  };
}

let tokenBought = false;
function eightBitFatLoot(): GarboPostTask {
  return {
    name: "Check 8-Bit for Fat Loot",
    completed: () => tokenBought,
    ready: () =>
      canAdventure($location`The Spooky Forest`) && get("8BitScore") >= 20_000,
    do: () => {
      visitUrl("place.php?whichplace=8bit&action=8treasure");
      if (availableChoiceOptions()[2]) {
        runChoice(2);
      }
      tokenBought = true;
    },
    available: () => tokenBought,
  };
}

let funguyWorthIt = true;

function funGuySpores(): GarboPostTask {
  return {
    name: "Fun-Guy Spores",
    ready: () =>
      funguyWorthIt &&
      myLevel() >= 15 &&
      (!globalOptions.ascend || myAdventures() > 11) &&
      get("dinseyRollercoasterNext"),
    completed: () => have($effect`Mush-Mouth`),
    do: () => {
      // According to wiki, it has a 75% chance of being a stat mushroom and 25% chance of being another mushroom
      const value =
        0.75 *
          garboAverageValue(
            ...$items`Boletus Broletus mushroom, Omphalotus Omphaloskepsis mushroom, Gyromitra Dynomita mushroom`,
          ) +
        0.25 *
          garboAverageValue(
            ...$items`Helvella Haemophilia mushroom, Stemonitis Staticus mushroom, Tremella Tarantella mushroom`,
          );
      if (
        mallPrice($item`Fun-Guy spore`) < value &&
        acquire(1, $item`Fun-Guy spore`, value, false) > 0
      ) {
        use($item`Fun-Guy spore`);
      } else funguyWorthIt = false;
    },
    available: () => funguyWorthIt,
  };
}

function leafResin(): GarboPostTask {
  return {
    name: "Leaf Resin",
    available: BurningLeaves.have(),
    ready: () =>
      BurningLeaves.numberOfLeaves() > 75 &&
      (estimatedGarboTurns() > 100 || !globalOptions.ascend),
    completed: () => have($effect`Resined`),
    acquire: [{ item: $item`distilled resin` }],
    do: () => use($item`distilled resin`),
  };
}

function wardrobeOMatic(): GarboPostTask {
  return {
    name: "Wardrobe-o-Matic",
    available: have($item`wardrobe-o-matic`),
    ready: () => myLevel() >= 20,
    completed: () => have($item`futuristic shirt`),
    do: () => use($item`wardrobe-o-matic`),
  };
}

function handleDrenchedInLava(): GarboPostTask {
  return {
    name: "Drenched In Lava Removal",
    available: () =>
      haveInCampground($item`haunted doghouse`) &&
      !get("doghouseBoarded") &&
      realmAvailable("hot"),
    ready: () =>
      get("hallowienerVolcoino") ||
      $location`The Bubblin' Caldera`.turnsSpent >= 7 ||
      $location`The Bubblin' Caldera`.noncombatQueue.includes("Lava Dogs"),
    completed: () => !have($effect`Drenched in Lava`),
    do: () => {
      if (get("_hotTubSoaks") < 5) {
        cliExecute("hottub");
      } else {
        uneffect($effect`Drenched in Lava`);
      }
    },
  };
}

export function PostQuest(completed?: () => boolean): Quest<GarboTask> {
  return {
    name: "Postcombat",
    completed,
    tasks: [
      ...workshedTasks(),
      handleDrenchedInLava(),
      fallbot(),
      closetStuff(),
      floristFriars(),
      numberology(),
      juneCleaver(),
      fillPantsgivingFullness(),
      fillSweatyLiver(),
      funGuySpores(),
      eightBitFatLoot(),
      setFishyPrepPref(),
      refillCinch(),
      leafResin(),
      wardrobeOMatic(),
    ]
      .filter(({ available }) => undelay(available ?? true))
      .map((task) => ({ ...task, spendsTurn: false })),
  };
}
