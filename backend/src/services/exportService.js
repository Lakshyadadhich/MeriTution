import ExcelJS from "exceljs";
import Attendance from "../models/Attendance.js";
import Batch from "../models/Batch.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import { currentMonthInTz, todayInTz } from "../utils/dates.js";
import { toRupees } from "../utils/money.js";
import { feesReport } from "./reportService.js";

function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tuition Manager";
  workbook.created = new Date();
  return workbook;
}

function addSheet(workbook, name, columns, rows) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns;
  for (const row of rows) sheet.addRow(row);
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6F4F1" },
  };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  return sheet;
}

function dateOnly(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

async function batchMapFor(students) {
  const ids = [
    ...new Set(
      students.map((s) => s.tuitionInfo?.batchId?.toString()).filter(Boolean)
    ),
  ];
  const batches = await Batch.find({ _id: { $in: ids } })
    .select("name")
    .lean();
  return new Map(batches.map((b) => [b._id.toString(), b.name]));
}

export async function exportStudents({ status, grade, batchId } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (grade) filter["academicInfo.grade"] = grade;
  if (batchId) filter["tuitionInfo.batchId"] = batchId;

  const students = await Student.find(filter)
    .sort({ studentCode: 1 })
    .lean();
  const batchMap = await batchMapFor(students);

  const workbook = newWorkbook();
  const studentsSheet = addSheet(
    workbook,
    "Students",
    [
      { header: "Student Code", key: "code", width: 14 },
      { header: "Full Name", key: "name", width: 26 },
      { header: "Grade", key: "grade", width: 8 },
      { header: "School", key: "school", width: 26 },
      { header: "Academic Year", key: "year", width: 14 },
      { header: "Subjects", key: "subjects", width: 26 },
      { header: "Father Name", key: "father", width: 22 },
      { header: "Mother Name", key: "mother", width: 22 },
      { header: "Primary Contact", key: "contact", width: 16 },
      { header: "Alternate Contact", key: "altContact", width: 16 },
      { header: "Batch", key: "batch", width: 18 },
      { header: "Monthly Fee (INR)", key: "fee", width: 18 },
      { header: "Due Day", key: "dueDay", width: 10 },
      { header: "Joining Date", key: "joining", width: 14 },
      { header: "Status", key: "status", width: 10 },
    ],
    students.map((s) => ({
      code: s.studentCode,
      name: s.personalInfo.fullName,
      grade: s.academicInfo.grade,
      school: s.academicInfo.schoolName || "",
      year: s.academicInfo.academicYear,
      subjects: (s.academicInfo.subjects || []).join(", "),
      father: s.parentInfo.fatherName || "",
      mother: s.parentInfo.motherName || "",
      contact: s.parentInfo.primaryContact,
      altContact: s.parentInfo.alternateContact || "",
      batch: s.tuitionInfo.batchId
        ? batchMap.get(s.tuitionInfo.batchId.toString()) || ""
        : "",
      fee: toRupees(s.tuitionInfo.monthlyFee),
      dueDay: s.tuitionInfo.dueDay,
      joining: dateOnly(s.tuitionInfo.joiningDate),
      status: s.status,
    }))
  );
  studentsSheet.getColumn("fee").numFmt = "#,##0.00";

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `students-${todayInTz()}.xlsx`,
  };
}

