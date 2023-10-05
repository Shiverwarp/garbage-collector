import {
  abort,
  cliExecute,
  equip,
  familiarEquippedEquipment,
  hippyStoneBroken,
  itemAmount,
  myPrimestat,
  retrieveItem,
  retrievePrice,
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
import { embezzlerCount, gregLikeFightCount } from "../embezzler";
import { meatFamiliar, setBestLeprechaunAsMeatFamiliar } from "../familiar";
import {
  baseMeat,
  felizValue,
  garbageTouristRatio,
  newarkValue,
  tryFeast,
  turnsToNC,
  userConfirmDialog,
} from "../lib";
import { estimatedGarboTurns } from "../turns";
import { GarboTask } from "./engine";
import { Quest } from "grimoire-kolmafia";

function drivebyValue(): number {
  const embezzlers = embezzlerCount();
  const cows = estimatedGarboTurns() - embezzlers;
  const marginalRoboWeight = 50;
  const meatPercentDelta =
    Math.sqrt(220 * 2 * marginalRoboWeight) -
    Math.sqrt(220 * 2 * marginalRoboWeight) +
    2 * marginalRoboWeight;
  return (meatPercentDelta / 100) * ((700 + baseMeat) * embezzlers + baseMeat * cows);
}

function bloodyNoraValue(): number {
  const embezzlers = embezzlerCount();
  const robortMultiplier = 2;
  const bloodyNoraWeight = 10;
  const cows = estimatedGarboTurns() - embezzlers;
  // Assume base weight of 100 pounds. This is off but close enough.
  const assumedBaseWeight = 100;
  // Marginal value of 1 familiar weight in % meat drop.
  const marginalValue =
    2 * robortMultiplier + Math.sqrt(220 * robortMultiplier) / (2 * Math.sqrt(assumedBaseWeight));
  // We fight embezzlers underwater while doing gregs
  return (
    bloodyNoraWeight * (marginalValue / 100) * baseMeat * cows +
    bloodyNoraWeight * (marginalValue / 100) * (baseMeat + 700) * gregLikeFightCount()
  );
}

function entendreValue(): number {
  const cows = estimatedGarboTurns() - embezzlers;
  const marginalRoboWeight = 50;
  const itemPercent = Math.sqrt(55 * marginalRoboWeight) + marginalRoboWeight - 3;
  const leatherDropRate = 0.2;
  const cowbellDropRate = 0.1;
  return (
    (itemPercent / 100) *
    (leatherDropRate * cows * garboValue($item`sea leather`) +
      cowbellDropRate * cows * garboValue($item`sea cowbell`))
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
    "Feliz Navidad": { priceCap: felizValue() * 0.25 * estimatedGarboTurns(), mandatory: false },
    "Bloody Nora": {
      priceCap: bloodyNoraValue(),
      mandatory: false,
    },
    "Single entendre": { priceCap: entendreValue(), mandatory: false },
  };
  for (const [drinkName, { priceCap, mandatory }] of Object.entries(roboDrinks)) {
    if (get("_roboDrinks").toLowerCase().includes(drinkName.toLowerCase())) continue;
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
    completed: () => familiarEquippedEquipment($familiar`Shorter-Order Cook`) === $item`blue plate`,
    do: () => equip($familiar`Shorter-Order Cook`, $item`blue plate`),
  },
  {
    name: "Prepare Robortender",
    ready: () => have($familiar`Robortender`),
    completed: () => get("_roboDrinks").toLowerCase().includes("drive-by shooting"),
    do: prepRobortender,
  },
  {
    name: "Acquire amulet coin",
    ready: () => have($familiar`Cornbeefadon`),
    completed: () => have($item`amulet coin`),
    do: () => use($item`box of Familiar Jacks`),
    acquire: [{ item: $item`box of Familiar Jacks` }],
    outfit: { familiar: $familiar`Cornbeefadon` },
  },
  {
    // TODO: Consider other familiars?
    name: "Equip tiny stillsuit",
    ready: () => itemAmount($item`tiny stillsuit`) > 0 && have($familiar`Cornbeefadon`),
    completed: () => familiarEquippedEquipment($familiar`Cornbeefadon`) === $item`tiny stillsuit`,
    do: () => equip($familiar`Cornbeefadon`, $item`tiny stillsuit`),
  },
  {
    name: "Acquire box of old Crimbo decorations",
    ready: () => have($familiar`Crimbo Shrub`),
    completed: () => have($item`box of old Crimbo decorations`),
    do: (): void => {
      useFamiliar($familiar`Crimbo Shrub`);
    },
    outfit: { familiar: $familiar`Crimbo Shrub` },
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
  },
  {
    name: "Mummery Meat",
    ready: () => have($item`mumming trunk`),
    completed: () => get("_mummeryMods").includes("Meat Drop"),
    do: () => cliExecute("mummery meat"),
    outfit: { familiar: meatFamiliar() },
  },
  {
    name: "Mummery Item",
    ready: () => have($item`mumming trunk`) && have($familiar`Trick-or-Treating Tot`),
    completed: () => get("_mummeryMods").includes("Item Drop"),
    do: () => cliExecute("mummery item"),
    outfit: { familiar: $familiar`Trick-or-Treating Tot` },
  },
  {
    name: "Moveable feast",
    ready: () => have($item`moveable feast`) || globalOptions.prefs.stashClan !== "none",
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
  },
];

export const DailyFamiliarsQuest: Quest<GarboTask> = {
  name: "Daily Familiars",
  tasks: DailyFamiliarTasks,
};
