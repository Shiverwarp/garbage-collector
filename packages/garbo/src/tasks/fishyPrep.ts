import {
  availableAmount,
  canAdventure,
  eat,
  haveEffect,
  isBanished,
  Location,
  mallPrice,
  maximize,
  myAdventures,
  myLevel,
  runChoice,
  totalTurnsPlayed,
  toUrl,
  use,
  visitUrl,
} from "kolmafia";
import {
  $effect,
  $item,
  $items,
  $location,
  $monster,
  $skill,
  clamp,
  Counter,
  Delayed,
  ensureEffect,
  get,
  have,
  PeridotOfPeril,
  questStep,
  SourceTerminal,
  undelay,
} from "libram";
import { OutfitSpec, Quest } from "grimoire-kolmafia";
import { WanderDetails } from "garbo-lib";

import { globalOptions } from "../config";
import { wanderer } from "../garboWanderer";
import {
  howManySausagesCouldIEat,
  kramcoGuaranteed,
  MEAT_TARGET_MULTIPLIER,
  romanticMonsterImpossible,
  setChoice,
  sober,
} from "../lib";
import { barfOutfit, freeFightOutfit, meatTargetOutfit } from "../outfit";
import { digitizedMonstersRemaining, highMeatMonsterCount } from "../turns";
import { computeDiet, countCopies } from "../diet";

import { GarboTask } from "./engine";
import { shouldFillLatte, tryFillLatte } from "../resources";
import { GarboStrategy } from "../combatStrategy";
import { Macro } from "../combat";

const steveAdventures: Map<Location, number[]> = new Map([
  [$location`The Haunted Bedroom`, [1, 3, 1]],
  [$location`The Haunted Nursery`, [1, 2, 2, 1, 1]],
  [$location`The Haunted Conservatory`, [1, 2, 2]],
  [$location`The Haunted Billiards Room`, [1, 2, 2]],
  [$location`The Haunted Wine Cellar`, [1, 2, 2, 3]],
  [$location`The Haunted Boiler Room`, [1, 2, 2]],
  [$location`The Haunted Laboratory`, [1, 1, 3, 1, 1]],
]);

const digitizedEmbezzler = () =>
  SourceTerminal.have() &&
  SourceTerminal.getDigitizeMonster() === globalOptions.target;

const isGhost = () => get("_voteMonster") === $monster`angry ghost`;
const isMutant = () => get("_voteMonster") === $monster`terrible mutant`;
const isSteve = () =>
  get("nextSpookyravenStephenRoom") === $location`The Haunted Laboratory`;

function wanderTask(
  details: Delayed<WanderDetails>,
  spec: Delayed<OutfitSpec>,
  base: Omit<GarboTask, "outfit" | "do" | "choices" | "spendsTurn"> & {
    combat?: GarboStrategy;
  },
): GarboTask {
  return {
    do: () => wanderer().getTarget(undelay(details)),
    choices: () => wanderer().getChoices(undelay(details)),
    outfit: () =>
      freeFightOutfit(undelay(spec), { wanderOptions: undelay(details) }),
    spendsTurn: false,
    combat: new GarboStrategy(() => Macro.basicCombat()),
    ...base,
    location: () => wanderer().getTarget(undelay(details)).location,
  };
}

let requiredFishyTurns: number;
export function getRequiredFishyTurns(): number {
  const unrealizedMimicEggFights = 11 - get("_mimicEggsObtained");
  return (requiredFishyTurns ??=
    countCopies(computeDiet().diet()) +
    highMeatMonsterCount() +
    unrealizedMimicEggFights + // We gain extra embezzler fights post-free-fights from mimic experience
    15 + // Extra buffer for turns to complete pirate realm prep
    10); // Extra buffer of 10 turns just in case weirdness
}

function shouldGoUnderwater(): boolean {
  if (!sober()) return false;
  if (myLevel() < 11) return false;

  if (questStep("questS01OldGuy") === -1) {
    visitUrl("place.php?whichplace=sea_oldman&action=oldman_oldman");
  }

  if (
    have($item`envyfish egg`) ||
    (globalOptions.ascend && get("_envyfishEggUsed"))
  ) {
    return false;
  }
  if (!canAdventure($location`The Briny Deeps`)) return false;

  // TODO: if you didn't digitize an embezzler, this equation may not be right
  if (
    mallPrice($item`pulled green taffy`) <
    MEAT_TARGET_MULTIPLIER() * get("valueOfAdventure")
  ) {
    return false;
  }

  if (have($effect`Fishy`)) return true;
  if (have($item`fishy pipe`) && !get("_fishyPipeUsed")) {
    use($item`fishy pipe`);
    return have($effect`Fishy`);
  }
  return false;
}