export async function exportFees(query = {}) {
  const { items } = await feesReport(query);
  const workbook = newWorkbook();
  const feesSheet = addSheet(
    workbook,
    "Fee Records",
    [
      { header: "Fee Month", key: "feeMonth", width: 12 },
      { header: "Student Code", key: "code", width: 14 },
      { header: "Student Name", key: "name", width: 26 },
      { header: "Grade", key: "grade", width: 8 },
      { header: "Batch", key: "batch", width: 18 },
      { header: "Base Amount", key: "base", width: 14 },
      { header: "Discount", key: "discount", width: 12 },
      { header: "Total Due", key: "total", width: 14 },
      { header: "Amount Paid", key: "paid", width: 14 },
      { header: "Balance", key: "balance", width: 14 },
      { header: "Status", key: "status", width: 10 },
      { header: "Due Date", key: "dueDate", width: 14 },
    ],
    items.map((r) => ({
      feeMonth: r.feeMonth,
      code: r.studentId?.studentCode || "",
      name: r.studentId?.personalInfo?.fullName || "",
      grade: r.studentId?.academicInfo?.grade || "",
      batch: r.batchName || "",
      base: toRupees(r.baseAmount),
      discount: toRupees(r.discountAmount),
      total: toRupees(r.totalDue),
      paid: toRupees(r.amountPaid),
      balance: toRupees(r.balanceAmount),
      status: r.status,
      dueDate: dateOnly(r.dueDate),
    }))
  );
  for (const col of ["base", "discount", "total", "paid", "balance"]) {
    feesSheet.getColumn(col).numFmt = "#,##0.00";
  }

  const label = query.feeMonth || "all";
  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `fees-${label}-${todayInTz()}.xlsx`,
  };
}

export async function exportPayments({ from, to, studentId, status } = {}) {
  const filter = {};
  if (from || to) {
    filter.paymentDate = {};
    if (from) filter.paymentDate.$gte = new Date(`${from}T00:00:00Z`);
    if (to) {
      filter.paymentDate.$lt = new Date(
        new Date(`${to}T00:00:00Z`).getTime() + 86400000
      );
    }
  }
  if (studentId) filter.studentId = studentId;
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .populate("studentId", "studentCode personalInfo.fullName")
    .populate("feeRecordId", "feeMonth")
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  const workbook = newWorkbook();
  const paymentsSheet = addSheet(
    workbook,
    "Payments",
    [
      { header: "Receipt No", key: "receipt", width: 14 },
      { header: "Payment Date", key: "date", width: 14 },
      { header: "Student Code", key: "code", width: 14 },
      { header: "Student Name", key: "name", width: 26 },
      { header: "Fee Month", key: "feeMonth", width: 12 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Mode", key: "mode", width: 14 },
      { header: "Reference", key: "reference", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Notes", key: "notes", width: 30 },
    ],
    payments.map((p) => ({
      receipt: p.receiptNumber,
      date: dateOnly(p.paymentDate),
      code: p.studentId?.studentCode || "",
      name: p.studentId?.personalInfo?.fullName || "",
      feeMonth: p.feeRecordId?.feeMonth || "",
      amount: toRupees(p.amount),
      mode: p.paymentMode,
      reference: p.transactionReference || "",
      status: p.status,
      notes: p.notes || "",
    }))
  );
  paymentsSheet.getColumn("amount").numFmt = "#,##0.00";

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `payments-${from || "start"}-to-${to || todayInTz()}.xlsx`,
  };
}

export async function exportAttendance({ from, to, batchId, studentId } = {}) {
  const end = to || todayInTz();
  const start = from || `${currentMonthInTz()}-01`;
  const filter = { attendanceDate: { $gte: start, $lte: end } };
  if (batchId) filter.batchId = batchId;
  if (studentId) filter.studentId = studentId;

  const records = await Attendance.find(filter)
    .populate("studentId", "studentCode personalInfo.fullName")
    .populate("batchId", "name")
    .sort({ attendanceDate: 1 })
    .lean();

  const workbook = newWorkbook();
  addSheet(
    workbook,
    "Attendance",
    [
      { header: "Date", key: "date", width: 14 },
      { header: "Batch", key: "batch", width: 20 },
      { header: "Student Code", key: "code", width: 14 },
      { header: "Student Name", key: "name", width: 26 },
      { header: "Status", key: "status", width: 12 },
      { header: "Remarks", key: "remarks", width: 30 },
    ],
    records.map((r) => ({
      date: r.attendanceDate,
      batch: r.batchId?.name || "",
      code: r.studentId?.studentCode || "",
      name: r.studentId?.personalInfo?.fullName || "",
      status: r.status,
      remarks: r.remarks || "",
    }))
  );

  return {
    buffer: await workbook.xlsx.writeBuffer(),
    filename: `attendance-${start}-to-${end}.xlsx`,
  };
}
