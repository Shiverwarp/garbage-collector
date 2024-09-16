import { OutfitSpec, Quest } from "grimoire-kolmafia";
import { GarboTask } from "./engine";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $stat,
  get,
  have,
  maxBy,
  set,
  uneffect,
} from "libram";
import {
  abort,
  adv1,
  cliExecute,
  mallPrice,
  myBuffedstat,
  runChoice,
  visitUrl,
} from "kolmafia";
import { garboValue } from "../garboValue";
import { freeFightFamiliar } from "../familiar";
import { freeFightOutfit } from "../outfit";
import { GarboStrategy, Macro } from "../combat";
import { acquire } from "../acquire";

const firstIslands = [
  $location`Battle Island`,
  $location`Crab Island`,
  $location`Glass Island`,
  $location`Dessert Island`,
  $location`Key Key`,
  $location`Skull Island`,
];

// Just checking for the gummi effects for now, maybe can check other stuff later?
function checkAndFixOvercapStats(): void {
  if (myBuffedstat($stat`Muscle`) >= 100) {
    if (have($effect`Gummiheart`)) uneffect($effect`Gummiheart`);
  }
  if (myBuffedstat($stat`Mysticality`) >= 100) {
    if (have($effect`Gummibrain`)) uneffect($effect`Gummibrain`);
  }
  if (myBuffedstat($stat`Moxie`) >= 100) {
    if (have($effect`Gummiskin`)) uneffect($effect`Gummiskin`);
  }
  if (
    myBuffedstat($stat`Moxie`) >= 100 ||
    myBuffedstat($stat`Mysticality`) >= 100 ||
    myBuffedstat($stat`Muscle`) >= 100
  ) {
    abort(
      "Buffed stats are too high for PirateRealm! Check for equipment or buffs that we can add to prevent in the script",
    );
  }
}

function crewRoleValue(crewmate: string): number {
  // Cuisinier is highest value if cocoa of youth is more meat than expected from giant crab
  if (
    garboValue($item`cocoa of youth`) > 2 * get("valueOfAdventure") &&
    crewmate.includes("Cuisinier")
  ) {
    return 50;
  }
  // Coxswain helps save turns if we run from storms
  if (crewmate.includes("Coxswain")) return 40;
  // Harquebusier gives us extra fun from combats
  if (crewmate.includes("Harquebusier")) return 30;
  // Crypto, Cuisinier (if cocoa not worth it), and Mixologist have small bonuses we care about less
  return 0;
}

function crewAdjectiveValue(crewmate: string): number {
  // Wide-Eyed give us bonus fun when counting birds in smooth sailing, and we'll mostly be doing that rather than spending limited grub/grog
  if (crewmate.includes("Wide-Eyed")) return 5;
  // Gluttonous can help when running out of grub, even though we usually shouldn't?
  if (crewmate.includes("Gluttonous")) return 4;
  // Beligerent, Dipsomaniacal, and Pinch-Fisted don't make much difference
  return 0;
}

function chooseCrew(): void {
  const bestChoice = maxBy([1, 2, 3], (choiceOption) => {
    const crewmatePref = `pirateRealmCrewmate${choiceOption}`;
    const crewmate = get(crewmatePref);
    const roleValue = crewRoleValue(crewmate);
    const adjectiveValue = crewAdjectiveValue(crewmate);
    return roleValue + adjectiveValue;
  });
  runChoice(bestChoice);
}

