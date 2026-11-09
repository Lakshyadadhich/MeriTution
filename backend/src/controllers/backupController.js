import Attendance from "../models/Attendance.js";
import AuditLog from "../models/AuditLog.js";
import Batch from "../models/Batch.js";
import Counter from "../models/Counter.js";
import FeeRecord from "../models/FeeRecord.js";
import Payment from "../models/Payment.js";
import Settings from "../models/Settings.js";
import Student from "../models/Student.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { todayInTz } from "../utils/dates.js";
import { getSettings } from "../services/settingsService.js";

export const exportBackup = asyncHandler(async (_req, res) => {
  const [students, batches, feeRecords, payments, attendance, counters, auditLogs] =
    await Promise.all([
      Student.find().lean(),
      Batch.find().lean(),
      FeeRecord.find().lean(),
      Payment.find().lean(),
      Attendance.find().lean(),
      Counter.find().lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(2000).lean(),
    ]);
  const settings = await getSettings();

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy: "tuition-manager",
    data: {
      students,
      batches,
      feeRecords,
      payments,
      attendance,
      counters,
      settings: [settings.toObject()],
      auditLogs,
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="tuition-backup-${todayInTz()}.json"`
  );
  res.send(JSON.stringify(payload, null, 2));
});

export const backupModels = {
  Attendance,
  AuditLog,
  Batch,
  Counter,
  FeeRecord,
  Payment,
  Settings,
  Student,
};
