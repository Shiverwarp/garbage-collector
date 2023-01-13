import { maxBy } from "./lib";
import { garboAverageValue, garboValue } from "./session";
import { estimatedTurns } from "./turns";
import {
  appearanceRates,
  availableAmount,
  getLocationMonsters,
  itemDropsArray,
  Location,
  toMonster,
} from "kolmafia";
import { $items, AutumnAton, get, sum } from "libram";

export function averageAutumnatonValue(
  location: Location,
  acuityOverride?: number,
  slotOverride?: number
): number {
  const badAttributes = ["LUCKY", "ULTRARARE", "BOSS"];
  const rates = appearanceRates(location);
  const monsters = Object.keys(getLocationMonsters(location))
    .map((m) => toMonster(m))
    .filter((m) => !badAttributes.some((s) => m.attributes.includes(s)) && rates[m.name] > 0);

  if (monsters.length === 0) {
    return 0;
  } else {
    const maximumDrops = slotOverride ?? AutumnAton.zoneItems();
    const acuityCutoff = 20 - (acuityOverride ?? AutumnAton.visualAcuity()) * 5;
    const validDrops = monsters
      .map((m) => itemDropsArray(m))
      .flat()
      .map(({ rate, type, drop }) => ({
        value: !["c", "0"].includes(type) ? garboValue(drop, true) : 0,
        preAcuityExpectation: ["c", "0", ""].includes(type) ? (2 * rate) / 100 : 0,
        postAcuityExpectation:
          rate >= acuityCutoff && ["c", "0", ""].includes(type) ? (8 * rate) / 100 : 0,
      }));
    const overallExpectedDropQuantity = sum(
      validDrops,
      ({ preAcuityExpectation, postAcuityExpectation }) =>
        preAcuityExpectation + postAcuityExpectation
    );
    const expectedCollectionValue = sum(
      validDrops,
      ({ value, preAcuityExpectation, postAcuityExpectation }) => {
        // This gives us the adjusted amount to fit within our total amount of available drop slots
        const adjustedDropAmount =
          (preAcuityExpectation + postAcuityExpectation) *
          Math.min(1, maximumDrops / overallExpectedDropQuantity);
        return adjustedDropAmount * value;
      }
    );
    return seasonalItemValue(location) + expectedCollectionValue;
  }
}

function seasonalItemValue(location: Location, seasonalOverride?: number): number {
  // Find the value of the drops based on zone difficulty/type
  const autumnItems = $items`autumn leaf, AutumnFest ale, autumn breeze, autumn dollar, autumn years wisdom`;
  const avgValueOfRandomAutumnItem = garboAverageValue(...autumnItems);
  const autumnMeltables = $items`autumn debris shield, autumn leaf pendant, autumn sweater-weather sweater`;
  const autumnItem = AutumnAton.getUniques(location)?.item;
  const seasonalItemDrops = seasonalOverride ?? AutumnAton.seasonalItems();
  if (autumnItem) {
    return (
      (seasonalItemDrops > 1 ? avgValueOfRandomAutumnItem : 0) +
      (autumnMeltables.includes(autumnItem)
        ? // If we already have the meltable, then we get a random item, else value at 0
          availableAmount(autumnItem) > 0
          ? avgValueOfRandomAutumnItem
          : 0
        : garboValue(autumnItem, true))
    );
  } else {
    // If we're in a location without any uniques, we still get cowcatcher items
    return seasonalItemDrops > 1 ? avgValueOfRandomAutumnItem : 0;
  }
}

function expectedRemainingExpeditions(legOverride?: number): number {
  const availableAutumnatonTurns = estimatedTurns() - AutumnAton.turnsLeft();
  let expeditionTurnSum = 0;
  let quests = get("_autumnatonQuests", 0);
  while (expeditionTurnSum < availableAutumnatonTurns) {
    expeditionTurnSum +=
      11 *
      Math.max(
        1,
        quests -
          (legOverride ?? AutumnAton.currentUpgrades().filter((u) => u.includes("leg")).length)
      );
    quests++;
  }

  return quests - get("_autumnatonQuests", 0);
}

