import Attendance from "../models/Attendance.js";
import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import ApiError from "../utils/ApiError.js";
import {
  currentMonthInTz,
  enumerateDates,
  monthRangeUtc,
  todayInTz,
  weekdayIndex,
} from "../utils/dates.js";
import { getSettings } from "./settingsService.js";

const STATUS_ORDER = ["unpaid", "partial", "paid"];

export async function dashboard({ feeMonth } = {}) {
  const month = feeMonth || currentMonthInTz();
  const today = todayInTz();
  await getSettings();

  const activeStudents = await Student.countDocuments({ status: "active" });

  const weekday = weekdayIndex(today);
  const scheduledBatches = await Batch.find({
    isActive: true,
    daysOfWeek: weekday,
  })
    .select("_id name")
    .lean();
  const scheduledBatchIds = scheduledBatches.map((b) => b._id);

  let totalExpected = 0;
  let presentToday = 0;
  let markedToday = 0;
  if (scheduledBatchIds.length) {
    totalExpected = await Student.countDocuments({
      status: "active",
      "tuitionInfo.batchId": { $in: scheduledBatchIds },
    });
    const todayRecords = await Attendance.find({
      attendanceDate: today,
      batchId: { $in: scheduledBatchIds },
    })
      .select("status")
      .lean();
    markedToday = todayRecords.length;
    presentToday = todayRecords.filter((r) => r.status === "present").length;
  }

  const { start, end } = monthRangeUtc(month);
  const collectionAgg = await Payment.aggregate([
    { $match: { status: "completed", paymentDate: { $gte: start, $lt: end } } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const monthCollection = collectionAgg[0]?.total || 0;
  const monthPayments = collectionAgg[0]?.count || 0;

  const feeRows = await FeeRecord.find({ feeMonth: month })
    .select("status totalDue amountPaid balanceAmount")
    .lean();
  const feeSummary = {
    totalDue: 0,
    collected: 0,
    outstanding: 0,
    count: feeRows.length,
    unpaid: 0,
    partial: 0,
    paid: 0,
  };
  for (const row of feeRows) {
    feeSummary.totalDue += row.totalDue;
    feeSummary.collected += row.amountPaid;
    feeSummary.outstanding += row.balanceAmount;
    feeSummary[row.status] += 1;
  }

  const allMonthsOutstanding = await FeeRecord.aggregate([
    { $match: { balanceAmount: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$balanceAmount" } } },
  ]);

  const pendingFees = await FeeRecord.find({
    feeMonth: month,
    balanceAmount: { $gt: 0 },
  })
    .populate(
      "studentId",
      "studentCode personalInfo.fullName parentInfo.primaryContact academicInfo.grade tuitionInfo.batchId status"
    )
    .sort({ balanceAmount: -1 })
    .limit(8)
    .lean();

  const recentStudents = await Student.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("studentCode personalInfo.fullName academicInfo.grade status createdAt")
    .lean();

  return {
    feeMonth: month,
    today,
    activeStudents,
    attendanceToday: {
      present: presentToday,
      totalExpected,
      marked: markedToday,
      scheduledBatches: scheduledBatches.length,
    },
    collection: {
      monthCollection,
      monthPayments,
      label: `Collected in ${month} (by payment date)`,
    },
    fees: feeSummary,
    outstanding: {
      feeMonthOutstanding: feeSummary.outstanding,
      allMonthsOutstanding: allMonthsOutstanding[0]?.total || 0,
    },
    pendingFees,
    recentStudents,
  };
}

export async function feesReport({ feeMonth, status, studentId, grade, batchId } = {}) {
  const filter = {};
  if (feeMonth) filter.feeMonth = feeMonth;
  if (status) filter.status = status;
  if (studentId) filter.studentId = studentId;

  if (grade || batchId) {
    const studentFilter = {};
    if (grade) studentFilter["academicInfo.grade"] = grade;
    if (batchId) studentFilter["tuitionInfo.batchId"] = batchId;
    const ids = await Student.find(studentFilter).select("_id").lean();
    filter.studentId = { $in: ids.map((s) => s._id) };
  }

  const records = await FeeRecord.find(filter)
    .populate(
      "studentId",
      "studentCode personalInfo.fullName parentInfo.primaryContact academicInfo.grade tuitionInfo.batchId"
    )
    .sort({ feeMonth: -1, balanceAmount: -1 })
    .limit(2000)
    .lean();

  const batchIds = [
    ...new Set(
      records
        .map((r) => r.studentId?.tuitionInfo?.batchId?.toString())
        .filter(Boolean)
    ),
  ];
  const batches = await Batch.find({ _id: { $in: batchIds } })
    .select("name")
    .lean();
  const batchMap = new Map(batches.map((b) => [b._id.toString(), b.name]));

  const items = records.map((r) => ({
    ...r,
    batchName: r.studentId?.tuitionInfo?.batchId
      ? batchMap.get(r.studentId.tuitionInfo.batchId.toString()) || null
      : null,
  }));

  const summary = {
    count: items.length,
    totalDue: 0,
    collected: 0,
    outstanding: 0,
    unpaid: 0,
    partial: 0,
    paid: 0,
  };
  for (const item of items) {
    summary.totalDue += item.totalDue;
    summary.collected += item.amountPaid;
    summary.outstanding += item.balanceAmount;
    summary[item.status] += 1;
  }

  return { feeMonth: feeMonth || null, summary, items };
}

export async function attendanceReport({ from, to, batchId, studentId, grade } = {}) {
  const end = to || todayInTz();
  const start = from || `${currentMonthInTz()}-01`;
  if (start > end) throw ApiError.badRequest("'from' must be before or equal to 'to'");

  const studentFilter = {};
  if (studentId) studentFilter._id = studentId;
  else studentFilter.status = "active";
  if (batchId) studentFilter["tuitionInfo.batchId"] = batchId;
  if (grade) studentFilter["academicInfo.grade"] = grade;

  const students = await Student.find(studentFilter)
    .select(
      "studentCode personalInfo.fullName academicInfo.grade tuitionInfo.batchId tuitionInfo.joiningDate status"
    )
    .sort({ "personalInfo.fullName": 1 })
    .lean();

  const batchIds = [
    ...new Set(students.map((s) => s.tuitionInfo.batchId?.toString()).filter(Boolean)),
  ];
  const batches = await Batch.find({ _id: { $in: batchIds } })
    .select("name daysOfWeek")
    .lean();
  const batchMap = new Map(batches.map((b) => [b._id.toString(), b]));

  const ids = students.map((s) => s._id);
  const records = await Attendance.find({
    studentId: { $in: ids },
    attendanceDate: { $gte: start, $lte: end },
  })
    .select("studentId status attendanceDate")
    .lean();

  const byStudent = new Map();
  for (const rec of records) {
    const key = rec.studentId.toString();
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key).push(rec);
  }

  const items = students.map((student) => {
    const batch = student.tuitionInfo.batchId
      ? batchMap.get(student.tuitionInfo.batchId.toString())
      : null;
    const joiningDate = student.tuitionInfo.joiningDate
      ? new Date(student.tuitionInfo.joiningDate).toISOString().slice(0, 10)
      : null;
    const rangeStart = joiningDate && joiningDate > start ? joiningDate : start;

    let scheduled = 0;
    if (batch && batch.daysOfWeek?.length && rangeStart <= end) {
      scheduled = enumerateDates(rangeStart, end).filter((d) =>
        batch.daysOfWeek.includes(weekdayIndex(d))
      ).length;
    }

    const recs = byStudent.get(student._id.toString()) || [];
    const present = recs.filter((r) => r.status === "present").length;
    const absent = recs.filter((r) => r.status === "absent").length;
    const leave = recs.filter((r) => r.status === "leave").length;
    const percentage =
      scheduled > 0
        ? Math.min(100, Math.round((present / scheduled) * 100))
        : null;

    return {
      studentId: student._id,
      studentCode: student.studentCode,
      fullName: student.personalInfo.fullName,
      grade: student.academicInfo.grade,
      batchId: student.tuitionInfo.batchId,
      batchName: batch?.name || null,
      scheduledSessions: scheduled,
      present,
      absent,
      leave,
      percentage,
      status: student.status,
    };
  });

  return { from: start, to: end, items };
}

export async function collectionReport({ month, from, to } = {}) {
  const match = { status: "completed" };
  let rangeLabel = "All time";

  if (month) {
    const { start, end } = monthRangeUtc(month);
    match.paymentDate = { $gte: start, $lt: end };
    rangeLabel = month;
  } else if (from || to) {
    match.paymentDate = {};
    if (from) match.paymentDate.$gte = new Date(`${from}T00:00:00Z`);
    if (to) {
      match.paymentDate.$lt = new Date(
        new Date(`${to}T00:00:00Z`).getTime() + 86400000
      );
    }
    rangeLabel = `${from || "start"} to ${to || "today"}`;
  }

  const rows = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
          mode: "$paymentMode",
        },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1, "_id.mode": 1 } },
  ]);

  const items = rows.map((r) => ({
    month: r._id.month,
    mode: r._id.mode,
    amount: r.amount,
    count: r.count,
  }));

  const byMode = {};
  let total = 0;
  for (const item of items) {
    byMode[item.mode] = (byMode[item.mode] || 0) + item.amount;
    total += item.amount;
  }

  return { rangeLabel, total, byMode, items };
}

export const feeStatuses = STATUS_ORDER;
