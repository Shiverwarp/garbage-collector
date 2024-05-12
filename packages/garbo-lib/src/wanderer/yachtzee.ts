import { Location } from "kolmafia";
import { $location, get, realmAvailable } from "libram";
import {
  DraggableFight,
  WandererFactoryOptions,
  WandererTarget,
  wandererTurnsAvailableToday,
} from "./lib";

export function yachtzeeFactory(
  type: DraggableFight,
  locationSkiplist: Location[],
  options: WandererFactoryOptions,
): WandererTarget[] {
  if (
    realmAvailable("sleaze") &&
    get("encountersUntilYachtzeeChoice") !== 0 &&
    ["backup", "wanderer", "yellow ray", "freefight", "freerun"].includes(
      type,
    ) &&
    !locationSkiplist.includes($location`The Sunken Party Yacht`)
  ) {
    const canFinishDelay =
      wandererTurnsAvailableToday(
        options,
        $location`The Sunken Party Yacht`,
        false,
      ) > get("encountersUntilYachtzeeChoice");
    return [
      new WandererTarget(
        "Yachtzee Countdown",
        $location`The Sunken Party Yacht`,
        options.ascend && !canFinishDelay // If we're ascending and don't have wanderer turns to finish delay, just use fallback value
          ? 20
          : (20000 - get("valueOfAdventure")) / 19,
      ),
    ];
  }
  return [];
}
