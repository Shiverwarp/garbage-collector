import { Item, myFamiliar, myLevel, useFamiliar } from "kolmafia";
import {
  $effect,
  $item,
  CinchoDeMayo,
  clamp,
  flat,
  get,
  maxBy,
  MayamCalendar,
  Range,
  sum,
  Tuple,
} from "libram";
import { garboValue } from "../garboValue";
import { copyTargetCount } from "../embezzler";
import { Potion } from "../potions";
import getExperienceFamiliars from "../familiar/experienceFamiliars";
import { felizValue } from "../lib";
import { GarboTask } from "../tasks/engine";
// Stats assigned a value of 1, to discern from the Truly Useless
// MP restore assigned a value of 2, because it's better than stats!
const MAYAM_RING_VALUES = {
  yam1: () => garboValue($item`yam`),
  sword: () => 1,
  vessel: () => 2,
  eye: () =>
    new Potion($item.none, { effect: $effect`Big Eyes`, duration: 100 }).gross(
      copyTargetCount(),
    ),
  fur: () =>
    Math.max(
      0,
      ...getExperienceFamiliars("free").map(
        ({ expectedValue }) => expectedValue / 12,
      ),
    ) * 100,
  chair: () => (CinchoDeMayo.have() ? 3 * 5 * felizValue() : 0),
  yam2: () => garboValue($item`yam`),
  lightning: () => 1,
  bottle: () => 0,
  wood: () => 0,
  wall: () => 0,
  cheese: () => garboValue($item`goat cheese`),
  eyepatch: () => 1,
  meat: () => clamp(myLevel() * 100, 100, 1500),
  yam3: () => garboValue($item`yam`),
  yam4: () => garboValue($item`yam`),
  explosion: () => 0,
  clock: () => 5 * get("valueOfAdventure"),
};

function valueSymbol(symbol: MayamCalendar.MayamSymbol): number {
  return MAYAM_RING_VALUES[symbol]();
}

function valueResonance(combination: MayamCalendar.Combination): number {
  const result = MayamCalendar.getResonanceResult(...combination);
  if (!result) return 0;
  if (result instanceof Item) {
    if (result === $item`yamtility belt`) return 0; // yamtilityValue();
    return garboValue(result);
  }
  return new Potion($item.none, { effect: result, duration: 30 }).gross(
    copyTargetCount(),
  );
}

function valueCombination(combination: MayamCalendar.Combination): number {
  return sum(combination, valueSymbol) + valueResonance(combination);
}

function getAvailableResonances(
  forbiddenSymbols: MayamCalendar.MayamSymbol[],
): MayamCalendar.Combination[] {
  return MayamCalendar.RESONANCE_KEYS.map((combination) =>
    MayamCalendar.toCombination([combination]),
  ).filter(
    (combination) => !combination.some((sym) => forbiddenSymbols.includes(sym)),
  );
}

function getBestAvailableSymbolFromRing<R extends Range<0, 4>>(
  ring: R,
  forbiddenSymbols: MayamCalendar.MayamSymbol[],
): (typeof MayamCalendar.RINGS)[R][number] {
  return maxBy(
    MayamCalendar.RINGS[ring].filter((sym) => !forbiddenSymbols.includes(sym)),
    valueSymbol,
  );
}

function getBestGreedyCombination(
  forbiddenSymbols: MayamCalendar.MayamSymbol[],
): MayamCalendar.Combination {
  return [
    getBestAvailableSymbolFromRing(0, forbiddenSymbols),
    getBestAvailableSymbolFromRing(1, forbiddenSymbols),
    getBestAvailableSymbolFromRing(2, forbiddenSymbols),
    getBestAvailableSymbolFromRing(3, forbiddenSymbols),
  ];
}

function expandCombinationGroup<N extends number>(
  group: Tuple<MayamCalendar.Combination, N>,
): [...Tuple<MayamCalendar.Combination, N>, MayamCalendar.Combination][] {
  const forbiddenSymbols = [...flat(group), ...MayamCalendar.symbolsUsed()];
  return [
    ...getAvailableResonances(forbiddenSymbols).map(
      (resonance) =>
        [...group, resonance] as [
          ...Tuple<MayamCalendar.Combination, N>,
          MayamCalendar.Combination,
        ],
    ),
    [...group, getBestGreedyCombination(forbiddenSymbols)],
  ];
}

function getBestMayamCombinations(): MayamCalendar.Combination[] {
  const combinationGroups =
    // `reduce` misbehaves a lot when `any` shows its face
    (new Array(MayamCalendar.remainingUses()).fill(null) as null[]).reduce(
      (acc) => {
        const result = [] as MayamCalendar.Combination[][];
        for (const combinationGroup of acc) {
          result.push(...expandCombinationGroup(combinationGroup));
        }
        return result;
      },
      [[]] as MayamCalendar.Combination[][],
    );
  return maxBy(combinationGroups, (group) => sum(group, valueCombination));
}

export const mayamCalendarSummon: GarboTask = {
  name: "Mayam Summons",
  completed: () => MayamCalendar.remainingUses() === 0,
  ready: () => MayamCalendar.have(),
  do: () => {
    const startingFamiliar = myFamiliar();
    for (const combination of getBestMayamCombinations()) {
      if (combination.includes("fur")) {
        const bestFamiliar = maxBy(
          getExperienceFamiliars("free"),
          "expectedValue",
        ).familiar;
        useFamiliar(bestFamiliar);
      }
      MayamCalendar.submit(...combination);
    }
    useFamiliar(startingFamiliar);
  },
  spendsTurn: false,
};
