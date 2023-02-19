import { Location, toItem } from "kolmafia";
import { get, have } from "libram";
import { acquire } from "../acquire";
import { DraggableFight, WandererTarget } from "./lib";

export function docBagFactory(
  _type: DraggableFight,
  locationSkiplist: Location[]
): WandererTarget[] {
  const location = get("doctorBagQuestLocation");
  if (location !== null) {
    if (locationSkiplist.includes(location)) {
      return [];
    }
    const questItem = toItem(get("doctorBagQuestItem"));
    return [
      new WandererTarget("DoctorBag", location, 1000, () => {
        if (!have(questItem)) {
          acquire(1, questItem, 50000);
        }
        return have(questItem);
      }),
    ];
  }
  return [];
}