const fishyPrepTasks: GarboTask[] = [
  {
    name: "Latte",
    completed: () => !shouldFillLatte(),
    do: () => tryFillLatte(),
    spendsTurn: false,
  },
  {
    name: "Lights Out",
    ready: () =>
      canAdventure(get("nextSpookyravenStephenRoom") ?? $location`none`) &&
      get("nextSpookyravenStephenRoom") !== get("ghostLocation") &&
      totalTurnsPlayed() % 37 === 0,
    completed: () => totalTurnsPlayed() === get("lastLightsOutTurn"),
    do: () => {
      const steveRoom = get("nextSpookyravenStephenRoom");
      if (steveRoom && canAdventure(steveRoom)) {
        const plan = steveAdventures.get(steveRoom);
        if (plan) {
          visitUrl(toUrl(steveRoom));
          for (const choiceValue of plan) {
            runChoice(choiceValue);
          }
        }
      }
    },
    outfit: () =>
      meatTargetOutfit(sober() ? {} : { offhand: $item`Drunkula's wineglass` }),
    spendsTurn: isSteve,
    combat: new GarboStrategy(() =>
      Macro.if_(
        $monster`Stephen Spookyraven`,
        Macro.basicCombat(),
      ).abortWithMsg("Expected to fight Stephen Spookyraven, but didn't!"),
    ),
  },
  {
    name: "Proton Ghost",
    ready: () =>
      have($item`protonic accelerator pack`) && !!get("ghostLocation"),
    completed: () => get("questPAGhost") === "unstarted",
    do: () => get("ghostLocation") as Location,
    outfit: () =>
      freeFightOutfit({
        modifier:
          get("ghostLocation") === $location`The Icy Peak`
            ? ["Cold Resistance 5 min"]
            : [],
        back: $item`protonic accelerator pack`,
      }),
    combat: new GarboStrategy(() => Macro.ghostBustin()),
    spendsTurn: false,
    // Ghost fights are currently hard
    // and they resist physical attacks!
    sobriety: "sober",
  },
  wanderTask(
    () => ({ wanderer: "wanderer", drunkSafe: !isGhost() }),
    () => ({
      equip: [
        $item`"I Voted!" sticker`,
        ...(!sober() && !isGhost() ? $items`Drunkula's wineglass` : []),
        ...(!have($item`mutant crown`) && isMutant()
          ? $items`mutant arm, mutant legs`.filter((i) => have(i))
          : []),
      ],
    }),
    {
      name: "Vote Wanderer",
      ready: () =>
        have($item`"I Voted!" sticker`) &&
        totalTurnsPlayed() % 11 === 1 &&
        get("_voteFreeFights") < 3,
      completed: () => get("lastVoteMonsterTurn") >= totalTurnsPlayed(),
    },
  ),
  {
    name: "Sausage",
    ready: () => myAdventures() <= 1 + globalOptions.saveTurns,
    completed: () => howManySausagesCouldIEat() === 0,
    prepare: () => maximize("MP", false),
    do: () => eat(howManySausagesCouldIEat(), $item`magical sausage`),
    spendsTurn: false,
  },
  {
    name: "Digitize Wanderer",
    completed: () => Counter.get("Digitize Monster") > 0,
    acquire: () =>
      SourceTerminal.getDigitizeMonster() === globalOptions.target &&
      shouldGoUnderwater()
        ? [{ item: $item`pulled green taffy` }]
        : [],
    outfit: () =>
      digitizedEmbezzler()
        ? meatTargetOutfit(
            {},
            wanderer().getTarget({
              wanderer: "wanderer",
              allowEquipment: false,
            }).location,
          )
        : freeFightOutfit(),
    do: () =>
      shouldGoUnderwater()
        ? $location`The Briny Deeps`
        : wanderer().getTarget({ wanderer: "wanderer", allowEquipment: false }),
    choices: () =>
      shouldGoUnderwater()
        ? {}
        : wanderer().getChoices({
            wanderer: "wanderer",
            allowEquipment: false,
          }),
    combat: new GarboStrategy(
      () =>
        Macro.externalIf(
          shouldGoUnderwater(),
          Macro.item($item`pulled green taffy`),
        ).meatKill(),
      () =>
        Macro.if_(
          `(monsterid ${globalOptions.target.id}) && !gotjump && !(pastround 2)`,
          Macro.externalIf(
            shouldGoUnderwater(),
            Macro.item($item`pulled green taffy`),
          ).meatKill(),
        ).abortWithMsg(
          `Expected a digitized ${SourceTerminal.getDigitizeMonster()}, but encountered something else.`,
        ),
    ),
    spendsTurn: () =>
      !SourceTerminal.getDigitizeMonster()?.attributes.includes("FREE"),
  },
  wanderTask(
    "wanderer",
    {
      offhand: $item`Kramco Sausage-o-Matic™`,
    },
    {
      name: "Guaranteed Kramco",
      ready: () => romanticMonsterImpossible(),
      completed: () => !kramcoGuaranteed(),
    },
  ),
  wanderTask(
    "wanderer",
    {
      offhand: $item`cursed magnifying glass`,
    },
    {
      name: "Void Monster",
      ready: () =>
        have($item`cursed magnifying glass`) && get("_voidFreeFights") < 5,
      completed: () => get("cursedMagnifyingGlassCount") !== 13,
    },
  ),
  {
    name: "Map for Pills",
    ready: () =>
      globalOptions.ascend &&
      clamp(myAdventures() - digitizedMonstersRemaining(), 1, myAdventures()) <=
        availableAmount($item`Map to Safety Shelter Grimace Prime`),
    completed: () => false,
    do: () => {
      const choiceToSet =
        availableAmount($item`distention pill`) <
        availableAmount($item`synthetic dog hair pill`) +
          availableAmount($item`Map to Safety Shelter Grimace Prime`)
          ? 1
          : 2;
      setChoice(536, choiceToSet);
      ensureEffect($effect`Transpondent`);
      use($item`Map to Safety Shelter Grimace Prime`);
      return true;
    },
    spendsTurn: true,
    sobriety: "drunk",
  },
  {
    name: "Use Fishy Pipe",
    ready: () => have($item`fishy pipe`),
    completed: () => haveEffect($effect`Fishy`) > 1 || get("_fishyPipeUsed"),
    do: () => use(1, $item`fishy pipe`),
    spendsTurn: false,
  },
  {
    name: "Banish Cowboy",
    // We don't need to banish if we already have the required turns. We will banish during normal barf turns otherwise.
    completed: () =>
      isBanished($monster`sea cowboy`) ||
      haveEffect($effect`Fishy`) >= getRequiredFishyTurns(),
    outfit: () =>
      PeridotOfPeril.canImperil($location`The Coral Corral`)
        ? barfOutfit({ equip: $items`spring shoes, Peridot of Peril` })
        : barfOutfit({ equip: $items`spring shoes` }),
    do: () => $location`The Coral Corral`,
    combat: new GarboStrategy(
      () =>
        Macro.if_(
          $monster`sea cowboy`,
          Macro.skill($skill`Spring Kick`)
            .trySkill($skill`Spring Away`)
            .basicCombat(),
        )
          .if_(
            $monster`wild seahorse`,
            Macro.item($item`sea cowbell`)
              .item($item`sea cowbell`)
              .item($item`sea cowbell`)
              .item($item`sea lasso`)
              .abortWithMsg(
                "Wild seahorse should have been tamed, what happened?",
              ),
          )
          .meatKill(),
      () =>
        Macro.if_(
          `(monsterid ${globalOptions.target.id}) && !gotjump && !(pastround 2)`,
          Macro.meatKill(),
        ).abort(),
    ),
    spendsTurn: true,
    choices: PeridotOfPeril.getChoiceObject($monster`sea cowboy`),
  },
  {
    name: "Fishy Prep",
    completed: () => haveEffect($effect`Fishy`) >= getRequiredFishyTurns(),
    outfit: () => barfOutfit({}),
    do: () => $location`The Coral Corral`,
    combat: new GarboStrategy(
      () => Macro.meatKill(),
      () =>
        Macro.if_(
          `(monsterid ${globalOptions.target.id}) && !gotjump && !(pastround 2)`,
          Macro.meatKill(),
        ).abort(),
    ),
    spendsTurn: true,
  },
];

export const fishyPrepQuest: Quest<GarboTask> = {
  name: "Fishy Prep",
  tasks: fishyPrepTasks,
  completed: () =>
    globalOptions.nobarf ||
    haveEffect($effect`Fishy`) > 1000 ||
    (haveEffect($effect`Fishy`) >= getRequiredFishyTurns() &&
      isBanished($monster`sea cowboy`) &&
      get("_shivRanchoFishyPrepped", false)),
};
