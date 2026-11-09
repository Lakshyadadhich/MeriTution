import Settings from "../models/Settings.js";
import { defaultAcademicYear } from "../utils/dates.js";

const DEFAULT_TUITION_NAME = "Sharma Tuition Classes";
const LEGACY_DEFAULT_TUITION_NAME = "My Tuition Classes";

export async function getSettings() {
  const settings = await Settings.findOneAndUpdate(
    {},
    {
      $setOnInsert: {
        academicYear: defaultAcademicYear(),
        tuitionName: DEFAULT_TUITION_NAME,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  if (settings.tuitionName === LEGACY_DEFAULT_TUITION_NAME) {
    settings.tuitionName = DEFAULT_TUITION_NAME;
    await settings.save();
  }
  return settings;
}

export default getSettings;
