import { z } from "zod";
import { dateOnly, monthString, objectId, optionalText, paginationQuery } from "./common.js";

const status = z.enum(["present", "absent", "leave"]);

export const bulkAttendanceSchema = z.object({
  batchId: objectId,
  attendanceDate: dateOnly,
  records: z
    .array(
      z.object({
        studentId: objectId,
        status,
        remarks: optionalText,
      })
    )
    .min(1, "At least one student is required")
    .max(200),
});

export const updateAttendanceSchema = z.object({
  status: status.optional(),
  remarks: optionalText,
});

export const listAttendanceQuery = z.object({
  batchId: objectId.optional(),
  studentId: objectId.optional(),
  attendanceDate: dateOnly.optional(),
  month: monthString.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  ...paginationQuery,
});
