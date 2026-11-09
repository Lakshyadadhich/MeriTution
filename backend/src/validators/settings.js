import { z } from "zod";

export const settingsSchema = z.object({
  tuitionName: z.string().trim().min(1).max(120).optional(),
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Academic year must be YYYY-YY")
    .optional(),
  feeGenerationDay: z.coerce.number().int().min(1).max(28).optional(),
  defaultDueDay: z.coerce.number().int().min(1).max(31).optional(),
  timezone: z.literal("Asia/Kolkata").optional(),
  currency: z.literal("INR").optional(),
});
