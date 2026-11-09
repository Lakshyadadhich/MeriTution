import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import ApiError from "../utils/ApiError.js";

export async function bulkSaveAttendance({ batchId, attendanceDate, records }) {
  const batch = await Batch.findById(batchId);
  if (!batch) throw ApiError.notFound("Batch not found");

  const studentIds = [...new Set(records.map((r) => r.studentId))];
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  const byId = new Map(students.map((s) => [s._id.toString(), s]));

  const invalid = [];
  for (const id of studentIds) {
    const student = byId.get(id);
    if (!student) {
      invalid.push({ studentId: id, reason: "Student not found" });
      continue;
    }
    if (student.status !== "active") {
      invalid.push({ studentId: id, reason: "Student is inactive" });
      continue;
    }
    if (!student.tuitionInfo.batchId || student.tuitionInfo.batchId.toString() !== batchId) {
      invalid.push({ studentId: id, reason: "Student is not assigned to this batch" });
    }
  }

  if (invalid.length) {
    throw ApiError.badRequest("Some students cannot be marked for this batch", invalid);
  }

  let created = 0;
  let updated = 0;
  const saved = [];

  for (const record of records) {
    const existing = await Attendance.findOne({
      studentId: record.studentId,
      batchId,
      attendanceDate,
    });

    if (existing) {
      existing.status = record.status;
      existing.remarks = record.remarks || null;
      await existing.save();
      updated += 1;
      saved.push(existing);
    } else {
      const doc = await Attendance.create({
        studentId: record.studentId,
        batchId,
        attendanceDate,
        status: record.status,
        remarks: record.remarks || null,
      });
      created += 1;
      saved.push(doc);
    }
  }

  return {
    batchId,
    attendanceDate,
    saved: saved.length,
    created,
    updated,
    records: saved,
  };
}
