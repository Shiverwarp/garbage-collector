import { $familiar, ChestMimic, get, SourceTerminal } from "libram";
import { globalOptions } from "../config";

export const mimicExperienceNeeded = (needKickstarterEgg: boolean) =>
  50 * (11 - get("_mimicEggsObtained")) +
  (globalOptions.ascend
    ? needKickstarterEgg &&
      !SourceTerminal.have() &&
      get("_mimicEggsObtained") < 11
      ? 50
      : 0
    : 250); // Max is 550, reduced to 250 because I have lots of fam exp granters and free fights

export function shouldChargeMimic(needKickstarterEgg: boolean): boolean {
  /* If we can't make any more eggs tomorrow, don't charge the mimic more */
  return (
    $familiar`Chest Mimic`.experience <
    mimicExperienceNeeded(needKickstarterEgg)
  );
}

export function shouldMakeEgg(barf: boolean): boolean {
  const experienceNeeded =
    50 * (11 - get("_mimicEggsObtained")) + (barf ? 50 : 0);
  return (
    $familiar`Chest Mimic`.experience >= experienceNeeded &&
    get("_mimicEggsObtained") < 11
  );
}

export const minimumMimicExperience = () =>
  50 + (ChestMimic.differentiableQuantity(globalOptions.target) ? 0 : 100);
