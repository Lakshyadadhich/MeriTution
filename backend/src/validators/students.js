import { z } from "zod";
import {
  dateOnly,
  gradeEnum,
  objectId,
  optionalText,
  paginationQuery,
} from "./common.js";

const personal = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  dob: z.union([dateOnly, z.null()]).optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  photoUrl: optionalText,
});

const parent = z.object({
  fatherName: optionalText,
  motherName: optionalText,
  primaryContact: z
    .string()
    .trim()
    .min(6, "Primary contact is required")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Contact may contain digits, +, - and spaces only"),
  alternateContact: z
    .union([
      z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+\-\s]*$/, "Contact may contain digits, +, - and spaces only"),
      z.null(),
    ])
    .optional(),
});

const academic = z.object({
  schoolName: optionalText,
  grade: gradeEnum,
  academicYear: z.string().trim().max(20).optional(),
  subjects: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
});

const tuition = z.object({
  batchId: z.union([objectId, z.null()]).optional(),
  monthlyFee: z.coerce
    .number()
    .int("Monthly fee must be a whole number of paise")
    .min(0, "Monthly fee cannot be negative"),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  joiningDate: dateOnly.optional(),
});

export const createStudentSchema = z.object({
  personalInfo: personal,
  parentInfo: parent,
  academicInfo: academic,
  tuitionInfo: tuition,
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateStudentSchema = z.object({
  personalInfo: personal.partial().optional(),
  parentInfo: parent.partial().optional(),
  academicInfo: academic.partial().optional(),
  tuitionInfo: tuition.partial().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const studentStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export const listStudentsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  grade: gradeEnum.optional(),
  school: z.string().trim().max(120).optional(),
  batchId: objectId.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  ...paginationQuery,
});