const profitRelevantUpgrades = [
  "leftarm1",
  "leftleg1",
  "rightarm1",
  "rightleg1",
  "cowcatcher",
  "periscope",
  "radardish",
] as const;

export function mostValuableUpgrade(fullLocations: Location[]): Location[] {
  // This function shouldn't be getting called if we don't have an expedition left
  if (expectedRemainingExpeditions() < 1) {
    return fullLocations;
  }
  const currentUpgrades = AutumnAton.currentUpgrades();
  const acquirableUpgrades = profitRelevantUpgrades.filter(
    (upgrade) => !currentUpgrades.includes(upgrade)
  );

  if (acquirableUpgrades.length === 0) {
    return fullLocations;
  }

  const currentBestLocation = maxBy(fullLocations, (loc: Location) => averageAutumnatonValue(loc));
  const currentExpectedProfit =
    averageAutumnatonValue(currentBestLocation) * expectedRemainingExpeditions();

  const upgradeValuations = acquirableUpgrades.map((upgrade) => {
    const upgradeLocations = fullLocations.filter(
      (location) => AutumnAton.getUniques(location)?.upgrade === upgrade
    );
    const bestLocContainingUpg = maxBy(upgradeLocations, (loc: Location) =>
      averageAutumnatonValue(loc)
    );

    if (upgrade === ("periscope" || "radardish")) {
      const bestLocWithInstalledUpg = maxBy(fullLocations, (loc: Location) =>
        averageAutumnatonValue(loc, AutumnAton.visualAcuity() + 1)
      );
      const extraExpectedProfit =
        averageAutumnatonValue(bestLocContainingUpg) +
        averageAutumnatonValue(bestLocWithInstalledUpg) *
          Math.max(0, expectedRemainingExpeditions() - 1);

      return { upgrade, profit: extraExpectedProfit };
    }
    if (upgrade === ("rightleg1" || "leftleg1")) {
      const bestLocWithInstalledUpg = currentBestLocation;
      const extraExpectedProfit =
        averageAutumnatonValue(bestLocContainingUpg) +
        averageAutumnatonValue(bestLocWithInstalledUpg) *
          Math.max(0, expectedRemainingExpeditions(AutumnAton.legs() + 1) - 1);

      return { upgrade, profit: extraExpectedProfit };
    }
    if (upgrade === ("rightarm1" || "leftarm1")) {
      const bestLocWithInstalledUpg = maxBy(fullLocations, (loc: Location) =>
        averageAutumnatonValue(loc, undefined, AutumnAton.zoneItems() + 1)
      );
      const extraExpectedProfit =
        averageAutumnatonValue(bestLocContainingUpg) +
        averageAutumnatonValue(bestLocWithInstalledUpg) *
          Math.max(0, expectedRemainingExpeditions() - 1);

      return { upgrade, profit: extraExpectedProfit };
    }
    if (upgrade === "cowcatcher") {
      const bestLocWithInstalledUpg = currentBestLocation;
      const extraExpectedProfit =
        averageAutumnatonValue(bestLocContainingUpg) +
        (seasonalItemValue(bestLocWithInstalledUpg) +
          averageAutumnatonValue(bestLocWithInstalledUpg)) *
          Math.max(0, expectedRemainingExpeditions() - 1);

      return { upgrade, profit: extraExpectedProfit };
    }
    return { upgrade, profit: 0 };
  });
  const mostValuableUpgrade = maxBy(upgradeValuations, "profit");
  const profitFromBestUpg = mostValuableUpgrade.profit;

  if (profitFromBestUpg > currentExpectedProfit) {
    const upgradeLocations = fullLocations.filter(
      (location) => AutumnAton.getUniques(location)?.upgrade === mostValuableUpgrade.upgrade
    );
    return upgradeLocations;
  } else {
    return fullLocations;
  }
}
