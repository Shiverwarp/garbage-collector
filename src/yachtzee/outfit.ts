import { equippedItem, mallPrice, myFamiliar, use, useFamiliar } from "kolmafia";
import {
  $effect,
  $item,
  $items,
  $slots,
  findLeprechaunMultiplier,
  get,
  have,
  Requirement,
} from "libram";
import { acquire } from "../acquire";
import { withStash } from "../clan";
import { meatFamiliar } from "../familiar";
import { baseMeat } from "../lib";
import { useUPCs } from "../outfit";
import { bestYachtzeeFamiliar } from "./familiar";
import { expectedEmbezzlers } from "./lib";

export const maximizeMeat = (): boolean =>
  new Requirement(
    [
      "meat",
      ...(myFamiliar().underwater ||
      have($effect`Driving Waterproofly`) ||
      have($effect`Wet Willied`)
        ? []
        : ["underwater familiar"]),
    ],
    {
      preventEquip: $items`anemoney clip, cursed magnifying glass, Kramco Sausage-o-Matic™, cheap sunglasses`,
    },
  ).maximize();

export function prepareOutfitAndFamiliar(): void {
  useFamiliar(bestYachtzeeFamiliar());
  if (
    !get("_feastedFamiliars").includes(myFamiliar().toString()) &&
    get("_feastedFamiliars").split(";").length < 5
  ) {
    withStash($items`moveable feast`, () => use($item`moveable feast`));
  }
  maximizeMeat();
}

export function stickerSetup(expectedYachts: number): void {
  const currentStickers = $slots`sticker1, sticker2, sticker3`.map((s) => equippedItem(s));
  const UPC = $item`scratch 'n' sniff UPC sticker`;
  if (currentStickers.every((sticker) => sticker === UPC)) return;
  const yachtOpportunityCost = 25 * findLeprechaunMultiplier(bestYachtzeeFamiliar());
  const embezzlerOpportunityCost = 25 * findLeprechaunMultiplier(meatFamiliar());
  const addedValueOfFullSword =
    ((75 - yachtOpportunityCost) * expectedYachts * 2000) / 100 +
    ((75 - embezzlerOpportunityCost) * Math.min(20, expectedEmbezzlers) * (700 + baseMeat)) / 100;
  if (mallPrice(UPC) < addedValueOfFullSword / 3) {
    const needed = 3 - currentStickers.filter((sticker) => sticker === UPC).length;
    if (needed) acquire(needed, UPC, addedValueOfFullSword / 3, false);
    useUPCs();
  }
}
