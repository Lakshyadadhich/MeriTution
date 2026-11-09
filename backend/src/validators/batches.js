import { z } from "zod";
import { gradeEnum, paginationQuery } from "./common.js";

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");

const baseBatch = {
  name: z.string().trim().min(2, "Batch name is required").max(80),
  grades: z.array(gradeEnum).max(12).optional(),
  startTime: timeString,
  endTime: timeString,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  isActive: z.boolean().optional(),
};

export const createBatchSchema = z.object(baseBatch);

export const updateBatchSchema = z.object(baseBatch).partial();

export const listBatchesQuery = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  ...paginationQuery,
});
