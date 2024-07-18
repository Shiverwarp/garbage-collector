import { Outfit, OutfitSpec } from "grimoire-kolmafia";
import { toJson } from "kolmafia";
import {
  $effect,
  $familiar,
  $item,
  $items,
  $location,
  $monster,
  Guzzlr,
  have,
} from "libram";
import { freeFightFamiliar, meatFamiliar } from "../familiar";
import { chooseBjorn } from "./bjorn";
import { bonusGear } from "./dropsgear";
import {
  bestBjornalike,
  cleaverCheck,
  useUPCsIfNeeded,
  validateGarbageFoldable,
} from "./lib";
import { BonusEquipMode, modeValueOfMeat } from "../lib";
import { globalOptions } from "../config";

export function embezzlerOutfit(
  spec: OutfitSpec = {},
  target = $location.none,
): Outfit {
  cleaverCheck();
  validateGarbageFoldable(spec);
  const outfit = Outfit.from(
    spec,
    new Error(`Failed to construct outfit from spec ${toJson(spec)}`),
  );

  if (globalOptions.target === $monster`Knob Goblin Embezzler`) {
    outfit.modifier.push(
      `${modeValueOfMeat(BonusEquipMode.EMBEZZLER)} Meat Drop`,
      "-tie",
    );
  } else if (globalOptions.target.attributes.includes("FREE")) {
    outfit.modifier.push(`${modeValueOfMeat(BonusEquipMode.FREE)}`, "-tie");
  }
  outfit.avoid.push($item`cheap sunglasses`); // Even if we're adventuring in Barf Mountain itself, these are bad
  outfit.familiar ??=
    globalOptions.target === $monster`Knob Goblin Embezzler`
      ? meatFamiliar()
      : freeFightFamiliar();

  const bjornChoice = chooseBjorn(
    globalOptions.target === $monster`Knob Goblin Embezzler`
      ? BonusEquipMode.EMBEZZLER
      : BonusEquipMode.FREE,
    outfit.familiar,
  );

  if (outfit.familiar === $familiar`Jill-of-All-Trades`) {
    outfit.equip($item`LED candle`);
    outfit.setModes({ jillcandle: "ultraviolet" });
  }

  useUPCsIfNeeded(outfit);

  outfit.bonuses = bonusGear(
    globalOptions.target === $monster`Knob Goblin Embezzler`
      ? BonusEquipMode.EMBEZZLER
      : BonusEquipMode.FREE,
  );
  const bjornalike = bestBjornalike(outfit);

  if (
    target === Guzzlr.getLocation() &&
    Guzzlr.turnsLeftOnQuest(false) === 1 &&
    Guzzlr.haveBooze()
  ) {
    outfit.addBonus(
      $item`Guzzlr pants`,
      Guzzlr.expectedReward(true) - Guzzlr.expectedReward(false),
    );
  }

  if (bjornalike) {
    outfit.setBonus(bjornalike, bjornChoice.value);
    outfit.equip(bjornalike);
    const other = $items`Buddy Bjorn, Crown of Thrones`.filter(
      (i) => i !== bjornalike,
    )[0];
    outfit.avoid.push(other);
    switch (bjornalike) {
      case $item`Buddy Bjorn`:
        outfit.bjornify(bjornChoice.familiar);
        break;
      case $item`Crown of Thrones`:
        outfit.enthrone(bjornChoice.familiar);
        break;
    }
  }

  outfit.setModes({
    snowsuit: "nose",
    parka: "kachungasaur",
    edpiece: "fish",
  });

  if (!have($effect`Everything Looks Purple`)) {
    outfit.equip($item`Roman Candelabra`);
  }

  return outfit;
}
