import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { audit } from "../utils/audit.js";
import { nextStudentCode } from "../utils/codes.js";
import { todayInTz } from "../utils/dates.js";
import { escapeRegex } from "../utils/helpers.js";
import { pagedResult, parsePagination } from "../utils/pagination.js";
import { getSettings } from "../services/settingsService.js";

const BATCH_POPULATE = {
  path: "batch",
  select: "name startTime endTime daysOfWeek grades isActive",
};

function toDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00Z`);
}

async function duplicateWarnings({ fullName, primaryContact, excludeId }) {
  const or = [];
  if (fullName) {
    or.push({
      "personalInfo.fullName": new RegExp(`^${escapeRegex(fullName.trim())}$`, "i"),
    });
  }
  if (primaryContact) {
    or.push({ "parentInfo.primaryContact": primaryContact.trim() });
  }
  if (!or.length) return [];

  const query = { $or: or };
  if (excludeId) query._id = { $ne: excludeId };

  const matches = await Student.find(query)
    .select(
      "studentCode personalInfo.fullName parentInfo.primaryContact academicInfo.grade status"
    )
    .limit(5)
    .lean();

  return matches.map((m) => {
    const reasons = [];
    if (
      fullName &&
      m.personalInfo.fullName?.toLowerCase() === fullName.trim().toLowerCase()
    ) {
      reasons.push("Same student name");
    }
    if (primaryContact && m.parentInfo.primaryContact === primaryContact.trim()) {
      reasons.push("Shared parent contact");
    }
    return {
      studentId: m._id,
      studentCode: m.studentCode,
      fullName: m.personalInfo.fullName,
      primaryContact: m.parentInfo.primaryContact,
      grade: m.academicInfo.grade,
      status: m.status,
      reasons,
    };
  });
}

async function assertBatch(batchId) {
  if (!batchId) return null;
  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.badRequest("Selected batch does not exist");
  return batch;
}

export const createStudent = asyncHandler(async (req, res) => {
  const { personalInfo, parentInfo, academicInfo, tuitionInfo, status } = req.body;
  await assertBatch(tuitionInfo.batchId);
  const settings = await getSettings();

  const student = await Student.create({
    studentCode: await nextStudentCode(),
    personalInfo: {
      fullName: personalInfo.fullName,
      dob: toDate(personalInfo.dob),
      gender: personalInfo.gender || null,
      photoUrl: personalInfo.photoUrl || null,
    },
    parentInfo: {
      fatherName: parentInfo.fatherName || null,
      motherName: parentInfo.motherName || null,
      primaryContact: parentInfo.primaryContact,
      alternateContact: parentInfo.alternateContact || null,
    },
    academicInfo: {
      schoolName: academicInfo.schoolName || null,
      grade: academicInfo.grade,
      academicYear: academicInfo.academicYear || settings.academicYear,
      subjects: academicInfo.subjects || [],
    },
    tuitionInfo: {
      batchId: tuitionInfo.batchId || null,
      monthlyFee: tuitionInfo.monthlyFee,
      dueDay: tuitionInfo.dueDay || settings.defaultDueDay || 5,
      joiningDate: toDate(tuitionInfo.joiningDate) || toDate(todayInTz()),
    },
    status: status || "active",
  });

  const warnings = await duplicateWarnings({
    fullName: student.personalInfo.fullName,
    primaryContact: student.parentInfo.primaryContact,
    excludeId: student._id,
  });

  res.status(201).json({ student, duplicateWarnings: warnings });
});

export const listStudents = asyncHandler(async (req, res) => {
  const { q, grade, school, batchId, status, page, limit } = req.validatedQuery;
  const filter = {};

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { "personalInfo.fullName": regex },
      { "parentInfo.primaryContact": regex },
    ];
  }
  if (grade) filter["academicInfo.grade"] = grade;
  if (school) filter["academicInfo.schoolName"] = new RegExp(escapeRegex(school), "i");
  if (batchId) filter["tuitionInfo.batchId"] = batchId;
  if (status) filter.status = status;

  const pagination = { page, limit, skip: (page - 1) * limit };
  const [items, total] = await Promise.all([
    Student.find(filter)
      .populate(BATCH_POPULATE)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  res.json(pagedResult(items, total, pagination));
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate(BATCH_POPULATE);
  if (!student) throw ApiError.notFound("Student not found");

  const [feeRecords, payments, attendance] = await Promise.all([
    FeeRecord.find({ studentId: student._id }).sort({ feeMonth: -1 }).lean(),
    Payment.find({ studentId: student._id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(50)
      .lean(),
    Attendance.find({ studentId: student._id })
      .populate("batchId", "name")
      .sort({ attendanceDate: -1 })
      .limit(30)
      .lean(),
  ]);

  const allAttendance = await Attendance.find({ studentId: student._id })
    .select("status")
    .lean();
  const attendanceSummary = {
    total: allAttendance.length,
    present: allAttendance.filter((a) => a.status === "present").length,
    absent: allAttendance.filter((a) => a.status === "absent").length,
    leave: allAttendance.filter((a) => a.status === "leave").length,
  };

  res.json({
    student,
    feeRecords,
    payments,
    attendanceSummary,
    recentAttendance: attendance,
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound("Student not found");

  const body = req.body;
  if (body.personalInfo) {
    const p = body.personalInfo;
    if (p.fullName !== undefined) student.personalInfo.fullName = p.fullName;
    if (p.dob !== undefined) student.personalInfo.dob = toDate(p.dob);
    if (p.gender !== undefined) student.personalInfo.gender = p.gender || null;
    if (p.photoUrl !== undefined) student.personalInfo.photoUrl = p.photoUrl || null;
  }
  if (body.parentInfo) {
    const p = body.parentInfo;
    if (p.fatherName !== undefined) student.parentInfo.fatherName = p.fatherName || null;
    if (p.motherName !== undefined) student.parentInfo.motherName = p.motherName || null;
    if (p.primaryContact !== undefined) student.parentInfo.primaryContact = p.primaryContact;
    if (p.alternateContact !== undefined)
      student.parentInfo.alternateContact = p.alternateContact || null;
  }
  if (body.academicInfo) {
    const a = body.academicInfo;
    if (a.schoolName !== undefined) student.academicInfo.schoolName = a.schoolName || null;
    if (a.grade !== undefined) student.academicInfo.grade = a.grade;
    if (a.academicYear !== undefined) student.academicInfo.academicYear = a.academicYear;
    if (a.subjects !== undefined) student.academicInfo.subjects = a.subjects;
  }
  if (body.tuitionInfo) {
    const t = body.tuitionInfo;
    if (t.batchId !== undefined) {
      await assertBatch(t.batchId);
      student.tuitionInfo.batchId = t.batchId || null;
    }
    if (t.monthlyFee !== undefined) student.tuitionInfo.monthlyFee = t.monthlyFee;
    if (t.dueDay !== undefined) student.tuitionInfo.dueDay = t.dueDay;
    if (t.joiningDate !== undefined)
      student.tuitionInfo.joiningDate = toDate(t.joiningDate);
  }

  const previousStatus = student.status;
  if (body.status !== undefined) student.status = body.status;

  await student.save();

  if (body.status !== undefined && body.status !== previousStatus) {
    await audit("student.status", {
      entityType: "Student",
      entityId: student._id,
      performedBy: req.user._id,
      details: { from: previousStatus, to: body.status },
    });
  }

  const warnings = await duplicateWarnings({
    fullName: student.personalInfo.fullName,
    primaryContact: student.parentInfo.primaryContact,
    excludeId: student._id,
  });

  res.json({ student, duplicateWarnings: warnings });
});

export const setStudentStatus = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound("Student not found");

  const previous = student.status;
  student.status = req.body.status;
  await student.save();

  if (previous !== student.status) {
    await audit("student.status", {
      entityType: "Student",
      entityId: student._id,
      performedBy: req.user._id,
      details: { from: previous, to: student.status },
    });
  }

  res.json({ student });
});

export const checkDuplicate = asyncHandler(async (req, res) => {
  const fullName = String(req.query.fullName || "").trim();
  const primaryContact = String(req.query.primaryContact || "").trim();
  if (!fullName && !primaryContact) {
    throw ApiError.badRequest("Provide a name or primary contact to check");
  }
  const warnings = await duplicateWarnings({ fullName, primaryContact });
  res.json({ duplicateWarnings: warnings });
});
