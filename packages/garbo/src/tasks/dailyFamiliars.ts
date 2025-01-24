import {
  abort,
  autosellPrice,
  cliExecute,
  closetAmount,
  equip,
  familiarEquippedEquipment,
  hippyStoneBroken,
  itemAmount,
  myPrimestat,
  retrieveItem,
  retrievePrice,
  takeCloset,
  toItem,
  use,
  useFamiliar,
} from "kolmafia";
import {
  $familiar,
  $familiars,
  $item,
  $items,
  CrimboShrub,
  get,
  have,
  Robortender,
  withProperty,
} from "libram";
import { withStash } from "../clan";
import { globalOptions } from "../config";
import { copyTargetCount } from "../target";
import { meatFamiliar, setBestLeprechaunAsMeatFamiliar } from "../familiar";
import {
  baseMeat,
  felizValue,
  isFree,
  newarkValue,
  targetMeat,
  tryFeast,
  userConfirmDialog,
} from "../lib";
import { estimatedGarboTurns } from "../turns";
import { GarboTask } from "./engine";
import { Quest } from "grimoire-kolmafia";
import { acquire } from "../acquire";

function drivebyValue(): number {
  const targets = copyTargetCount();
  const cows = estimatedGarboTurns() - targets;
  const marginalRoboWeight = 50;
  const meatPercentDelta =
    Math.sqrt(220 * 2 * marginalRoboWeight) -
    Math.sqrt(220 * 2 * marginalRoboWeight) +
    2 * marginalRoboWeight;
  return (
    (meatPercentDelta / 100) * (targetMeat() * targets + baseMeat() * cows)
  );
}

function bloodyNoraValue(): number {
  const targets = copyTargetCount();
  const robortMultiplier = 2;
  const bloodyNoraWeight = 10;
  const cows = estimatedGarboTurns() - targets;
  // Assume base weight of 100 pounds. This is off but close enough.
  const assumedBaseWeight = 100;
  // Marginal value of 1 familiar weight in % meat drop.
  const marginalValue =
    2 * robortMultiplier +
    Math.sqrt(220 * robortMultiplier) / (2 * Math.sqrt(assumedBaseWeight));

  return bloodyNoraWeight * (marginalValue / 100) * baseMeat() * cows;
}

function entendreValue(): number {
  const cows = estimatedGarboTurns() - copyTargetCount();
  const marginalRoboWeight = 50;
  const itemPercent =
    Math.sqrt(55 * marginalRoboWeight) + marginalRoboWeight - 3;
  const leatherDropRate = 0.2;
  const cowbellDropRate = 0.1;
  // Only value at autosell
  return (
    (itemPercent / 100) *
    (leatherDropRate * cows * autosellPrice($item`sea leather`) +
      cowbellDropRate * cows * autosellPrice($item`sea cowbell`))
  );
}

function worthFeedingRobortender(): boolean {
  if (!globalOptions.nobarf) return true;
  if (isFree(globalOptions.target)) return false;
  return (
    (globalOptions.target.maxMeat + globalOptions.target.minMeat) / 2 >= 300
  );
}

export function prepRobortender(): void {
  if (!have($familiar`Robortender`)) return;
  const roboDrinks = {
    "Drive-by shooting": { priceCap: drivebyValue(), mandatory: true },
    Newark: {
      priceCap: newarkValue() * 0.25 * estimatedGarboTurns(),
      mandatory: false,
    },
    "Feliz Navidad": {
      priceCap: felizValue() * 0.25 * estimatedGarboTurns(),
      mandatory: false,
    },
    "Bloody Nora": {
      priceCap: bloodyNoraValue(),
      mandatory: false,
    },
    "Single entendre": { priceCap: entendreValue(), mandatory: false },
  };
  for (const [drinkName, { priceCap, mandatory }] of Object.entries(
    roboDrinks,
  )) {
    if (get("_roboDrinks").toLowerCase().includes(drinkName.toLowerCase())) {
      continue;
    }
    useFamiliar($familiar`Robortender`);
    const drink = toItem(drinkName);
    if (retrievePrice(drink) > priceCap) {
      if (mandatory) {
        setBestLeprechaunAsMeatFamiliar();
        if (
          !userConfirmDialog(
            `Garbo cannot find a reasonably priced drive-by-shooting (price cap: ${priceCap}), and will not be using your robortender. Is that cool with you?`,
            true,
          )
        ) {
          abort(
            "Alright, then, I guess you should try to find a reasonbly priced drive-by-shooting. Or do different things with your day.",
          );
        }
        break;
      }
      continue;
    }
    withProperty("autoBuyPriceLimit", priceCap, () => retrieveItem(1, drink));
    if (have(drink)) Robortender.feed(drink);
  }
}

