import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pagedResult } from "../utils/pagination.js";
import { generateMonthlyFees, updateFeeRecord } from "../services/feeService.js";

const STUDENT_FIELDS =
  "studentCode personalInfo.fullName parentInfo.primaryContact academicInfo.grade tuitionInfo.batchId status";

async function studentIdFilter({ grade, batchId }) {
  if (!grade && !batchId) return null;
  const filter = {};
  if (grade) filter["academicInfo.grade"] = grade;
  if (batchId) filter["tuitionInfo.batchId"] = batchId;
  const students = await Student.find(filter).select("_id").lean();
  return students.map((s) => s._id);
}

export const generateFees = asyncHandler(async (req, res) => {
  const result = await generateMonthlyFees(req.body, req.user);
  res.status(201).json(result);
});

export const listFees = asyncHandler(async (req, res) => {
  const { feeMonth, month, status, studentId, grade, batchId, page, limit } =
    req.validatedQuery;
  const filter = {};
  const selectedMonth = feeMonth || month;
  if (selectedMonth) filter.feeMonth = selectedMonth;
  if (status) filter.status = status;
  if (studentId) filter.studentId = studentId;

  const ids = await studentIdFilter({ grade, batchId });
  if (ids) filter.studentId = { $in: ids };

  const pagination = { page, limit, skip: (page - 1) * limit };
  const [items, total] = await Promise.all([
    FeeRecord.find(filter)
      .populate("studentId", STUDENT_FIELDS)
      .sort({ feeMonth: -1, balanceAmount: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    FeeRecord.countDocuments(filter),
  ]);

  res.json(pagedResult(items, total, pagination));
});

export const getFee = asyncHandler(async (req, res) => {
  const fee = await FeeRecord.findById(req.params.id)
    .populate("studentId", STUDENT_FIELDS)
    .lean();
  if (!fee) throw ApiError.notFound("Fee record not found");

  const payments = await Payment.find({ feeRecordId: fee._id })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  res.json({ fee, payments });
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .select(STUDENT_FIELDS)
    .lean();
  if (!student) throw ApiError.notFound("Student not found");

  const feeRecords = await FeeRecord.find({ studentId: student._id })
    .sort({ feeMonth: -1 })
    .lean();
  const payments = await Payment.find({ studentId: student._id })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  const totalOutstanding = feeRecords.reduce((sum, f) => sum + f.balanceAmount, 0);

  res.json({ student, feeRecords, payments, totalOutstanding });
});

export const updateFee = asyncHandler(async (req, res) => {
  const fee = await updateFeeRecord(req.params.id, req.body, req.user);
  res.json({ fee });
});
