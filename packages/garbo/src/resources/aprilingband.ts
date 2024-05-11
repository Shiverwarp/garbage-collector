import { $item, AprilingBandHelmet, clamp, get, have } from "libram";
import { globalOptions } from "../config";
import { garboValue } from "../garboValue";
import { getBestLuckyAdventure } from "../lib";
import getExperienceFamiliars from "../familiar/experienceFamiliars";
import { toItem } from "kolmafia";

const instruments: {
  instrument: AprilingBandHelmet.Instrument;
  value: () => number;
}[] = [
  {
    instrument: "Apriling band quad tom",
    value: () =>
      (globalOptions.prefs.valueOfFreeFight +
        0.02 * garboValue($item`spice melange`)) *
      3,
  },
  {
    instrument: "Apriling band saxophone",
    value: () => getBestLuckyAdventure().value() * 3,
  },
  {
    instrument: "Apriling band piccolo",
    value: () =>
      Math.max(
        0,
        ...getExperienceFamiliars("free").map(({ familiar, expectedValue }) => {
          const usesAllowed = clamp(
            Math.floor((400 - familiar.experience) / 40),
            0,
            3,
          );
          return (expectedValue / 12) * 40 * usesAllowed;
        }),
      ),
  },
];

export function getBestAprilInstruments(): AprilingBandHelmet.Instrument[] {
  const available = clamp(2 - get("_aprilBandInstruments"), 0, 2);

  return instruments
    .filter(({ instrument }) => !have(toItem(instrument)))
    .sort((a, b) => b.value() - a.value())
    .splice(0, available)
    .map(({ instrument }) => instrument);
}
