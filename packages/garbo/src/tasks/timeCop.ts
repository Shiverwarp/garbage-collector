import { Quest } from "grimoire-kolmafia";
import { GarboTask } from "./engine";
import { sober } from "../lib";
import { GarboFreeFightTask } from "./freeFight";
import { $familiar, $item, $items, $skill, clamp, get } from "libram";
import { GarboStrategy } from "../combatStrategy";
import { freeFightOutfit } from "../outfit";
import { Macro } from "../combat";
import { garboValue } from "../garboValue";
import { handlingChoice, runChoice, runCombat, visitUrl } from "kolmafia";
import { freeFightFamiliar } from "../familiar";

const TimeCopTasks: GarboFreeFightTask[] = [
  {
    name: "Fight Time Cop",
    completed: () => get("_timeCopsFoughtToday", 11) >= 11,
    combat: new GarboStrategy(() =>
      Macro.trySkill($skill`Emit Matter Duplicating Drones`).basicCombat(),
    ),
    do: () => {
      do {
        if (handlingChoice()) runChoice(6);
        visitUrl("clan_dreadsylvania.php?action=forceloc&loc=4");
        if (!handlingChoice()) break;
        runChoice(6);
        visitUrl("clan_dreadsylvania.php?action=forceloc&loc=4");
      } while (handlingChoice());
      return runCombat();
    },
    outfit: () =>
      freeFightOutfit({
        // eslint-disable-next-line libram/verify-constants
        modifier: `${(garboValue($item`time cop top hat`) / 100 / 100).toFixed(2)} Item Drop 10000 max`,
        // eslint-disable-next-line libram/verify-constants
        equip: $items`Möbius ring`,
        familiar:
          get("gooseDronesRemaining") < 1
            ? $familiar`Grey Goose`
            : freeFightFamiliar(),
      }),
    combatCount: () => clamp(11 - get("_timeCopsFoughtToday", 11), 0, 11),
    spendsTurn: false,
    tentacle: true,
  },
];

export const FreeTimeCopQuest: Quest<GarboTask> = {
  name: "Free Time Cop",
  tasks: TimeCopTasks,
  ready: () => sober(),
};
