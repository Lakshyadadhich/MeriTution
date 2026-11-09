import { z } from "zod";
import { GRADES } from "../models/Student.js";

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");

export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM");

export const gradeEnum = z.enum(GRADES);

export const paginationQuery = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
};

export const optionalText = z
  .union([z.string().trim().max(500), z.null()])
  .optional();

export const idParam = z.object({ id: objectId });