const DailyFamiliarTasks: GarboTask[] = [
  {
    name: "Prepare Shorter-Order Cook",
    ready: () => have($familiar`Shorter-Order Cook`) && have($item`blue plate`),
    completed: () =>
      familiarEquippedEquipment($familiar`Shorter-Order Cook`) ===
      $item`blue plate`,
    do: () => {
      if (
        itemAmount($item`blue plate`) < 1 &&
        closetAmount($item`blue plate`) > 0
      ) {
        takeCloset($item`blue plate`);
      }
      equip($familiar`Shorter-Order Cook`, $item`blue plate`);
    },
    spendsTurn: false,
  },
  {
    name: "Prepare Robortender",
    ready: () => have($familiar`Robortender`) && worthFeedingRobortender(),
    completed: () =>
      get("_roboDrinks").toLowerCase().includes("drive-by shooting"),
    do: prepRobortender,
    spendsTurn: false,
  },
  {
    name: "Acquire box of Familiar Jacks",
    ready: () => have($familiar`Cornbeefadon`),
    completed: () =>
      have($item`box of Familiar Jacks`) || have($item`amulet coin`),
    do: () =>
      // TODO: acquire max price calculation
      acquire(1, $item`box of Familiar Jacks`, get("autoBuyPriceLimit")),
    spendsTurn: false,
  },
  {
    name: "Acquire amulet coin",
    ready: () =>
      have($familiar`Cornbeefadon`) && have($item`box of Familiar Jacks`),
    completed: () => have($item`amulet coin`),
    do: (): void => {
      use($item`box of Familiar Jacks`);
    },
    outfit: { familiar: $familiar`Cornbeefadon` },
    spendsTurn: false,
  },
  {
    name: "Acquire box of old Crimbo decorations",
    ready: () => have($familiar`Crimbo Shrub`),
    completed: () => have($item`box of old Crimbo decorations`),
    do: (): void => {
      useFamiliar($familiar`Crimbo Shrub`);
    },
    outfit: { familiar: $familiar`Crimbo Shrub` },
    spendsTurn: false,
  },
  {
    name: "Decorate Crimbo Shrub",
    ready: () => have($item`box of old Crimbo decorations`),
    completed: () => get("_shrubDecorated"),
    do: () =>
      CrimboShrub.decorate(
        myPrimestat().toString(),
        "Stench Damage",
        hippyStoneBroken() ? "PvP Fights" : "HP Regen",
        "Red Ray",
      ),
    outfit: { familiar: $familiar`Crimbo Shrub` },
    spendsTurn: false,
  },
  {
    name: "Mummery Meat",
    ready: () => have($item`mumming trunk`),
    completed: () => get("_mummeryMods").includes("Meat Drop"),
    do: () => cliExecute("mummery meat"),
    outfit: { familiar: meatFamiliar() },
    spendsTurn: false,
  },
  {
    name: "Mummery Item",
    ready: () =>
      have($item`mumming trunk`) && have($familiar`Trick-or-Treating Tot`),
    completed: () => get("_mummeryMods").includes("Item Drop"),
    do: () => cliExecute("mummery item"),
    outfit: { familiar: $familiar`Trick-or-Treating Tot` },
    spendsTurn: false,
  },
  {
    name: "Moveable feast",
    ready: () =>
      have($item`moveable feast`) || globalOptions.prefs.stashClan !== "none",
    completed: () => get("_feastUsed") > 0,
    do: (): void => {
      withStash($items`moveable feast`, () => {
        if (have($item`moveable feast`)) {
          [
            ...$familiars`Pocket Professor, Frumious Bandersnatch, Pair of Stomping Boots`,
            meatFamiliar(),
          ].forEach(tryFeast);
        }
      });
    },
    spendsTurn: false,
  },
];

export const DailyFamiliarsQuest: Quest<GarboTask> = {
  name: "Daily Familiars",
  tasks: DailyFamiliarTasks,
};
