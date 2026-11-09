import Settings from "../models/Settings.js";
import { defaultAcademicYear } from "../utils/dates.js";

export async function getSettings() {
  const settings = await Settings.findOneAndUpdate(
    {},
    { $setOnInsert: { academicYear: defaultAcademicYear() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return settings;
}

export default getSettings;
