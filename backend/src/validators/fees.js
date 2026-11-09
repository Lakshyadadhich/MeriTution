import { z } from "zod";
import {
  dateOnly,
  gradeEnum,
  monthString,
  objectId,
  optionalText,
  paginationQuery,
} from "./common.js";

export const generateFeesSchema = z.object({
  feeMonth: monthString.optional(),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  studentIds: z.array(objectId).max(500).optional(),
});

export const listFeesQuery = z.object({
  feeMonth: monthString.optional(),
  month: monthString.optional(),
  status: z.enum(["unpaid", "partial", "paid"]).optional(),
  studentId: objectId.optional(),
  grade: gradeEnum.optional(),
  batchId: objectId.optional(),
  ...paginationQuery,
});

export const updateFeeSchema = z.object({
  baseAmount: z.coerce.number().int().min(0).optional(),
  discountAmount: z.coerce.number().int().min(0).optional(),
  dueDate: dateOnly.optional(),
});

export const paymentModes = ["cash", "upi", "bank_transfer", "other"];

export const createPaymentSchema = z.object({
  studentId: objectId,
  feeRecordId: objectId,
  amount: z.coerce.number().int("Amount must be in paise").min(1, "Amount must be greater than zero"),
  paymentDate: dateOnly.optional(),
  paymentMode: z.enum(paymentModes),
  transactionReference: optionalText,
  notes: optionalText,
});

export const reversePaymentSchema = z.object({
  reason: z.string().trim().min(3, "A reason is required").max(300),
});

export const listPaymentsQuery = z.object({
  studentId: objectId.optional(),
  feeRecordId: objectId.optional(),
  status: z.enum(["completed", "reversed"]).optional(),
  paymentMode: z.enum(paymentModes).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  ...paginationQuery,
});
