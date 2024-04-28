import { Location } from "kolmafia";
import { $location, clamp, get, realmAvailable } from "libram";
import { DraggableFight, WandererFactoryOptions, WandererTarget } from "./lib";

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
    // If we aren't ascending, the fewer turns we have left the less likely we are to reach another Yachtzee.
    // Reduce the expected value the lower our turns get (This is just a shitty equation I came up with randomly)
    const percentageReduction = clamp(
      options.ascend
        ? (190 * clamp(options.estimatedTurns(), 50, 200)) /
            (get("encountersUntilYachtzeeChoice") * 2000)
        : 1,
      0.25,
      1,
    );
    return [
      new WandererTarget(
        "Yachtzee Countdown",
        $location`The Sunken Party Yacht`,
        ((20000 - get("valueOfAdventure")) / 19) * percentageReduction,
      ),
    ];
  }
  return [];
}
