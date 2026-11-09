import Payment from "../models/Payment.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pagedResult } from "../utils/pagination.js";
import { recordPayment, reversePayment } from "../services/paymentService.js";

const STUDENT_FIELDS = "studentCode personalInfo.fullName academicInfo.grade";

export const createPayment = asyncHandler(async (req, res) => {
  const result = await recordPayment(req.body, req.user);
  res.status(201).json(result);
});

export const listPayments = asyncHandler(async (req, res) => {
  const { studentId, feeRecordId, status, paymentMode, from, to, page, limit } =
    req.validatedQuery;

  const filter = {};
  if (studentId) filter.studentId = studentId;
  if (feeRecordId) filter.feeRecordId = feeRecordId;
  if (status) filter.status = status;
  if (paymentMode) filter.paymentMode = paymentMode;
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = new Date(`${from}T00:00:00Z`);
    if (to) {
      filter.paymentDate.$lt = new Date(
        new Date(`${to}T00:00:00Z`).getTime() + 86400000
      );
    }
  }

  const pagination = { page, limit, skip: (page - 1) * limit };
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate("studentId", STUDENT_FIELDS)
      .populate("feeRecordId", "feeMonth status")
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  res.json(pagedResult(items, total, pagination));
});

export const reverse = asyncHandler(async (req, res) => {
  const result = await reversePayment(req.params.id, req.body.reason, req.user);
  res.json(result);
});
