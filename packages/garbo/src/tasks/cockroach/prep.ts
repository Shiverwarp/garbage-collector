import { Quest } from "grimoire-kolmafia";
import {
  abort,
  mallPrice,
  myAdventures,
  runChoice,
  Stat,
  visitUrl,
} from "kolmafia";
import {
  $item,
  $items,
  $location,
  $monster,
  get,
  have,
  questStep,
} from "libram";
import { acquire } from "../../acquire";
import { GarboStrategy, Macro } from "../../combat";
import { freeFightFamiliar } from "../../familiar";
import { freeFightOutfit } from "../../outfit";
import { GarboTask } from "../engine";
import {
  bestCrewmate,
  checkAndFixOvercapStats,
  dessertIslandWorthIt,
  outfitBonuses,
} from "./lib";
import { doingGregFight } from "../../resources";
import { userConfirmDialog } from "../../lib";
import { globalOptions } from "../../config";

export const CockroachSetup: Quest<GarboTask> = {
  name: "Setup Cockroach Target",
  ready: () =>
    get("pirateRealmUnlockedAnemometer") &&
    doingGregFight() &&
    globalOptions.target === $monster`cockroach`,
  completed: () =>
    get("_lastPirateRealmIsland") === $location`Trash Island` ||
    (questStep("_questPirateRealm") === 5 &&
      get("_lastPirateRealmIsland") === $location`Crab Island`),
  tasks: [
    {
      name: "40 Adventure Failsafe",
      ready: () => myAdventures() <= 40,
      completed: () => have($item`PirateRealm eyepatch`),
      do: () => {
        if (
          userConfirmDialog(
            "You don't have enough adventures to do piraterealm; would you like us to automatically change your copy target to a Knob Goblin Guard? Otherwise, we're going to abort.",
            true,
          )
        ) {
          globalOptions.target = $monster`Knob Goblin Elite Guard Captain`;
        } else {
          abort(
            "Unable to start piraterealm but you're hellbent on doing cockroaches!",
          );
        }
      },
      spendsTurn: false,
    },
    // Tasks to progress pirate realm up to selecting Trash Island go here
    // We'll have to be careful about things like max stats becoming too high (bofa is annoying for this!)
    // To be optimal we would progress up until we're about to fight the giant giant crab, and then after buffing and fighting it, we then select trash island.
    // We might need some restructuring to do this nicely?
    {
      name: "Get PirateRealm Eyepatch",
      completed: () => have($item`PirateRealm eyepatch`),
      do: () => visitUrl("place.php?whichplace=realm_pirate&action=pr_port"),
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Start PirateRealm Journey",
      ready: () => have($item`PirateRealm eyepatch`),
      completed: () => questStep("_questPirateRealm") > 0,
      prepare: checkAndFixOvercapStats,
      do: () => {
        visitUrl("place.php?whichplace=realm_pirate&action=pr_port");
        runChoice(1); // Head to Groggy's
        runChoice(bestCrewmate()); // Choose our crew
        runChoice(4); // Choose anemometer for trash island
        const bestBoat = get("pirateRealmUnlockedClipper") ? 4 : 3; // Swift Clipper or Speedy Caravel
        runChoice(bestBoat);
        runChoice(1); // Head for the sea
      },
      outfit: {
        equip: $items`PirateRealm eyepatch`,
        modifier: Stat.all().map((stat) => `-${stat}`),
      },
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Choose First Island",
      ready: () => questStep("_questPirateRealm") === 1,
      completed: () => questStep("_questPirateRealm") > 1,
      prepare: checkAndFixOvercapStats,
      do: $location`Sailing the PirateRealm Seas`,
      outfit: {
        equip: $items`PirateRealm eyepatch`,
        modifier: Stat.all().map((stat) => `-${stat}`),
      },
      choices: () => ({
        1352:
          dessertIslandWorthIt() &&
          get("_pirateRealmCrewmate").includes("Cuisinier")
            ? 6
            : 1,
      }),
      limit: { tries: 1 },
      spendsTurn: false,
      combat: new GarboStrategy(() =>
        Macro.abortWithMsg("Hit a combat while sailing the high seas!"),
      ),
    },
    {
      name: "Sail to first Island",
      ready: () => questStep("_questPirateRealm") === 2,
      completed: () => questStep("_questPirateRealm") > 2,
      prepare: checkAndFixOvercapStats,
      do: $location`Sailing the PirateRealm Seas`,
      outfit: {
        equip: $items`PirateRealm eyepatch, PirateRealm party hat, Red Roger's red right foot`,
        modifier: Stat.all().map((stat) => `-${stat}`),
      },
      choices: () => ({
        1365: 1,
        1364: 2,
        1361: 1,
        1357: get("_pirateRealmGold") >= 50 ? 3 : 4,
        1360: 6, // Will need to add shop handling, perhaps to choice adventure script
        1356: 3,
        1362:
          get("_pirateRealmShipSpeed") - get("_pirateRealmSailingTurns") >= 2
            ? 2
            : 1,
        1363: 2,
        1359: 1, // Emergency grog adventure, choice one seems more consistent?
        1358: 1, // Emergency grub adventure, choice one seems more consistent?
        1367: 1, // Wrecked ship, this uses glue, need a pref for glue to make this not break if we don't have glue
      }),
      limit: { tries: 8 },
      spendsTurn: true,
      combat: new GarboStrategy(() =>
        Macro.abortWithMsg("Hit a combat while sailing the high seas!"),
      ),
    },
    {
      name: "Land Ho (First Island)",
      ready: () => questStep("_questPirateRealm") === 3,
      completed: () => questStep("_questPirateRealm") > 3,
      prepare: checkAndFixOvercapStats,
      do: $location`Sailing the PirateRealm Seas`,
      combat: new GarboStrategy(() =>
        Macro.abortWithMsg("Expected Land Ho! but hit a combat"),
      ),
      choices: { 1355: 1 }, // Land ho!
      outfit: {
        equip: $items`PirateRealm eyepatch`,
        modifier: Stat.all().map((stat) => `-${stat}`),
      },
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Standard Island Combats (Island 1)",
      ready: () => questStep("_questPirateRealm") === 4,
      completed: () => questStep("_questPirateRealm") > 4,
      prepare: () => {
        checkAndFixOvercapStats();
        if (
          mallPrice($item`windicle`) < 3 * get("valueOfAdventure") &&
          !get("_pirateRealmWindicleUsed")
        ) {
          acquire(1, $item`windicle`, 3 * get("valueOfAdventure"), true);
        }
      },
      do: () => get("_lastPirateRealmIsland", $location`none`),
      outfit: () =>
        freeFightOutfit({
          equip: $items`PirateRealm eyepatch`,
          bonuses: outfitBonuses(),
          familiar: freeFightFamiliar({
            canChooseMacro: false,
            location: get("_lastPirateRealmIsland", $location`none`),
            allowAttackFamiliars: true,
            mode: "free",
          }),
          avoid: $items`Roman Candelabra`,
        }),
      combat: new GarboStrategy(() =>
        Macro.externalIf(
          mallPrice($item`windicle`) < 3 * get("valueOfAdventure") &&
            !get("_pirateRealmWindicleUsed") &&
            get("_pirateRealmIslandMonstersDefeated") <= 1,
          Macro.item($item`windicle`),
        ).basicCombat(),
      ),
      limit: { tries: 8 },
      spendsTurn: true,
    },
    {
      name: "Final Island Encounter (Island 1 (Dessert))",
      ready: () =>
        questStep("_questPirateRealm") === 5 &&
        get("_lastPirateRealmIsland") === $location`Dessert Island`,
      completed: () => questStep("_questPirateRealm") > 5,
      prepare: checkAndFixOvercapStats,
      do: () => $location`PirateRealm Island`,
      outfit: () => ({
        equip: $items`PirateRealm eyepatch`,
        modifier: Stat.all().map((stat) => `-${stat}`),
      }),
      choices: { 1385: 1 }, // Take cocoa of youth
      combat: new GarboStrategy(() =>
        Macro.abortWithMsg("Hit a combat when we expected cocoa of youth!"),
      ),
      limit: { tries: 1 },
      spendsTurn: true,
    },
    {
      name: "Choose Trash Island",
      ready: () => questStep("_questPirateRealm") === 6,
      completed: () => questStep("_questPirateRealm") > 6,
      prepare: checkAndFixOvercapStats,
      do: $location`Sailing the PirateRealm Seas`,
      outfit: { equip: $items`PirateRealm eyepatch` },
      choices: { 1353: 5 }, // Trash Island
      limit: { tries: 1 },
      spendsTurn: false,
      combat: new GarboStrategy(() =>
        Macro.abortWithMsg("Hit a combat while sailing the high seas!"),
      ),
    },
  ],
};
