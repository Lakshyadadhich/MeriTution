import { asyncHandler } from "../utils/asyncHandler.js";
import { getSettings } from "../services/settingsService.js";

export const get = asyncHandler(async (_req, res) => {
  const settings = await getSettings();
  res.json({ settings });
});

export const update = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  for (const key of [
    "tuitionName",
    "academicYear",
    "feeGenerationDay",
    "defaultDueDay",
    "timezone",
    "currency",
  ]) {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  }
  await settings.save();
  res.json({ settings });
});