export const CockroachSetup: Quest<GarboTask> = {
  name: "Setup Cockroach Target in PirateRealm",
  completed: () =>
    get("_lastPirateRealmIsland", $location`none`) === $location`Trash Island`,
  tasks: [
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
      completed: () => !!get("_pirateRealmShip"),
      prepare: () => checkAndFixOvercapStats(),
      do: () => {
        visitUrl("place.php?whichplace=realm_pirate&action=pr_port");
        runChoice(1); // Head to Groggy's
        chooseCrew(); // Choose our crew
        runChoice(4); // Choose anemometer for trash island
        runChoice(4); // Choose swift clipper, fastest ship
        runChoice(1); // Head for the sea
      },
      outfit: { equip: $items`PirateRealm eyepatch` },
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Choose First Island",
      ready: () => !!get("_pirateRealmShip"),
      completed: () => !!get("_lastPirateRealmIsland"),
      prepare: () => checkAndFixOvercapStats(),
      do: () => adv1($location`Sailing the PirateRealm Seas`),
      outfit: { equip: $items`PirateRealm eyepatch` },
      choices: {
        1352:
          garboValue($item`cocoa of youth`) > 2 * get("valueOfAdventure") &&
          get("_pirateRealmCrewmate").includes("Cuisinier")
            ? 6
            : 1,
      },
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Sail to first Island",
      ready: () =>
        firstIslands.some(
          (island) => island === get("_lastPirateRealmIsland", $location`none`),
        ),
      completed: () =>
        get("_pirateRealmSailingTurns") >= get("_pirateRealmShipSpeed"),
      prepare: () => checkAndFixOvercapStats(),
      do: () => adv1($location`Sailing the PirateRealm Seas`),
      outfit: {
        equip: $items`PirateRealm eyepatch, PirateRealm party hat, Red Roger's red right foot`,
      },
      choices: {
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
      },
      limit: { tries: 8 },
      spendsTurn: true,
    },
    {
      name: "Land Ho (First Island)",
      ready: () =>
        firstIslands.some(
          (island) => island === get("_lastPirateRealmIsland", $location`none`),
        ) && get("_pirateRealmSailingTurns") >= get("_pirateRealmShipSpeed"),
      completed: () => get("_shivFirstIslandLandHoCompleted", false),
      prepare: () => checkAndFixOvercapStats(),
      do: () => {
        // Should give us the Land-Ho adventure
        if (visitUrl("adventure.php?snarfblat=530").includes("Land Ho!")) {
          runChoice(1);
          set("_shivFirstIslandLandHoCompleted", true);
        } else {
          abort("Expected Land Ho! but didn't get it!");
        }
      },
      outfit: {
        equip: $items`PirateRealm eyepatch`,
      },
      limit: { tries: 1 },
      spendsTurn: false,
    },
    {
      name: "Standard Island Combats (Island 1)",
      ready: () =>
        firstIslands.some(
          (island) => get("_lastPirateRealmIsland", $location`none`) === island,
        ),
      completed: () => get("_pirateRealmIslandMonstersDefeated") >= 4,
      prepare: () => {
        checkAndFixOvercapStats();
        if (
          mallPrice($item`windicle`) < 3 * get("valueOfAdventure") &&
          !get("_pirateRealmWindicleUsed")
        ) {
          acquire(1, $item`windicle`, 3 * get("valueOfAdventure"), true);
        }
      },
      do: () =>
        adv1(get("_lastPirateRealmIsland", $location`none`) ?? $location`none`),
      outfit: () =>
        freeFightOutfit({
          equip: $items`PirateRealm eyepatch, PirateRealm party hat, carnivorous potted plant, Red Roger's red left foot, Space Trip safety headphones`,
          familiar: freeFightFamiliar({
            canChooseMacro: false,
            location:
              get("_lastPirateRealmIsland", $location`none`) ?? $location`none`,
            allowAttackFamiliars: true,
            mode: "free",
          }),
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
      name: "Final Island Encounter (Island 1)", // Ideally we delay this to do it before our copy target fights for meat but here for now
      ready: () =>
        firstIslands.some(
          (island) => get("_lastPirateRealmIsland", $location`none`) === island,
        ) && get("_pirateRealmIslandMonstersDefeated") === 4,
      completed: () => get("_pirateRealmIslandMonstersDefeated") > 4, // This might not work for dessert island with current mafia
      prepare: () => {
        checkAndFixOvercapStats();
        if (
          get("_lastPirateRealmIsland", $location`none`) ===
          $location`Crab Island`
        ) {
          cliExecute("tcrsgain meat 5 eff"); // stopgap before we fix ordering and can properly do potions
        }
      },
      do: () =>
        adv1(get("_lastPirateRealmIsland", $location`none`) ?? $location`none`),
      outfit: () => {
        if (
          get("_lastPirateRealmIsland", $location`none`) ===
          $location`Crab Island`
        ) {
          if (get("_saberMod") === 0) {
            cliExecute("saber familiar"); // Again we haven't done first time setup yet with current order, so bandaid
          }
          const spec: OutfitSpec = {
            modifier: ["meat"],
            equip: $items`PirateRealm eyepatch`,
            avoid: $items`cursed pirate cutlass`, // Gives +25 muscle which often overcaps
            familiar: $familiar`Hobo Monkey`, // We haven't done familiar prep yet so robort isn't fed yet, something to fix later
          };
          return spec;
        }
        return { equip: $items`PirateRealm eyepatch` };
      },
      choices: { 1385: 1, 1368: 1 }, // Take cocoa of youth, fight crab
      combat: new GarboStrategy(() => Macro.meatKill()),
      limit: { tries: 1 },
      spendsTurn: true,
    },
    {
      name: "Choose Trash Island",
      ready: () =>
        firstIslands.some(
          (island) => get("_lastPirateRealmIsland", $location`none`) === island,
        ) && get("_pirateRealmIslandMonstersDefeated") > 4,
      completed: () =>
        get("_lastPirateRealmIsland", $location`none`) ===
        $location`Trash Island`,
      prepare: () => checkAndFixOvercapStats(),
      do: () => adv1($location`Sailing the PirateRealm Seas`),
      outfit: { equip: $items`PirateRealm eyepatch` },
      choices: { 1353: 5 }, // Trash Island
      limit: { tries: 1 },
      spendsTurn: false,
    },
  ],
};
