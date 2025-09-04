import { abort, useSkill } from "kolmafia";
import { $location, $skill, get, withChoice } from "libram";

export function waveDireWarren() {
  if (
    get("_seadentWaveUsed") === "false" && // TODO fix this get when libram/eslint updates
    get("lastAdventure") === $location`The Dire Warren`
  ) {
    withChoice(1566, 1, () => {
      useSkill($skill`Sea *dent: Summon a Wave`);
    });
    // TODO fix this get when libram/eslint updates
    if (get("_seadentWaveZone") !== "The Dire Warren") {
      abort("Something went wrong while waving Dire Warren");
    }
  }
}
