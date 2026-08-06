import { $monster, $skill, PeridotOfPeril } from "libram";
import {
  inebrietyLimit,
  isBanished,
  myAdventures,
  myInebriety,
} from "kolmafia";
import { $item, $items, $location } from "libram";
import { Quest } from "grimoire-kolmafia";

import { Macro } from "../../combat";
import { GarboStrategy } from "../../combatStrategy";
import { globalOptions } from "../../config";
import { barfOutfit } from "../../outfit";
import { estimatedGarboTurns } from "../../turns";
import { completeBarfQuest } from "../../resources";
import { trackMarginalMpa } from "../../session";
import { meatMood } from "../../mood";

import { GarboTask } from "../engine";
import { canContinue } from "./lib";

export const BarfTurnQuest: Quest<GarboTask> = {
  name: "Barf Turn",
  tasks: [
    {
      name: "Banish Cowboy Barf",
      completed: () => isBanished($monster`sea cowboy`),
      outfit: () =>
        PeridotOfPeril.canImperil($location`The Coral Corral`)
          ? barfOutfit({ equip: $items`spring shoes, Peridot of Peril` })
          : barfOutfit({ equip: $items`spring shoes` }),
      do: () => $location`The Coral Corral`,
      combat: new GarboStrategy(
        () =>
          Macro.if_(
            $monster`sea cowboy`,
            Macro.skill($skill`Spring Kick`).trySkill($skill`Spring Away`),
          ).basicCombat(),
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
      name: "Ranch",
      completed: () => myAdventures() === 0,
      outfit: () =>
        barfOutfit(
          myInebriety() > inebrietyLimit() && !globalOptions.overcapped
            ? { weapon: $item`June cleaver` }
            : {},
        ),
      do: $location`The Coral Corral`,
      combat: new GarboStrategy(
        () => Macro.meatKill(),
        () =>
          Macro.if_(
            `(monsterid ${globalOptions.target.id}) && !gotjump && !(pastround 2)`,
            Macro.meatKill(),
          ).abort(),
      ),
      prepare: () => meatMood("Barf").execute(estimatedGarboTurns()),
      post: () => {
        completeBarfQuest();
        trackMarginalMpa();
      },
      spendsTurn: true,
    },
  ],
  completed: () => !canContinue(),
};
