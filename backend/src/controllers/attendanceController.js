import Attendance from "../models/Attendance.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { audit } from "../utils/audit.js";
import { pagedResult } from "../utils/pagination.js";
import { bulkSaveAttendance } from "../services/attendanceService.js";

export const bulkSave = asyncHandler(async (req, res) => {
  const result = await bulkSaveAttendance(req.body);
  res.status(201).json(result);
});

export const listAttendance = asyncHandler(async (req, res) => {
  const { batchId, studentId, attendanceDate, month, from, to, page, limit } =
    req.validatedQuery;

  const filter = {};
  if (batchId) filter.batchId = batchId;
  if (studentId) filter.studentId = studentId;
  if (attendanceDate) filter.attendanceDate = attendanceDate;
  if (month) filter.attendanceDate = new RegExp(`^${month}`);
  if (from || to) {
    filter.attendanceDate = {};
    if (from) filter.attendanceDate.$gte = from;
    if (to) filter.attendanceDate.$lte = to;
  }

  const pagination = { page, limit, skip: (page - 1) * limit };
  const [items, total] = await Promise.all([
    Attendance.find(filter)
      .populate("studentId", "studentCode personalInfo.fullName academicInfo.grade")
      .populate("batchId", "name")
      .sort({ attendanceDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  res.json(pagedResult(items, total, pagination));
});

export const updateAttendance = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound("Attendance record not found");

  const previous = { status: record.status, remarks: record.remarks };
  if (req.body.status !== undefined) record.status = req.body.status;
  if (req.body.remarks !== undefined) record.remarks = req.body.remarks || null;
  await record.save();

  await audit("attendance.correct", {
    entityType: "Attendance",
    entityId: record._id,
    performedBy: req.user._id,
    details: { previous, current: { status: record.status, remarks: record.remarks } },
  });

  res.json({ attendance: record });
});
