import { z } from "zod";
import { dateOnly, monthString, objectId } from "./common.js";

export const reportsQuery = z.object({
  feeMonth: monthString.optional(),
  month: monthString.optional(),
  batchId: objectId.optional(),
  studentId: objectId.optional(),
  grade: z.string().optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export const exportQuery = z.object({
  feeMonth: monthString.optional(),
  month: monthString.optional(),
  batchId: objectId.optional(),
  studentId: objectId.optional(),
  grade: z.string().optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
