import { Location } from "kolmafia";
import {
  DraggableFight,
  WandererFactoryOptions,
  WandererTarget,
  wandererTurnsAvailableToday,
} from "./lib";
import { $effect, $item, $location, get, have } from "libram";

type PearlTarget = {
  location: Location;
  completionPref: string;
  progressPref: string;
  estimatedProgress: number;
};
const PearlTargets: PearlTarget[] = [
  // estimating progress at some lower rates, 3.4 is with just passives
  {
    location: $location`The Briniest Deepests`,
    completionPref: "_unblemishedPearlTheBriniestDeepests",
    progressPref: "_unblemishedPearlTheBriniestDeepestsProgress",
    estimatedProgress: 5,
  },
  {
    location: $location`Madness Reef`,
    completionPref: "_unblemishedPearlMadnessReef",
    progressPref: "_unblemishedPearlMadnessReefProgress",
    estimatedProgress: 5,
  },
];

function turnsRemainingToComplete(
  progressPref: string,
  estimatedProgress: number,
) {
  const progressRemaining = 100 - get(progressPref, 0);
  return Math.ceil(progressRemaining / estimatedProgress);
}

export function pearlFactory(
  type: DraggableFight,
  _locationSkiplist: Location[],
  options: WandererFactoryOptions,
): WandererTarget[] {
  if (have($effect`Fishy`) && type !== "freerun") {
    return PearlTargets.filter(
      (t) =>
        !get(t.completionPref) &&
        wandererTurnsAvailableToday(options, t.location, true) >=
          turnsRemainingToComplete(t.progressPref, t.estimatedProgress),
    ).map(
      (t) =>
        new WandererTarget(
          `${t.location} Pearl`,
          t.location,
          options.itemValue($item`unblemished pearl`) *
            (t.estimatedProgress / 100),
        ),
    );
  }
  return [];
}
